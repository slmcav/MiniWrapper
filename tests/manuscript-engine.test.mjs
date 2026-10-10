import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createBuildReceipt} from '../src/build-evidence.mjs';
import {createResearchCapture} from '../src/research-capture.mjs';
import {createFigureEvidence} from '../src/research-figures.mjs';
import {createSweepProtocol,createSweepSession} from '../src/research-experiments.mjs';
import {createReplicatedProtocol,createReplicatedSession} from '../src/research-replications.mjs';
import {auditMethodology} from '../src/methodology-audit.mjs';
import {assembleManuscript,verifyManuscript,manuscriptRows} from '../src/manuscript-engine.mjs';
import {renderManuscriptHTML,exportManuscriptBundle} from '../src/manuscript-render.mjs';
import {createDirectPdf} from '../src/research-pdf.mjs';
import {verifyManuscriptZip,BUNDLE_VERIFICATION_SCHEMA} from '../src/manuscript-verify.mjs';
import {prepareEditorialPacket,verifyEditorialPacket} from '../src/scholarly-review.mjs';
const subtle=webcrypto.subtle;
globalThis.btoa??=s=>Buffer.from(s,'binary').toString('base64');
globalThis.atob??=s=>Buffer.from(s,'base64').toString('binary');
const baseline=()=>({zoom:1,angle:0,speed:1,hue:0,brightness:1});
const clock=i=>()=>new Date(Date.UTC(2026,9,10,12,0,i)).toISOString();
const platform=()=>({api:'WebGL2',webglVersion:'WebGL 2.0 synthetic fixture',
  shadingLanguageVersion:'WebGL GLSL ES 3.00',vendor:'masked vendor',renderer:'masked renderer',
  maxTextureSize:4096,maxRenderbufferSize:4096,maxVertexAttribs:16,
  fragmentHighpPrecision:23,devicePixelRatio:1});
