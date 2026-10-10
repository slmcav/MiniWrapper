// P3 nine-frame observed WebGL study runner and export/import controls.
import {createBuildReceipt} from './build-evidence.mjs';
import {createResearchCapture} from './research-capture.mjs';
import {createFigureEvidence} from './research-figures.mjs';
import {createReplicatedProtocol,createReplicatedSession,verifyReplicatedSession,compareReplicatedSessions,exportReplicatedZip,parseReplicatedJson} from './research-replications.mjs';
const $=id=>document.getElementById(id),bridge=window.glslLabBridge;
if(!bridge)throw new Error('WebGL2 study bridge unavailable');
const defaultStep={zoom:.2,angle:30,hue:45,brightness:.15};
let study=null,prior=null,comparison=null,busy=false,ready=false;
const msg=(text,error=false)=>{$('repeatStatus').textContent=text;$('repeatStatus').dataset.error=String(error);};
function controls(){
  $('repeatRun').disabled=busy||!ready;
  for(const key of ['repeatExportJson','repeatExportZip'])$(key).disabled=busy||!study;
  for(const key of ['repeatParameter','repeatStep','repeatTime','repeatPhase','repeatImport'])$(key).disabled=busy;
}
function show(){
  $('repeatPlatform').textContent=study?
    'WebGL '+study.platform.webglVersion+'; GLSL '+study.platform.shadingLanguageVersion+
    '\nBrowser-reported renderer '+study.platform.vendor+' / '+study.platform.renderer+
    '\nHighp '+study.platform.fragmentHighpPrecision+'; max texture '+study.platform.maxTextureSize+
    '; pixel ratio '+study.platform.devicePixelRatio:'Graphics platform capabilities not yet recorded.';
  $('repeatSummary').textContent=study?
    'Session '+study.sessionId+'\nObserved treatment order: '+
    study.protocol.sequence.map(slot=>study.protocol.sweep.levels[slot.levelIndex]).join(' → ')+
    '\n'+study.summary.map((r,i)=>'Level '+(i+1)+' ('+study.protocol.sweep.levels[i]+
    '): n='+r.observationCount+', mean encoded luma '+r.meanLuma8.toFixed(3)+
    ', sample SD '+r.sampleStdevLuma8.toFixed(3)+
    ', range '+r.minLuma8.toFixed(3)+'–'+r.maxLuma8.toFixed(3)).join('\n')
    :'No nine-frame study recorded.';
  $('repeatComparison').textContent=comparison?
    'Between-session descriptive differences\n'+comparison.differences.map(d=>
    'Level '+(d.levelIndex+1)+': Δ mean luma '+d.differenceMeanLuma8.toFixed(3)+
    ', SD '+d.previousSampleStdevLuma8.toFixed(3)+' → '+d.currentSampleStdevLuma8.toFixed(3)).join('\n')
    :prior?'Imported study verified; repeat its exact protocol for comparison.':
    'Import another archived session to compare.';
}
function download(name,data,mime){
  const url=URL.createObjectURL(new Blob([data],{type:mime}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function observe(){
  const p=createReplicatedProtocol(bridge.getProjectState().parameters,
    $('repeatParameter').value,Number($('repeatStep').value),
    Number($('repeatTime').value),Number($('repeatPhase').value));
  const platform=bridge.getGraphicsPlatform();
  // Capture all nine buffers synchronously before any async hashing or PNG work.
  const shots=p.sequence.map(slot=>bridge.renderSweepPoint({
    ...p.sweep.baseline,[p.sweep.parameter]:p.sweep.levels[slot.levelIndex]
  },p.sweep.shaderTimeSeconds));
  const figures=[];
  for(const shot of shots){
    const clock=()=>shot.observedAt;
    const receipt=await createBuildReceipt(shot.observation,{clock});
    const capture=await createResearchCapture(receipt,shot.pixels,{clock});
    const figure=await createFigureEvidence(receipt,capture,shot.pixels,{
      clock,drawSequence:shot.frameId
    });
    figures.push({...figure,receipt,capture});
  }
  return createReplicatedSession(p,figures,platform,{
    sessionId:crypto.randomUUID(),clock:()=>shots[0].observedAt
  });
}
$('repeatParameter').addEventListener('change',()=>{
  $('repeatStep').value=String(defaultStep[$('repeatParameter').value]);
});
bridge.onValidationChange(ok=>{ready=ok;controls();});
$('repeatRun').addEventListener('click',async()=>{
  if(busy||!ready)return;
  busy=true;controls();msg('Recording nine real GPU draws at fixed shader time.');
  try{
    const result=await observe();await verifyReplicatedSession(result);
    const matching=prior?await compareReplicatedSessions(prior,result):null;
    study=result;comparison=matching;show();
    msg(matching?'Nine-frame study verified and separate-session comparison calculated.':
      'Nine frames verified. Export the archive before reloading.');
  }catch(e){msg('Study rejected: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('repeatExportJson').addEventListener('click',async()=>{
  if(!study||busy)return;busy=true;controls();
  try{
    await verifyReplicatedSession(study);
    download('glsl-repeat-'+study.sessionId+'.json',
      JSON.stringify(study,null,2)+'\n','application/json;charset=utf-8');
    msg('Complete RGBA8 study JSON exported.');
  }catch(e){msg('Export rejected: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('repeatExportZip').addEventListener('click',async()=>{
  if(!study||busy)return;busy=true;controls();
  try{
    download('glsl-repeat-'+study.sessionId+'.zip',await exportReplicatedZip(study),'application/zip');
    msg('Full archive and nine lossless PNG images exported.');
  }catch(e){msg('ZIP export rejected: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('repeatImport').addEventListener('change',async event=>{
  if(busy)return;const file=event.target.files?.[0];if(!file)return;
  busy=true;controls();
  try{
    if(file.size>28000000)throw new Error('Study JSON exceeds 28 MB');
    const result=parseReplicatedJson(await file.text());
    await verifyReplicatedSession(result);
    const matching=study?await compareReplicatedSessions(result,study):null;
    prior=result;comparison=matching;show();
    msg(matching?'Imported study verified and comparison calculated.':
      'Imported study verified. Capture matching conditions to compare.');
  }catch(e){msg('Import rejected: '+String(e.message||e),true);}
  finally{busy=false;event.target.value='';controls();}
});
controls();show();msg('Study data remain in browser memory until exported.');
