import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {canonicalJson,sha256Hex} from '../src/build-evidence.mjs';
import {REFERENCES} from '../src/reference-registry.mjs';
import {REVIEW_SCHEMA} from '../src/scholarly-review.mjs';
import {verifyUnsignedEditorialPacket,createSourceReviewDossier,verifySourceReviewDossier} from '../src/source-review-dossier.mjs';
import {createClaimCrosswalk,verifyClaimCrosswalk} from '../src/source-claim-crosswalk.mjs';
import {validateMethodsEvidence,loadMethodsEvidence,METHODS_EVIDENCE_SHA256} from '../src/p8-methods-evidence.mjs';
const subtle=webcrypto.subtle;
const when='2026-10-10T12:00:00.000Z';
async function packet(ids){
 const body={
  schema:REVIEW_SCHEMA,
  manuscriptSha256:'a'.repeat(64),studySha256:'b'.repeat(64),auditSha256:'c'.repeat(64),
  status:'NOT_SUBMITTED_FOR_REVIEW',humanReviewComplete:false,
  reviewerName:null,reviewerInstitution:null,independentAssessment:null,publicationAuthorized:false,
  criteria:['authorship','primary_sources','literature','experimental_design','calibration','statistics',
    'figures','publication_format','reproducibility','novelty','independent_signoff'].map(id=>({
      id,task:'Human review pending '+id,status:'pending',reviewer:null,reviewNotes:null
    })),
  bibliography:REFERENCES.map(r=>({
    id:r.id,title:r.title,year:r.year,url:r.url,metadataSource:r.metadataSource,
    applicableToManuscript:ids.includes(r.id),metadataStatus:r.status,
    primaryFullTextReviewed:false,supportingPassagesReviewed:false,
    humanSourceReviewer:null,reviewStatus:'pending'
  })),
  note:'Unsigned source packet does not authenticate authors or reviewers'
 };
 return {...body,sha256:await sha256Hex(canonicalJson(body),subtle),createdAt:when};
}
function note(id){
 const ref=REFERENCES.find(r=>r.id===id);
 return {entryId:'p9_note_0001',referenceId:id,sourceUrl:ref.url,
  claim:'Procedural noise literature defines context rather than shader novelty.',
  locator:'Publisher article abstract and associated citation record',
  assessment:'requires_revision',
  note:'This specific document does not establish novelty of the current shader or a physical GPU replication.',
  reviewerDeclaredName:'Self declared study reader',checkedAt:when};
}
test('P9 research file is pinned to reviewed bytes and all 13 claims deny approval',async()=>{
 const raw=await readFile(new URL('../docs/P8_EVIDENCE_REGISTER.json',import.meta.url),'utf8');
 assert.equal(await sha256Hex(raw,subtle),METHODS_EVIDENCE_SHA256);
 const fetcher=async()=>({ok:true,text:async()=>raw});
 const data=await loadMethodsEvidence({fetcher,subtle});
 assert.equal(validateMethodsEvidence(data),true);
 assert.equal(data.claimRows.length,13);
 assert.equal(data.claimRows.every(x=>x.strongerClaimEstablished===false&&
  x.readerDeclarationsPromoted===false&&x.reviewAuthority==='none'),true);
 assert.equal(data.publicationAuthorized,false);
 assert.equal(data.independentGpuExperimentRun,false);
});
test('P9 research file edits and forged approvals fail closed and never become reviewed',async()=>{
 const raw=await readFile(new URL('../docs/P8_EVIDENCE_REGISTER.json',import.meta.url),'utf8');
 const amended=JSON.parse(raw);
 amended.claimRows[2].strongerClaimEstablished=true;
 assert.throws(()=>validateMethodsEvidence(amended),/must not imply/);
 const forged=JSON.parse(raw);forged.publicationAuthorized=true;
 assert.throws(()=>validateMethodsEvidence(forged),/clearance must remain false/);
 const promoted=JSON.parse(raw);promoted.claimRows[2].readerDeclarationsPromoted=true;
 assert.throws(()=>validateMethodsEvidence(promoted),/must not imply/);
 const swapped=JSON.parse(raw);swapped.claimRows.reverse();
 assert.throws(()=>validateMethodsEvidence(swapped),/reordered/);
 await assert.rejects(()=>loadMethodsEvidence({subtle,fetcher:async()=>({
  ok:true,text:async()=>raw.replace('GLSL conformance','fabricated peer approval')
 })}),/checksum mismatch/);
 await assert.rejects(()=>loadMethodsEvidence({subtle,fetcher:async()=>({ok:false,text:async()=>raw})}),/unavailable/);
});
test('P9 manuscript-specific citations can differ from the original three fixed sources',async()=>{
 const selected=['khronos-glsl-es300','lagae2010'];
 const p=await packet(selected);
 assert.equal(await verifyUnsignedEditorialPacket(p,subtle),true);
 const d=await createSourceReviewDossier(p,[note('lagae2010')],{subtle,clock:()=>when});
 const v=await verifySourceReviewDossier(d,p,subtle);
 assert.deepEqual(v.unreviewedCitationIds,['khronos-glsl-es300']);
 const x=await createClaimCrosswalk(p,d,{subtle,clock:()=>when});
 assert.equal(x.summary.citedSources,2);
 assert.equal(x.summary.claimsRequiringRevision,1);
 assert.equal(x.publicationAuthorized,false);
 assert.equal(x.independentHumanVerification,false);
 assert.equal((await verifyClaimCrosswalk(x,p,d,subtle)).verdict,'INTEGRITY_ONLY');
});
test('P9 packet refuses uncited source fabrication, zero citations and still-pending bibliography items',async()=>{
 await assert.rejects(()=>verifyUnsignedEditorialPacket(await packet([]),subtle),/at least one cited/);
 await assert.rejects(()=>verifyUnsignedEditorialPacket(
  await packet(['jeremias-quilez2013']),subtle),/bibliography cannot be silently altered/);
 const p=await packet(['khronos-glsl-es300']);
 await assert.rejects(()=>createSourceReviewDossier(p,[note('lagae2010')],{subtle}),/refer to a citation/);
 const forged={...p,publicationAuthorized:true};
 const {sha256,createdAt,...body}=forged;
 forged.sha256=await sha256Hex(canonicalJson(body),subtle);
 await assert.rejects(()=>verifyUnsignedEditorialPacket(forged,subtle),/must not claim scholarly authorization/);
});
test('P9 explicit caveat: unsigned packet checksum is not a verified manuscript citation witness',async()=>{
 const p=await packet(['lagae2010']);
 const alternate=await packet(['khronos-glsl-es300']);
 assert.equal(await verifyUnsignedEditorialPacket(p,subtle),true);
 assert.notEqual(p.sha256,alternate.sha256);
 const d=await createSourceReviewDossier(p,[note('lagae2010')],{subtle,clock:()=>when});
 await assert.rejects(()=>verifySourceReviewDossier(d,alternate,subtle),/refer to a citation|altered/);
 assert.equal(d.independentPeerReviewEstablished,false);
 assert.equal(d.publicationAuthorized,false);
});
