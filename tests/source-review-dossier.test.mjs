import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonicalJson,sha256Hex} from '../src/build-evidence.mjs';
import {REFERENCES} from '../src/reference-registry.mjs';
import {REVIEW_SCHEMA} from '../src/scholarly-review.mjs';
import {verifyUnsignedEditorialPacket,createSourceReviewDossier,verifySourceReviewDossier} from '../src/source-review-dossier.mjs';
import {createClaimCrosswalk,verifyClaimCrosswalk} from '../src/source-claim-crosswalk.mjs';
const subtle=webcrypto.subtle;
const H='b'.repeat(64);
const when=()=>new Date('2026-10-10T12:00:00.000Z').toISOString();
async function packet(){
 const body={
  schema:REVIEW_SCHEMA,manuscriptSha256:H,studySha256:'a'.repeat(64),auditSha256:'c'.repeat(64),
  status:'NOT_SUBMITTED_FOR_REVIEW',humanReviewComplete:false,
  reviewerName:null,reviewerInstitution:null,independentAssessment:null,
  publicationAuthorized:false,
  criteria:['authorship','primary_sources','literature','experimental_design','calibration',
   'statistics','figures','publication_format','reproducibility','novelty','independent_signoff'].map(id=>({
    id,task:'Human reviewer must independently assess '+id,status:'pending',reviewer:null,reviewNotes:null
  })),
  bibliography:REFERENCES.map(r=>({
   id:r.id,title:r.title,year:r.year,url:r.url,metadataSource:r.metadataSource,
   applicableToManuscript:['khronos-glsl-es300','khronos-webgl2','sacks1989'].includes(r.id),
   metadataStatus:r.status,primaryFullTextReviewed:false,supportingPassagesReviewed:false,
   humanSourceReviewer:null,reviewStatus:'pending'
  })),
  note:'Machine-generated review plan, not a signed evaluation.'
 };
 return {...body,sha256:await sha256Hex(canonicalJson(body),subtle),createdAt:when()};
}
const annotation=(overrides={})=>({
 entryId:'evidence_0001',referenceId:'khronos-webgl2',
 claim:'WebGL2 provides a framebuffer readPixels API for RGBA8 captured data.',
 locator:'Reading back pixels, WebGL 2 specification',
 sourceUrl:'https://registry.khronos.org/webgl/specs/latest/2.0/',
 assessment:'supports_limited_claim',
 note:'The specification defines readPixels overloads and mentions blocking readback behavior.',
 reviewerDeclaredName:'Example Human Reader',checkedAt:when(),...overrides
});
test('P7 unsigned editor packet is validated as pending, not approved',async()=>{
 const p=await packet();
 assert.equal(await verifyUnsignedEditorialPacket(p,subtle),true);
 const forged={...p,publicationAuthorized:true};const {sha256,createdAt,...body}=forged;
 forged.sha256=await sha256Hex(canonicalJson(body),subtle);
 await assert.rejects(()=>verifyUnsignedEditorialPacket(forged,subtle),/must not claim scholarly authorization/);
});
test('P7 one human-declared passage assessment becomes hash-linked but not peer-reviewed',async()=>{
 const p=await packet();
 const dossier=await createSourceReviewDossier(p,[annotation()],{subtle,clock:when});
 assert.equal(dossier.assessmentCount,1);
 assert.deepEqual(dossier.reviewedCitationIds,['khronos-webgl2']);
 assert.equal(dossier.independentPeerReviewEstablished,false);
 assert.equal(dossier.publicationAuthorized,false);
 assert.match(dossier.sha256,/^[a-f0-9]{64}$/);
 const result=await verifySourceReviewDossier(dossier,p,subtle);
 assert.equal(result.verdict,'INTEGRITY_ONLY');
 assert.equal(result.authenticatedHumanReview,false);
 assert.deepEqual(result.unreviewedCitationIds,['khronos-glsl-es300','sacks1989']);
});
test('P7 separate contradictory interpretations are retained, never auto-resolved',async()=>{
 const p=await packet();
 const d=await createSourceReviewDossier(p,[
  annotation(),annotation({entryId:'evidence_0002',assessment:'contradicts_claim',
   note:'An alternative passage interpretation conflicts with the proposed bounded reading.'})
 ],{subtle,clock:when});
 assert.equal(d.assessmentCount,2);
 assert.equal(d.reviewedCitationIds.length,1);
 assert.equal((await verifySourceReviewDossier(d,p,subtle)).verdict,'INTEGRITY_ONLY');
});
test('P7 dossier must link only cited works and concrete passages with named human claimants',async()=>{
 const p=await packet();
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({referenceId:'lagae2010'})],{subtle}),/refer to a citation/);
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({locator:'?'})],{subtle}),/locator/);
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({reviewerDeclaredName:''})],{subtle}),/reviewerDeclaredName/);
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({assessment:'peer_review_approved'})],{subtle}),/Unsupported source assessment/);
});
test('P7 duplicate records and unsafe URLs are rejected before export',async()=>{
 const p=await packet(),a=annotation();
 await assert.rejects(()=>createSourceReviewDossier(p,[a,a],{subtle}),/Duplicate reviewer evidence/);
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({sourceUrl:'javascript:alert(1)'})],{subtle}),/must use HTTPS/);
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({sourceUrl:'https://u:p@example.org/'})],{subtle}),/Invalid source URL/);
 await assert.rejects(()=>createSourceReviewDossier(p,[annotation({sourceUrl:'https://example.org/other.pdf'})],{subtle}),/must match the manuscript citation/);
});
test('P7 changed reviewer dispositions, timestamps or experiment linkage fail integrity checks',async()=>{
 const p=await packet(),d=await createSourceReviewDossier(p,[annotation()],{subtle,clock:when});
 const changed=structuredClone(d);changed.assessments[0].assessment='contradicts_claim';
 await assert.rejects(()=>verifySourceReviewDossier(changed,p,subtle),/altered/);
 const other=await packet();other.manuscriptSha256='d'.repeat(64);
 const {sha256,createdAt,...body}=other;other.sha256=await sha256Hex(canonicalJson(body),subtle);
 await assert.rejects(()=>verifySourceReviewDossier(d,other,subtle),/altered/);
 const tampered=structuredClone(p);tampered.bibliography[0].reviewStatus='approved';
 await assert.rejects(()=>verifyUnsignedEditorialPacket(tampered,subtle),/hash mismatch/);
});
test('P7 unsigned source notes cannot alter the original manuscript paper gate',async()=>{
 const p=await packet(),d=await createSourceReviewDossier(p,[annotation()],{subtle,clock:when});
 assert.equal(d.status,'REVIEWER_DECLARATIONS_UNAUTHENTICATED');
 assert.equal(d.publicationAuthorized,false);
 assert.equal(p.publicationAuthorized,false);
 assert.equal(p.humanReviewComplete,false);
});

