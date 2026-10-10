import {createBuildReceipt,verifyBuildReceipt} from './build-evidence.mjs';
import {createProject,saveProject,listProjects,importProject,exportProject,saveReceipt,listReceipts} from './project-store.mjs';

const $=id=>document.getElementById(id);
const bridge=window.glslLabBridge;
if(!bridge)throw new Error('WebGL validation bridge is unavailable');
const storage=window.localStorage;
let project=null,receipt=null,valid=false;
const note=(text,error=false)=>{$('projectStatus').textContent=text;$('projectStatus').dataset.error=String(error);};
function download(filename,body){
  const blob=new Blob([body],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function refresh(){
  const projects=listProjects(storage),select=$('projectPicker');
  select.replaceChildren();
  const empty=document.createElement('option');
  empty.value='';empty.textContent='Select saved project';select.appendChild(empty);
  for(const p of projects){
    const option=document.createElement('option');
    option.value=p.id;option.textContent=p.name+' · '+p.demoId;select.appendChild(option);
  }
  if(project)select.value=project.id;
  return projects;
}
bridge.onValidationChange(ok=>{
  valid=ok;$('saveBuild').disabled=!ok;
  $('buildState').textContent=ok?'Build verified: WebGL2 compile, link and draw passed.':'Build pending: waiting for verified WebGL2 output.';
});
$('generatePaper').disabled=true;
$('generatePaper').title='Paper generation awaits research capture and bibliography gates (P3/P4).';
$('saveBuild').addEventListener('click',async()=>{
  if(!valid)return;
  $('saveBuild').disabled=true;
  try{
    const snap=bridge.capture();
    const result=await createBuildReceipt(snap);
    await saveReceipt(result,storage);
    await verifyBuildReceipt(result);
    receipt=result;$('exportBuild').disabled=false;
    $('receiptInfo').textContent='Saved SHA-256 '+receipt.sha256.slice(0,20)+'…';
    if(project){
      project=createProject({id:project.id,name:project.name,createdAt:project.createdAt,
        demoId:snap.demoId,parameters:snap.parameters,
        graph:snap.demoId==='builder'?bridge.getProjectState().graph:undefined,
        buildIds:[...new Set([...project.buildIds,result.sha256])]});
      saveProject(project,storage);refresh();
    }
    note('Verified build saved locally. Export the JSON for archival use.');
  }catch(e){note('Build not saved: '+String(e.message||e),true);}
  finally{$('saveBuild').disabled=!valid;}
});
$('exportBuild').addEventListener('click',async()=>{
  if(!receipt)return;
  try{await verifyBuildReceipt(receipt);
    download('glsl-build-'+receipt.sha256.slice(0,12)+'.json',JSON.stringify(receipt,null,2)+'\n');
    note('Last verified build exported.');
  }catch(e){note('Build export blocked: '+String(e.message||e),true);}
});
$('saveProject').addEventListener('click',()=>{
  try{
    const state=bridge.getProjectState();
    project=createProject({id:project?.id,createdAt:project?.createdAt,
      name:$('projectName').value.trim(),demoId:state.demoId,parameters:state.parameters,
      graph:state.graph,buildIds:project?.buildIds||[]});
    saveProject(project,storage);refresh();note('Project saved: '+project.name);
  }catch(e){note('Project save failed: '+String(e.message||e),true);}
});
$('projectPicker').addEventListener('change',()=>{
  if(!$('projectPicker').value)return;
  try{
    project=listProjects(storage).find(x=>x.id===$('projectPicker').value);
    if(!project)throw new Error('Project missing');
    $('projectName').value=project.name;
    bridge.applyProject(project);note('Project loaded; verifying a new rendered frame.');
  }catch(e){note('Load failed: '+String(e.message||e),true);}
});
$('exportProject').addEventListener('click',()=>{
  try{if(!project)throw new Error('Save the project before exporting');
    download('glsl-project-'+project.id+'.json',exportProject(project));
    note('Project JSON exported.');
  }catch(e){note('Export failed: '+String(e.message||e),true);}
});
$('importProject').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>100000)throw new Error('Project JSON exceeds 100 KB');
    project=importProject(await file.text(),{storage});
    $('projectName').value=project.name;refresh();bridge.applyProject(project);
    note('Imported project under a new local identifier.');
  }catch(e){note('Import rejected: '+String(e.message||e),true);}
  finally{event.target.value='';}
});
try{
  const projects=refresh(),receipts=await listReceipts(storage);
  $('receiptInfo').textContent=receipts.length+' stored verified build receipts';
  note(projects.length+' local projects · '+receipts.length+' saved builds');
}catch(e){note('Local storage failed validation; no records overwritten. '+String(e.message||e),true);}
