// P4 preflight: independently recompute experiment evidence and scope bibliography claims.
// This audit is mechanical, NOT independent scholarly peer review.
import {canonicalJson,sha256Hex} from './build-evidence.mjs';
import {verifySweepSession} from './research-experiments.mjs';
import {verifyReplicatedSession} from './research-replications.mjs';
import {REFERENCES,bibliographicReadiness,vettedReferences,exportBibtex} from './reference-registry.mjs';
export const METHOD_AUDIT_SCHEMA='glsl-lab/methodology-audit/1';
const need=(condition,message)=>{if(!condition)throw new TypeError(message);};
const UTC=x=>typeof x==='string'&&x.endsWith('Z')&&!Number.isNaN(Date.parse(x));
const BASIS=Object.freeze([
  {id:'language',kind:'technical',claim:'GLSL ES 3.00 language contract',referenceIds:['khronos-glsl-es300']},
  {id:'readback',kind:'technical',claim:'WebGL2 drawing-buffer readPixels contract',referenceIds:['khronos-webgl2']},
  {id:'experiment_design',kind:'method',claim:'Computer-experiment design and output sensitivity context',referenceIds:['sacks1989']}
]);
function findings(session){
  const replicated=session.schema==='glsl-lab/replicated-session/1';
  const observations=session.trials.length,levelCount=3;
  const treatmentCount=replicated?session.summary.length:session.protocol.levels.length;
  return [
    {code:'hash_provenance',status:'verified',detail:'Complete image pixels, samples, figures and build receipts were recomputed and matched immutable hashes'},
    {code:'condition_count',status:'observed',detail:observations+' GPU draw submissions across '+levelCount+' predetermined treatment levels'},
    {code:'shader_time',status:'observed',detail:'Fixed GLSL shader time specified in the authenticated experiment protocol'},
    {code:'experimental_order',status:'qualified',detail:replicated?'Cyclic positional counterbalancing across three blocks; not randomized':'Three sequential conditions; no order counterbalancing'},
    {code:'independent_replicates',status:'missing',detail:'Serial framebuffer draws are not established as independent experimental replications'},
    {code:'platform_calibration',status:'missing',detail:replicated?'Browser-reported WebGL capabilities supplied; actual GPU and driver equivalence not independently established':'Hardware capability envelope not included in three-condition study'},
    {code:'uncertainty_model',status:'missing',detail:replicated?'Within-treatment standard deviation describes three serial image observations; no inferential uncertainty model':'No within-condition replication or inferential uncertainty model'},
    {code:'peer_review',status:'missing',detail:'No independent scientific peer reviewer has signed the findings'},
    {code:'references',status:'qualified',detail:'Publisher/standards metadata reviewed; manuscript-level attribution and contextual suitability require human review'},
    {code:'novelty',status:'missing',detail:'No independently established novelty or prior-art comparison'}
  ];
}
export async function auditMethodology(session,{
  clock=()=>new Date().toISOString(),subtle=globalThis.crypto?.subtle
}={}){
  need(session&&typeof session==='object','Experiment JSON is required for evidence audit');
  const replicate=session.schema==='glsl-lab/replicated-session/1';
  const sweep=session.schema==='glsl-lab/sweep-session/1';
  need(replicate||sweep,'Unsupported experiment schema for manuscript audit');
  if(replicate)await verifyReplicatedSession(session,subtle);
  else await verifySweepSession(session,subtle);
  const refs=bibliographicReadiness();
  need(!refs.missingRequiredScopes.length,'Bibliography lacks essential technical or methodology references');
  const checkedAt=clock();need(UTC(checkedAt),'UTC audit timestamp required');
  const supported=BASIS.map(x=>({...x,claimClass:'verified_reference_metadata'}));
  const content={
    schema:METHOD_AUDIT_SCHEMA,sourceSchema:session.schema,
    experimentSha256:session.sha256,
    bibliographySha256:await sha256Hex(canonicalJson(REFERENCES),subtle),
    citationBasis:supported,findings:findings(session),
    measurements:{
      treatmentLevels:3,observedGpuDraws:session.trials.length,
      observedDrawsPerTreatment:replicate?3:1,
      platformCapabilitiesReported:replicate,
      randomized:false,independentReplicationsEstablished:false
    },
    release:{
      descriptiveReportSupported:true,
      academicManuscriptUnlocked:false,
      reasons:[
        'Independent manuscript bibliography and relevance sign-off not obtained',
        'Independent experimental replication and hardware calibration not established',
        'Statistical inference and novelty cannot be claimed from these observations',
        'Publication-format manuscript generator and external editorial review are not verified'
      ]
    },
    interpretation:'Hash-backed descriptive shader analysis only. This review is a programmatic methods screen, not peer review.',
    bibliographyPending:refs.pendingIds
  };
  return {...content,sha256:await sha256Hex(canonicalJson(content),subtle),checkedAt};
}
export async function verifyMethodologyAudit(audit,session,subtle=globalThis.crypto?.subtle){
  need(audit&&audit.schema===METHOD_AUDIT_SCHEMA,'Invalid methodology audit schema');
  const rebuilt=await auditMethodology(session,{subtle,clock:()=>audit.checkedAt});
  need(canonicalJson(rebuilt)===canonicalJson(audit),'Methodology audit no longer reproduces from experiment evidence');
  return true;
}
export function bibliographyForAudit(audit){
  need(audit?.schema===METHOD_AUDIT_SCHEMA&&audit?.release?.academicManuscriptUnlocked===false,
    'Only verified-gate bibliographies are exportable');
  const scope=['glsl_language','webgl_api','pixel_readback','experiment_design'];
  const references=vettedReferences(scope);
  const requiredIds=new Set(audit.citationBasis.flatMap(b=>b.referenceIds));
  need([...requiredIds].every(id=>references.some(ref=>ref.id===id)),
    'Citation basis has an unsupported bibliography claim');
  return {references,bibtex:exportBibtex(scope)};
}
