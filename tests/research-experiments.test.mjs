import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createBuildReceipt,canonicalJson,sha256Hex} from '../src/build-evidence.mjs';
import {createResearchCapture} from '../src/research-capture.mjs';
import {createFigureEvidence} from '../src/research-figures.mjs';
import {createSweepProtocol,createSweepSession,verifySweepSession,compareSweepSessions,exportSweepZip,parseSweepJson} from '../src/research-experiments.mjs';

const subtle=webcrypto.subtle;
globalThis.btoa??=s=>Buffer.from(s,'binary').toString('base64');
globalThis.atob??=s=>Buffer.from(s,'base64').toString('binary');
const baseline=()=>({zoom:1,angle:0,speed:1,hue:0,brightness:1});
const when=i=>()=>new Date(Date.UTC(2026,9,10,8,0,i)).toISOString();
const protocol=()=>createSweepProtocol(baseline(),'zoom',.2,2);
async function make(id,add=0,p=protocol()){
 const figures=[];
 for(let i=0;i<3;i++){
   const rgba=Uint8Array.from({length:48},(_,k)=>k%4===3?255:(k+i*9+add)%256);
   const receipt=await createBuildReceipt({
     shaderBody:'o.rgb=vec3(.2);',expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(.2);}',
     demoId:'original',attribution:'@YoheiNishitsuji',
     checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
     viewport:{width:4,height:3},
     parameters:{...p.baseline,[p.parameter]:p.levels[i]},shaderTimeSeconds:p.shaderTimeSeconds,
     compileCpuMs:10+i
   },{subtle,clock:when(i)});
   const capture=await createResearchCapture(receipt,rgba,{subtle,clock:when(i)});
   const figure=await createFigureEvidence(receipt,capture,rgba,{subtle,clock:when(i),drawSequence:i+10});
   figures.push({...figure,receipt,capture});
 }
 return createSweepSession(p,figures,{subtle,sessionId:id,clock:when(0)});
}
test('P3 fixed-time sweep produces three ordered, one-variable conditions',()=>{
 const p=protocol();assert.deepEqual(p.levels,[.8,1,1.2]);
 assert.equal(p.shaderTimeSeconds,2);
 assert.throws(()=>createSweepProtocol(baseline(),'speed'),/Only shader-uniform/);
 assert.throws(()=>createSweepProtocol(baseline(),'zoom',1.5),/step/);
});
test('P3 full pixels, figure hashes and immutable source recover from archived session',async()=>{
 const s=await make('session_0001');assert.equal(s.trials.length,3);
 assert.equal((await verifySweepSession(parseSweepJson(JSON.stringify(s)),subtle)).length,3);
 assert.deepEqual(s.trials.map(x=>x.receipt.parameters.zoom),[.8,1,1.2]);
 assert.match(s.sha256,/^[a-f0-9]{64}$/);
});
test('P3 separate sessions compare descriptively despite different image pixels',async()=>{
 const first=await make('session_0001'),second=await make('session_0002',12);
 const summary=await compareSweepSessions(first,second,subtle);
 assert.equal(summary.comparisons.length,3);
 assert.ok(summary.comparisons[0].meanAbsRgb8>0);
 assert.match(summary.inferenceScope,/independence not established/);
 await assert.rejects(()=>compareSweepSessions(first,first,subtle),/same session/);
});
test('P3 identical pixels in separate session are permissible, changed protocol is not',async()=>{
 const first=await make('session_0001'),same=await make('session_0002');
 const result=await compareSweepSessions(first,same,subtle);
 assert.deepEqual(result.comparisons.map(x=>x.changedRgbPixelFraction),[0,0,0]);
 const altered=await make('session_0003',0,createSweepProtocol(baseline(),'zoom',.1,2));
 await assert.rejects(()=>compareSweepSessions(first,altered,subtle),/protocols differ/);
});
test('P3 tampering archived pixels, parameters or drawing order invalidates the study',async()=>{
 const study=await make('session_0001');
 const damaged=structuredClone(study);damaged.trials[0].rgbaBase64='AAAA';
 await assert.rejects(()=>verifySweepSession(damaged,subtle),/hash mismatch/);
 const forged=structuredClone(study);forged.trials[2].receipt.parameters.zoom=1.9;
 const {sha256,...body}=forged;
 forged.sha256=await sha256Hex(canonicalJson(body),subtle);
 await assert.rejects(()=>verifySweepSession(forged,subtle),/hash mismatch|settings/);
});
test('P3 archive exports complete verified experiment JSON and all PNGs as ZIP',async()=>{
 const s=await make('session_0001'),zip=Buffer.from(await exportSweepZip(s,subtle));
 assert.equal(zip.readUInt32LE(0),0x04034b50);
 assert.ok(zip.includes(Buffer.from('experiment.json')));
 assert.ok(zip.includes(Buffer.from('figures/treatment-3.png')));
 assert.equal(zip.readUInt16LE(zip.length-12),4);
});
