import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createBuildReceipt} from '../src/build-evidence.mjs';
import {sampleGrid,calculateSampleMetrics,createResearchCapture,verifyResearchCapture,
  saveResearchCapture,readResearchStore,decodeResearchPixels} from '../src/research-capture.mjs';
const subtle=webcrypto.subtle,clock=()=> '2026-10-10T08:00:00.000Z';
globalThis.btoa??=(str)=>Buffer.from(str,'binary').toString('base64');
globalThis.atob??=(str)=>Buffer.from(str,'base64').toString('binary');
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),raw:map};};
const pixels=(w,h)=>Uint8Array.from({length:w*h*4},(_,i)=>i%4===3?255:(i*13+47)%256);
async function receipt(w=4,h=3){
 return createBuildReceipt({
   shaderBody:'o.rgb=vec3(.5);',expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(.5);}',
   demoId:'original',attribution:'@YoheiNishitsuji',
   checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
   viewport:{width:w,height:h},parameters:{zoom:1,angle:0,speed:1,hue:0,brightness:1},
   shaderTimeSeconds:0
 },{subtle,clock});
}
test('P3 sampler chooses documented pixel centers, retaining RGBA order',()=>{
 const buffer=new Uint8Array([10,20,30,255,40,50,60,255,70,80,90,255,100,110,120,255]);
 const sample=sampleGrid(buffer,2,2,1,1);
 assert.deepEqual([...sample.rgba],[100,110,120,255]);
 assert.equal(sample.cols,1);assert.equal(sample.rows,1);
});
test('P3 metric computations exactly match a known three-pixel sample',()=>{
 const bytes=new Uint8Array([0,0,0,255,255,255,255,255,100,100,100,0]);
 const stats=calculateSampleMetrics(bytes);
 assert.equal(stats.sampleCount,3);assert.equal(stats.meanLuma8,118.333333);
 assert.equal(stats.alphaBelow128Fraction,.333333);
 assert.equal(stats.clippedChannelFraction,.666667);
 assert.equal(stats.lumaHistogram16.reduce((a,b)=>a+b,0),3);
});
test('P3 observed pixel capture round-trips with receipt, metrics and hashes',async()=>{
 const build=await receipt();const record=await createResearchCapture(build,pixels(4,3),{subtle,clock});
 assert.equal(record.sampler.columns,4);assert.equal(record.sampler.rows,3);
 assert.equal(record.receiptSha256,build.sha256);
 assert.equal(record.metrics.sampleCount,12);
 assert.deepEqual([...decodeResearchPixels(record)],[...pixels(4,3)]);
 assert.equal(await verifyResearchCapture(JSON.parse(JSON.stringify(record)),build,subtle),true);
});
test('P3 repeated equal frames retain identical content hash, distinct capture timestamp',async()=>{
 const build=await receipt(),a=await createResearchCapture(build,pixels(4,3),{subtle,clock});
 const b=await createResearchCapture(build,pixels(4,3),{subtle,clock:()=> '2026-10-11T08:00:00.000Z'});
 assert.equal(a.sha256,b.sha256);assert.notEqual(a.capturedAt,b.capturedAt);
});
test('P3 tampered pixels, metrics and receipt provenance fail closed',async()=>{
 const build=await receipt(),good=await createResearchCapture(build,pixels(4,3),{subtle,clock});
 const tamper=fn=>{const x=JSON.parse(JSON.stringify(good));fn(x);return x;};
 await assert.rejects(()=>verifyResearchCapture(tamper(x=>x.metrics.meanRgb8[0]=999),build,subtle),/measurements/);
 await assert.rejects(()=>verifyResearchCapture(tamper(x=>x.sample.rgbaBase64='AAAA'),build,subtle),/byte length/);
 await assert.rejects(()=>verifyResearchCapture(tamper(x=>x.sha256='f'.repeat(64)),build,subtle),/SHA-256 mismatch/);
 const otherBuild=await receipt(5,3);
 await assert.rejects(()=>verifyResearchCapture(good,otherBuild,subtle),/different shader build/);
});
test('P3 research store only saves linked, hash-verified observations',async()=>{
 const storage=memory(),build=await receipt(),record=await createResearchCapture(build,pixels(4,3),{subtle,clock});
 await saveResearchCapture(record,build,storage,subtle);
 await saveResearchCapture(record,build,storage,subtle);
 const persisted=await readResearchStore(storage,subtle);
 assert.equal(persisted.length,1);assert.equal(persisted[0].sha256,record.sha256);
 const modified=JSON.parse(JSON.stringify(record));modified.metrics.meanLuma8=999;
 await assert.rejects(()=>saveResearchCapture(modified,build,storage,subtle));
 assert.equal((await readResearchStore(storage,subtle)).length,1);
});
test('P3 sample grid rejects damaged buffers and invalid dimensions',()=>{
 assert.throws(()=>sampleGrid(new Uint8Array(8),2,2),/Invalid full RGBA/);
 assert.throws(()=>sampleGrid(new Uint8Array(16),2,2,3,2),/Invalid sampling grid/);
});

test('P3 corrupted stored RGBA or metric evidence blocks any subsequent write',async()=>{
 const storage=memory(),build=await receipt(),first=await createResearchCapture(build,pixels(4,3),{subtle,clock});
 await saveResearchCapture(first,build,storage,subtle);
 const altered=JSON.parse(storage.getItem('glsl-lab:research:v1'));
 altered[0].metrics.meanLuma8=999;
 const forged=JSON.stringify(altered);
 storage.setItem('glsl-lab:research:v1',forged);
 await assert.rejects(()=>readResearchStore(storage,subtle),/measurements failed reproduction audit/);
 const next=await createResearchCapture(build,pixels(4,3),{subtle,clock:()=> '2026-10-11T08:00:00.000Z'});
 await assert.rejects(()=>saveResearchCapture(next,build,storage,subtle),/measurements failed reproduction audit/);
 assert.equal(storage.getItem('glsl-lab:research:v1'),forged);
});
