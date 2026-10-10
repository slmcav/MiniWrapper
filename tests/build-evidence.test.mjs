import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createStarterGraph,emitGLSL} from '../src/expression-graph.mjs';
import {createStarterDAG,emitDAG,connectDAG} from '../src/graph-dag.mjs';
import {BUILD_RECEIPT_SCHEMA, canonicalJson,createBuildReceipt,validateBuildReceipt,verifyBuildReceipt} from '../src/build-evidence.mjs';
const subtle=webcrypto.subtle;
const input=()=>({
  shaderBody:'vec3 q=vec3(0.); o.rgb=vec3(1.);',
  expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(1.);}',
  demoId:'original',attribution:'@YoheiNishitsuji',
  checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
  viewport:{width:300,height:500},
  parameters:{zoom:1,angle:0,speed:1,hue:0,brightness:1},
  shaderTimeSeconds:2.5
});
const build=(value=input(),time='2026-10-10T06:00:00.000Z')=>createBuildReceipt(value,{subtle,clock:()=>time});
test('successful build generates a hashed, validated v1 receipt',async()=>{
  const receipt=await build();
  assert.equal(receipt.schema,BUILD_RECEIPT_SCHEMA);
  assert.equal(receipt.sha256.length,64);
  assert.equal(receipt.evidenceClass,'observed-compile-link-draw');
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.parameters));
  assert.ok(Object.isFrozen(receipt.shader));
  assert.ok(Object.isFrozen(receipt.checks));
  assert.equal(validateBuildReceipt(receipt),true);
  assert.equal(await verifyBuildReceipt(receipt,subtle),true);
});
test('identical observations hash identically even when captured at different UTC times',async()=>{
  const a=await build(input(),'2026-10-10T06:00:00.000Z');
  const b=await build(input(),'2026-10-11T06:00:00.000Z');
  assert.equal(a.sha256,b.sha256);
  assert.notEqual(a.capturedAt,b.capturedAt);
});
test('changed source, parameters, dimensions or measured timing change the hash',async()=>{
  const baseline=await build();
  for(const edit of [
    x=>{x.shaderBody+=' x';},x=>{x.parameters.zoom=1.2;},x=>{x.viewport.width=400;},x=>{x.compileCpuMs=11.2;}
  ]) {const another=input();edit(another);assert.notEqual((await build(another)).sha256,baseline.sha256);}
});
test('compile-only or link-only results can never mint validated receipts',async()=>{
  for(const key of ['vertexCompiled','fragmentCompiled','linked','frameDrawn']){
    const x=input();x.checks[key]=false;
    await assert.rejects(()=>build(x),new RegExp(key));
  }
  const bad=input();bad.checks.glError=1282;
  await assert.rejects(()=>build(bad),/WebGL error/);
});
test('missing and out-of-range parameters are rejected',async()=>{
  for(const edit of [x=>{delete x.parameters.zoom;},x=>{x.parameters.zoom=3;},x=>{x.parameters.hue=NaN;},x=>{x.parameters.speed=Infinity;}]) {
    const x=input();edit(x);await assert.rejects(()=>build(x));
  }
});
test('unknown fields, unsafe values and invalid dimensions are rejected',async()=>{
  for(const edit of [x=>{x.fabricatedMetric=0.9;},x=>{x.viewport.width=0;},x=>{x.checks.totallyVerified=true;},x=>{x.parameters.extra=1;}]) {
    const x=input();edit(x);await assert.rejects(()=>build(x));
  }
});
test('CPU compile time is optional, never implicitly zero',async()=>{
  const a=await build(); assert.ok(!Object.hasOwn(a,'compileCpuMs'));
  const x=input();x.compileCpuMs=17.25;
  assert.equal((await build(x)).compileCpuMs,17.25);
});
test('canonical JSON has deterministic object ordering and rejects nonfinite data',()=>{
  assert.equal(canonicalJson({z:4,a:3}),canonicalJson({a:3,z:4}));
  assert.throws(()=>canonicalJson({bad:Infinity}),/finite/);
});
test('tampering a saved receipt invalidates its hash',async()=>{
  const original=await build();
  const clone=JSON.parse(JSON.stringify(original));clone.parameters.zoom=1.9;
  await assert.rejects(()=>verifyBuildReceipt(clone,subtle),/hash mismatch/);
});
test('round-trip JSON receipt retains validated evidence',async()=>{
  const receipt=await build();
  const parsed=JSON.parse(JSON.stringify(receipt));
  assert.equal(await verifyBuildReceipt(parsed,subtle),true);
});
test('non-UTC or invalid observation timestamps rejected',async()=>{
  await assert.rejects(()=>build(input(),'tomorrow'),/UTC ISO/);
  await assert.rejects(()=>build(input(),'2026-10-10T06:00:00-07:00'),/UTC ISO/);
});

test('P2 generated shader receipts retain the exact typed graph and verify its GLSL',async()=>{
  const graph=createStarterGraph(),body=emitGLSL(graph);
  const typed=input();typed.shaderBody=body;typed.demoId='builder';
  typed.attribution='User-authored via GLSL Lab expression graph';typed.graph=graph;
  const result=await build(typed);
  assert.deepEqual(result.graph,graph);
  assert.equal(await verifyBuildReceipt(JSON.parse(JSON.stringify(result)),subtle),true);
});
test('P2 cannot mint an authored graph receipt with missing or mismatched graph',async()=>{
  const typed=input();typed.demoId='builder';typed.shaderBody=emitGLSL(createStarterGraph());
  await assert.rejects(()=>build(typed),/requires the authored graph/);
  typed.graph=createStarterGraph();typed.shaderBody='o.rgb = vec3(0.);';
  await assert.rejects(()=>build(typed),/not generated/);
  const demo=input();demo.graph=createStarterGraph();
  await assert.rejects(()=>build(demo),/must not claim a graph/);
});

test('P2 DAG v2 receipt contains exact typed wiring, layout and generated source',async()=>{
  const graph=createStarterDAG(),body=emitDAG(graph),record=input();
  record.demoId='builder';record.attribution='User-authored via GLSL Lab expression graph';
  record.graph=graph;record.shaderBody=body;
  const receipt=await build(record);
  assert.equal(receipt.graph.version,2);
  assert.equal(receipt.graph.nodes.length,8);
  assert.equal(receipt.shader.body,body);
  assert.equal(await verifyBuildReceipt(JSON.parse(JSON.stringify(receipt)),subtle),true);
});
test('P2 DAG v2 receipts reject unused nodes, mismatched source and bad version',async()=>{
  const graph=createStarterDAG(),record=input();
  record.demoId='builder';record.attribution='User-authored via GLSL Lab expression graph';
  record.graph=graph;record.shaderBody='o.rgb = vec3(0.);';
  await assert.rejects(()=>build(record),/not generated/);
  record.shaderBody=emitDAG(graph);
  record.graph=connectDAG(graph,'blend','b','waveA');
  await assert.rejects(()=>build(record),/Unused nodes/);
  record.graph={...graph,version:99};
  await assert.rejects(()=>build(record),/Unsupported builder graph version/);
});
