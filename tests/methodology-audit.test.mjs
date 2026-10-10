import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCES,validateReferences,bibliographicReadiness,exportBibtex,vettedReferences} from '../src/reference-registry.mjs';
import {auditMethodology,bibliographyForAudit} from '../src/methodology-audit.mjs';
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