test('P7 claim-level crosswalk exposes unassessed sources without granting approval',async()=>{
 const p=await packet(),d=await createSourceReviewDossier(p,[annotation()],{subtle,clock:when});
 const x=await createClaimCrosswalk(p,d,{subtle,clock:when});
 assert.equal(x.summary.citedSources,3);
 assert.equal(x.summary.sourcesWithAssessments,1);
 assert.equal(x.summary.sourceCoverageOnly,'1/3');
 assert.equal(x.summary.claimsWithContradictions,0);
 assert.equal(x.summary.claimsWithConflictingDeclarations,0);
 assert.deepEqual(x.sourceReviewRows.filter(r=>r.coverage==='not_assessed').map(r=>r.referenceId),
   ['khronos-glsl-es300','sacks1989']);
 assert.equal(x.publicationAuthorized,false);
 assert.equal((await verifyClaimCrosswalk(x,p,d,subtle)).verdict,'INTEGRITY_ONLY');
});
test('P7 contradictory assessments of the exact same claim remain explicitly in disagreement',async()=>{
 const p=await packet();
 const entries=[
  annotation(),
  annotation({entryId:'evidence_0002',assessment:'contradicts_claim',
   reviewerDeclaredName:'Different Human Reader',
   note:'An alternative reading disputes the specific claim; disagreement must remain visible.'})
 ];
 const d=await createSourceReviewDossier(p,entries,{subtle,clock:when});
 const x=await createClaimCrosswalk(p,d,{subtle,clock:when});
 const row=x.sourceReviewRows.find(r=>r.referenceId==='khronos-webgl2');
 assert.equal(row.coverage,'conflicting_reader_declarations');
 assert.equal(row.claims.length,1);
 assert.equal(row.claims[0].status,'conflicting_reader_declarations');
 assert.deepEqual(row.claims[0].declaredReaders,['Different Human Reader','Example Human Reader']);
 assert.equal(x.summary.claimsWithConflictingDeclarations,1);
 assert.equal(x.independentHumanVerification,false);
});
test('P7 distinct claims are never merged solely because they cite the same source',async()=>{
 const p=await packet(),second=annotation({
  entryId:'evidence_0002',claim:'WebGL2 readPixels behavior is not evidence of calibrated physical luminance.',
  assessment:'requires_revision',
  note:'This particular output-color claim requires an independently calibrated colorimetry source.'
 });
 const d=await createSourceReviewDossier(p,[annotation(),second],{subtle,clock:when});
 const x=await createClaimCrosswalk(p,d,{subtle,clock:when});
 const row=x.sourceReviewRows.find(r=>r.referenceId==='khronos-webgl2');
 assert.equal(row.distinctClaims,2);
 assert.equal(row.coverage,'revision_requested');
 assert.equal(row.claims.some(c=>c.status==='conflicting_reader_declarations'),false);
 assert.equal(x.summary.claimsRequiringRevision,1);
});
test('P7 changed review details or forged crosswalk approval fail content replay',async()=>{
 const p=await packet(),d=await createSourceReviewDossier(p,[annotation()],{subtle,clock:when});
 const x=await createClaimCrosswalk(p,d,{subtle,clock:when});
 const modified=structuredClone(x);modified.sourceReviewRows[1].coverage='limited_support_declared';
 await assert.rejects(()=>verifyClaimCrosswalk(modified,p,d,subtle),/no longer reproduces/);
 const forged=structuredClone(x);forged.publicationAuthorized=true;
 await assert.rejects(()=>verifyClaimCrosswalk(forged,p,d,subtle),/no longer reproduces/);
 const other=structuredClone(d);other.assessments[0].note+=' Changed.';
 await assert.rejects(()=>createClaimCrosswalk(p,other,{subtle}),/altered/);
});
