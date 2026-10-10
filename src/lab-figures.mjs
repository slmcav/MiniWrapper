// P3 browser figure session: lossless full-frame figures with independently verified archive.
// Full-resolution bytes remain in memory and MUST be exported before page reload.
import {createBuildReceipt} from './build-evidence.mjs';
import {createResearchCapture} from './research-capture.mjs';
import {createFigureEvidence,createFrameSeries,exportFigureBundle} from './research-figures.mjs';

const $=id=>document.getElementById(id);
const bridge=window.glslLabBridge;
if(!bridge)throw new Error('Figure capture requires a validated WebGL2 bridge');
let figures=[],series=null,busy=false,ready=false;
const status=(message,error=false)=>{
  $('figureStatus').textContent=message;
  $('figureStatus').dataset.error=String(error);
};
function updateControls(){
  $('figureCapture').disabled=busy||!ready||figures.length>=5;
  $('figureSeries').disabled=busy||!ready||!bridge.isPlaying();
  $('figureExport').disabled=busy||!figures.length;
  $('figureClear').disabled=busy||!figures.length;
  $('figureCount').textContent=figures.length+' full-resolution figure(s) in this session; export before reload.';
  $('figureComparison').textContent=series
    ?'Controlled series: '+series.frames.length+' observed frames\n'+series.pairs.map((p,i)=>
      'Frames '+(p.from+1)+' → '+(p.to+1)+': Δ shader time '+p.elapsedShaderSeconds.toFixed(4)+' s; mean absolute RGB8 difference '+p.meanAbsRgb8.toFixed(4)+'; changed pixels '+(100*p.changedRgbPixelFraction).toFixed(2)+'%').join('\n')
    :'No controlled series captured yet.';
}
bridge.onValidationChange(ok=>{
  ready=ok;
  updateControls();
  if(!ok)status('A newly validated shader draw is required to capture additional figures.');
  else if(!busy)status('Validated GPU frame available. Capture a figure or a controlled three-frame series.');
});
function observe(){
  // Pixels and the exact source/parameter/time snapshot are read in the same JS task.
  return bridge.readPixelsForResearch();
}
async function prepare(shot){
  if(!Number.isSafeInteger(shot.frameId)||shot.frameId<=0||
      typeof shot.observedAt!=='string'||Number.isNaN(Date.parse(shot.observedAt)))
    throw new Error('GPU observation is missing frame sequence or capture timestamp');
  const clock=()=>shot.observedAt;
  const receipt=await createBuildReceipt(shot.observation,{clock});
  const capture=await createResearchCapture(receipt,shot.pixels,{clock});
  const figure=await createFigureEvidence(receipt,capture,shot.pixels,{
    clock,drawSequence:shot.frameId
  });
  return {...figure,receipt,capture,drawId:shot.frameId};
}
async function operation(fn){
  if(busy)return;
  busy=true;updateControls();
  try{await fn();}
  catch(error){status('Research figure operation failed: '+String(error.message||error),true);}
  finally{busy=false;updateControls();}
}
$('figureCapture').addEventListener('click',()=>operation(async()=>{
  if(!ready)throw new Error('Shader has not drawn a verified frame');
  if(figures.length>=5)throw new Error('The current figure session is full; export and clear it');
  const snapshot=observe();
  const fig=await prepare(snapshot);
  figures.push(fig);series=null;
  status('Captured lossless full-resolution figure '+fig.record.width+' × '+fig.record.height+
    '. Its PNG and raw framebuffer bytes have independent SHA-256 digests.');
}));
function awaitNextDraw(previous){
  return new Promise((resolve,reject)=>{
    let frames=0;
    function inspect(){
      if(!bridge.isPlaying())return reject(new Error('Animation stopped during the controlled series'));
      const next=bridge.getFrameNumber();
      if(next>previous)return resolve(next);
      if(++frames>=120)return reject(new Error('No new verified GPU draw was observed'));
      requestAnimationFrame(inspect);
    }
    requestAnimationFrame(inspect);
  });
}
$('figureSeries').addEventListener('click',()=>operation(async()=>{
  if(!ready||!bridge.isPlaying())throw new Error('Start the animation before capturing a series');
  status('Observing three consecutive verified GPU draws with unchanged inputs.');
  let last=bridge.getFrameNumber();
  const snapshots=[];
  for(let i=0;i<3;i++){
    await awaitNextDraw(last);
    const shot=observe();
    if(shot.frameId<=last)throw new Error('Frame was not freshly redrawn');
    last=shot.frameId;
    snapshots.push(shot);
  }
  const candidates=[];
  for(const shot of snapshots)candidates.push(await prepare(shot));
  const verified=await createFrameSeries(candidates);
  // Publish session state only after the full controlled comparison validates.
  figures=candidates;series=verified;
  status('Captured 3 independent draw submissions under fixed source, settings and resolution. Descriptive pixel comparisons are ready for export.');
}));
$('figureClear').addEventListener('click',()=>operation(async()=>{
  figures=[];series=null;
  status('In-memory figures cleared. Previously exported evidence is unaffected.');
}));
$('figureExport').addEventListener('click',()=>operation(async()=>{
  if(!figures.length)throw new Error('No full-frame figures captured');
  const bundle=await exportFigureBundle(figures,series,
    figures.map(f=>f.receipt),figures.map(f=>f.capture));
  const blob=new Blob([bundle.zip],{type:'application/zip'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download='glsl-lab-full-figures-'+figures.length+'-frames.zip';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  status('Exported integrity-verified lossless PNG figures, sampled evidence, build receipts and frame comparisons in one ZIP.');
}));
updateControls();
status('Lossless full-frame capture is ready after a successful GPU draw. Session-only data are not autosaved.');
