import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {createBuildReceipt} from '../src/build-evidence.mjs';
import {createResearchCapture} from '../src/research-capture.mjs';
import {encodeLosslessPng,crc32,createFigureEvidence,verifyFigureEvidence,
  compareFullFrames,createFrameSeries,validateFrameSeries,exportFigureBundle,zipStored} from '../src/research-figures.mjs';
const subtle=webcrypto.subtle;
globalThis.btoa??=v=>Buffer.from(v,'binary').toString('base64');
globalThis.atob??=v=>Buffer.from(v,'base64').toString('binary');
const clock=i=>()=>new Date(Date.UTC(2026,9,10,9,0,i)).toISOString();
const px=(width,height,add=0)=>Uint8Array.from({length:width*height*4},(_,i)=>i%4===3?255:(i*17+add)%256);
async function evidence(pixels=px(4,3),w=4,h=3,time=0,second=0){
 const receipt=await createBuildReceipt({
  shaderBody:'o.rgb=vec3(.25);',expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(.25);}',
  demoId:'original',attribution:'@YoheiNishitsuji',
  checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
  viewport:{width:w,height:h},parameters:{zoom:1,angle:0,speed:1,hue:0,brightness:1},
  shaderTimeSeconds:time
 },{subtle,clock:clock(second)});
 const capture=await createResearchCapture(receipt,pixels,{subtle,clock:clock(second)});
 const figure=await createFigureEvidence(receipt,capture,pixels,{subtle,clock:clock(second)});
 return {...figure,receipt,capture};
}
function chunks(png){
 const data=Buffer.from(png),chunks=[];let pos=8;
 while(pos<data.length){
   const size=data.readUInt32BE(pos),type=data.toString('ascii',pos+4,pos+8),
     payload=data.subarray(pos+8,pos+8+size);
   const expected=data.readUInt32BE(pos+8+size);
   assert.equal(crc32(data.subarray(pos+4,pos+8+size)),expected,'PNG CRC mismatch');
   chunks.push({type,payload});
   pos+=size+12;
 }
 return chunks;
}
test('P3 PNG encoder writes lossless valid 8-bit RGBA with vertical WebGL flip',()=>{
 const rgba=new Uint8Array([255,0,0,255,  0,255,0,255,  0,0,255,255,  255,255,255,255]);
 const png=encodeLosslessPng(rgba,2,2);
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const parts=chunks(png);
 assert.deepEqual(parts.map(x=>x.type),['IHDR','IDAT','IEND']);
 assert.equal(parts[0].payload.readUInt32BE(0),2);
 assert.equal(parts[0].payload.readUInt32BE(4),2);
 assert.equal(parts[0].payload[9],6);
 const decoded=inflateSync(parts[1].payload);
 assert.deepEqual([...decoded],[
   0,0,0,255,255,255,255,255,255,
   0,255,0,0,255,0,255,0,255
 ]);
});
test('P3 figure record links true framebuffer, sample and lossless PNG hashes',async()=>{
 const r=await evidence();
 assert.equal(await verifyFigureEvidence(r,r.receipt,r.capture,subtle),true);
 assert.equal(r.record.width,4);assert.equal(r.record.height,3);
 assert.equal(r.record.fullFrameMetrics.sampleCount,12);
 assert.match(r.record.pngSha256,/^[a-f0-9]{64}$/);
 assert.match(r.record.rawRgbaSha256,/^[a-f0-9]{64}$/);
});
test('P3 corrupted image, pixel sample, and figure record cannot pass audit',async()=>{
 const r=await evidence();
 const badPng={...r,png:new Uint8Array(r.png)};badPng.png[40]^=1;
 await assert.rejects(()=>verifyFigureEvidence(badPng,r.receipt,r.capture,subtle),/PNG bytes were modified/);
 const badRaw={...r,rgba:new Uint8Array(r.rgba)};badRaw.rgba[0]^=1;
 await assert.rejects(()=>verifyFigureEvidence(badRaw,r.receipt,r.capture,subtle),/do not reproduce linked sample/);
 const badRecord={...r,record:{...r.record,fullFrameMetrics:{...r.record.fullFrameMetrics,meanLuma8:999}}};
 await assert.rejects(()=>verifyFigureEvidence(badRecord,r.receipt,r.capture,subtle),/metric|hash mismatch/);
});
test('P3 compareFrames derives descriptive RGB differences from actual bytes',()=>{
 const a=new Uint8Array([0,0,0,255, 10,20,30,255]);
 const b=new Uint8Array([0,0,0,255, 20,40,60,255]);
 assert.deepEqual(compareFullFrames(a,b),{pixels:2,meanAbsRgb8:10,changedRgbPixelFraction:.5,maxAbsChannelDifference:30});
 assert.throws(()=>compareFullFrames(a,new Uint8Array(4)),/matching/);
});
test('P3 controlled series permits equal frames at distinct observation times',async()=>{
 const a=await evidence(px(4,3),4,3,0,1);
 const b=await evidence(px(4,3),4,3,0,2);
 const series=await createFrameSeries([a,b],{subtle});
 assert.equal(series.frames.length,2);
 assert.equal(series.pairs[0].meanAbsRgb8,0);
 assert.equal(series.pairs[0].changedRgbPixelFraction,0);
 assert.equal(await validateFrameSeries(series,[a,b],subtle),true);
});
test('P3 controlled series reports real frame changes and rejects changed inputs',async()=>{
 const a=await evidence(px(4,3),4,3,1,1),b=await evidence(px(4,3,12),4,3,2,2);
 const series=await createFrameSeries([a,b],{subtle});
 assert.ok(series.pairs[0].meanAbsRgb8>0);
 assert.equal(series.pairs[0].elapsedShaderSeconds,1);
 const different=await evidence(px(5,3),5,3,3,3);
 await assert.rejects(()=>createFrameSeries([a,different],{subtle}),/dimensions changed/);
 const earlier=await evidence(px(4,3),4,3,.5,3);
 await assert.rejects(()=>createFrameSeries([a,earlier],{subtle}),/Shader time decreased/);
 const withChange={...b,receipt:{...b.receipt,parameters:{...b.receipt.parameters,zoom:2}}};
 await assert.rejects(()=>createFrameSeries([a,withChange],{subtle}),/hash mismatch/);
});
test('P3 ZIP bundle contains manifest and the exact PNG bytes with stored checksums',async()=>{
 const a=await evidence(),b=await evidence(px(4,3,15),4,3,1,1);
 const series=await createFrameSeries([a,b],{subtle});
 const result=await exportFigureBundle([a,b],series,[a.receipt,b.receipt],[a.capture,b.capture],{subtle});
 assert.deepEqual(result.manifest.figures.map(x=>x.path),['figures/frame-01.png','figures/frame-02.png']);
 assert.equal(result.manifest.receipts.length,2);
 assert.equal(result.manifest.captures.length,2);
 const bytes=Buffer.from(result.zip);
 assert.equal(bytes.readUInt32LE(0),0x04034b50);
 assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
 assert.equal(bytes.readUInt16LE(bytes.length-12),3);
 assert.ok(bytes.includes(Buffer.from('figures/frame-02.png')));
 assert.throws(()=>zipStored([{name:'../bad.png',data:new Uint8Array(4)}]),/Invalid or duplicate/);
});
test('P3 refuse figure archives whose image data or series summaries are altered',async()=>{
 const a=await evidence(),b=await evidence(px(4,3,15),4,3,1,1);
 const series=await createFrameSeries([a,b],{subtle});
 const changed={...series,pairs:[{...series.pairs[0],meanAbsRgb8:999}]};
 await assert.rejects(()=>exportFigureBundle([a,b],changed,[a.receipt,b.receipt],[a.capture,b.capture],{subtle}),/failed reproduction/);
 const forged={...a,png:new Uint8Array(a.png)};forged.png[44]^=1;
 await assert.rejects(()=>exportFigureBundle([forged],null,[a.receipt],[a.capture],{subtle}),/PNG bytes were modified/);
});
