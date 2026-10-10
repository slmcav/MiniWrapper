// P3: verified fixed-time GPU sweeps and cross-session comparison.
import {createBuildReceipt} from './build-evidence.mjs';
import {createResearchCapture} from './research-capture.mjs';
import {createFigureEvidence} from './research-figures.mjs';
import {createSweepProtocol,createSweepSession,verifySweepSession,compareSweepSessions,exportSweepZip,parseSweepJson} from './research-experiments.mjs';

const $=id=>document.getElementById(id),bridge=window.glslLabBridge;
if(!bridge)throw new Error('Controlled experiments require WebGL2');
const stepDefaults={zoom:.2,hue:45,angle:30,brightness:.15};
let session=null,prior=null,comparison=null,busy=false,ready=false;
const message=(s,error=false)=>{$('sweepStatus').textContent=s;$('sweepStatus').dataset.error=String(error);};
function controls(){
  $('sweepRun').disabled=busy||!ready;
  $('sweepExportJson').disabled=busy||!session;
  $('sweepExportZip').disabled=busy||!session;
  $('sweepImport').disabled=busy;
  for(const key of ['sweepParameter','sweepStep','sweepTime'])$(key).disabled=busy;
}
function output(){
  $('sweepSummary').textContent=!session?'No experimental data recorded':
    'Session '+session.sessionId+'\n'+session.protocol.parameter+' levels: '+session.protocol.levels.join(' / ')+
    ' at t = '+session.protocol.shaderTimeSeconds+' s\n'+session.trials.map((trial,i)=>
      'Level '+(i+1)+' mean full-frame encoded luma: '+trial.figure.fullFrameMetrics.meanLuma8.toFixed(3)+
      ' | figure hash '+trial.figure.sha256.slice(0,12)+'…').join('\n');
  $('sweepComparison').textContent=comparison
    ?'Separate-session descriptive comparison\n'+comparison.comparisons.map((row,i)=>
      'Level '+(i+1)+': mean absolute RGB8 difference '+row.meanAbsRgb8.toFixed(3)+
      ', changed pixels '+(row.changedRgbPixelFraction*100).toFixed(2)+'%'+
      ', Δ luma '+row.deltaMeanLuma8.toFixed(3)).join('\n')
    :prior?'Imported session verified. Run an identical sweep for comparison.':
      'Import another saved session JSON to compare two separate captures.';
}
function download(name,content,mime){
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function run(){
  const parameter=$('sweepParameter').value;
  const protocol=createSweepProtocol(bridge.getProjectState().parameters,parameter,
    Number($('sweepStep').value),Number($('sweepTime').value));
  // Capture all three GPU buffers synchronously before any hashing, minimizing
  // race windows with user interaction or animation frames.
  const observations=protocol.levels.map(value=>bridge.renderSweepPoint({
    ...protocol.baseline,[parameter]:value
  },protocol.shaderTimeSeconds));
  const figures=[];
  for(const shot of observations){
    const clock=()=>shot.observedAt;
    const receipt=await createBuildReceipt(shot.observation,{clock});
    const capture=await createResearchCapture(receipt,shot.pixels,{clock});
    const figure=await createFigureEvidence(receipt,capture,shot.pixels,{
      clock,drawSequence:shot.frameId
    });
    figures.push({...figure,receipt,capture});
  }
  const recorded=await createSweepSession(protocol,figures,{
    sessionId:crypto.randomUUID(),clock:()=>observations[0].observedAt
  });
  await verifySweepSession(recorded);
  return recorded;
}
$('sweepParameter').addEventListener('change',()=>{
  $('sweepStep').value=String(stepDefaults[$('sweepParameter').value]);
});
bridge.onValidationChange(ok=>{
  ready=ok;controls();
  if(ok&&!busy&&!session)message('Shader validated. A fixed-time parameter sweep is ready.');
});
$('sweepRun').addEventListener('click',async()=>{
  if(busy||!ready)return;
  busy=true;controls();message('Reading three fixed-time GPU conditions and verifying the archived pixels.');
  try{
    const candidate=await run();
    const compared=prior?await compareSweepSessions(prior,candidate):null;
    session=candidate;comparison=compared;output();
    window.glslLabLatestExperiment=candidate;
    window.dispatchEvent(new Event('glsl-lab-study-ready'));
    message(compared?'Experiment verified and compared to the imported session.':
      'Experiment verified. Export the JSON to reproduce or compare this session.');
  }catch(error){message('Experiment rejected: '+String(error.message||error),true);}
  finally{busy=false;controls();}
});
$('sweepExportJson').addEventListener('click',async()=>{
  if(!session||busy)return;
  busy=true;controls();
  try{
    await verifySweepSession(session);
    download('glsl-experiment-'+session.sessionId+'.json',
      JSON.stringify(session,null,2)+'\n','application/json;charset=utf-8');
    message('Archived the full observed RGBA8 data, build receipts, and reproducibility hashes.');
  }catch(e){message('JSON export rejected: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('sweepExportZip').addEventListener('click',async()=>{
  if(!session||busy)return;
  busy=true;controls();
  try{
    const zip=await exportSweepZip(session);
    download('glsl-experiment-'+session.sessionId+'.zip',zip,'application/zip');
    message('Archived three lossless PNGs and the complete experiment record.');
  }catch(e){message('ZIP export rejected: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('sweepImport').addEventListener('change',async event=>{
  if(busy)return;
  const file=event.target.files?.[0];if(!file)return;
  busy=true;controls();
  try{
    if(file.size>24000000)throw new Error('Experiment JSON exceeds 24 MB');
    const candidate=parseSweepJson(await file.text());
    await verifySweepSession(candidate);
    const compared=session?await compareSweepSessions(candidate,session):null;
    prior=candidate;comparison=compared;output();
    message(compared?'Verified imported session and computed descriptive comparison.':
      'Prior session verified. Run its matching protocol to compare.');
  }catch(e){message('Import rejected: '+String(e.message||e),true);}
  finally{busy=false;event.target.value='';controls();}
});
controls();output();
message('Study data are stored in memory until export. Do not interpret three levels as independent trials.');
