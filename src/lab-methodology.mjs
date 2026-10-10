// P4 preflight UI: reference custody + verified study methods report; not paper publishing.
import {REFERENCES,bibliographicReadiness,exportBibtex} from './reference-registry.mjs';
import {auditMethodology,verifyMethodologyAudit,bibliographyForAudit} from './methodology-audit.mjs';
const $=id=>document.getElementById(id);
let audit=null,study=null,busy=false;
window.glslLabAuditedStudy={
  current(){return audit&&study?{audit,study}:null;}
};
const notify=()=>window.dispatchEvent(new Event('glsl-lab-audit-updated'));
const state=(msg,error=false)=>{
  $('auditStatus').textContent=msg;$('auditStatus').dataset.error=String(error);
};
function dl(name,content,type){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
const summary=bibliographicReadiness();
$('referenceStatus').textContent=summary.verifiedCount+' metadata-checked sources; '+
  summary.pendingIds.length+' pending primary-source checks. External manuscript review has not occurred.';
for(const ref of REFERENCES){
  const outer=document.createElement('div');outer.className='audit-source';
  const strong=document.createElement('strong');strong.textContent=ref.title+' ('+ref.year+')';
  const link=document.createElement('a');link.href=ref.metadataSource;
  link.target='_blank';link.rel='noopener noreferrer';
  link.textContent=ref.authors.join(', ');
  const kind=document.createElement('small');
  kind.textContent=ref.type+' · '+(ref.status==='metadata_verified'?'Metadata checked':'Citation quarantined')+
    ' · '+ref.note;
  outer.append(strong,link,kind);$('referenceList').append(outer);
}
$('auditBibtex').addEventListener('click',()=>{
  try{
    dl('glsl-lab-metadata-checked.bib',exportBibtex(),
      'application/x-bibtex;charset=utf-8');
    state('Exported sources with verified metadata and applicable claim scopes. Pending entries excluded.');
  }catch(e){state('Bibliography export rejected: '+String(e.message||e),true);}
});
async function verifyAndDisplay(candidate){
  const result=await auditMethodology(candidate);
  await verifyMethodologyAudit(result,candidate);
  const b=bibliographyForAudit(result);
  study=candidate;audit=result;
  $('auditResults').textContent=[
    'Original experiment SHA-256: '+result.experimentSha256,
    'Methodology report SHA-256: '+result.sha256,
    'Observed GPU draws: '+result.measurements.observedGpuDraws,
    'Draws per treatment: '+result.measurements.observedDrawsPerTreatment,
    'Bibliographic basis: '+b.references.length+' applicable metadata-checked sources',
    ...result.findings.map(x=>x.code+' ['+x.status+']: '+x.detail),
    'Academic manuscript gate: LOCKED',
    ...result.release.reasons.map(x=>'- '+x)
  ].join('\n');
  $('auditExport').disabled=false;
  notify();
  state('Experiment and methodology findings independently recomputed from archived bytes. No publication authorization granted.');
}
$('auditCurrentStudy').addEventListener('click',async()=>{
  if(busy||!window.glslLabLatestExperiment)return;
  busy=true;$('auditCurrentStudy').disabled=true;
  state('Verifying the current GPU study and its source evidence.');
  try{
    await verifyAndDisplay(window.glslLabLatestExperiment);
    state('Study audit complete. Generate the manuscript from the verified evidence.');
  }catch(error){
    audit=null;study=null;$('auditExport').disabled=true;notify();
    state('Audit rejected: '+String(error.message||error),true);
  }finally{
    busy=false;$('auditCurrentStudy').disabled=!window.glslLabLatestExperiment;
  }
});
window.addEventListener('glsl-lab-study-ready',()=>{
 $('auditCurrentStudy').disabled=false;
});
$('auditStudyImport').addEventListener('change',async event=>{
  if(busy)return;const file=event.target.files?.[0];if(!file)return;
  busy=true;$('auditExport').disabled=true;state('Verifying source hashes and recomputing study metrics.');
  try{
    if(file.size>28000000)throw new Error('Research study JSON exceeds 28 MB');
    const candidate=JSON.parse(await file.text());
    await verifyAndDisplay(candidate);
  }catch(e){
    audit=null;study=null;$('auditExport').disabled=true;
    notify();
    $('auditResults').textContent='No accepted methodology audit. Manuscript gate remains locked.';
    state('Audit rejected: '+String(e.message||e),true);
  }finally{busy=false;event.target.value='';}
});
$('auditExport').addEventListener('click',async()=>{
  if(!audit||!study||busy)return;
  busy=true;$('auditExport').disabled=true;
  try{
    await verifyMethodologyAudit(audit,study);
    const basis=bibliographyForAudit(audit);
    dl('glsl-methodology-'+audit.experimentSha256.slice(0,12)+'.json',
      JSON.stringify({schema:'glsl-lab/methodology-bundle/1',
        report:audit,references:basis.references,bibtex:basis.bibtex},null,2)+'\n',
      'application/json;charset=utf-8');
    state('Exported hash-verified methodology audit and scoped bibliography. Academic paper remains locked.');
  }catch(e){state('Methodology export rejected: '+String(e.message||e),true);}
  finally{busy=false;$('auditExport').disabled=!audit;}
});
state('Bibliography metadata loaded. Import an experiment JSON for a reproducible methods audit.');
