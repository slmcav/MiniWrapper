import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphHistory,graphOrder,insertOperation,removeOperation,moveOperation,setOperationParameter,parametersFor,exportGraph,importGraph,emitGLSL,createStarterGraph} from '../src/graph-editor.mjs';
test('P2 core: inserted Turn/Wave nodes maintain valid typed connections',()=>{
 let g=createStarterGraph();g=insertOperation(g,'rotate');g=insertOperation(g,'wave');
 assert.equal(graphOrder(g).length,7);
 assert.match(emitGLSL(g),/n_rotate1/);assert.match(emitGLSL(g),/n_wave1/);
});
test('P2 optional node deletion automatically reconnects downstream',()=>{
 let g=insertOperation(createStarterGraph(),'wave');
 g=removeOperation(g,'pulse');
 assert.deepEqual(graphOrder(g),['view','turn','rings','wave1','color']);
 assert.match(emitGLSL(g),/n_wave1/);
});
test('P2 required nodes are protected',()=>{
 assert.throws(()=>removeOperation(createStarterGraph(),'rings'),/only optional/i);
 assert.throws(()=>insertOperation(createStarterGraph(),'coordinates'),/Only Turn or Wave/);
});
test('P2 same-type reorder preserves graph and different-type reorder rejected',()=>{
 let g=insertOperation(createStarterGraph(),'rotate');
 g=setOperationParameter(g,'rotate1','angle',2);
 g=moveOperation(g,'rotate1',-1);
 assert.deepEqual(graphOrder(g).slice(0,4),['view','rotate1','turn','rings']);
 assert.match(emitGLSL(g),/cos\(2\.0\)/);
 assert.throws(()=>moveOperation(g,'turn',1),/same type/);
});
test('P2 slider changes update deterministic GLSL',()=>{
 const start=createStarterGraph(),edited=setOperationParameter(start,'rings','frequency',15);
 assert.notEqual(emitGLSL(start),emitGLSL(edited));
 assert.equal(emitGLSL(edited),emitGLSL(edited));
 assert.equal(parametersFor(edited.nodes.find(n=>n.id==='rings'))[0].value,15);
 assert.equal(start.nodes.find(n=>n.id==='rings').params.frequency,8);
});
test('P2 reject invalid parameters, cycles, and unknown inputs',()=>{
 assert.throws(()=>setOperationParameter(createStarterGraph(),'turn','angle',Infinity),/range/);
 assert.throws(()=>setOperationParameter(createStarterGraph(),'turn','bad',0),/Unknown/);
 const g=createStarterGraph();g.nodes[1].input='turn';
 assert.throws(()=>importGraph(JSON.stringify(g)),/cycle/);
});
test('P2 undo redo tracks graph states and invalidates redo after branching',()=>{
 const h=new GraphHistory();const before=h.graph;
 h.apply(insertOperation(h.graph,'rotate'));h.apply(setOperationParameter(h.graph,'rotate1','angle',.5));
 assert.ok(h.canUndo);h.undo();assert.equal(h.graph.nodes.find(n=>n.id==='rotate1').params.angle,0);
 h.redo();assert.equal(h.graph.nodes.find(n=>n.id==='rotate1').params.angle,.5);
 h.undo();h.undo();assert.deepEqual(h.graph,before);
 h.apply(insertOperation(h.graph,'wave'));assert.equal(h.canRedo,false);
});
test('P2 import/export round-trips and rejects script injection',()=>{
 const g=insertOperation(createStarterGraph(),'wave');
 assert.deepEqual(importGraph(exportGraph(g)),g);
 const poisoned=JSON.parse(exportGraph(g));poisoned.nodes[1].id='x;discard';
 assert.throws(()=>importGraph(JSON.stringify(poisoned)),/Invalid node id/);
});