async function observed(settings,i,shader='o.rgb = vec3(.5);'){
  const pixels=Uint8Array.from({length:48},(_,x)=>x%4===3?255:(x+i*17)%256);
  const receipt=await createBuildReceipt({
    shaderBody:shader,expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(.5);}',
    demoId:'original',attribution:'@YoheiNishitsuji',
    checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
    viewport:{width:4,height:3},parameters:settings,shaderTimeSeconds:2
  },{subtle,clock:clock(i)});
  const capture=await createResearchCapture(receipt,pixels,{subtle,clock:clock(i)});
  const figure=await createFigureEvidence(receipt,capture,pixels,{subtle,
    clock:clock(i),drawSequence:i+50});
  return {...figure,receipt,capture};
}
async function fixture(replicated=false,shader='o.rgb = vec3(.5);'){
  const protocol=replicated?
    createReplicatedProtocol(baseline(),'zoom',.2,2,0):
    createSweepProtocol(baseline(),'zoom',.2,2);
  const sequence=replicated?protocol.sequence:[0,1,2].map(levelIndex=>({levelIndex}));
  const values=replicated?protocol.sweep.levels:protocol.levels,figures=[];
  for(let i=0;i<sequence.length;i++){
    figures.push(await observed({...baseline(),zoom:values[sequence[i].levelIndex]},i,shader));
  }
  const session=replicated?
    await createReplicatedSession(protocol,figures,platform(),{
      sessionId:'draft_repeat_001',clock:clock(0),subtle}):
    await createSweepSession(protocol,figures,{
      sessionId:'draft_sweep_001',clock:clock(0),subtle});
  const audit=await auditMethodology(session,{subtle,clock:clock(0)});
  return {session,audit};
}
test('P4 manuscript draft uses only authenticated three-level measurements and source references',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  assert.equal(draft.record.observedDraws,3);
  assert.equal(draft.record.drawsPerTreatment,1);
  assert.deepEqual(draft.record.levels,[.8,1,1.2]);
  assert.deepEqual(draft.record.treatments.map(r=>r.n),[1,1,1]);
  assert.ok(draft.record.treatments.every(r=>r.stdevLuma8===null));
  assert.equal(draft.figures.length,3);
  assert.deepEqual(draft.references.map(r=>r.id),
    ['khronos-glsl-es300','khronos-webgl2','sacks1989']);
  assert.equal(draft.record.release.academicManuscriptUnlocked,false);
  assert.equal(await verifyManuscript(draft,subtle),true);
});
test('P4 print-ready article contains methods, equations, table, citations, figure and GLSL',async()=>{
  const {session,audit}=await fixture();
  const article=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const html=renderManuscriptHTML(article);
  for(const phrase of ['Abstract','1. Introduction','2. Materials and methods',
    '3. Results','4. Discussion','5. Limitations','6. Data and reproducibility',
    'References','Appendix A','Y′ = 0.2126 R','Not estimated','@page',
    'o.rgb = vec3(.5);','data:image/png;base64,','SHA-256'])
    assert.ok(html.includes(phrase),phrase+' missing from article');
  assert.ok(html.includes('UNREVIEWED'));
  assert.ok(!html.includes('jeremias-quilez2013'));
  assert.ok(!html.includes('lagae2010'));
  assert.ok(!html.includes('<script>'));
});
test('P4 repeated study article reports n=3 and descriptive sample SD without inferential claims',async()=>{
  const {session,audit}=await fixture(true);
  const manuscript=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  assert.equal(manuscript.record.observedDraws,9);
  assert.equal(manuscript.record.drawsPerTreatment,3);
  assert.deepEqual(manuscript.record.treatments.map(r=>r.n),[3,3,3]);
  assert.ok(manuscript.record.treatments.every(x=>x.stdevLuma8!==null));
  const html=renderManuscriptHTML(manuscript);
  assert.ok(html.includes('divisor n − 1 = 2'));
  assert.ok(html.includes('does not establish independent replication'));
  assert.equal(manuscript.figures.length,9);
  assert.equal(await verifyManuscript(manuscript,subtle),true);
});
test('P4 manuscript export bundles exact study, audit, figures, references and source code',async()=>{
  const {session,audit}=await fixture();
  const manuscript=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const product=await exportManuscriptBundle(manuscript,{subtle});
  const zip=Buffer.from(product.zip);
  assert.equal(zip.readUInt32LE(0),0x04034b50);
  assert.ok(zip.includes(Buffer.from('manuscript.html')));
  assert.ok(zip.includes(Buffer.from('references.bib')));
  assert.ok(zip.includes(Buffer.from('shader.glsl')));
  assert.ok(zip.includes(Buffer.from('figures/frame-03.png')));
  assert.equal(product.manifest.fileInventory.length,10);
  assert.ok(product.manifest.fileInventory.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
  assert.equal(product.manifest.verification.academicManuscriptUnlocked,false);
  assert.doesNotMatch(renderManuscriptHTML(manuscript,{embedImages:false}),/data:image\/png;base64,/);
});
test('P4 manuscript cannot disguise audit release blockers or altered observations',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const forged=structuredClone(draft.record);
  forged.release.academicManuscriptUnlocked=true;
  const modified={...draft,record:forged};
  assert.throws(()=>renderManuscriptHTML(modified),/Only an unreviewed/);
  await assert.rejects(()=>verifyManuscript(modified,subtle),/do not reproduce/);
  const damaged={...draft,figures:draft.figures.map(x=>({...x,png:new Uint8Array(x.png)}))};
  damaged.figures[0].png[50]^=1;
  await assert.rejects(()=>exportManuscriptBundle(damaged,{subtle}),/PNG bytes altered/);
});
test('P4 GLSL contents are HTML-escaped, not executable markup',async()=>{
  const shader='o.rgb=vec3(1.); /* </pre><script>alert("x")</script> */';
  const {session,audit}=await fixture(false,shader);
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const html=renderManuscriptHTML(draft);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;/pre&gt;'));
});

