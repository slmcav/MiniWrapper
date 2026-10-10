// User-declared scholarly source notes, separately exported from immutable manuscript evidence.
import {verifyUnsignedEditorialPacket,createSourceReviewDossier,verifySourceReviewDossier,parseSourceReviewJson} from './source-review-dossier.mjs';
const $=id=>document.getElementById(id);
const editable=['sourceReviewCitation','sourceReviewReader','sourceReviewDisposition','sourceReviewLocator','sourceReviewClaim','sourceReviewNote','sourceReviewImport'];
let packet=null,notes=[],dossier=null,busy=false;
const say=(text,error=false)=>{$('sourceReviewStatus').textContent=text;$('sourceReviewStatus').dataset.error=String(error);};
function controls(){
 for(const key of editable)$(key).disabled=busy||!packet;
 $('sourceReviewPacket').disabled=busy;
 $('sourceReviewAdd').disabled=busy||!packet;
 $('sourceReviewExport').disabled=busy||!dossier;
}
function render(){
 $('sourceReviewSummary').textContent=dossier?
 'REVIEWER-DECLARED NOTES (identity not verified)\nManuscript SHA-256: '+dossier.manuscriptSha256+
 '\nDossier SHA-256: '+dossier.sha256+
 '\n'+dossier.assessmentCount+' assessments across '+dossier.reviewedCitationIds.length+
 ' of '+dossier.citedSourceCount+' cited sources\n'+
 dossier.assessments.map((r,i)=>(i+1)+'. '+r.referenceId+' ['+r.assessment+'] '+r.locator+' — '+r.note).join('\n')+
 '\nIndependent peer review and publication approval: NOT ESTABLISHED':
 'No recorded source-reading assessments. Scholarly approval remains locked.';
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
  packet=candidate;notes=[];dossier=null;
  const select=$('sourceReviewCitation');select.replaceChildren();
  for(const r of candidate.bibliography.filter(x=>x.applicableToManuscript)){
   const option=document.createElement('option');option.value=r.id;
   option.textContent=r.title+' ('+r.year+')';select.append(option);
  }
  render();say('Original unsigned packet verified. Record your source-specific reading.');
 }catch(error){packet=null;notes=[];dossier=null;render();say('Packet rejected: '+String(error.message||error),true);}
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
  notes=result.assessments;dossier=result;
  for(const key of ['sourceReviewClaim','sourceReviewLocator','sourceReviewNote'])$(key).value='';
  render();say('Source note recorded. Authorship and reviewer identity remain unverified.');
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
$('sourceReviewImport').addEventListener('change',async e=>{
 if(busy||!packet)return;const file=e.target.files?.[0];if(!file)return;
 busy=true;controls();
 try{
  if(file.size>350000)throw new Error('Review dossier exceeds 350 KB');
  const candidate=parseSourceReviewJson(await file.text());
  const result=await verifySourceReviewDossier(candidate,packet);
  notes=candidate.assessments.map(x=>({...x}));dossier=candidate;render();
  say('Dossier content verified: '+result.assessmentCount+' reviewer-declared entries, no independent authentication.');
 }catch(error){say('Dossier rejected: '+String(error.message||error),true);}
 finally{busy=false;e.target.value='';controls();}
});
controls();render();say('Import a frozen unsigned review packet to begin source-specific research notes.');
