import test from 'node:test';
import assert from 'node:assert/strict';
import { NODE_TYPES, GRAPH_VERSION, createStarterGraph, validateGraph, emitGLSL, parseGraph } from '../src/expression-graph.mjs';

function mutate(edit) { const graph = createStarterGraph(); edit(graph); return graph; }

test('graph schema is versioned, has five typed operation kinds', () => {
  assert.equal(GRAPH_VERSION, 1);
  assert.deepEqual(Object.keys(NODE_TYPES), ['coordinates', 'rotate', 'radius', 'wave', 'palette']);
});
test('starter graph resolves in dependency order and returns a color', () => {
  const order = validateGraph(createStarterGraph()).map(node => node.id);
  assert.deepEqual(order, ['view', 'turn', 'rings', 'pulse', 'color']);
});
test('codegen is deterministic and does not mutate its input', () => {
  const graph = createStarterGraph(), before = JSON.stringify(graph);
  const output = emitGLSL(graph);
  assert.equal(output, emitGLSL(graph));
  assert.equal(JSON.stringify(graph), before);
  assert.match(output, /vec2 n_view/);
  assert.match(output, /mat2 m_turn/);
  assert.match(output, /o\.rgb = n_color;/);
});
test('JSON roundtrip preserves graph and emitted GLSL', () => {
  const graph = createStarterGraph();
  const cloned = parseGraph(JSON.stringify(graph));
  assert.deepEqual(cloned, graph);
  assert.equal(emitGLSL(cloned), emitGLSL(graph));
});
test('node list may be supplied out of order', () => {
  const graph = mutate(g => g.nodes.reverse());
  assert.deepEqual(validateGraph(graph).map(n => n.id), ['view', 'turn', 'rings', 'pulse', 'color']);
});
test('valid slider parameter edits affect only generated values', () => {
  const first = createStarterGraph();
  const second = mutate(g => { g.nodes[1].params.angle = 1.25; });
  assert.notEqual(emitGLSL(first), emitGLSL(second));
  assert.match(emitGLSL(second), /cos\(1\.25\)/);
});
test('invalid graph version and zero nodes are rejected', () => {
  assert.throws(() => validateGraph(mutate(g => { g.version = 2; })), /version/);
  assert.throws(() => validateGraph(mutate(g => { g.nodes = []; })), /nodes/);
});
test('duplicate, missing and illegal node ids are rejected', () => {
  assert.throws(() => validateGraph(mutate(g => g.nodes[2].id = 'turn')), /Duplicate/);
  assert.throws(() => validateGraph(mutate(g => g.nodes[2].input = 'missing')), /Missing/);
  assert.throws(() => validateGraph(mutate(g => g.nodes[2].id = 'bad-id;')), /Invalid node id/);
});
test('cycles and unreachable nodes are rejected', () => {
  assert.throws(() => validateGraph(mutate(g => g.nodes[1].input = 'turn')), /cycle/);
  assert.throws(() => validateGraph(mutate(g => g.nodes.push({id:'unused',type:'coordinates'}))), /unreachable/);
});
test('type-mismatched edges and non-color outputs are rejected', () => {
  assert.throws(() => validateGraph(mutate(g => g.nodes[2].input = 'pulse')), /Type mismatch|cycle/);
  assert.throws(() => validateGraph(mutate(g => g.output = 'rings')), /color/);
});
test('non-finite, out-of-range and unknown parameters are rejected', () => {
  assert.throws(() => validateGraph(mutate(g => g.nodes[1].params.angle = NaN)), /Invalid/);
  assert.throws(() => validateGraph(mutate(g => g.nodes[1].params.angle = Infinity)), /Invalid/);
  assert.throws(() => validateGraph(mutate(g => g.nodes[1].params.angle = 200)), /Invalid/);
  assert.throws(() => validateGraph(mutate(g => g.nodes[1].params.javascript = 1)), /Unknown parameter/);
  assert.throws(() => validateGraph(mutate(g => g.nodes[1].params.angle = '0; o.rgb=vec3(1.)')), /Invalid/);
});
test('codegen never inserts arbitrary GLSL from node ids or parameters', () => {
  assert.throws(() => emitGLSL(mutate(g => g.nodes[1].id = 'evil;discard;')), /Invalid node id/);
  assert.throws(() => emitGLSL(mutate(g => g.nodes[2].params.frequency = 'sin(1.)')), /Invalid/);
});
