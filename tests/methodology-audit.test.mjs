import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCES,validateReferences,bibliographicReadiness,exportBibtex,vettedReferences} from '../src/reference-registry.mjs';
import {auditMethodology,bibliographyForAudit,verifyMethodologyAudit} from '../src/methodology-audit.mjs';
import {webcrypto} from 'node:crypto';
import {createBuildReceipt,canonicalJson,sha256Hex} from '../src/build-evidence.mjs';
import {createResearchCapture} from '../src/research-capture.mjs';
import {createFigureEvidence} from '../src/research-figures.mjs';
import {createSweepProtocol,createSweepSession} from '../src/research-experiments.mjs';
test('P4 reference registry distinguishes checked metadata and pending review',()=>{
 assert.equal(validateReferences(),true);
 const state=bibliographicReadiness();
 assert.equal(state.verifiedCount,4);
 assert.deepEqual(state.pendingIds,['jeremias-quilez2013']);
 assert.equal(state.humanSourceReviewSigned,false);
 assert.deepEqual(state.missingRequiredScopes,[]);
});
test('P4 BibTeX excludes pending sources and unrelated subject areas',()=>{
 const bib=exportBibtex();
 assert.match(bib,/@manual\{khronos-glsl-es300/);
 assert.match(bib,/@article\{sacks1989/);
 assert.doesNotMatch(bib,/jeremias-quilez2013/);
 assert.deepEqual(vettedReferences(['procedural_noise_context']).map(r=>r.id),['lagae2010']);
});
test('P4 duplicate citations and DOI alterations are rejected',()=>{
 const a=structuredClone(REFERENCES);a.push(structuredClone(a[0]));
 assert.throws(()=>validateReferences(a),/Duplicate/);
 const b=structuredClone(REFERENCES);b[2].doi='10.1214/ss/00000';
 assert.throws(()=>validateReferences(b),/DOI and resolver mismatch/);
});
test('P4 unsourced or unsupported experiment documents cannot be promoted',async()=>{
 await assert.rejects(()=>auditMethodology({schema:'test-invalid'},{}),/Unsupported experiment schema/);
});
test('P4 bibliography does not accept a made-up citation status',()=>{
 const a=structuredClone(REFERENCES);a[0].status='automatically_peer_reviewed';
 assert.throws(()=>validateReferences(a),/Unknown source type or metadata status/);
});

const subtle=webcrypto.subtle;
globalThis.btoa??=str=>Buffer.from(str,'binary').toString('base64');
globalThis.atob??=str=>Buffer.from(str,'base64').toString('binary');
const params=()=>({zoom:1,angle:0,speed:1,hue:0,brightness:1});
const clock=i=>()=>new Date(Date.UTC(2026,9,10,10,0,i)).toISOString();
async function fixture(){
 const protocol=createSweepProtocol(params(),'zoom',.2,2);
 const figures=[];
 for(let i=0;i<3;i++){
   const pixels=Uint8Array.from({length:48},(_,j)=>j%4===3?255:(j+i*11)%256);
   const receipt=await createBuildReceipt({
     shaderBody:'o.rgb=vec3(.5);',expandedShader:'#version 300 es\nvoid main(){o.rgb=vec3(.5);}',
     demoId:'original',attribution:'@YoheiNishitsuji',
     checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
     viewport:{width:4,height:3},parameters:{...params(),zoom:protocol.levels[i]},
     shaderTimeSeconds:2
   },{subtle,clock:clock(i)});
   const capture=await createResearchCapture(receipt,pixels,{subtle,clock:clock(i)});
   const fig=await createFigureEvidence(receipt,capture,pixels,{subtle,clock:clock(i),drawSequence:40+i});
   figures.push({...fig,receipt,capture});
 }
 return createSweepSession(protocol,figures,{sessionId:'audit_sweep_01',clock:clock(0),subtle});
}
test('P4 real validated study produces only bounded descriptive methodology claims',async()=>{
 const study=await fixture();
 const audit=await auditMethodology(study,{subtle,clock:clock(0)});
 assert.equal(audit.measurements.observedGpuDraws,3);
 assert.equal(audit.measurements.independentReplicationsEstablished,false);
 assert.equal(audit.release.academicManuscriptUnlocked,false);
 assert.equal(audit.release.descriptiveReportSupported,true);
 assert.equal(audit.experimentSha256,study.sha256);
 assert.equal(audit.bibliographySha256,await sha256Hex(canonicalJson(REFERENCES),subtle));
 assert.equal(await verifyMethodologyAudit(audit,study,subtle),true);
 assert.ok(bibliographyForAudit(audit).references.every(x=>x.status==='metadata_verified'));
});
test('P4 altered methodology reports and altered study pixels fail reproduction',async()=>{
 const study=await fixture();
 const audited=await auditMethodology(study,{subtle,clock:clock(0)});
 const edited=structuredClone(audited);edited.release.academicManuscriptUnlocked=true;
 await assert.rejects(()=>verifyMethodologyAudit(edited,study,subtle),/no longer reproduces/);
 const badStudy=structuredClone(study);badStudy.trials[1].rgbaBase64='AAAA';
 await assert.rejects(()=>auditMethodology(badStudy,{subtle}),/SHA-256 mismatch/);
});
