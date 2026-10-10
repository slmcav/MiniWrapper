// Evidence-driven research draft preparation: no claims of publication or peer review.
import {canonicalJson,sha256Hex} from './build-evidence.mjs';
import {auditMethodology,verifyMethodologyAudit,bibliographyForAudit} from './methodology-audit.mjs';
import {createFigureEvidence} from './research-figures.mjs';
export const MANUSCRIPT_SCHEMA='glsl-lab/manuscript-draft/1';
const need=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
function decode(s){
  need(typeof s==='string'&&s.length>0&&s.length<=24000000,'Invalid archived RGBA bytes');
  return Uint8Array.from(atob(s),c=>c.charCodeAt(0));
}
export function manuscriptRows(study){
  const repeated=study.schema==='glsl-lab/replicated-session/1';
  const protocol=repeated?study.protocol.sweep:study.protocol;
  return protocol.levels.map((value,index)=>{
    const observations=study.trials.map((trial,i)=>({trial,i}))
      .filter(({trial,i})=>repeated?trial.levelIndex===index:i===index);
    need(observations.length===(repeated?3:1),'Unsupported observation count');
    const means=observations.map(({trial})=>trial.figure.fullFrameMetrics.meanLuma8);
    const n=means.length,mean=means.reduce((a,b)=>a+b,0)/n;
    const stdev=n>1?Math.sqrt(means.reduce((a,v)=>a+(v-mean)**2,0)/(n-1)):null;
    return {index,value,n,meanLuma8:mean,stdevLuma8:stdev,
      minLuma8:Math.min(...means),maxLuma8:Math.max(...means),
      firstTrialIndex:observations[0].i};
  });
}
export async function assembleManuscript(study,{
  audit,clock=()=>new Date().toISOString(),subtle=globalThis.crypto?.subtle
}={}){
  need(subtle&&typeof subtle.digest==='function','Web Crypto required');
  const reviewed=audit||await auditMethodology(study,{clock,subtle});
  await verifyMethodologyAudit(reviewed,study,subtle);
  need(reviewed.release.academicManuscriptUnlocked===false&&reviewed.release.descriptiveReportSupported===true,
    'Only verified descriptive drafts are permitted');
  const repeated=study.schema==='glsl-lab/replicated-session/1';
  const protocol=repeated?study.protocol.sweep:study.protocol;
  const bib=bibliographyForAudit(reviewed);
  const ids=['khronos-glsl-es300','khronos-webgl2','sacks1989'];
  const references=ids.map(id=>bib.references.find(ref=>ref.id===id));
  need(references.every(Boolean),'Essential scoped bibliography is missing');
  const rows=manuscriptRows(study);
  const figures=[];
  for(let i=0;i<study.trials.length;i++){
    const t=study.trials[i];
    const reconstructed=await createFigureEvidence(t.receipt,t.capture,decode(t.rgbaBase64),{
      subtle,clock:()=>t.figure.capturedAt,
      ...(t.figure.drawSequence===undefined?{}:{drawSequence:t.figure.drawSequence})
    });
    need(canonicalJson(reconstructed.record)===canonicalJson(t.figure),
      'Manuscript figure no longer matches its archived source');
    figures.push({png:reconstructed.png,record:reconstructed.record,
      path:'figures/frame-'+String(i+1).padStart(2,'0')+'.png'});
  }
  const generatedAt=clock();
  need(typeof generatedAt==='string'&&generatedAt.endsWith('Z')&&Number.isFinite(Date.parse(generatedAt)),
    'Manuscript timestamp must be UTC');
  const record={
    schema:MANUSCRIPT_SCHEMA,
    publicationStatus:'UNREVIEWED TECHNICAL RESEARCH DRAFT — NOT A PEER-REVIEWED PUBLICATION',
    title:'A Reproducible Descriptive Study of WebGL2 Fragment-Shader Output Under Controlled Uniform Variation',
    authorship:'Author and affiliation not supplied',
    studySha256:study.sha256,auditSha256:reviewed.sha256,
    sourceSchema:study.schema,sourceReceiptSha256:study.trials[0].receipt.sha256,
    shaderIdentifier:study.trials[0].receipt.shader.identifier,
    shaderAttribution:study.trials[0].receipt.shader.attribution,
    parameter:protocol.parameter,levels:protocol.levels,
    shaderTimeSeconds:protocol.shaderTimeSeconds,
    viewport:study.trials[0].receipt.viewport,
    treatments:rows,observedDraws:study.trials.length,
    drawsPerTreatment:repeated?3:1,
    orderDescription:repeated?
      'Cyclic positional counterbalancing in three blocks, without randomization':
      'Three sequential ascending treatment values without counterbalancing',
    figureSelectionRule:'Earliest archived observation per treatment level, not a visually selected result',
    citationIds:ids,
    claimLimits:[
      'Recorded GPU draws are not established as statistically independent experimental replications.',
      'Reported WebGL capability strings do not verify GPU or driver equivalence.',
      'No causal attribution, inferential significance, performance benchmark, or research novelty is established.',
      'Bibliographic metadata checks do not constitute a complete scholarly literature review.',
      'No authorship, external peer review or publication authorization is asserted.'
    ],
    release:{descriptiveDraftOnly:true,academicManuscriptUnlocked:false}
  };
  return {
    record:{...record,sha256:await sha256Hex(canonicalJson(record),subtle),generatedAt},
    figures,study,audit:reviewed,references,bibtex:bib.bibtex,shader:study.trials[0].receipt.shader.body
  };
}
export async function verifyManuscript(bundle,subtle=globalThis.crypto?.subtle){
  need(bundle?.record?.schema===MANUSCRIPT_SCHEMA,'Manuscript schema not recognized');
  const rebuilt=await assembleManuscript(bundle.study,{
    audit:bundle.audit,clock:()=>bundle.record.generatedAt,subtle
  });
  need(canonicalJson(rebuilt.record)===canonicalJson(bundle.record),
    'Manuscript text and evidence record do not reproduce');
  need(bundle.figures?.length===rebuilt.figures.length,'Manuscript figure count changed');
  for(let i=0;i<rebuilt.figures.length;i++){
    need(canonicalJson(rebuilt.figures[i].record)===canonicalJson(bundle.figures[i].record),
      'Manuscript figure metadata altered');
    const a=rebuilt.figures[i].png,b=bundle.figures[i].png;
    need(b instanceof Uint8Array&&a.length===b.length&&a.every((value,j)=>value===b[j]),
      'Manuscript PNG bytes altered');
  }
  return true;
}
