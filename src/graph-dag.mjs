// GLSL Lab advanced graph v2: typed DAGs, draft connections, and spatial layouts.
// Explicitly separate from the immutable version 1 linear graph and 17 archival demos.
export const DAG_VERSION=2;
export const DAG_TYPES=Object.freeze({
  coordinates:{label:'Coordinates',out:'vec2',ports:{},params:{}},
  rotate:{label:'Turn',out:'vec2',ports:{uv:'vec2'},params:{angle:[-6.28,6.28,0]}},
  radius:{label:'Distance',out:'float',ports:{uv:'vec2'},params:{frequency:[.01,100,8]}},
  wave:{label:'Wave',out:'float',ports:{value:'float'},params:{speed:[-10,10,1]}},
  constant:{label:'Number',out:'float',ports:{},params:{value:[0,1,.4]}},
  add:{label:'Add',out:'float',ports:{a:'float',b:'float'},params:{}},
  blend:{label:'Blend',out:'float',ports:{a:'float',b:'float'},params:{mix:[0,1,.5]}},
  palette:{label:'Color',out:'vec3',ports:{light:'float'},params:{hue:[0,1,.59],saturation:[0,1,.8]}},
  output:{label:'Output',out:'vec3',ports:{color:'vec3'},params:{}}
});
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const requireOk=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
const copy=x=>JSON.parse(JSON.stringify(x));
const identifier=/^[a-zA-Z][a-zA-Z0-9_]*$/;
function nodeSpec(node){requireOk(plain(node)&&own(DAG_TYPES,node.type),'Unknown node type');return DAG_TYPES[node.type];}
export function inspectDAG(graph,{complete=false}={}){
  requireOk(plain(graph)&&graph.version===DAG_VERSION,'DAG version must be 2');
  requireOk(Array.isArray(graph.nodes)&&graph.nodes.length>0&&graph.nodes.length<=64,'DAG must contain 1 to 64 nodes');
  const all=new Map();
  for(const node of graph.nodes){
    const spec=nodeSpec(node);
    requireOk(typeof node.id==='string'&&identifier.test(node.id)&&!node.id.startsWith('gl_'),'Invalid node id');
    requireOk(!all.has(node.id),'Duplicate node id');
    requireOk(plain(node.inputs)&&Object.keys(node.inputs).sort().join(',')===Object.keys(spec.ports).sort().join(','),'Node ports mismatch: '+node.id);
    requireOk(plain(node.params)&&Object.keys(node.params).sort().join(',')===Object.keys(spec.params).sort().join(','),'Node parameters mismatch: '+node.id);
    for(const [key,[min,max]] of Object.entries(spec.params)){
      const value=node.params[key];
      requireOk(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,'Invalid parameter '+node.id+'.'+key);
    }
    requireOk(plain(node.position)&&Number.isFinite(node.position.x)&&Number.isFinite(node.position.y)&&node.position.x>=0&&node.position.x<=2400&&node.position.y>=0&&node.position.y<=2400,'Invalid node position');
    all.set(node.id,node);
  }
  const output=all.get(graph.output);
  requireOk(output?.type==='output','Graph output must be an Output node');
  const deps=new Map();
  for(const node of graph.nodes){
    const spec=nodeSpec(node),sources=[];
    for(const [port,type] of Object.entries(spec.ports)){
      const from=node.inputs[port];
      if(from===null){
        if(complete)requireOk(false,'Unconnected port: '+node.id+'.'+port);
        continue;
      }
      requireOk(typeof from==='string','Invalid source at '+node.id+'.'+port);
      const source=all.get(from);
      requireOk(!!source,'Missing source '+from);
      requireOk(nodeSpec(source).out===type,'Type mismatch for '+node.id+'.'+port);
      sources.push(from);
    }
    deps.set(node.id,sources);
  }
  const visiting=new Set(),visited=new Set(),order=[];
  function visit(id){
    requireOk(!visiting.has(id),'Graph contains cycle at '+id);
    if(visited.has(id))return;
    visiting.add(id);
    for(const dep of deps.get(id))visit(dep);
    visiting.delete(id);visited.add(id);
    order.push(all.get(id));
  }
  for(const node of graph.nodes)visit(node.id);
  const reachable=new Set();
  function mark(id){if(reachable.has(id))return;reachable.add(id);for(const dep of deps.get(id))mark(dep);}
  mark(graph.output);
  if(complete)requireOk(reachable.size===all.size,'Unused nodes must be connected to Output before building');
  return {order,reachable:[...reachable],unused:graph.nodes.filter(n=>!reachable.has(n.id)).map(n=>n.id),nodes:all};
}
function makeNode(id,type,x,y){
  const spec=DAG_TYPES[type];
  return {id,type,inputs:Object.fromEntries(Object.keys(spec.ports).map(k=>[k,null])),
    params:Object.fromEntries(Object.entries(spec.params).map(([key,v])=>[key,v[2]])),
    position:{x,y}};
}
export function createStarterDAG(){
  const coords=makeNode('coords','coordinates',30,100);
  const turn=makeNode('turn','rotate',265,80);turn.inputs.uv='coords';
  const distance=makeNode('distance','radius',495,90);distance.inputs.uv='turn';
  const wave=makeNode('waveA','wave',730,35);wave.inputs.value='distance';
  const number=makeNode('number','constant',730,225);
  const blend=makeNode('blend','blend',965,95);blend.inputs.a='waveA';blend.inputs.b='number';
  const color=makeNode('color','palette',1200,100);color.inputs.light='blend';
  const output=makeNode('screen','output',1435,100);output.inputs.color='color';
  const graph={version:2,nodes:[coords,turn,distance,wave,number,blend,color,output],output:'screen'};
  inspectDAG(graph,{complete:true});
  return graph;
}
function nextId(graph,type){let i=1;while(graph.nodes.some(n=>n.id===type+i))i++;return type+i;}
export function addDAGNode(graph,type){
  inspectDAG(graph);requireOk(own(DAG_TYPES,type)&&type!=='output','Cannot add that operation');
  requireOk(graph.nodes.length<64,'Node limit reached');
  const id=nextId(graph,type),maxX=Math.max(...graph.nodes.map(n=>n.position.x));
  const node=makeNode(id,type,Math.min(2100,maxX+80),Math.min(2100,130+graph.nodes.length*95));
  for(const [port,want] of Object.entries(DAG_TYPES[type].ports)){
    const candidate=graph.nodes.find(n=>DAG_TYPES[n.type].out===want&&n.id!==graph.output);
    if(candidate)node.inputs[port]=candidate.id;
  }
  const next=copy(graph);next.nodes.push(node);inspectDAG(next);return next;
}
export function connectDAG(graph,targetId,port,sourceId){
  inspectDAG(graph);const next=copy(graph),target=next.nodes.find(n=>n.id===targetId);
  requireOk(!!target&&own(DAG_TYPES[target.type].ports,port),'Unknown input port');
  requireOk(sourceId===null||next.nodes.some(n=>n.id===sourceId),'Unknown input source');
  target.inputs[port]=sourceId;inspectDAG(next);return next;
}
export function setDAGParam(graph,id,key,value){
  inspectDAG(graph);const next=copy(graph),node=next.nodes.find(n=>n.id===id);
  requireOk(node&&own(DAG_TYPES[node.type].params,key),'Unknown parameter');
  node.params[key]=value;inspectDAG(next);return next;
}
export function moveDAGNode(graph,id,x,y){
  inspectDAG(graph);
  const next=copy(graph),node=next.nodes.find(n=>n.id===id);requireOk(!!node,'Unknown node');
  node.position={x:Math.max(0,Math.min(2400,Math.round(x))),y:Math.max(0,Math.min(2400,Math.round(y)))};
  inspectDAG(next);return next;
}
export function removeDAGNode(graph,id){
  inspectDAG(graph);requireOk(id!==graph.output,'Cannot remove Output');
  requireOk(!graph.nodes.some(n=>Object.values(n.inputs).includes(id)),'Disconnect dependent ports first');
  const next=copy(graph);next.nodes=next.nodes.filter(n=>n.id!==id);
  inspectDAG(next);return next;
}
export function layoutDAG(graph){
  const {order}=inspectDAG(graph),byId=new Map(),columns=new Map();
  for(const n of order){
    const sources=Object.values(n.inputs).filter(x=>x!==null);
    const depth=sources.length?Math.max(...sources.map(id=>byId.get(id).depth))+1:0;
    const nInColumn=columns.get(depth)||0;columns.set(depth,nInColumn+1);
    byId.set(n.id,{depth,x:30+depth*245,y:35+nInColumn*205});
  }
  const next=copy(graph);for(const n of next.nodes)n.position={x:Math.min(2400,byId.get(n.id).x),y:Math.min(2400,byId.get(n.id).y)};
  inspectDAG(next);return next;
}
const num=n=>Number.isInteger(n)?n.toFixed(1):String(n);
export function emitDAG(graph){
  const {order}=inspectDAG(graph,{complete:true});
  const lines=[];
  for(const n of order){
    const v='g_'+n.id,src=p=>'g_'+n.inputs[p],p=k=>num(n.params[k]);
    switch(n.type){
      case 'coordinates': lines.push('vec2 '+v+' = (FC - 0.5 * r) / r.y;');break;
      case 'rotate':lines.push('vec2 '+v+' = mat2(cos('+p('angle')+'),sin('+p('angle')+'),-sin('+p('angle')+'),cos('+p('angle')+')) * '+src('uv')+';');break;
      case 'radius':lines.push('float '+v+' = length('+src('uv')+') * '+p('frequency')+';');break;
      case 'wave':lines.push('float '+v+' = 0.5 + 0.5 * sin('+src('value')+' + t * '+p('speed')+');');break;
      case 'constant':lines.push('float '+v+' = '+p('value')+';');break;
      case 'add':lines.push('float '+v+' = '+src('a')+' + '+src('b')+';');break;
      case 'blend':lines.push('float '+v+' = mix('+src('a')+', '+src('b')+', '+p('mix')+');');break;
      case 'palette':lines.push('vec3 '+v+' = hsv('+p('hue')+', '+p('saturation')+', '+src('light')+');');break;
      case 'output':lines.push('o.rgb = '+src('color')+';');break;
    }
  }
  return lines.join('\n');
}
export function importDAG(text){requireOk(typeof text==='string'&&text.length<=100000,'DAG JSON is too large');const graph=JSON.parse(text);inspectDAG(graph);return copy(graph);}
export function exportDAG(graph){inspectDAG(graph);return JSON.stringify(graph,null,2)+'\n';}
export class DAGHistory {
  #past=[];#future=[];#current;
  constructor(graph=createStarterDAG()){inspectDAG(graph);this.#current=copy(graph);}
  get graph(){return copy(this.#current);}
  get canUndo(){return this.#past.length>0;}
  get canRedo(){return this.#future.length>0;}
  apply(graph){inspectDAG(graph);if(JSON.stringify(graph)===JSON.stringify(this.#current))return this.graph;
    this.#past.push(this.#current);if(this.#past.length>60)this.#past.shift();this.#future=[];this.#current=copy(graph);return this.graph;}
  undo(){if(this.canUndo){this.#future.push(this.#current);this.#current=this.#past.pop();}return this.graph;}
  redo(){if(this.canRedo){this.#past.push(this.#current);this.#current=this.#future.pop();}return this.graph;}
}
