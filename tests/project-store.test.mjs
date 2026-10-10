import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,randomUUID} from 'node:crypto';
import {createBuildReceipt} from '../src/build-evidence.mjs';
import {PROJECT_SCHEMA,createProject,validateProject,listProjects,saveProject,
  importProject,exportProject,listReceipts,saveReceipt,findReceipt} from '../src/project-store.mjs';
const subtle=webcrypto.subtle;
const now=()=> '2026-10-10T07:00:00.000Z';
const uuid=()=>randomUUID();
function storage(){
  const data=new Map();
  return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),raw:data};
}
function create(overrides={}){
  return createProject({name:'Experiment A',demoId:'original',
    parameters:{zoom:1,angle:0,speed:1,hue:0,brightness:1},...overrides},{clock:now,randomUUID:uuid});
}
async function receipt(){
  return createBuildReceipt({
    shaderBody:'o.rgb=vec3(1.);',expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(1.);}',
    demoId:'original',attribution:'@YoheiNishitsuji',
    checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
    viewport:{width:390,height:220},
    parameters:{zoom:1,angle:0,speed:1,hue:0,brightness:1},shaderTimeSeconds:0
  },{subtle,clock:now});
}
test('P1 project schema validates source, sliders, identity and UTC timestamps',()=>{
  const p=create();assert.equal(p.schema,PROJECT_SCHEMA);assert.equal(validateProject(p),true);
  assert.ok(p.id.length>=8);
});
test('P1 local project save/overwrite/read has no duplicates',()=>{
  const s=storage(),p=create();
  saveProject(p,s);
  saveProject({...p,name:'Experiment A revised'},s);
  assert.equal(listProjects(s).length,1);
  assert.equal(listProjects(s)[0].name,'Experiment A revised');
});
test('P1 project JSON round-trip keeps parameters and rekeys imports',()=>{
  const s=storage(),p=create({parameters:{zoom:2,angle:35,speed:.5,hue:-60,brightness:1.3}});
  const raw=exportProject(p);const imported=importProject(raw,{storage:s,clock:now,randomUUID:uuid});
  assert.notEqual(imported.id,p.id);
  assert.deepEqual(imported.parameters,p.parameters);
  assert.equal(listProjects(s).length,1);
});
test('P1 importing a project never trusts unattached build hashes',()=>{
  const s=storage(),p=create({buildIds:['a'.repeat(64)]});
  const imported=importProject(exportProject(p),{storage:s,clock:now,randomUUID:uuid});
  assert.deepEqual(imported.buildIds,[]);
});
test('P1 malformed or out-of-range project data is rejected',()=>{
  for(const bad of [
    p=>{p.demoId='unknown';},p=>{p.parameters.angle=9999;},
    p=>{p.parameters.speed='fast';},p=>{p.name='';},
    p=>{p.buildIds.push('not-a-sha');},p=>{p.schema='glsl-lab/project/999';}
  ]) {const p=create();bad(p);assert.throws(()=>validateProject(p));}
});
test('P1 tampered local projects produce an explicit error without overwriting',()=>{
  const s=storage(),p=create();
  saveProject(p,s);
  const list=listProjects(s);list[0].parameters.zoom=Infinity;
  // JSON.stringify(Infinity) becomes null: invalid, must not be accepted.
  s.setItem('glsl-lab:projects:v1',JSON.stringify(list));
  assert.throws(()=>listProjects(s),/Invalid parameter/);
  assert.notEqual(s.getItem('glsl-lab:projects:v1'),null);
});
test('P1 bad input to import is rejected and safe store is preserved',()=>{
  const s=storage(),p=create();saveProject(p,s);
  assert.throws(()=>importProject('{"evil":true}',{storage:s,clock:now,randomUUID:uuid}));
  assert.equal(listProjects(s).length,1);
});
test('P1 only hash-verified receipts enter persistent evidence store',async()=>{
  const s=storage(),good=await receipt();
  await saveReceipt(good,s,subtle);
  await saveReceipt(good,s,subtle);
  assert.equal((await listReceipts(s,subtle)).length,1);
  assert.equal((await findReceipt(good.sha256,s,subtle)).shader.body,good.shader.body);
});
test('P1 altered evidence is rejected without mutating previous receipts',async()=>{
  const s=storage(),good=await receipt();
  await saveReceipt(good,s,subtle);
  const forged=JSON.parse(JSON.stringify(good));forged.viewport.width=200;
  await assert.rejects(()=>saveReceipt(forged,s,subtle),/hash mismatch/);
  assert.equal((await listReceipts(s,subtle)).length,1);
});
test('P1 corrupted stored receipts fail closed, not silently deleted',async()=>{
  const s=storage(),good=await receipt();
  await saveReceipt(good,s,subtle);
  const altered=JSON.parse(s.getItem('glsl-lab:receipts:v1'));
  altered[0].viewport.height=999;
  s.setItem('glsl-lab:receipts:v1',JSON.stringify(altered));
  await assert.rejects(()=>listReceipts(s,subtle),/hash mismatch/);
  assert.ok(s.getItem('glsl-lab:receipts:v1'));
});
