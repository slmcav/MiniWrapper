import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonicalJson,sha256Hex} from '../src/build-evidence.mjs';
import {REFERENCES} from '../src/reference-registry.mjs';
import {REVIEW_SCHEMA} from '../src/scholarly-review.mjs';
import {verifyUnsignedEditorialPacket,createSourceReviewDossier,verifySourceReviewDossier} from '../src/source-review-dossier.mjs';
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
