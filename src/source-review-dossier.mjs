// P7 reviewer-DECLARED source assessment notes. No authentication or peer-review approval.
// A dossier is separate from the frozen manuscript archive and cannot mutate its release gate.
import {canonicalJson,sha256Hex} from './build-evidence.mjs';
import {REVIEW_SCHEMA} from './scholarly-review.mjs';
import {REFERENCES} from './reference-registry.mjs';
export const SOURCE_REVIEW_SCHEMA='glsl-lab/source-review-dossier/1';
export const REVIEW_DISPOSITIONS=Object.freeze([
  'supports_limited_claim','requires_revision','contradicts_claim'
]);
const fail=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,fields)=>obj(v)&&Object.keys(v).sort().join(',')===fields.slice().sort().join(',');
const hex=/^[a-f0-9]{64}$/;
const UTC=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const fields=['entryId','referenceId','claim','locator','sourceUrl','assessment','note','reviewerDeclaredName','checkedAt'];
async function checkPacket(packet,subtle){
  fail(obj(packet)&&packet.schema===REVIEW_SCHEMA&&hex.test(packet.sha256)&&UTC(packet.createdAt),
    'A complete unsigned original editorial packet is required');
  const {sha256,createdAt,...body}=packet;
  fail(await sha256Hex(canonicalJson(body),subtle)===sha256,
    'Editorial packet evidence hash mismatch');
  fail(packet.status==='NOT_SUBMITTED_FOR_REVIEW'&&packet.humanReviewComplete===false&&
    packet.publicationAuthorized===false&&packet.reviewerName===null&&
    packet.reviewerInstitution===null&&packet.independentAssessment===null,
    'The editorial packet must not claim scholarly authorization');
  fail(hex.test(packet.manuscriptSha256)&&hex.test(packet.studySha256)&&hex.test(packet.auditSha256),
    'Editorial source linkage missing');
  fail(Array.isArray(packet.criteria)&&packet.criteria.length>=10&&
    packet.criteria.every(c=>obj(c)&&c.status==='pending'&&c.reviewer===null&&c.reviewNotes===null),
    'Original independent-review criteria must remain pending');
  fail(Array.isArray(packet.bibliography)&&packet.bibliography.length===REFERENCES.length,
    'Editorial source list incomplete');
  const lookup=new Map(REFERENCES.map(r=>[r.id,r]));
  const seen=new Set();
  for(const p of packet.bibliography){
    const source=lookup.get(p.id);
    fail(source&&!seen.has(p.id)&&p.title===source.title&&p.year===source.year&&
      p.url===source.url&&p.metadataSource===source.metadataSource&&
      p.metadataStatus===source.status&&
      p.applicableToManuscript===['khronos-glsl-es300','khronos-webgl2','sacks1989'].includes(p.id)&&
      p.primaryFullTextReviewed===false&&p.supportingPassagesReviewed===false&&
      p.humanSourceReviewer===null&&p.reviewStatus==='pending',
      'Original bibliography cannot be silently altered or approved');
    seen.add(p.id);
  }
  return true;
}
export async function verifyUnsignedEditorialPacket(packet,subtle=globalThis.crypto?.subtle){
  return checkPacket(packet,subtle);
}
function checkEntry(v,cited){
  fail(exact(v,fields),'Unexpected source review fields');
  fail(typeof v.entryId==='string'&&/^[0-9a-z_-]{8,80}$/i.test(v.entryId),
    'Unsafe reviewer entry identifier');
  fail(cited.has(v.referenceId),'Review entry must refer to a citation in the manuscript');
  for(const [name,min,max] of [['claim',12,700],['locator',3,240],['note',20,2400],['reviewerDeclaredName',2,160]]){
    fail(typeof v[name]==='string'&&v[name].trim().length>=min&&v[name].length<=max,
      'Missing or oversized reviewer statement: '+name);
  }
  fail(REVIEW_DISPOSITIONS.includes(v.assessment),'Unsupported source assessment');
  fail(typeof v.sourceUrl==='string'&&v.sourceUrl.length<1200&&v.sourceUrl.startsWith('https://'),
    'Review source URL must use HTTPS');
  const u=new URL(v.sourceUrl);
  fail(u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password,
    'Invalid source URL');
  fail(UTC(v.checkedAt),'An explicit UTC evidence-reading time is required');
}
export async function createSourceReviewDossier(packet,entries,{
  subtle=globalThis.crypto?.subtle,clock=()=>new Date().toISOString()
}={}){
  fail(subtle&&typeof subtle.digest==='function','Web Crypto required');
  await checkPacket(packet,subtle);
  fail(Array.isArray(entries)&&entries.length>0&&entries.length<=60,
    '1 to 60 explicit reviewer source assessments required');
  const cited=new Set(packet.bibliography.filter(p=>p.applicableToManuscript).map(p=>p.id));
  const seen=new Set();
  for(const entry of entries){
    checkEntry(entry,cited);
    fail(!seen.has(entry.entryId),'Duplicate reviewer evidence entry identifier');
    seen.add(entry.entryId);
  }
  const now=clock();fail(UTC(now),'Dossier export requires UTC time');
  const observations=entries.map(x=>({...x}));
  const reviewedIds=[...new Set(observations.map(v=>v.referenceId))].sort();
  const body={
    schema:SOURCE_REVIEW_SCHEMA,editorialPacketSha256:packet.sha256,
    manuscriptSha256:packet.manuscriptSha256,studySha256:packet.studySha256,
    auditSha256:packet.auditSha256,
    assessments:observations,reviewedCitationIds:reviewedIds,
    assessmentCount:observations.length,citedSourceCount:cited.size,
    status:'REVIEWER_DECLARATIONS_UNAUTHENTICATED',
    independentPeerReviewEstablished:false,
    publicationAuthorized:false,
    warning:'Reviewer names, source-reading actions and interpretations are user-supplied claims. This file does not authenticate an individual, verify the actual full text, or authorize publication.'
  };
  return {...body,sha256:await sha256Hex(canonicalJson(body),subtle),createdAt:now};
}
export async function verifySourceReviewDossier(dossier,packet,subtle=globalThis.crypto?.subtle){
  fail(obj(dossier)&&dossier.schema===SOURCE_REVIEW_SCHEMA&&hex.test(dossier.sha256)&&
    UTC(dossier.createdAt),'Unsupported source assessment dossier');
  const reconstructed=await createSourceReviewDossier(packet,dossier.assessments,{
    subtle,clock:()=>dossier.createdAt
  });
  fail(canonicalJson(reconstructed)===canonicalJson(dossier),
    'Source-review dossier or manuscript linkage is altered');
  return {
    verdict:'INTEGRITY_ONLY',
    reviewedCitationIds:dossier.reviewedCitationIds,
    assessmentCount:dossier.assessmentCount,
    unreviewedCitationIds:packet.bibliography.filter(p=>
      p.applicableToManuscript&&!dossier.reviewedCitationIds.includes(p.id)).map(p=>p.id),
    authenticatedHumanReview:false,publicationAuthorized:false
  };
}
export function parseSourceReviewJson(text){
  fail(typeof text==='string'&&text.length>0&&text.length<=350000,
    'Review dossier exceeds the 350 KB import limit');
  return JSON.parse(text);
}
