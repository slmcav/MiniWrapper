// P3: observed WebGL2 pixel data, independently verified receipts, and explicit scope.
import {createBuildReceipt,verifyBuildReceipt} from './build-evidence.mjs';
import {createResearchCapture,verifyResearchCapture,readResearchStore,saveResearchCapture,decodeResearchPixels} from './research-capture.mjs';
import {saveReceipt,listReceipts} from './project-store.mjs';

const $=id=>document.getElementById(id);
const bridge=window.glslLabBridge;
if(!bridge)throw new Error('Research needs the validated WebGL2 bridge');
const store=window.localStorage;
let ready=false,captures=[];
const state=(text,error=false)=>{$('researchStatus').textContent=text;$('researchStatus').dataset.error=String(error);};
function download(filename,json){
  const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function preview(record){
  const canvas=$('researchSampleCanvas'),ctx=canvas.getContext('2d');
  if(!ctx)return;
  const {columns,rows}=record.sampler;
  canvas.width=columns;canvas.height=rows;
  const bytes=decodeResearchPixels(record),image=ctx.createImageData(columns,rows);
  // WebGL starts at bottom-left, Canvas ImageData at top-left.
  for(let y=0;y<rows;y++){
    const source=y*columns*4,target=(rows-y-1)*columns*4;
    image.data.set(bytes.subarray(source,source+columns*4),target);
  }
  ctx.putImageData(image,0,0);
}
function show(){
  $('researchCount').textContent=captures.length+' locally stored sampled frame(s)';
  $('researchExport').disabled=captures.length===0;
  if(!captures.length){$('researchMetrics').textContent='No sampled pixels yet.';return;}
  const last=captures.at(-1),m=last.metrics;
  $('researchMetrics').textContent=[
    'Sample: '+last.sampler.columns+' × '+last.sampler.rows+' pixels ('+m.sampleCount+' points)',
    'Encoded RGB means (0–255): '+m.meanRgb8.join(' / '),
    'Encoded Rec.709 luma proxy: '+m.meanLuma8.toFixed(3)+' ± '+m.stdevLuma8.toFixed(3),
    'Clipped-channel sample fraction: '+(m.clippedChannelFraction*100).toFixed(2)+'%',
    'Capture hash: '+last.sha256.slice(0,18)+'…',
    'Linked build: '+last.receiptSha256.slice(0,18)+'…'
  ].join('\n');
  preview(last);
}
async function auditCaptures(){
  const savedReceipts=await listReceipts(store);
  const byHash=new Map(savedReceipts.map(r=>[r.sha256,r]));
  const saved=await readResearchStore(store);
  for(const capture of saved){
    const linked=byHash.get(capture.receiptSha256);
    if(!linked)throw new Error('Research capture has no verified linked build receipt');
    await verifyResearchCapture(capture,linked);
  }
  captures=saved;
  return {receipts:savedReceipts,captures:saved};
}
bridge.onValidationChange(ok=>{
  ready=ok;
  $('researchCapture').disabled=!ok;
  if(!ok)state('Capture unavailable until WebGL2 has drawn a validated frame.');
  else state('Live GPU frame available. Capture a measured sample when ready.');
});
$('researchCapture').addEventListener('click',async()=>{
  if(!ready)return;
  $('researchCapture').disabled=true;
  try{
    // Read actual pixels and exact evidence in the same synchronous browser task.
    const {observation,pixels}=bridge.readPixelsForResearch();
    const receipt=await createBuildReceipt(observation);
    const capture=await createResearchCapture(receipt,pixels);
    await saveReceipt(receipt,store);
    await saveResearchCapture(capture,receipt,store);
    await auditCaptures();
    show();
    state('Captured actual WebGL pixels and verified their source, measurements, and SHA-256 hashes.');
  }catch(error){
    state('Research capture failed: '+String(error.message||error),true);
  }finally{$('researchCapture').disabled=!ready;}
});
$('researchExport').addEventListener('click',async()=>{
  try{
    const audited=await auditCaptures();
    if(!audited.captures.length)throw new Error('No research captures are available');
    const included=new Set(audited.captures.map(c=>c.receiptSha256));
    const bundle={
      schema:'glsl-lab/research-export/1',
      description:'Observed GPU RGBA center-grid samples and reproducible per-sample image metrics; not full-frame statistics.',
      captures:audited.captures,
      receipts:audited.receipts.filter(r=>included.has(r.sha256))
    };
    download('glsl-lab-research-'+audited.captures.length+'-captures.json',JSON.stringify(bundle,null,2)+'\n');
    state('Exported verified research observations with their linked immutable shader receipts.');
  }catch(error){state('Export blocked: '+String(error.message||error),true);}
});
try{
  await auditCaptures();
  show();
  state(captures.length+' verified local research capture(s). A new GPU draw can be measured.');
}catch(error){
  $('researchExport').disabled=true;
  state('Stored research evidence requires review; no data were overwritten: '+String(error.message||error),true);
}
