// Minimal typed, deterministic graph core for GLSL Lab's future visual expression builder.
// Deliberately separate from the 17 archival shader expressions.
export const GRAPH_VERSION = 1;

export const NODE_TYPES = Object.freeze({
  coordinates: { input: null, output: 'vec2', parameters: {} },
  rotate: { input: 'vec2', output: 'vec2', parameters: { angle: [-6.283185307179586, 6.283185307179586, 0] } },
  radius: { input: 'vec2', output: 'float', parameters: { frequency: [0.01, 100, 8] } },
  wave: { input: 'float', output: 'float', parameters: { speed: [-10, 10, 1] } },
  palette: { input: 'float', output: 'vec3', parameters: { hue: [0, 1, 0.59], saturation: [0, 1, 0.8] } }
});

const validId = /^[A-Za-z][A-Za-z0-9_]*$/;
function fail(message) { throw new TypeError(message); }
function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

export function validateGraph(graph) {
  if (!isObject(graph) || graph.version !== GRAPH_VERSION) fail('Graph version must be 1');
  if (!Array.isArray(graph.nodes) || !graph.nodes.length || graph.nodes.length > 128) fail('Graph must contain 1 to 128 nodes');
  if (typeof graph.output !== 'string') fail('Graph output must be a node id');
  const byId = new Map();
  for (const node of graph.nodes) {
    if (!isObject(node) || typeof node.id !== 'string' || !validId.test(node.id) || node.id.startsWith('gl_')) fail('Invalid node id');
    if (byId.has(node.id)) fail('Duplicate node id: ' + node.id);
    if (!hasOwn(NODE_TYPES, node.type)) fail('Unknown node type: ' + String(node.type));
    const spec = NODE_TYPES[node.type];
    if (spec.input === null && hasOwn(node, 'input')) fail(node.id + ' cannot have an input');
    if (spec.input !== null && typeof node.input !== 'string') fail(node.id + ' needs an input');
    if (hasOwn(node, 'params') && !isObject(node.params)) fail(node.id + ' params must be an object');
    const params = node.params || {};
    for (const [key, value] of Object.entries(params)) {
      if (!hasOwn(spec.parameters, key)) fail('Unknown parameter ' + key + ' on ' + node.id);
      const [min, max] = spec.parameters[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail('Invalid ' + node.id + '.' + key);
    }
    byId.set(node.id, node);
  }
  const visiting = new Set(), visited = new Set(), order = [];
  function visit(id) {
    const node = byId.get(id);
    if (!node) fail('Missing node reference: ' + id);
    if (visiting.has(id)) fail('Graph contains a cycle at ' + id);
    if (visited.has(id)) return;
    visiting.add(id);
    const spec = NODE_TYPES[node.type];
    if (spec.input !== null) {
      const upstream = byId.get(node.input);
      if (!upstream) fail('Missing node reference: ' + node.input);
      if (NODE_TYPES[upstream.type].output !== spec.input) fail('Type mismatch at ' + id);
      visit(node.input);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(node);
  }
  visit(graph.output);
  if (NODE_TYPES[byId.get(graph.output).type].output !== 'vec3') fail('Output must be a color (vec3)');
  if (order.length !== graph.nodes.length) fail('Graph has unreachable nodes');
  return order;
}
const glslNumber = value => Number.isInteger(value) ? value.toFixed(1) : String(value);
function param(node, key) {
  const raw = node.params || {};
  const fallback = NODE_TYPES[node.type].parameters[key][2];
  return glslNumber(hasOwn(raw, key) ? raw[key] : fallback);
}
export function emitGLSL(graph) {
  const ordered = validateGraph(graph);
  const lines = [];
  for (const node of ordered) {
    const v = 'n_' + node.id;
    const input = 'n_' + node.input;
    switch (node.type) {
      case 'coordinates':
        lines.push('vec2 ' + v + ' = (FC - r * 0.5) / r.y;');
        break;
      case 'rotate': {
        const angle = param(node, 'angle');
        lines.push('mat2 m_' + node.id + ' = mat2(cos(' + angle + '),sin(' + angle + '),-sin(' + angle + '),cos(' + angle + '));');
        lines.push('vec2 ' + v + ' = m_' + node.id + ' * ' + input + ';');
        break;
      }
      case 'radius':
        lines.push('float ' + v + ' = length(' + input + ') * ' + param(node, 'frequency') + ';');
        break;
      case 'wave':
        lines.push('float ' + v + ' = 0.5 + 0.5 * sin(' + input + ' + t * ' + param(node, 'speed') + ');');
        break;
      case 'palette':
        lines.push('vec3 ' + v + ' = hsv(' + param(node, 'hue') + ', ' + param(node, 'saturation') + ', ' + input + ');');
        break;
    }
  }
  lines.push('o.rgb = n_' + graph.output + ';');
  return lines.join('\n');
}
export function createStarterGraph() {
  return {
    version: GRAPH_VERSION,
    nodes: [
      { id: 'view', type: 'coordinates' },
      { id: 'turn', type: 'rotate', input: 'view', params: { angle: 0 } },
      { id: 'rings', type: 'radius', input: 'turn', params: { frequency: 8 } },
      { id: 'pulse', type: 'wave', input: 'rings', params: { speed: 1 } },
      { id: 'color', type: 'palette', input: 'pulse', params: { hue: 0.59, saturation: 0.8 } }
    ],
    output: 'color'
  };
}
export function parseGraph(json) {
  if (typeof json !== 'string') fail('Graph JSON must be a string');
  const graph = JSON.parse(json);
  validateGraph(graph);
  return graph;
}
