// P3: reproducible point samples of a WebGL2 drawing buffer, not full-frame statistics.
// Measurements are calculated exclusively from the bytes retained in each record.
import {sha256Hex,canonicalJson,verifyBuildReceipt} from './build-evidence.mjs';
export const RESEARCH_SCHEMA='glsl-lab/research-capture/1';
export const RESEARCH_STORAGE_KEY='glsl-lab:research:v1';
const valid=(test,msg)=>{if(!test)throw new TypeError(msg);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const copy=x=>JSON.parse(JSON.stringify(x));
function exact(obj,keys){
  valid(plain(obj)&&Object.keys(obj).sort().join(',')===keys.slice().sort().join(','),'Unexpected research record fields');
}
export function sampleGrid(pixels,width,height,cols=Math.min(32,width),rows=Math.min(24,height)){
  valid(Number.isSafeInteger(width)&&width>0&&width<=16384&&Number.isSafeInteger(height)&&height>0&&height<=16384,'Invalid framebuffer resolution');
  valid(pixels instanceof Uint8Array&&pixels.length===width*height*4,'Invalid full RGBA buffer');
  valid(Number.isSafeInteger(cols)&&cols>0&&cols<=width&&Number.isSafeInteger(rows)&&rows>0&&rows<=height,'Invalid sampling grid');
  const selected=new Uint8Array(cols*rows*4);
  for(let y=0;y<rows;y++){
    const py=Math.min(height-1,Math.floor((y+.5)*height/rows));
    for(let x=0;x<cols;x++){
      const px=Math.min(width-1,Math.floor((x+.5)*width/cols));
      const offset=(py*width+px)*4,at=(y*cols+x)*4;
      selected.set(pixels.subarray(offset,offset+4),at);
    }
  }
  return {cols,rows,rgba:selected};
}
export function calculateSampleMetrics(bytes){
  valid(bytes instanceof Uint8Array&&bytes.length>0&&bytes.length%4===0,'RGBA sample bytes required');
  const n=bytes.length/4,channel=[0,0,0],histogram=Array(16).fill(0);
  let lumaSum=0,lumaSq=0,transparent=0,clipped=0,min=255,max=0;
  for(let i=0;i<bytes.length;i+=4){
    const r=bytes[i],g=bytes[i+1],b=bytes[i+2],a=bytes[i+3];
    channel[0]+=r;channel[1]+=g;channel[2]+=b;
    // Encoded-sRGB Rec.709 weighted luma proxy, not linear-light luminance.
    const y=.2126*r+.7152*g+.0722*b;
    lumaSum+=y;lumaSq+=y*y;
    histogram[Math.min(15,Math.floor(y/16))]++;
    min=Math.min(min,y);max=Math.max(max,y);
    if(a<128)transparent++;
    if(r===0||g===0||b===0||r===255||g===255||b===255)clipped++;
  }
  const mean=lumaSum/n;
  const round=v=>Math.round(v*1e6)/1e6;
  return {
    sampleCount:n,
    meanRgb8:channel.map(x=>round(x/n)),
    meanLuma8:round(mean),
    stdevLuma8:round(Math.sqrt(Math.max(0,lumaSq/n-mean*mean))),
    minLuma8:round(min),
    maxLuma8:round(max),
    clippedChannelFraction:round(clipped/n),
    alphaBelow128Fraction:round(transparent/n),
    lumaHistogram16:histogram
  };
}
function bytesBase64(bytes){
  valid(bytes instanceof Uint8Array,'Expected RGBA bytes');
  let result='';
  for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(result);
}
function decodeBase64(text){
  valid(typeof text==='string'&&text.length>0&&/^[A-Za-z0-9+/]+={0,2}$/.test(text),'Invalid sample base64');
  const binary=atob(text);return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function hashBytes(bytes,subtle=globalThis.crypto?.subtle){
  valid(subtle&&typeof subtle.digest==='function','Web Crypto required');
  const digest=await subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
function parametersMatch(a,b){return canonicalJson(a)===canonicalJson(b);}
export async function createResearchCapture(receipt,pixels,options={}){
  const subtle=options.subtle||globalThis.crypto?.subtle;
  await verifyBuildReceipt(receipt,subtle);
  const width=receipt.viewport.width,height=receipt.viewport.height;
  const grid=sampleGrid(pixels,width,height,Math.min(32,width),Math.min(24,height));
  const capturedAt=(options.clock||(()=>new Date().toISOString()))();
  valid(typeof capturedAt==='string'&&capturedAt.endsWith('Z')&&!Number.isNaN(Date.parse(capturedAt)),'UTC capture time required');
  const sampleBase64=bytesBase64(grid.rgba);
  const body={
    schema:RESEARCH_SCHEMA,
    receiptSha256:receipt.sha256,
    sampler:{algorithm:'center-nearest-grid-v1',origin:'bottom-left',source:'WebGL2.readPixels RGBA/UNSIGNED_BYTE',
      framebufferWidth:width,framebufferHeight:height,columns:grid.cols,rows:grid.rows},
    sample:{encoding:'base64-rgba8',rgbaBase64:sampleBase64,sha256:await hashBytes(grid.rgba,subtle)},
    metrics:calculateSampleMetrics(grid.rgba),
    inferenceScope:'Sampled pixels only; no full-frame or statistical-generalization claims'
  };
  const sha256=await sha256Hex(canonicalJson(body),subtle);
  return {...body,sha256,capturedAt};
}
export async function verifyResearchCapture(record,receipt,subtle=globalThis.crypto?.subtle){
  valid(plain(record),'Research record must be an object');
  exact(record,['schema','receiptSha256','sampler','sample','metrics','inferenceScope','sha256','capturedAt']);
  valid(record.schema===RESEARCH_SCHEMA&&hex(record.receiptSha256)&&hex(record.sha256),'Invalid research record identifiers');
  valid(typeof record.capturedAt==='string'&&record.capturedAt.endsWith('Z')&&!Number.isNaN(Date.parse(record.capturedAt)),'Invalid UTC capture time');
  await verifyBuildReceipt(receipt,subtle);
  valid(record.receiptSha256===receipt.sha256,'Capture links to a different shader build');
  const sampler=record.sampler;
  exact(sampler,['algorithm','origin','source','framebufferWidth','framebufferHeight','columns','rows']);
  valid(sampler.algorithm==='center-nearest-grid-v1'&&sampler.origin==='bottom-left'&&sampler.source==='WebGL2.readPixels RGBA/UNSIGNED_BYTE','Unknown sampling method');
  valid(sampler.framebufferWidth===receipt.viewport.width&&sampler.framebufferHeight===receipt.viewport.height,'Capture dimensions differ from build');
  valid(sampler.columns===Math.min(32,receipt.viewport.width)&&sampler.rows===Math.min(24,receipt.viewport.height),'Invalid sample dimensions');
  exact(record.sample,['encoding','rgbaBase64','sha256']);
  valid(record.sample.encoding==='base64-rgba8'&&hex(record.sample.sha256),'Invalid sample format');
  const bytes=decodeBase64(record.sample.rgbaBase64);
  valid(bytes.length===sampler.columns*sampler.rows*4,'Sample byte length does not match grid');
  valid(await hashBytes(bytes,subtle)===record.sample.sha256,'Captured pixel bytes were modified');
  valid(parametersMatch(record.metrics,calculateSampleMetrics(bytes)),'Captured image measurements do not reproduce');
  valid(record.inferenceScope==='Sampled pixels only; no full-frame or statistical-generalization claims','Research inference scope changed');
  const {sha256,capturedAt,...content}=record;
  valid(await sha256Hex(canonicalJson(content),subtle)===sha256,'Research capture SHA-256 mismatch');
  return true;
}
export function decodeResearchPixels(capture){return decodeBase64(capture.sample.rgbaBase64);}
export async function readResearchStore(storage=globalThis.localStorage,subtle=globalThis.crypto?.subtle){
  const raw=storage.getItem(RESEARCH_STORAGE_KEY);
  if(raw===null)return [];
  valid(raw.length<=1_200_000,'Research storage size limit exceeded');
  const records=JSON.parse(raw);
  valid(Array.isArray(records)&&records.length<=16,'Research capture count limit exceeded');
  // Validate each stored sample independently before allowing another write.
  // The caller also validates that each receiptSha256 resolves to a genuine build.
  for(const record of records){
    valid(plain(record)&&hex(record.sha256)&&hex(record.receiptSha256),'Malformed stored capture');
    valid(record.schema===RESEARCH_SCHEMA&&plain(record.sample)&&plain(record.sampler)&&plain(record.metrics),'Malformed research record');
    const grid=record.sampler;
    valid(Number.isSafeInteger(grid.columns)&&Number.isSafeInteger(grid.rows)&&
      grid.columns>0&&grid.rows>0&&grid.columns<=32&&grid.rows<=24,'Invalid stored grid');
    valid(typeof record.sample.rgbaBase64==='string'&&hex(record.sample.sha256),'Malformed stored pixel data');
    const bytes=decodeBase64(record.sample.rgbaBase64);
    valid(bytes.length===grid.columns*grid.rows*4,'Stored RGBA sample length mismatch');
    valid(await hashBytes(bytes,subtle)===record.sample.sha256,'Stored sampled pixels failed SHA-256 audit');
    valid(canonicalJson(record.metrics)===canonicalJson(calculateSampleMetrics(bytes)),'Stored measurements failed reproduction audit');
    const {sha256,capturedAt,...body}=record;
    valid(await sha256Hex(canonicalJson(body),subtle)===sha256,'Stored research record SHA-256 mismatch');
  }
  return records.map(copy);
}
export async function saveResearchCapture(capture,receipt,storage=globalThis.localStorage,subtle=globalThis.crypto?.subtle){
  await verifyResearchCapture(capture,receipt,subtle);
  const prior=await readResearchStore(storage,subtle);
  if(prior.some(item=>item.sha256===capture.sha256))return copy(capture);
  valid(prior.length<16,'16 captures stored; export your research data before adding more');
  const next=[...prior,copy(capture)];
  const json=canonicalJson(next);
  valid(json.length<=1_200_000,'Research storage capacity reached; export before continuing');
  storage.setItem(RESEARCH_STORAGE_KEY,json);
  return copy(capture);
}
