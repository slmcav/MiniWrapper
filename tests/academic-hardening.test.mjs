import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {ORIGINAL_DEMO_SIGNATURES,canonicalShader,identifyExampleShader,assertResearchEligibleShader} from '../src/research-source-policy.mjs';
import {pdfFilename,assertPdfFilename} from '../src/pdf-filename.mjs';
const subtle=webcrypto.subtle;
test('All seventeen attributed gallery shaders are forbidden as research evidence, even when reformatted',async()=>{
 const gallery=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const block=gallery.slice(gallery.indexOf('const DEMOS = {'),gallery.indexOf('const codeEl ='));
 const sourceRows=block.split('\n').filter(line=>/^\s*(original|rotation|yohei|demo\d+):/.test(line));
 assert.equal(sourceRows.length,17);
 assert.equal(ORIGINAL_DEMO_SIGNATURES.length,17);
 for(const line of sourceRows){
   const match=line.match(/^\s*(\w+):\s*(['"])(.*?)\2,?\s*$/);
   assert.ok(match,'Malformed demo fixture');
   const original=match[3];
   assert.equal(identifyExampleShader(original),match[1]);
   const mixed=original.slice(0,120)+' /* gallery paste */\n '+original.slice(120);
   assert.equal(identifyExampleShader(mixed),match[1]);
   const altered=original.slice(0,12)+'x'+original.slice(13,-14)+'y'+original.slice(-13);
   assert.equal(identifyExampleShader(altered),match[1],match[1]+' lightly edited paste not identified');
   assert.throws(()=>assertResearchEligibleShader({body:altered,identifier:'builder',attribution:'Independently authored'}),/excluded/);
   assert.throws(()=>assertResearchEligibleShader({
    body:mixed,identifier:'research_fixture',attribution:'Independent reader'
   }),/excluded from research/);
   assert.throws(()=>assertResearchEligibleShader({
    body:'void main(){} '+original,identifier:'research_fixture',attribution:'Independent reader'
   }),/excluded from research/);
 }
 assert.ok(canonicalShader('float a /*comment*/ = 1. ;').includes('floata=1.;'));
 assert.equal(assertResearchEligibleShader({
  body:'o.rgb=vec3(0.2,0.4,0.7);',identifier:'builder',
  attribution:'Authored in GLSL Lab'
 }),true);
});
test('Gallery source identifiers and original author attribution are rejected',()=>{
 for(const entry of ORIGINAL_DEMO_SIGNATURES){
  assert.throws(()=>assertResearchEligibleShader({
   body:'o.rgb=vec3(1.);',identifier:entry.id,attribution:'Independent author'
  }),/excluded/);
 }
 assert.throws(()=>assertResearchEligibleShader({
  body:'o.rgb=vec3(1.);',identifier:'builder',attribution:'@YoheiNishitsuji'
 }),/excluded/);
});
test('PDF file ID is deterministic for one manuscript and SHA is computed from actual PDF bytes',async()=>{
 const fake=new Uint8Array(800).fill(65);
 fake.set(new TextEncoder().encode('%PDF-1.4'),0);
 const sha='a'.repeat(64);
 const name=await pdfFilename(sha,fake,subtle);
 assert.match(name,/^GLSL-a{32}_[0-9a-f]{64}\.pdf$/);
 assert.equal(assertPdfFilename(name),true);
 assert.equal(await pdfFilename(sha,fake,subtle),name);
 fake[300]^=1;
 const revised=await pdfFilename(sha,fake,subtle);
 assert.notEqual(revised,name);
 await assert.rejects(()=>pdfFilename(sha,new Uint8Array([1,2,3]),subtle),/PDF byte stream/);
 assert.throws(()=>assertPdfFilename('manuscript.pdf'),/PDF filename/);
});


test('Academic Lab HTML is structurally unique and exposes no gallery demo presets',async()=>{
 const html=await readFile(new URL('../glsl-lab.html',import.meta.url),'utf8');
 const ids=[...html.matchAll(/\bid="([a-zA-Z0-9_-]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'Duplicate interactive element ID');
 assert.ok(ids.includes('auditCurrentStudy'));
 assert.ok(ids.includes('workflowAuthor'));
 assert.ok(ids.includes('paperDirectPdf'));
 assert.ok(!html.includes('const DEMOS ='),'Original demo source leaked into researcher-facing Lab');
 assert.ok(!html.includes('id="demo"'),'Gallery selector must not be available in the Lab');
 assert.ok(!html.includes('Download PDF directly'),'Legacy JS PDF must not be the academic pathway');
 const begin=html.indexOf('<script>\n'),end=html.indexOf('</script>',begin);
 assert.ok(begin>=0&&end>begin);
 const {spawnSync}=await import('node:child_process');
 const check=spawnSync(process.execPath,['--check'],{
  input:html.slice(begin+9,end),encoding:'utf8'
 });
 assert.equal(check.status,0,check.stderr);
});
test('Academic modules and test server maintain syntactically valid JavaScript',async()=>{
 const {readdir} = await import('node:fs/promises');
 const {spawnSync}=await import('node:child_process');
 const list=await readdir(new URL('../src/',import.meta.url));
 for(const path of list.filter(x=>x.endsWith('.mjs'))){
  const file=new URL('../src/'+path,import.meta.url);
  const check=spawnSync(process.execPath,['--check',file.pathname],{encoding:'utf8'});
  assert.equal(check.status,0,path+': '+check.stderr);
 }
});
