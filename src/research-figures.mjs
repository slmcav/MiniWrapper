// P3 research figures: lossless RGBA8 PNG, content integrity, and controlled frame differences.
// PNG encoder intentionally uses uncompressed DEFLATE for deterministic cross-platform bytes.
import {canonicalJson,sha256Hex,verifyBuildReceipt} from './build-evidence.mjs';
import {verifyResearchCapture,sampleGrid,decodeResearchPixels,calculateSampleMetrics} from './research-capture.mjs';
export const FIGURE_SCHEMA='glsl-lab/figure/1';
export const SERIES_SCHEMA='glsl-lab/frame-series/1';
const need=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
const te=new TextEncoder();
const u32=(arr,at,value)=>{const n=value>>>0;arr[at]=(n>>>24)&255;arr[at+1]=(n>>>16)&255;arr[at+2]=(n>>>8)&255;arr[at+3]=n&255;};
const le16=(arr,at,v)=>{arr[at]=v&255;arr[at+1]=(v>>>8)&255;};
const le32=(arr,at,v)=>{arr[at]=v&255;arr[at+1]=(v>>>8)&255;arr[at+2]=(v>>>16)&255;arr[at+3]=(v>>>24)&255;};
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function concat(parts){const size=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
function pngChunk(type,data){const name=te.encode(type),out=new Uint8Array(12+data.length);u32(out,0,data.length);out.set(name,4);out.set(data,8);u32(out,8+data.length,crc32(out.subarray(4,8+data.length)));return out;}
function adler32(bytes){let a=1,b=0;for(let at=0;at<bytes.length;at+=5552){const stop=Math.min(at+5552,bytes.length);for(let i=at;i<stop;i++){a+=bytes[i];b+=a;}a%=65521;b%=65521;}return ((b<<16)|a)>>>0;}
function validFrame(pixels,w,h){
  need(Number.isSafeInteger(w)&&Number.isSafeInteger(h)&&w>0&&h>0&&w*h<=2097152,'Full resolution exceeds the 2-million-pixel limit');
  need(pixels instanceof Uint8Array&&pixels.length===w*h*4,'Expected complete RGBA8 framebuffer');
}
export function encodeLosslessPng(bottomLeftPixels,width,height){
  validFrame(bottomLeftPixels,width,height);
  const stride=width*4,scan=new Uint8Array((stride+1)*height);
  for(let row=0;row<height;row++)scan.set(
    bottomLeftPixels.subarray((height-1-row)*stride,(height-row)*stride),row*(stride+1)+1
  );
  const compressed=[Uint8Array.of(0x78,0x01)];
  for(let offset=0;offset<scan.length;){
    const size=Math.min(65535,scan.length-offset),last=offset+size===scan.length;
    const block=new Uint8Array(5+size);block[0]=last?1:0;
    le16(block,1,size);le16(block,3,(~size)&65535);block.set(scan.subarray(offset,offset+size),5);
    compressed.push(block);offset+=size;
  }
  const checksum=new Uint8Array(4);u32(checksum,0,adler32(scan));compressed.push(checksum);
  const ihdr=new Uint8Array(13);u32(ihdr,0,width);u32(ihdr,4,height);ihdr[8]=8;ihdr[9]=6;
  return concat([
    Uint8Array.of(137,80,78,71,13,10,26,10),
    pngChunk('IHDR',ihdr),
    pngChunk('IDAT',concat(compressed)),
    pngChunk('IEND',new Uint8Array())
  ]);
}
async function digest(bytes,subtle=globalThis.crypto?.subtle){
  need(bytes instanceof Uint8Array&&subtle&&typeof subtle.digest==='function','SHA-256 needs bytes and Web Crypto');
  const hashed=await subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hashed),v=>v.toString(16).padStart(2,'0')).join('');
}
function eqBytes(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
export async function createFigureEvidence(receipt,capture,rgba,options={}){
  const subtle=options.subtle||globalThis.crypto?.subtle;
  await verifyResearchCapture(capture,receipt,subtle);
  const {width,height}=receipt.viewport;
  validFrame(rgba,width,height);
  const selected=sampleGrid(rgba,width,height);
  need(eqBytes(selected.rgba,decodeResearchPixels(capture)),'Figure pixels do not reproduce linked sample');
  const png=encodeLosslessPng(rgba,width,height);
  const drawSequence=options.drawSequence;
  if(drawSequence!==undefined)need(Number.isSafeInteger(drawSequence)&&drawSequence>0,'Observed draw sequence must be a positive integer');
  const content={
    schema:FIGURE_SCHEMA,receiptSha256:receipt.sha256,captureSha256:capture.sha256,
    ...(drawSequence!==undefined?{drawSequence}:{}),
    width,height,format:'image/png',encoding:'png-rgba8-lossless-store-v1',
    origin:'WebGL bottom-left; PNG top-left',
    frameTimeSeconds:receipt.shaderTimeSeconds,
    rawRgbaSha256:await digest(rgba,subtle),pngSha256:await digest(png,subtle),
    fullFrameMetrics:calculateSampleMetrics(rgba),
    inferenceScope:'Single entire RGBA8 framebuffer only; no temporal or statistical significance claim'
  };
  const capturedAt=(options.clock||(()=>new Date().toISOString()))();
  need(typeof capturedAt==='string'&&capturedAt.endsWith('Z')&&!Number.isNaN(Date.parse(capturedAt)),'Figure UTC time required');
  const sha256=await sha256Hex(canonicalJson(content),subtle);
  return {record:{...content,sha256,capturedAt},png,rgba:new Uint8Array(rgba)};
}
export async function verifyFigureEvidence(figure,receipt,capture,subtle=globalThis.crypto?.subtle){
  need(figure&&figure.record&&figure.png instanceof Uint8Array&&figure.rgba instanceof Uint8Array,'Figure pixel and PNG data required');
  const {record,png,rgba}=figure;
  need(record.schema===FIGURE_SCHEMA&&record.receiptSha256===receipt.sha256&&record.captureSha256===capture.sha256,'Figure provenance mismatch');
  const rebuilt=await createFigureEvidence(receipt,capture,rgba,{
    subtle,clock:()=>record.capturedAt,...(record.drawSequence===undefined?{}:{drawSequence:record.drawSequence})
  });
  need(canonicalJson(rebuilt.record)===canonicalJson(record),'Figure metrics or hash mismatch');
  need(eqBytes(rebuilt.png,png),'Figure PNG bytes were modified');
  return true;
}
export function compareFullFrames(first,second){
  need(first instanceof Uint8Array&&second instanceof Uint8Array&&first.length===second.length&&first.length>0&&first.length%4===0,'Frames must have matching RGBA dimensions');
  const pixels=first.length/4;
  let changed=0,absolute=0,max=0;
  for(let i=0;i<first.length;i+=4){
    let difference=0;
    for(let ch=0;ch<3;ch++){
      const d=Math.abs(first[i+ch]-second[i+ch]);absolute+=d;max=Math.max(max,d);difference+=d;
    }
    if(difference>0)changed++;
  }
  const round=x=>Math.round(x*1e6)/1e6;
  return {pixels,meanAbsRgb8:round(absolute/(pixels*3)),changedRgbPixelFraction:round(changed/pixels),maxAbsChannelDifference:max};
}
export async function createFrameSeries(figures,options={}){
  const subtle=options.subtle||globalThis.crypto?.subtle;
  need(Array.isArray(figures)&&figures.length>=2&&figures.length<=5,'Series needs 2 to 5 verified frames');
  const first=figures[0],records=figures.map(x=>x.record);
  need(first.receipt,'Series must include verified build receipts');
  await verifyBuildReceipt(first.receipt,subtle);
  const conditions=canonicalJson({
    shader:first.receipt.shader,graph:first.receipt.graph||null,
    parameters:first.receipt.parameters,viewport:first.receipt.viewport,runtime:first.receipt.runtime
  });
  for(const f of figures){
    need(f.record.schema===FIGURE_SCHEMA&&f.rgba instanceof Uint8Array&&f.receipt,'Invalid series frame');
    await verifyBuildReceipt(f.receipt,subtle);
    need(f.record.receiptSha256===f.receipt.sha256,'Series figure has mismatched build provenance');
    need(f.record.width===first.record.width&&f.record.height===first.record.height,'Frame dimensions changed during series');
    need(canonicalJson({shader:f.receipt.shader,graph:f.receipt.graph||null,
      parameters:f.receipt.parameters,viewport:f.receipt.viewport,runtime:f.receipt.runtime})===conditions,
      'Shader, graph, settings or viewport changed during series');
  }
  for(let i=1;i<records.length;i++){
    if(records[i-1].drawSequence!==undefined||records[i].drawSequence!==undefined){
      need(Number.isSafeInteger(records[i-1].drawSequence)&&Number.isSafeInteger(records[i].drawSequence)&&
        records[i].drawSequence>records[i-1].drawSequence,'Series must use distinct, ordered GPU draw submissions');
    }
    need(Date.parse(records[i].capturedAt)>=Date.parse(records[i-1].capturedAt),
      'Figure observations must be ordered by capture time');
    need(records[i].frameTimeSeconds>=records[i-1].frameTimeSeconds,
      'Shader time decreased during capture series');
  }
  const pairs=[];
  for(let i=1;i<figures.length;i++){
    pairs.push({from:i-1,to:i,elapsedShaderSeconds:Math.round((records[i].frameTimeSeconds-records[i-1].frameTimeSeconds)*1e6)/1e6,
      ...compareFullFrames(figures[i-1].rgba,figures[i].rgba)});
  }
  const body={schema:SERIES_SCHEMA,frames:records.map(r=>({figureSha256:r.sha256,capturedAt:r.capturedAt,
    shaderTimeSeconds:r.frameTimeSeconds,...(r.drawSequence===undefined?{}:{drawSequence:r.drawSequence})})),
    width:first.record.width,height:first.record.height,pairs,
    inferenceScope:'Descriptive within-session pixel changes; no independence, hardware timing, or significance claim'};
  return {...body,sha256:await sha256Hex(canonicalJson(body),subtle)};
}
export async function validateFrameSeries(series,figures,subtle=globalThis.crypto?.subtle){
  const expected=await createFrameSeries(figures,{subtle});
  need(canonicalJson(series)===canonicalJson(expected),'Repeated-frame series data failed reproduction');
  return true;
}
export function zipStored(files){
  need(Array.isArray(files)&&files.length>0&&files.length<=32,'ZIP needs 1 to 32 files');
  const names=new Set(),local=[],central=[];let offset=0;
  for(const {name,data} of files){
    need(typeof name==='string'&&/^[a-z0-9][a-z0-9/_\-.]{0,100}$/.test(name)&&!name.includes('..')&&!names.has(name),'Invalid or duplicate ZIP entry');
    need(data instanceof Uint8Array&&data.length<=32e6,'Invalid ZIP entry bytes');names.add(name);
    const filename=te.encode(name),crc=crc32(data);
    const lh=new Uint8Array(30+filename.length);
    le32(lh,0,0x04034b50);le16(lh,4,20);le16(lh,8,0);
    le32(lh,14,crc);le32(lh,18,data.length);le32(lh,22,data.length);le16(lh,26,filename.length);lh.set(filename,30);
    local.push(lh,data);
    const ch=new Uint8Array(46+filename.length);
    le32(ch,0,0x02014b50);le16(ch,4,20);le16(ch,6,20);
    le32(ch,16,crc);le32(ch,20,data.length);le32(ch,24,data.length);le16(ch,28,filename.length);le32(ch,42,offset);
    ch.set(filename,46);central.push(ch);
    offset+=lh.length+data.length;
  }
  const cd=concat(central),end=new Uint8Array(22);
  le32(end,0,0x06054b50);le16(end,8,names.size);le16(end,10,names.size);le32(end,12,cd.length);le32(end,16,offset);
  return concat([...local,cd,end]);
}
export async function exportFigureBundle(figures,series,receipts,captures,{subtle=globalThis.crypto?.subtle}={}){
  need(Array.isArray(figures)&&figures.length>0&&figures.length<=5,'Export 1 to 5 figures');
  const receiptMap=new Map(receipts.map(r=>[r.sha256,r])),captureMap=new Map(captures.map(c=>[c.sha256,c]));
  for(const fig of figures){
    const r=receiptMap.get(fig.record.receiptSha256),c=captureMap.get(fig.record.captureSha256);
    need(r&&c,'Figure links must resolve to saved observations');
    await verifyFigureEvidence(fig,r,c,subtle);
  }
  if(series)await validateFrameSeries(series,figures,subtle);
  const usedReceipts=[...new Set(figures.map(f=>f.record.receiptSha256))].map(k=>receiptMap.get(k));
  const usedCaptures=[...new Set(figures.map(f=>f.record.captureSha256))].map(k=>captureMap.get(k));
  const manifest={
    schema:'glsl-lab/figure-bundle/1',
    description:'Deterministic lossless RGBA8 PNGs, pixel hashes, sampled and full-frame measurements, frozen GLSL builds and optional descriptive frame comparisons.',
    figures:figures.map((f,i)=>({...f.record,path:'figures/frame-'+String(i+1).padStart(2,'0')+'.png'})),
    series:series||null,receipts:usedReceipts,captures:usedCaptures
  };
  const entries=[{name:'manifest.json',data:te.encode(JSON.stringify(manifest,null,2)+'\n')}];
  for(let i=0;i<figures.length;i++)entries.push({name:manifest.figures[i].path,data:figures[i].png});
  return {manifest,zip:zipStored(entries)};
}
