// User-declared scholarly source notes, separately exported from immutable manuscript evidence.
import {verifyUnsignedEditorialPacket,createSourceReviewDossier,verifySourceReviewDossier,parseSourceReviewJson} from './source-review-dossier.mjs';
import {createClaimCrosswalk,verifyClaimCrosswalk} from './source-claim-crosswalk.mjs';
const $=id=>document.getElementById(id);
const editable=['sourceReviewCitation','sourceReviewReader','sourceReviewDisposition','sourceReviewLocator','sourceReviewClaim','sourceReviewNote','sourceReviewImport'];
let packet=null,notes=[],dossier=null,crosswalk=null,busy=false;
const say=(text,error=false)=>{$('sourceReviewStatus').textContent=text;$('sourceReviewStatus').dataset.error=String(error);};
function controls(){
 for(const key of editable)$(key).disabled=busy||!packet;
 $('sourceReviewPacket').disabled=busy;
 $('sourceReviewAdd').disabled=busy||!packet;
 $('sourceReviewExport').disabled=busy||!dossier;
 $('sourceCrosswalkExport').disabled=busy||!crosswalk;
}
function render(){
 $('sourceReviewSummary').textContent=dossier?
 'SOURCE-READING NOTES (self-reported)\nManuscript SHA-256: '+dossier.manuscriptSha256+
 '\nDossier SHA-256: '+dossier.sha256+
 '\n'+dossier.assessmentCount+' assessments across '+dossier.reviewedCitationIds.length+
 ' of '+dossier.citedSourceCount+' cited sources\n'+
 dossier.assessments.map((r,i)=>(i+1)+'. '+r.referenceId+' ['+r.assessment+'] '+r.locator+' — '+r.note).join('\n')+
 '':
 'No source-reading assessments recorded.';
}
function showCrosswalk(){
 const target=$('sourceClaimCrosswalk');
 if(!crosswalk){target.textContent='No claim-level crosswalk yet. Add or import reader-declared source notes.';return;}
 target.textContent=[
  'SOURCE-CLAIM COVERAGE',
  crosswalk.summary.sourceCoverageOnly+' cited sources have at least one recorded reading',
  'Conflicting declarations: '+crosswalk.summary.claimsWithConflictingDeclarations,
  'Declared contradictions: '+crosswalk.summary.claimsWithContradictions,
  'Claims requiring revision: '+crosswalk.summary.claimsRequiringRevision,
  ...crosswalk.sourceReviewRows.map(row=>row.referenceId+
    ' ['+row.coverage+'] '+row.assessmentCount+' notes across '+row.distinctClaims+' distinct claims'+
    (row.claims.length?'\n'+row.claims.map(c=>'    '+c.status+': '+c.claim).join('\n'):''))
 ].join('\n');
}
function download(name,data){
 const u=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),30000);
}
$('sourceReviewPacket').addEventListener('change',async e=>{
 if(busy)return;const file=e.target.files?.[0];if(!file)return;
 busy=true;controls();say('Checking original manuscript and unsigned-review linkage.');
 try{
  if(file.size>500000)throw new Error('Review packet exceeds 500 KB');
  const candidate=JSON.parse(await file.text());
  await verifyUnsignedEditorialPacket(candidate);
  packet=candidate;notes=[];dossier=null;crosswalk=null;
  const select=$('sourceReviewCitation');select.replaceChildren();
  for(const r of candidate.bibliography.filter(x=>x.applicableToManuscript)){
   const option=document.createElement('option');option.value=r.id;
   option.textContent=r.title+' ('+r.year+')';select.append(option);
  }
  render();showCrosswalk();say('Original unsigned packet verified. Record your source-specific reading.');
 }catch(error){packet=null;notes=[];dossier=null;crosswalk=null;render();showCrosswalk();say('Packet rejected: '+String(error.message||error),true);}
 finally{busy=false;e.target.value='';controls();}
});
$('sourceReviewAdd').addEventListener('click',async()=>{
 if(busy||!packet)return;busy=true;controls();
 try{
  const source=packet.bibliography.find(r=>r.id===$('sourceReviewCitation').value);
  if(!source)throw new Error('Choose a cited source');
  const note={
   entryId:crypto.randomUUID(),referenceId:source.id,
   claim:$('sourceReviewClaim').value.trim(),locator:$('sourceReviewLocator').value.trim(),
   sourceUrl:source.url,assessment:$('sourceReviewDisposition').value,
   note:$('sourceReviewNote').value.trim(),reviewerDeclaredName:$('sourceReviewReader').value.trim(),
   checkedAt:new Date().toISOString()
  };
  const result=await createSourceReviewDossier(packet,[...notes,note]);
  const report=await createClaimCrosswalk(packet,result);
  notes=result.assessments;dossier=result;crosswalk=report;
  for(const key of ['sourceReviewClaim','sourceReviewLocator','sourceReviewNote'])$(key).value='';
  render();showCrosswalk();say('Source reading saved with an integrity receipt.');
 }catch(error){say('Assessment rejected: '+String(error.message||error),true);}
 finally{busy=false;controls();}
});
$('sourceReviewExport').addEventListener('click',async()=>{
 if(!dossier||!packet||busy)return;busy=true;controls();
 try{
  await verifySourceReviewDossier(dossier,packet);
  download('glsl-source-review-'+dossier.manuscriptSha256.slice(0,12)+'.json',
   JSON.stringify(dossier,null,2)+'\n');
  say('Exported hash-linked, unsigned source-reading dossier.');
 }catch(error){say('Export rejected: '+String(error.message||error),true);}
 finally{busy=false;controls();}
});
$('sourceCrosswalkExport').addEventListener('click',async()=>{
 if(!crosswalk||!packet||!dossier||busy)return;
 busy=true;controls();
 try{
  await verifyClaimCrosswalk(crosswalk,packet,dossier);
  download('glsl-claim-crosswalk-'+crosswalk.manuscriptSha256.slice(0,12)+'.json',
    JSON.stringify(crosswalk,null,2)+'\n');
  say('Exported source coverage and unresolved reader disagreements; no peer-review claim.');
 }catch(error){say('Crosswalk export rejected: '+String(error.message||error),true);}
 finally{busy=false;controls();}
});
$('sourceReviewImport').addEventListener('change',async e=>{
 if(busy||!packet)return;const file=e.target.files?.[0];if(!file)return;
 busy=true;controls();
 try{
  if(file.size>350000)throw new Error('Review dossier exceeds 350 KB');
  const candidate=parseSourceReviewJson(await file.text());
  const result=await verifySourceReviewDossier(candidate,packet);
  const report=await createClaimCrosswalk(packet,candidate);
  notes=candidate.assessments.map(x=>({...x}));dossier=candidate;crosswalk=report;render();showCrosswalk();
  say('Dossier content verified: '+result.assessmentCount+' reviewer-declared entries, no independent authentication.');
 }catch(error){notes=[];dossier=null;crosswalk=null;render();showCrosswalk();say('Dossier rejected: '+String(error.message||error),true);}
 finally{busy=false;e.target.value='';controls();}
});
controls();render();showCrosswalk();say('Import a frozen unsigned review packet to begin source-specific research notes.');
