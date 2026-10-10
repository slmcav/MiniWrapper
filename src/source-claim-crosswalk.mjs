// P7 claim-level coverage and conflicting reader declarations.
// This is a deterministic assessment inventory, NOT automated fact checking.
import {canonicalJson,sha256Hex} from './build-evidence.mjs';
import {verifyUnsignedEditorialPacket,verifySourceReviewDossier} from './source-review-dossier.mjs';
export const CLAIM_CROSSWALK_SCHEMA='glsl-lab/source-claim-crosswalk/1';
const requireOk=(condition,message)=>{if(!condition)throw new TypeError(message);};
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function conclusion(notes){
  if(notes.length===0)return 'no_assessment';
  const kinds=new Set(notes.map(n=>n.assessment));
  if(kinds.size>1)return 'conflicting_reader_declarations';
  if(kinds.has('contradicts_claim'))return 'declared_contradiction';
  if(kinds.has('requires_revision'))return 'revision_requested';
  return 'declared_limited_support';
}
export async function createClaimCrosswalk(packet,dossier,{
  subtle=globalThis.crypto?.subtle,clock=()=>new Date().toISOString()
}={}){
  requireOk(subtle&&typeof subtle.digest==='function','Web Crypto required for claim crosswalk');
  await verifyUnsignedEditorialPacket(packet,subtle);
  await verifySourceReviewDossier(dossier,packet,subtle);
  const checkedAt=clock();
  requireOk(typeof checkedAt==='string'&&checkedAt.endsWith('Z')&&
    Number.isFinite(Date.parse(checkedAt)),'Claim crosswalk requires UTC timestamp');
  const cited=packet.bibliography.filter(r=>r.applicableToManuscript);
  const rows=cited.map(source=>{
    const notes=dossier.assessments.filter(n=>n.referenceId===source.id);
    const group=new Map();
    for(const item of notes){
      // Do not group vaguely related claims by keywords or visual similarity.
      // Exact whitespace-normalized, case-sensitive claim text is the only grouping.
      const key=item.claim.trim().replace(/\s+/g,' ');
      if(!group.has(key))group.set(key,[]);
      group.get(key).push(item);
    }
    const claims=[...group].map(([claim,items])=>({
      claim,assessmentCount:items.length,
      assessmentEntryIds:items.map(x=>x.entryId),
      declaredReaders:[...new Set(items.map(x=>x.reviewerDeclaredName))].sort(),
      dispositions:[...new Set(items.map(x=>x.assessment))].sort(),
      status:conclusion(items),
      declaredPassageLocators:items.map(x=>x.locator)
    }));
    const statuses=new Set(claims.map(x=>x.status));
    let coverage='not_assessed';
    if(notes.length){
      coverage=statuses.has('conflicting_reader_declarations')?'conflicting_reader_declarations':
        statuses.has('declared_contradiction')?'declared_contradiction':
        statuses.has('revision_requested')?'revision_requested':
        'limited_support_declared';
    }
    return {
      referenceId:source.id,referenceTitle:source.title,
      citationMetadataStatus:source.metadataStatus,
      coverage,assessmentCount:notes.length,distinctClaims:claims.length,
      claims
    };
  });
  const summary={
    citedSources:cited.length,sourcesWithAssessments:rows.filter(r=>r.assessmentCount>0).length,
    sourceCoverageOnly:rows.filter(r=>r.assessmentCount>0).length+'/'+cited.length,
    claimsWithContradictions:rows.reduce((v,r)=>v+r.claims.filter(c=>
      c.status==='declared_contradiction').length,0),
    claimsWithConflictingDeclarations:rows.reduce((v,r)=>v+r.claims.filter(c=>
      c.status==='conflicting_reader_declarations').length,0),
    claimsRequiringRevision:rows.reduce((v,r)=>v+r.claims.filter(c=>
      c.status==='revision_requested').length,0)
  };
  const content={
    schema:CLAIM_CROSSWALK_SCHEMA,dossierSha256:dossier.sha256,
    originalPacketSha256:packet.sha256,
    manuscriptSha256:packet.manuscriptSha256,
    sourceReviewRows:rows,summary,
    status:'SOURCE_READING_INVENTORY_ONLY',
    independentHumanVerification:false,publicationAuthorized:false,
    notes:'Grouping is exact claim text only. These reader declarations are not authenticated, original passages have not been independently verified, and agreement among notes does not authorize publication.'
  };
  return {...content,sha256:await sha256Hex(canonicalJson(content),subtle),createdAt:checkedAt};
}
export async function verifyClaimCrosswalk(crosswalk,packet,dossier,subtle=globalThis.crypto?.subtle){
  requireOk(obj(crosswalk)&&crosswalk.schema===CLAIM_CROSSWALK_SCHEMA&&
    typeof crosswalk.sha256==='string'&&/^[a-f0-9]{64}$/.test(crosswalk.sha256),
    'Invalid claim crosswalk record');
  const rebuilt=await createClaimCrosswalk(packet,dossier,{
    subtle,clock:()=>crosswalk.createdAt
  });
  requireOk(canonicalJson(rebuilt)===canonicalJson(crosswalk),
    'Claim-level assessment crosswalk no longer reproduces from its cited source notes');
  return {verdict:'INTEGRITY_ONLY',...rebuilt.summary,publicationAuthorized:false};
}
