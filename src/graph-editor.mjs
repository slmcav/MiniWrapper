// P2 immutable linear node-editor operations. Every transition validates typed graph connectivity.
// The UI only exposes valid insertions and never silently imports arbitrary GLSL as nodes.
import {NODE_TYPES,validateGraph,createStarterGraph,emitGLSL,parseGraph} from './expression-graph.mjs';
const deep=x=>JSON.parse(JSON.stringify(x));
const insist=(v,m)=>{if(!v)throw new TypeError(m);};
const generated=(graph,type)=>{
  let number=1,id;
  do{id=type+number++;}while(graph.nodes.some(n=>n.id===id));
  return id;
};
export const OPERATION_LABELS=Object.freeze({
  coordinates:'Coordinates',rotate:'Turn',radius:'Distance',wave:'Wave',palette:'Color'
});
export function graphOrder(graph){return validateGraph(graph).map(n=>n.id);}
export function parametersFor(node){
  const def=NODE_TYPES[node.type];insist(def,'Unknown operation');
  return Object.entries(def.parameters).map(([name,[min,max,fallback]])=>({
    name,min,max,value:node.params?.[name]??fallback
  }));
}
function graphFromChain(nodes) {
  const chain=nodes.map(n=>deep(n));
  chain.forEach((node,i)=>{
    if(i===0)delete node.input;
    else node.input=chain[i-1].id;
  });
  const graph={version:1,nodes:chain,output:chain.at(-1).id};
  validateGraph(graph);
  return graph;
}
export function insertOperation(graph,type){
  const order=validateGraph(graph);
  insist(type==='rotate'||type==='wave','Only Turn or Wave can be inserted');
  insist(order.length<32,'Builder supports at most 32 operations');
  const node={id:generated(graph,type),type,params:Object.fromEntries(
    Object.entries(NODE_TYPES[type].parameters).map(([name,spec])=>[name,spec[2]]))};
  const location=type==='rotate'?order.findIndex(n=>n.type==='radius'):order.findIndex(n=>n.type==='palette');
  insist(location>0,'Cannot place operation in current graph');
  return graphFromChain([...order.slice(0,location),node,...order.slice(location)]);
}
export function removeOperation(graph,id){
  const nodes=validateGraph(graph);
  const target=nodes.find(n=>n.id===id);
  insist(target&&(target.type==='rotate'||target.type==='wave'),'Only optional Turn and Wave operations can be removed');
  return graphFromChain(nodes.filter(n=>n.id!==id));
}
export function moveOperation(graph,id,direction){
  const nodes=validateGraph(graph).map(deep);
  const index=nodes.findIndex(n=>n.id===id);
  insist(index>=0,'Operation not found');
  insist(direction===-1||direction===1,'Direction must be -1 or 1');
  const next=index+direction;
  insist(next>=0&&next<nodes.length&&nodes[index].type===nodes[next].type,'Can only reorder operations of the same type');
  [nodes[index],nodes[next]]=[nodes[next],nodes[index]];
  return graphFromChain(nodes);
}
export function setOperationParameter(graph,id,name,value){
  const nodes=validateGraph(graph).map(deep);
  const node=nodes.find(n=>n.id===id);
  insist(!!node,'Operation not found');
  const def=NODE_TYPES[node.type].parameters[name];
  insist(!!def,'Unknown operation parameter');
  const [min,max]=def;
  insist(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,'Parameter out of range');
  node.params={...node.params,[name]:value};
  const updated={version:graph.version,nodes,output:graph.output};
  validateGraph(updated);
  return updated;
}
export class GraphHistory{
  #past=[];#future=[];#current;
  constructor(graph=createStarterGraph()){validateGraph(graph);this.#current=deep(graph);}
  get graph(){return deep(this.#current);}
  get canUndo(){return this.#past.length>0;}
  get canRedo(){return this.#future.length>0;}
  apply(next){
    validateGraph(next);
    if(JSON.stringify(next)===JSON.stringify(this.#current))return this.graph;
    this.#past.push(this.#current);
    if(this.#past.length>60)this.#past.shift();
    this.#future=[];
    this.#current=deep(next);
    return this.graph;
  }
  undo(){
    if(!this.canUndo)return this.graph;
    this.#future.push(this.#current);
    this.#current=this.#past.pop();
    return this.graph;
  }
  redo(){
    if(!this.canRedo)return this.graph;
    this.#past.push(this.#current);
    this.#current=this.#future.pop();
    return this.graph;
  }
}
export function exportGraph(graph){validateGraph(graph);return JSON.stringify(graph,null,2)+'\n';}
export function importGraph(json){insist(typeof json==='string'&&json.length<=100000,'Graph must be JSON under 100 KB');return deep(parseGraph(json));}
export {emitGLSL,createStarterGraph};
