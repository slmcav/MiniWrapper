// Editorial handoff packet, never a generated peer-review approval.
import {canonicalJson,sha256Hex} from './build-evidence.mjs';
import {verifyManuscript} from './manuscript-engine.mjs';
import {REFERENCES} from './reference-registry.mjs';
export const REVIEW_SCHEMA='glsl-lab/editorial-review-packet/1';
const conditions=[
  {id:'authorship',task:'Confirm manuscript authorship, affiliations, contributions and shader copyright/permissions'},
  {id:'primary_sources',task:'Read and independently check each cited primary source and its exact supporting passages'},
  {id:'literature',task:'Expand directly relevant shader-language, procedural-graphics and reproducibility related work'},
  {id:'experimental_design',task:'Assess independent experimental units, counterbalancing, carryover effects and controls'},
  {id:'calibration',task:'Check GPU, driver, browser versions, color encoding, precision and repeatability on known devices'},
  {id:'statistics',task:'Review variance assumptions, uncertainty reporting and permissible interpretations'},
  {id:'figures',task:'Verify every PDF figure, labels, placement, caption and PNG SHA-256 against source data'},
  {id:'publication_format',task:'Inspect exported PDF page-by-page for glyph fidelity, layout, citations and journal requirements'},
  {id:'reproducibility',task:'Independently run the archive verifier on another machine and preserve verification logs'},
  {id:'novelty',task:'Evaluate originality against the primary literature; do not assume a new graphics result'},
  {id:'independent_signoff',task:'Obtain attributable independent human editorial/scientific review and publication authorization'}
];
export async function prepareEditorialPacket(bundle,{subtle=globalThis.crypto?.subtle,
  clock=()=>new Date().toISOString()}={}){
  await verifyManuscript(bundle,subtle);
  const checkedAt=clock();
  if(typeof checkedAt!=='string'||!checkedAt.endsWith('Z')||Number.isNaN(Date.parse(checkedAt)))
    throw new TypeError('Review record requires an explicit UTC timestamp');
  const cited=new Set(bundle.record.citationIds);
  const sources=REFERENCES.map(ref=>({
    id:ref.id,title:ref.title,year:ref.year,
    url:ref.url,metadataSource:ref.metadataSource,
    applicableToManuscript:cited.has(ref.id),
    metadataStatus:ref.status,
    primaryFullTextReviewed:false,
    supportingPassagesReviewed:false,
    humanSourceReviewer:null,
    reviewStatus:'pending'
  }));
  const record={
    schema:REVIEW_SCHEMA,manuscriptSha256:bundle.record.sha256,
    studySha256:bundle.study.sha256,auditSha256:bundle.audit.sha256,
    status:'NOT_SUBMITTED_FOR_REVIEW',humanReviewComplete:false,
    reviewerName:null,reviewerInstitution:null,independentAssessment:null,
    publicationAuthorized:false,
    criteria:conditions.map(c=>({...c,status:'pending',reviewer:null,reviewNotes:null})),
    bibliography:sources,
    note:'Machine-generated review plan, not a signed evaluation. All criteria require attributable independent human assessment.'
  };
  return {...record,sha256:await sha256Hex(canonicalJson(record),subtle),createdAt:checkedAt};
}
export async function verifyEditorialPacket(packet,bundle,subtle=globalThis.crypto?.subtle){
  if(!packet||packet.schema!==REVIEW_SCHEMA)throw new TypeError('Invalid editorial review packet');
  const expected=await prepareEditorialPacket(bundle,{subtle,clock:()=>packet.createdAt});
  if(canonicalJson(expected)!==canonicalJson(packet))
    throw new TypeError('Review packet changed or falsely represents scientific clearance');
  return true;
}
