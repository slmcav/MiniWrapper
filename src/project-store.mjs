// P1 local-first storage: versioned project state and independently hashed build receipts.
// This module never invents a successful build. Only validated evidence can enter the receipt store.
import { verifyBuildReceipt, canonicalJson } from './build-evidence.mjs';
import { validateGraph } from './expression-graph.mjs';
import { inspectDAG } from './graph-dag.mjs';
export const PROJECT_SCHEMA='glsl-lab/project/1';
export const PROJECT_STORAGE_KEY='glsl-lab:projects:v1';
export const RECEIPT_STORAGE_KEY='glsl-lab:receipts:v1';
const ids=new Set(['original','rotation','yohei','builder']);
const bounds={zoom:[.5,2.5],angle:[-180,180],speed:[0,2.5],hue:[-180,180],brightness:[.25,2]};
function insist(test,message){if(!test)throw new TypeError(message);}
function record(x){return !!x && typeof x==='object' && !Array.isArray(x);}
function utc(x){return typeof x==='string'&&x.endsWith('Z')&&!Number.isNaN(Date.parse(x));}
const clone=x=>JSON.parse(JSON.stringify(x));
function parameters(x){
  insist(record(x) && Object.keys(x).sort().join(',')===Object.keys(bounds).sort().join(','),'Five shader parameters required');
  const result={};
  for(const [key,[min,max]] of Object.entries(bounds)){
    const v=x[key];insist(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,'Invalid parameter '+key);result[key]=v;
  }
  return result;
}
function exactKeys(obj,keys,label){
  insist(record(obj)&&Object.keys(obj).sort().join(',')===keys.slice().sort().join(','),'Unexpected '+label+' fields');
}
export function createProject({name='Untitled project',demoId='original',parameters:values,id,createdAt,buildIds=[],graph}={},options={}){
  const now=(options.clock||(()=>new Date().toISOString()))();
  const project={schema:PROJECT_SCHEMA,id:id||((options.randomUUID||(()=>globalThis.crypto.randomUUID()))()),
    name,demoId,parameters:parameters(values||{zoom:1,angle:0,speed:1,hue:0,brightness:1}),
    buildIds:clone(buildIds),createdAt:createdAt||now,updatedAt:now};
  if(demoId==='builder'){
    insist(record(graph),'Builder project requires a typed expression graph');
    if(graph.version===1)validateGraph(graph);
    else if(graph.version===2)inspectDAG(graph);
    else insist(false,'Unsupported graph version');
    project.graph=clone(graph);
  }else insist(graph===undefined,'Demo projects cannot contain an expression graph');
  validateProject(project);
  return project;
}
export function validateProject(project){
  exactKeys(project,project.demoId==='builder'
    ?['schema','id','name','demoId','parameters','buildIds','createdAt','updatedAt','graph']
    :['schema','id','name','demoId','parameters','buildIds','createdAt','updatedAt'],'project');
  insist(project.schema===PROJECT_SCHEMA,'Unsupported project schema');
  insist(typeof project.id==='string'&&/^[a-zA-Z0-9_-]{8,64}$/.test(project.id),'Invalid project ID');
  insist(typeof project.name==='string'&&project.name.trim().length>0&&project.name.length<=80,'Project name must be 1 to 80 characters');
  insist(ids.has(project.demoId),'Unsupported Lab demo ID');
  if(project.demoId==='builder'){
    if(project.graph?.version===1)validateGraph(project.graph);
    else if(project.graph?.version===2)inspectDAG(project.graph);
    else insist(false,'Unsupported graph version');
  }
  parameters(project.parameters);
  insist(utc(project.createdAt)&&utc(project.updatedAt),'UTC timestamps required');
  insist(Array.isArray(project.buildIds)&&project.buildIds.length<=80&&new Set(project.buildIds).size===project.buildIds.length
    &&project.buildIds.every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)),'Invalid build links');
  return true;
}
function getArray(storage,key){
  const raw=storage.getItem(key);
  if(raw===null)return [];
  const list=JSON.parse(raw);
  insist(Array.isArray(list),'Stored data is malformed');
  return list;
}
export function listProjects(storage=globalThis.localStorage){
  const list=getArray(storage,PROJECT_STORAGE_KEY);
  insist(list.length<=50,'Project store exceeds safe limit');
  return list.map(x=>{validateProject(x);return clone(x);});
}
export function saveProject(project,storage=globalThis.localStorage){
  validateProject(project);
  const list=listProjects(storage);
  const index=list.findIndex(p=>p.id===project.id);
  if(index>=0)list[index]=clone(project);
  else {insist(list.length<50,'Project store full: export projects before adding more');list.push(clone(project));}
  storage.setItem(PROJECT_STORAGE_KEY,canonicalJson(list));
  return clone(project);
}
export function importProject(json,{storage=globalThis.localStorage,randomUUID=()=>globalThis.crypto.randomUUID(),clock=()=>new Date().toISOString()}={}){
  insist(typeof json==='string'&&json.length<=100_000,'Project JSON must be a text file under 100 KB');
  const parsed=JSON.parse(json);validateProject(parsed);
  // Imported projects receive a fresh identity; linked receipt hashes are omitted until their evidence is verified locally.
  const project=createProject({name:parsed.name,demoId:parsed.demoId,parameters:parsed.parameters,graph:parsed.graph,buildIds:[]},{randomUUID,clock});
  return saveProject(project,storage);
}
export function exportProject(project){validateProject(project);return canonicalJson(project)+'\n';}
export async function listReceipts(storage=globalThis.localStorage,subtle=globalThis.crypto?.subtle){
  const list=getArray(storage,RECEIPT_STORAGE_KEY);
  insist(list.length<=80,'Receipt store exceeds safe limit');
  for(const receipt of list)await verifyBuildReceipt(receipt,subtle);
  return list.map(clone);
}
export async function saveReceipt(receipt,storage=globalThis.localStorage,subtle=globalThis.crypto?.subtle){
  await verifyBuildReceipt(receipt,subtle);
  const list=await listReceipts(storage,subtle);
  const found=list.find(r=>r.sha256===receipt.sha256);
  if(found)return found;
  insist(list.length<80,'Build evidence store full: export before saving more');
  list.push(clone(receipt));
  storage.setItem(RECEIPT_STORAGE_KEY,canonicalJson(list));
  return clone(receipt);
}
export async function findReceipt(sha,storage=globalThis.localStorage,subtle=globalThis.crypto?.subtle){
  insist(typeof sha==='string'&&/^[a-f0-9]{64}$/.test(sha),'Invalid receipt identifier');
  return (await listReceipts(storage,subtle)).find(x=>x.sha256===sha)||null;
}
