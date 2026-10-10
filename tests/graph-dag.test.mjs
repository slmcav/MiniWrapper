import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarterDAG,inspectDAG,emitDAG,connectDAG,addDAGNode,removeDAGNode,setDAGParam,moveDAGNode,layoutDAG,DAGHistory,importDAG,exportDAG} from '../src/graph-dag.mjs';
test('v2 branched default DAG includes two independent float branches',()=>{
 const g=createStarterDAG(),report=inspectDAG(g,{complete:true});
 assert.equal(report.unused.length,0);
 assert.match(emitDAG(g),/mix\(g_waveA, g_number/);
 assert.match(emitDAG(g),/o.rgb = g_color/);
});
test('v2 type-safe freeform port rewiring and cycle detection',()=>{
 const g=createStarterDAG();
 assert.throws(()=>connectDAG(g,'color','light','coords'),/Type mismatch/);
 assert.throws(()=>connectDAG(g,'turn','uv','turn'),/cycle/);
 const rewired=connectDAG(g,'blend','b','distance');
 assert.equal(rewired.nodes.find(x=>x.id==='blend').inputs.b,'distance');
 assert.equal(inspectDAG(rewired).unused.includes('number'),true);
});
test('v2 draft add, connect, build; disconnected nodes block promotion',()=>{
 let g=addDAGNode(createStarterDAG(),'wave');
 assert.equal(inspectDAG(g).unused.includes('wave1'),true);
 assert.throws(()=>emitDAG(g),/Unused nodes/);
 g=connectDAG(g,'blend','b','wave1');
 assert.doesNotThrow(()=>emitDAG(g));
});
test('v2 multiple typed ports allow sum and blend without implicit conversions',()=>{
 let g=addDAGNode(createStarterDAG(),'add');
 g=connectDAG(g,'blend','a','add1');
 g=connectDAG(g,'add1','a','waveA');
 g=connectDAG(g,'add1','b','number');
 assert.match(emitDAG(g),/g_waveA \+ g_number/);
});
test('v2 node removal protects dependencies and output',()=>{
 let g=createStarterDAG();
 assert.throws(()=>removeDAGNode(g,'number'),/Disconnect/);
 assert.throws(()=>removeDAGNode(g,'screen'),/Cannot remove Output/);
 g=connectDAG(g,'blend','b','waveA');g=removeDAGNode(g,'number');
 assert.equal(g.nodes.some(n=>n.id==='number'),false);
 assert.doesNotThrow(()=>emitDAG(g));
});
test('v2 immutable parameter edits, position moves and auto-layout',()=>{
 const original=createStarterDAG();let g=setDAGParam(original,'waveA','speed',2.25);
 g=moveDAGNode(g,'waveA',800,300);
 assert.equal(g.nodes.find(n=>n.id==='waveA').position.x,800);
 assert.equal(original.nodes.find(n=>n.id==='waveA').params.speed,1);
 assert.notEqual(emitDAG(g),emitDAG(original));
 const laid=layoutDAG(g);
 assert.doesNotThrow(()=>inspectDAG(laid,{complete:true}));
 assert.throws(()=>setDAGParam(g,'waveA','speed',Infinity),/Invalid/);
});
test('v2 history and JSON roundtrip preserve exact spatial layout and connections',()=>{
 const h=new DAGHistory(),before=h.graph;
 h.apply(moveDAGNode(h.graph,'waveA',777,500));
 h.undo();assert.deepEqual(h.graph,before);
 h.redo();assert.equal(h.graph.nodes.find(n=>n.id==='waveA').position.x,777);
 assert.deepEqual(importDAG(exportDAG(h.graph)),h.graph);
});
test('v2 rejects injected ids, mismatched ports, forged graph revisions',()=>{
 const data=createStarterDAG();data.nodes[1].id='bad;discard';
 assert.throws(()=>inspectDAG(data),/Invalid node id/);
 const forged=createStarterDAG();forged.nodes[1].inputs.extra='coords';
 assert.throws(()=>inspectDAG(forged),/ports mismatch/);
 const revision=createStarterDAG();revision.version=99;
 assert.throws(()=>inspectDAG(revision),/version/);
});
