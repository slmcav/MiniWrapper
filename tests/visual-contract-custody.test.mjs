import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const forbiddenNames=new Set([
  'glsl_lab_shader_research_dashboard.png',
  'a_wide_high_resolution_promotional_ui_mockup_da_1.png'
]);
const forbiddenFolders=new Set(['visual-contract','design-reference-image']);
const ignored=new Set(['.git','node_modules','test-results','playwright-report','.cache']);
test('the approved off-repository design image and derivatives are not part of source',()=>{
  const found=[];
  function scan(dir){
    for(const ent of readdirSync(dir,{withFileTypes:true})){
      if(ignored.has(ent.name))continue;
      const current=resolve(dir,ent.name);
      if(forbiddenNames.has(ent.name) || forbiddenFolders.has(ent.name))
        found.push(relative(root,current));
      if(ent.isDirectory() && !forbiddenFolders.has(ent.name))scan(current);
    }
  }
  scan(root);
  assert.deepEqual(found,[],'Visual-contract assets must stay out of GitHub');
});
