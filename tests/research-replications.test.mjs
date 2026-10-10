import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createBuildReceipt,canonicalJson,sha256Hex} from '../src/build-evidence.mjs';
import {createResearchCapture} from '../src/research-capture.mjs';
import {createFigureEvidence} from '../src/research-figures.mjs';
import {createReplicatedProtocol,createReplicatedSession,verifyReplicatedSession,compareReplicatedSessions,exportReplicatedZip,validateGraphicsPlatform} from '../src/research-replications.mjs';
const subtle=webcrypto.subtle;
globalThis.btoa??=v=>Buffer.from(v,'binary').toString('base64');
globalThis.atob??=v=>Buffer.from(v,'base64').toString('binary');
const params=()=>({zoom:1,angle:0,speed:1,hue:0,brightness:1});
const time=i=>()=>new Date(Date.UTC(2026,9,10,9,0,i)).toISOString();
const platform=()=>({api:'WebGL2',webglVersion:'WebGL 2.0 test',shadingLanguageVersion:'WebGL GLSL ES 3.00',
  vendor:'WebGL vendor',renderer:'WebGL renderer',maxTextureSize:4096,
  maxRenderbufferSize:4096,maxVertexAttribs:16,fragmentHighpPrecision:23,devicePixelRatio:1});
async function make(id,offset=0,phase=0,platformData=platform()){
  const protocol=createReplicatedProtocol(params(),'zoom',.2,2,phase),figures=[];
  for(const [i,slot] of protocol.sequence.entries()){
    const rgba=Uint8Array.from({length:4*3*4},(_,index)=>index%4===3?255:(index+slot.levelIndex*12+slot.block+offset)%256);
    const receipt=await createBuildReceipt({
      shaderBody:'o.rgb=vec3(.5);',expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(.5);}',
      demoId:'original',attribution:'@YoheiNishitsuji',
      checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
      viewport:{width:4,height:3},
      parameters:{...protocol.sweep.baseline,zoom:protocol.sweep.levels[slot.levelIndex]},
      shaderTimeSeconds:2,compileCpuMs:i+1
    },{subtle,clock:time(i)});
    const capture=await createResearchCapture(receipt,rgba,{subtle,clock:time(i)});
    const figure=await createFigureEvidence(receipt,capture,rgba,{subtle,clock:time(i),drawSequence:90+i});
    figures.push({...figure,receipt,capture});
  }
  return createReplicatedSession(protocol,figures,platformData,{sessionId:id,clock:time(0),subtle});
}
test('P3 replicated protocol balances each level across all serial positions',()=>{
 const p=createReplicatedProtocol(params(),'zoom',.2,2,0);
 assert.equal(p.sequence.length,9);
 for(let level=0;level<3;level++){
   assert.equal(p.sequence.filter(s=>s.levelIndex===level).length,3);
   assert.deepEqual(p.sequence.filter(s=>s.levelIndex===level).map(s=>s.position).sort(),[0,1,2]);
 }
 assert.deepEqual(p.sequence.map(s=>s.levelIndex),[0,1,2,1,2,0,2,0,1]);
 assert.throws(()=>createReplicatedProtocol(params(),'zoom',.2,2,3),/phase/);
});
test('P3 graphics capabilities report a supported, bounded browser-reported envelope',()=>{
 assert.equal(validateGraphicsPlatform(platform()),true);
 const bad=platform();bad.maxTextureSize=Infinity;
 assert.throws(()=>validateGraphicsPlatform(bad),/capability/);
 const extra=platform();extra.unmaskedDeviceSerial='not allowed';
 assert.throws(()=>validateGraphicsPlatform(extra),/fields/);
});
test('P3 nine observations reproduce image evidence, means and sample dispersion',async()=>{
 const study=await make('study_run_001');
 assert.equal(study.trials.length,9);
 assert.equal((await verifyReplicatedSession(study,subtle)).length,9);
 assert.deepEqual(study.summary.map(s=>s.observationCount),[3,3,3]);
 assert.ok(study.summary.every(s=>s.sampleStdevLuma8>=0));
 assert.deepEqual(study.trials.map(t=>t.levelIndex),[0,1,2,1,2,0,2,0,1]);
});
test('P3 separately initiated matching study produces descriptive differences only',async()=>{
 const a=await make('study_run_001'),b=await make('study_run_002',13);
 const c=await compareReplicatedSessions(a,b,subtle);
 assert.equal(c.differences.length,3);
 assert.ok(c.differences[0].differenceMeanLuma8>0);
 assert.match(c.inferenceScope,/no random sample/);
 const same=await make('study_run_003');
 const equal=await compareReplicatedSessions(a,same,subtle);
 assert.deepEqual(equal.differences.map(v=>v.differenceMeanLuma8),[0,0,0]);
 await assert.rejects(()=>compareReplicatedSessions(a,a,subtle),/cannot be compared against itself/);
});
test('P3 unmatched platform, counterbalance phase and shader parameters fail closed',async()=>{
 const a=await make('study_run_001');
 const differingPlatform=platform();differingPlatform.maxTextureSize=8192;
 const b=await make('study_run_002',0,0,differingPlatform);
 await assert.rejects(()=>compareReplicatedSessions(a,b,subtle),/platform capabilities differ/);
 const phase=await make('study_run_003',0,1);
 await assert.rejects(()=>compareReplicatedSessions(a,phase,subtle),/protocols differ/);
});
test('P3 tampered pixels, treatment schedule and summary do not verify',async()=>{
 const original=await make('study_run_001');
 const change=JSON.parse(JSON.stringify(original));
 change.trials[0].rgbaBase64='AAAA';
 await assert.rejects(()=>verifyReplicatedSession(change,subtle),/SHA-256 mismatch/);
 const reordered=JSON.parse(JSON.stringify(original));reordered.trials[1].levelIndex=2;
 const {sha256,...body}=reordered;reordered.sha256=await sha256Hex(canonicalJson(body),subtle);
 await assert.rejects(()=>verifyReplicatedSession(reordered,subtle),/counterbalance protocol/);
 const summary=JSON.parse(JSON.stringify(original));summary.summary[0].meanLuma8=999;
 const {sha256:ignored,...payload}=summary;summary.sha256=await sha256Hex(canonicalJson(payload),subtle);
 await assert.rejects(()=>verifyReplicatedSession(summary,subtle),/dispersions do not reproduce/);
});
test('P3 reproducible ZIP archive contains JSON and nine lossless PNG figures',async()=>{
 const archive=Buffer.from(await exportReplicatedZip(await make('study_run_001'),subtle));
 assert.equal(archive.readUInt32LE(0),0x04034b50);
 assert.ok(archive.includes(Buffer.from('experiment.json')));
 assert.ok(archive.includes(Buffer.from('figures/trial-09.png')));
 assert.equal(archive.readUInt16LE(archive.length-12),10);
});