test('P5 directly generated A4 PDF has valid cross-reference, article text and embedded figures',async()=>{
  const {session,audit}=await fixture();
  const manuscript=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const pdf=Buffer.from(await createDirectPdf(manuscript,{subtle}));
  assert.equal(pdf.subarray(0,8).toString('latin1'),'%PDF-1.4');
  assert.ok(pdf.includes(Buffer.from('/Type /Pages')));
  assert.ok(pdf.includes(Buffer.from('/MediaBox [0 0 595.28 841.89]')));
  assert.ok(pdf.includes(Buffer.from('/Subtype /Image')));
  assert.ok(pdf.includes(Buffer.from('UNREVIEWED RESEARCH DRAFT')));
  assert.ok(pdf.includes(Buffer.from('2. Materials and methods')));
  assert.ok(pdf.includes(Buffer.from('References')));
  assert.ok(pdf.includes(Buffer.from('xref\n')));
  assert.ok(pdf.includes(Buffer.from('startxref\n')));
  assert.ok(pdf.includes(Buffer.from('%%EOF')));
  const size=Number(pdf.toString('latin1').match(/\/Count (\d+) >>/)[1]);
  assert.ok(size>=2);
});
test('P5 PDF generation honors nine-frame treatment statistics and verified source attribution',async()=>{
  const {session,audit}=await fixture(true);
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const pdf=Buffer.from(await createDirectPdf(draft,{subtle}));
  assert.ok(pdf.includes(Buffer.from('Sample SD =')));
  assert.ok(pdf.includes(Buffer.from('@YoheiNishitsuji')));
  assert.ok(pdf.includes(Buffer.from('independent experimental units')));
  assert.ok(pdf.includes(Buffer.from('UNREVIEWED')));
});
test('P5 tampered sources cannot produce a seemingly valid direct PDF',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const changed={...draft,record:{...draft.record,authorship:'False author'}};
  await assert.rejects(()=>createDirectPdf(changed,{subtle}),/do not reproduce/);
});
test('P5 unsigned editorial packet explicitly requires real independent human review',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const packet=await prepareEditorialPacket(draft,{subtle,clock:clock(0)});
  assert.equal(packet.status,'NOT_SUBMITTED_FOR_REVIEW');
  assert.equal(packet.humanReviewComplete,false);
  assert.equal(packet.publicationAuthorized,false);
  assert.ok(packet.criteria.length>=10);
  assert.ok(packet.criteria.every(c=>c.status==='pending'));
  assert.ok(packet.bibliography.some(r=>r.metadataStatus==='pending_primary_metadata'));
  assert.equal(await verifyEditorialPacket(packet,draft,subtle),true);
  const forgery=structuredClone(packet);forgery.publicationAuthorized=true;
  await assert.rejects(()=>verifyEditorialPacket(forgery,draft,subtle),/falsely represents/);
});

test('P6 imported manuscript ZIP reproduces every image, PDF, source, citation, review packet and manifest',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const product=await exportManuscriptBundle(draft,{subtle});
  const proof=await verifyManuscriptZip(product.zip,{subtle});
  assert.equal(proof.schema,BUNDLE_VERIFICATION_SCHEMA);
  assert.equal(proof.verdict,'PASS');
  assert.equal(proof.studySha256,session.sha256);
  assert.equal(proof.manuscriptSha256,draft.record.sha256);
  assert.equal(proof.observedGpuDraws,3);
  assert.equal(proof.sourceFiguresVerified,3);
  assert.equal(proof.inventoryEntries,10);
  assert.equal(proof.manuscriptReviewCompleted,false);
  assert.equal(proof.publicationAuthorized,false);
});
test('P6 independent nine-frame manuscript archive roundtrip verifies every GPU figure',async()=>{
  const {session,audit}=await fixture(true);
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const {zip}=await exportManuscriptBundle(draft,{subtle});
  const proof=await verifyManuscriptZip(zip.buffer.slice(zip.byteOffset,zip.byteOffset+zip.byteLength),{subtle});
  assert.equal(proof.observedGpuDraws,9);
  assert.equal(proof.sourceFiguresVerified,9);
  assert.equal(proof.pdfVerified,true);
});
test('P6 file tampering, ZIP truncation, and unsupported compression cannot pass imported archive check',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const {zip}=await exportManuscriptBundle(draft,{subtle});
  const broken=new Uint8Array(zip);broken[150]^=1;
  await assert.rejects(()=>verifyManuscriptZip(broken,{subtle}),/CRC-32 mismatch|does not reproduce/);
  await assert.rejects(()=>verifyManuscriptZip(zip.subarray(0,zip.length-21),{subtle}),/central directory|end record/);
  const compressed=new Uint8Array(zip);compressed[8]=8;
  await assert.rejects(()=>verifyManuscriptZip(compressed,{subtle}),/uncompressed/);
});
test('P6 imported research ZIP rejects forged central-directory and publication approval data',async()=>{
  const {session,audit}=await fixture();
  const draft=await assembleManuscript(session,{audit,subtle,clock:clock(0)});
  const {zip}=await exportManuscriptBundle(draft,{subtle});
  const altered=new Uint8Array(zip);
  const offset=altered.length-6;
  altered[offset]^=1;
  await assert.rejects(()=>verifyManuscriptZip(altered,{subtle}),/central directory offset mismatch/);
  const other=new Uint8Array(zip);
  const manifest=Buffer.from('academicManuscriptUnlocked');
  const at=Buffer.from(other).indexOf(manifest);
  assert.ok(at>0);
  const falseOffset=at+manifest.length+3;
  // Flip the serialized approval value in the manifest: a hash and/or byte check must reject it.
  other[falseOffset]^=1;
  await assert.rejects(()=>verifyManuscriptZip(other,{subtle}),/CRC-32 mismatch|does not reproduce|unreviewed/);
});
