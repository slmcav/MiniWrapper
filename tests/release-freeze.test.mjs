// Fail-closed release gate: archive lineage, supply chain and truthful scientific status.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SOURCE_SNAPSHOT_COMMIT,PINNED_SOURCE_BLOBS} from '../src/source-lineage.mjs';
import {ORIGINAL_DEMO_SIGNATURES} from '../src/research-source-policy.mjs';

const read=async(path)=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('The exact browser dependency tree is frozen by integrity-checked npm lockfile',async()=>{
 const pkg=JSON.parse(await read('package.json'));
 const lock=JSON.parse(await read('package-lock.json'));
 assert.equal(lock.lockfileVersion,3);
 assert.equal(lock.name,pkg.name);
 assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies);
 assert.deepEqual(Object.keys(lock.packages).sort(),[
  '','node_modules/@playwright/test','node_modules/playwright','node_modules/playwright-core'
 ].sort());
 for(const [name,data] of Object.entries(lock.packages)){
  if(name==='')continue;
  assert.match(data.integrity,/^sha512-[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(data.resolved,'https://registry.npmjs.org/'+
    (name==='node_modules/@playwright/test'?'@playwright/test/-/test-1.64.0.tgz':
    name==='node_modules/playwright'?'playwright/-/playwright-1.64.0.tgz':
    'playwright-core/-/playwright-core-1.64.0.tgz'));
  assert.equal(data.version,'1.64.0');
 }
});

test('Release source tree names 36 exact producer blobs, with no duplicate or missing bytes',async()=>{
 assert.match(SOURCE_SNAPSHOT_COMMIT,/^[a-f0-9]{40}$/);
 assert.equal(PINNED_SOURCE_BLOBS.length,36);
 const seen=new Set();
 for(const {path,gitBlobSha1} of PINNED_SOURCE_BLOBS){
  assert.ok(!seen.has(path),'Duplicate producer: '+path);seen.add(path);
  const bytes=await readFile(new URL('../'+path,import.meta.url));
  const digest=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(digest,gitBlobSha1,'A producer mutated after its freeze: '+path);
 }
 for(const mandatory of ['package-lock.json','glsl-lab.html','src/manuscript-latex.mjs','src/research-source-policy.mjs',
   'src/lab-visual-contract.css','src/lab-visual-contract.mjs','src/manuscript-verify.mjs'])
  assert.ok(seen.has(mandatory),'Unfrozen research producer: '+mandatory);
});

test('Research UI is local-first, and the private reference comp is never imported',async()=>{
 const html=await read('glsl-lab.html');
 const css=await read('src/lab-visual-contract.css');
 const view=await read('src/lab-visual-contract.mjs');
 for(const script of html.matchAll(/<script\b([^>]+)>/g)){
  const src=script[1].match(/\bsrc="([^"]+)"/);
  if(src)assert.match(src[1],/^\.\/src\/[a-z0-9-]+\.mjs$/);
 }
 for(const stylesheet of html.matchAll(/<link\b([^>]+)>/g)){
  const href=stylesheet[1].match(/\bhref="([^"]+)"/);
  if(href)assert.match(href[1],/^\.\/src\/[a-z0-9-]+\.css$/);
 }
 for(const source of [html,css,view]){
  assert.doesNotMatch(source,/GLSL Lab Shader Research Dashboard\.png|visual-contract\.png|data:image\/png;base64/i);
 }
 assert.match(html,/id="paperPreview"[^>]+sandbox="allow-same-origin allow-modals"/);
 assert.match(view,/\.textContent|document\.createTextNode|\.append\(/);
 assert.doesNotMatch(view,/\beval\s*\(|\bnew Function\s*\(/);
});

test('Academic PDF production is native TeX with actual hashed outputs and no shell escape',async()=>{
 const latex=await read('src/manuscript-latex.mjs');
 const script=await read('src/latex-build-scripts.mjs');
 assert.match(latex,/verifyManuscript\(bundle,subtle\)/);
 assert.match(latex,/\\includegraphics/);
 assert.match(script,/-no-shell-escape/);
 assert.match(script,/FORCE_SOURCE_DATE/);
 assert.match(script,/SOURCE_DATE_EPOCH/);
 assert.match(script,/build-receipt\.json/);
 assert.match(script,/sha256sum manuscript\.pdf/);
 assert.match(script,/Get-FileHash -LiteralPath "manuscript\.pdf" -Algorithm SHA256/);
 assert.match(script,/GLSL-/);
});

test('The scientific release gate never converts reader self-reports into peer approval',async()=>{
 const review=await read('src/scholarly-review.mjs');
 const source=await read('src/source-review-dossier.mjs');
 const manuscript=await read('src/manuscript-engine.mjs');
 const verification=await read('src/manuscript-verify.mjs');
 assert.match(review,/publicationAuthorized:false/);
 assert.match(review,/reviewerName:null/);
 assert.match(source,/authenticatedHumanReview:false,publicationAuthorized:false/);
 assert.match(manuscript,/academicManuscriptUnlocked:false/);
 assert.match(verification,/manuscriptReviewCompleted:false,publicationAuthorized:false/);
 assert.equal(ORIGINAL_DEMO_SIGNATURES.length,17);
});
