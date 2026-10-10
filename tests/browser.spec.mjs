import { test, expect } from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';

test('mobile navigation: classic editor opens Lab without losing presets',async({page})=>{
  await page.goto('/index.html');
  await expect(page.locator('#example option')).toHaveCount(17);
  await expect(page.locator('#recording-indicator')).toBeHidden();
  await page.getByRole('link',{name:/Open GLSL Lab/}).click();
  await expect(page).toHaveURL(/glsl-lab\.html/);
  await expect(page.locator('#demo')).toHaveCount(0);
  await expect(page.locator('#tabPlay')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#code')).toHaveValue(/o\.rgb|vec3/);
});
test('mobile Play and Understand views are navigable',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#glcanvas')).toBeVisible();
  await page.locator('#tabCode').click();
  await expect(page.locator('#paneCode')).toBeVisible();
  await expect(page.locator('#panePlay')).toBeHidden();
  await page.locator('#tabPlay').click();
  await expect(page.locator('#panePlay')).toBeVisible();
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(420);
});
test('GPU smoke: authored graph compiles and slider updates do not recompile',async({page})=>{
  await page.addInitScript(()=>{
    window.__compileProbe=0;
    if(typeof WebGL2RenderingContext==='undefined')return;
    const original=WebGL2RenderingContext.prototype.compileShader;
    WebGL2RenderingContext.prototype.compileShader=function(...args) {
      window.__compileProbe++;return original.apply(this,args);
    };
  });
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'WebGL2 unavailable in this runner; this is NOT proof of successful GPU rendering');
  await expect(page.locator('#error')).toBeEmpty({timeout:30000});
  await expect(page.locator('#state')).toHaveText('Live',{timeout:30000});
  const before=await page.evaluate(()=>window.__compileProbe);
  await page.locator('#zoom').evaluate(node=>{
    node.value='1.75';
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('#zoomValue')).toHaveText('175%');
  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>window.__compileProbe)).toBe(before);
  const file=page.waitForEvent('download',{timeout:30000});
  await page.locator('#savePng').click();
  expect((await file).suggestedFilename()).toBe('glsl-lab-builder.png');
});

test('P1 mobile project and evidence workflow saves, verifies and reloads',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#projectStatus')).not.toBeEmpty({timeout:15000});
  await page.locator('#projectName').fill('Research test project');
  await page.locator('#saveProject').click();
  await expect(page.locator('#projectStatus')).toContainText('Project saved');
  await expect(page.locator('#projectPicker option')).toHaveCount(2);
  const savedState=await page.evaluate(()=>{
    const raw=localStorage.getItem('glsl-lab:projects:v1');
    return raw&&JSON.parse(raw);
  });
  expect(savedState).toHaveLength(1);
  expect(savedState[0].name).toBe('Research test project');
  const available=await page.evaluate(()=>Boolean(document.getElementById('glcanvas').getContext('webgl2')));
  test.skip(!available,'WebGL2 unavailable for real evidence capture on CI');
  await expect(page.locator('#saveBuild')).toBeEnabled({timeout:15000});
  await page.locator('#saveBuild').click();
  await expect(page.locator('#receiptInfo')).toContainText('Saved SHA-256',{timeout:15000});
  await expect(page.locator('#exportBuild')).toBeEnabled();
  await expect(page.locator('#generatePaper')).toBeDisabled();
  const stored=await page.evaluate(()=>({
    receipts:JSON.parse(localStorage.getItem('glsl-lab:receipts:v1')),
    projects:JSON.parse(localStorage.getItem('glsl-lab:projects:v1'))
  }));
  expect(stored.receipts).toHaveLength(1);
  expect(stored.receipts[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(stored.receipts[0].checks.frameDrawn).toBe(true);
  expect(stored.receipts[0].checks.glError).toBe(0);
  expect(stored.projects[0].buildIds).toContain(stored.receipts[0].sha256);
  const dl=page.waitForEvent('download');
  await page.locator('#exportBuild').click();
  expect((await dl).suggestedFilename()).toMatch(/glsl-build-[a-f0-9]{12}\.json/);
  await page.reload();
  await expect(page.locator('#projectPicker option')).toHaveCount(2);
  await page.locator('#projectPicker').selectOption(stored.projects[0].id);
  await expect(page.locator('#projectName')).toHaveValue('Research test project');
  await expect(page.locator('#projectStatus')).toContainText('Project loaded');
});

test('P2 mobile builder compiles a typed graph and saves its project',async({page})=>{
  await page.goto('/glsl-lab.html');
  await page.locator('#tabBuild').click();
  await expect(page.locator('#graphChain .graph-node')).toHaveCount(5);
  await page.locator('#addWave').click();
  await expect(page.locator('#graphChain .graph-node')).toHaveCount(6);
  await page.locator('#builderUndo').click();
  await expect(page.locator('#graphChain .graph-node')).toHaveCount(5);
  await page.locator('#builderRedo').click();
  await expect(page.locator('#graphChain .graph-node')).toHaveCount(6);
  await page.locator('#builderRender').click();
  await expect(page.locator('#error')).toBeEmpty({timeout:30000});
  await expect(page.locator('#saveBuild')).toBeEnabled({timeout:30000});
  await page.locator('#projectName').fill('Typed graph proof');
  await page.locator('#saveProject').click();
  await expect(page.locator('#projectStatus')).toContainText('Project saved');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('glsl-lab:projects:v1'))[0]);
  expect(saved.demoId).toBe('builder');
  expect(saved.graph.nodes).toHaveLength(6);
  await page.locator('#saveBuild').click();
  await expect(page.locator('#receiptInfo')).toContainText('Saved SHA-256',{timeout:30000});
  const receipt=await page.evaluate(()=>JSON.parse(localStorage.getItem('glsl-lab:receipts:v1'))[0]);
  expect(receipt.shader.identifier).toBe('builder');
  expect(receipt.graph.nodes).toHaveLength(6);
  expect(receipt.shader.attribution).toMatch(/User-authored/);
  expect(receipt.sha256).toMatch(/^[a-f0-9]{64}$/);
  await page.reload();
  await page.locator('#projectPicker').selectOption(saved.id);
  await expect(page.locator('#paneBuild')).toBeVisible();
  await expect(page.locator('#graphChain .graph-node')).toHaveCount(6);
});

test('P2 advanced typed wiring builds a branched shader with validated evidence',async({page})=>{
  await page.goto('/glsl-lab.html');
  await page.locator('#tabBuild').click();
  await page.locator('#advancedToggle').click();
  await expect(page.locator('#advancedBuilder')).toBeVisible();
  await expect(page.locator('#quickBuilder')).toBeHidden();
  await expect(page.locator('.dag-card')).toHaveCount(8);
  await expect(page.locator('#dagBuild')).toBeEnabled();
  await expect(page.locator('#dagGenerated')).toHaveValue(/mix\(g_waveA, g_number/);
  const available=await page.evaluate(()=>Boolean(document.getElementById('glcanvas').getContext('webgl2')));
  test.skip(!available,'WebGL2 absent: advanced graph GPU smoke requires actual GL');
  await page.locator('#dagBuild').click();
  await expect(page.locator('#error')).toBeEmpty({timeout:30000});
  await expect(page.locator('#saveBuild')).toBeEnabled({timeout:30000});
  await page.locator('#projectName').fill('Branch experiment');
  await page.locator('#saveProject').click();
  await expect(page.locator('#projectStatus')).toContainText('Project saved');
  await page.locator('#saveBuild').click();
  await expect(page.locator('#receiptInfo')).toContainText('Saved SHA-256',{timeout:30000});
  const saved=await page.evaluate(()=>({
    project:JSON.parse(localStorage.getItem('glsl-lab:projects:v1'))[0],
    receipt:JSON.parse(localStorage.getItem('glsl-lab:receipts:v1'))[0]
  }));
  expect(saved.project.graph.version).toBe(2);
  expect(saved.receipt.graph.version).toBe(2);
  expect(saved.receipt.graph.nodes).toHaveLength(8);
  expect(saved.receipt.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(saved.project.buildIds).toContain(saved.receipt.sha256);
  await page.reload();
  await page.locator('#projectPicker').selectOption(saved.project.id);
  await expect(page.locator('#advancedBuilder')).toBeVisible();
  await expect(page.locator('.dag-card')).toHaveCount(8);
});
test('P2 advanced wires enforce unused-node gate and allow explicit reconnection',async({page})=>{
  await page.goto('/glsl-lab.html');
  await page.locator('#tabBuild').click();
  await page.locator('#advancedToggle').click();
  await page.locator('#dagNewType').selectOption('wave');
  await page.locator('#dagAdd').click();
  await expect(page.locator('.dag-card')).toHaveCount(9);
  await expect(page.locator('#dagBuild')).toBeDisabled();
  await page.locator('[data-dag-node="blend"]').click();
  await page.locator('[data-dag-port="b"]').selectOption('wave1');
  await expect(page.locator('#dagBuild')).toBeDisabled();
  await page.locator('[data-dag-node="number"]').click();
  await expect(page.locator('#dagRemove')).toBeEnabled();
  await page.locator('#dagRemove').click();
  await expect(page.locator('.dag-card')).toHaveCount(8);
  await expect(page.locator('#dagBuild')).toBeEnabled();
  await page.locator('#dagAutoLayout').click();
  await expect(page.locator('#dagReady')).toHaveText('Ready to compile');
});

test('P3 real WebGL sampled research capture is reproducible and exportable',async({page})=>{
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'WebGL2 unavailable; actual pixel readback is a required device gate');
  await expect(page.locator('#researchCapture')).toBeEnabled({timeout:30000});
  await page.locator('#researchCapture').click();
  await expect(page.locator('#researchStatus')).toContainText('Captured actual WebGL pixels',{timeout:30000});
  await expect(page.locator('#researchCount')).toContainText('1 locally stored sampled frame');
  await expect(page.locator('#researchMetrics')).toContainText('Sample:');
  await expect(page.locator('#researchExport')).toBeEnabled();
  const evidence=await page.evaluate(async()=>{
    const capture=JSON.parse(localStorage.getItem('glsl-lab:research:v1'))[0];
    const receipt=JSON.parse(localStorage.getItem('glsl-lab:receipts:v1'))[0];
    const module=await import('/src/research-capture.mjs');
    await module.verifyResearchCapture(capture,receipt);
    return {capture,receipt};
  });
  expect(evidence.capture.receiptSha256).toBe(evidence.receipt.sha256);
  expect(evidence.capture.sampler.columns).toBeLessThanOrEqual(32);
  expect(evidence.capture.sampler.rows).toBeLessThanOrEqual(24);
  expect(evidence.capture.metrics.sampleCount).toBe(evidence.capture.sampler.columns*evidence.capture.sampler.rows);
  expect(evidence.capture.metrics.lumaHistogram16.reduce((a,b)=>a+b,0)).toBe(evidence.capture.metrics.sampleCount);
  expect(evidence.capture.sample.sha256).toMatch(/^[a-f0-9]{64}$/);
  const dl=page.waitForEvent('download');
  await page.locator('#researchExport').click();
  expect((await dl).suggestedFilename()).toBe('glsl-lab-research-1-captures.json');
  await page.reload();
  await expect(page.locator('#researchCount')).toContainText('1 locally stored sampled frame',{timeout:30000});
  await expect(page.locator('#researchExport')).toBeEnabled();
  await expect(page.locator('#generatePaper')).toBeDisabled();
});
test('P3 research capture cannot proceed without a freshly validated frame',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#researchCapture')).toBeEnabled({timeout:30000});
  await page.locator('#tabPlay').click();
  await page.locator('#zoom').evaluate(el=>{
    el.value='1.75';
    el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('#zoomValue')).toHaveText('175%');
  // After the next successful render, a fresh capture is allowed again.
  await expect(page.locator('#researchCapture')).toBeEnabled({timeout:30000});
  await page.locator('#researchCapture').click();
  await expect(page.locator('#researchStatus')).toContainText('Captured actual WebGL pixels',{timeout:30000});
  const observed=await page.evaluate(()=>JSON.parse(localStorage.getItem('glsl-lab:receipts:v1'))[0]);
  expect(observed.parameters.zoom).toBe(1.75);
});

test('P3 lossless full-resolution PNG and manifest export work on actual GPU',async({page})=>{
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'GPU readback is required to validate a real full-resolution figure');
  await expect(page.locator('#figureCapture')).toBeEnabled({timeout:30000});
  await page.locator('#figureCapture').click();
  await expect(page.locator('#figureStatus')).toContainText('Captured lossless full-resolution figure',{timeout:30000});
  await expect(page.locator('#figureCount')).toContainText('1 full-resolution figure');
  await expect(page.locator('#figureExport')).toBeEnabled();
  const result=page.waitForEvent('download');
  await page.locator('#figureExport').click();
  const item=await result;
  expect(item.suggestedFilename()).toBe('glsl-lab-full-figures-1-frames.zip');
  const zip=Buffer.from(await readFile(await item.path()));
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  const nameLength=zip.readUInt16LE(26),extra=zip.readUInt16LE(28),length=zip.readUInt32LE(18);
  expect(zip.toString('utf8',30,30+nameLength)).toBe('manifest.json');
  const manifest=JSON.parse(zip.toString('utf8',30+nameLength+extra,30+nameLength+extra+length));
  expect(manifest.schema).toBe('glsl-lab/figure-bundle/1');
  expect(manifest.figures).toHaveLength(1);
  expect(manifest.figures[0].pngSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.figures[0].fullFrameMetrics.sampleCount).toBe(
    manifest.figures[0].width*manifest.figures[0].height
  );
  expect(manifest.captures).toHaveLength(1);
  expect(manifest.receipts).toHaveLength(1);
  await page.reload();
  await expect(page.locator('#figureCount')).toContainText('0 full-resolution figure');
  await expect(page.locator('#figureExport')).toBeDisabled();
});
test('P3 controlled three-draw series measures frame differences and exports linked figures',async({page})=>{
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'GPU timing and readback require a real WebGL2 context');
  await expect(page.locator('#figureSeries')).toBeEnabled({timeout:30000});
  await page.locator('#figureSeries').click();
  await expect(page.locator('#figureStatus')).toContainText('Captured 3 independent draw submissions',{timeout:30000});
  await expect(page.locator('#figureCount')).toContainText('3 full-resolution figure');
  await expect(page.locator('#figureComparison')).toContainText('Controlled series: 3 observed frames');
  await expect(page.locator('#figureComparison')).toContainText('mean absolute RGB8 difference');
  const result=page.waitForEvent('download');
  await page.locator('#figureExport').click();
  const item=await result,zip=Buffer.from(await readFile(await item.path()));
  const offset=30+zip.readUInt16LE(26)+zip.readUInt16LE(28);
  const manifest=JSON.parse(zip.toString('utf8',offset,offset+zip.readUInt32LE(18)));
  expect(manifest.figures).toHaveLength(3);
  expect(manifest.series.frames).toHaveLength(3);
  expect(manifest.series.frames.every(f=>Number.isSafeInteger(f.drawSequence))).toBe(true);
  expect(manifest.series.frames[0].drawSequence).toBeLessThan(manifest.series.frames[1].drawSequence);
  expect(manifest.series.frames[1].drawSequence).toBeLessThan(manifest.series.frames[2].drawSequence);
  expect(manifest.series.frames.every(f=>/Z$/.test(f.capturedAt))).toBe(true);
  expect(manifest.series.pairs).toHaveLength(2);
  expect(manifest.series.pairs[0].pixels).toBe(manifest.figures[0].width*manifest.figures[0].height);
  expect(manifest.series.pairs[0].changedRgbPixelFraction).toBeGreaterThanOrEqual(0);
  expect(manifest.series.pairs[0].changedRgbPixelFraction).toBeLessThanOrEqual(1);
  await page.locator('#figureClear').click();
  await expect(page.locator('#figureCount')).toContainText('0 full-resolution figure');
});

test('P3 mobile GPU controlled sweep archives pixels and compares imported second session',async({page})=>{
  test.setTimeout(120000);
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'A real WebGL2 framebuffer is required for parameter experiments');
  await expect(page.locator('#sweepRun')).toBeEnabled({timeout:30000});
  await page.locator('#sweepRun').click();
  await expect(page.locator('#sweepStatus')).toContainText('Experiment verified',{timeout:60000});
  await expect(page.locator('#sweepSummary')).toContainText('0.8 / 1 / 1.2');
  const firstDownload=page.waitForEvent('download');
  await page.locator('#sweepExportJson').click();
  const file=await firstDownload;
  expect(file.suggestedFilename()).toMatch(/^glsl-experiment-[\w-]+\.json$/);
  const first=JSON.parse((await readFile(await file.path())).toString('utf8'));
  expect(first.schema).toBe('glsl-lab/sweep-session/1');
  expect(first.trials).toHaveLength(3);
  expect(first.trials[0].receipt.shaderTimeSeconds).toBe(2);
  expect(first.trials.map(t=>t.receipt.parameters.zoom)).toEqual([.8,1,1.2]);
  await page.locator('#sweepRun').click();
  await expect(page.locator('#sweepStatus')).toContainText('Experiment verified',{timeout:60000});
  await page.locator('#sweepImport').setInputFiles({
    name:'earlier-session.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(first))
  });
  await expect(page.locator('#sweepStatus')).toContainText('comparison',{timeout:60000});
  await expect(page.locator('#sweepComparison')).toContainText('Separate-session descriptive comparison');
  await expect(page.locator('#sweepComparison')).toContainText('Level 3');
  const zipWait=page.waitForEvent('download');
  await page.locator('#sweepExportZip').click();
  const zipped=Buffer.from(await readFile(await (await zipWait).path()));
  expect(zipped.readUInt32LE(0)).toBe(0x04034b50);
  expect(zipped.includes(Buffer.from('figures/treatment-3.png'))).toBe(true);
  await expect(page.locator('#generatePaper')).toBeDisabled();
});
test('P3 invalid parameter sweep is rejected without creating a research archive',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#sweepRun')).toBeEnabled({timeout:30000});
  await page.locator('#sweepStep').fill('99');
  await page.locator('#sweepRun').click();
  await expect(page.locator('#sweepStatus')).toContainText('Experiment rejected');
  await expect(page.locator('#sweepExportJson')).toBeDisabled();
});

test('P3 mobile nine-frame counterbalanced capture records graphics capability and reproducible evidence',async({page})=>{
  test.setTimeout(180000);
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'A real WebGL2 shader is required for replicated graphics research');
  await expect(page.locator('#repeatRun')).toBeEnabled({timeout:30000});
  await page.locator('#repeatRun').click();
  await expect(page.locator('#repeatStatus')).toContainText('Nine frames verified',{timeout:90000});
  await expect(page.locator('#repeatSummary')).toContainText('n=3');
  await expect(page.locator('#repeatPlatform')).toContainText('WebGL');
  const dl=page.waitForEvent('download');
  await page.locator('#repeatExportJson').click();
  const downloaded=await dl;
  expect(downloaded.suggestedFilename()).toMatch(/^glsl-repeat-[\w-]+\.json$/);
  const study=JSON.parse((await readFile(await downloaded.path())).toString('utf8'));
  expect(study.schema).toBe('glsl-lab/replicated-session/1');
  expect(study.trials).toHaveLength(9);
  expect(study.summary.map(x=>x.observationCount)).toEqual([3,3,3]);
  expect(study.protocol.sequence.map(x=>x.levelIndex)).toEqual([0,1,2,1,2,0,2,0,1]);
  expect(study.platform.api).toBe('WebGL2');
  const repeatProof=await page.evaluate(async session=>{
    const mod=await import('/src/research-replications.mjs');
    const figures=await mod.verifyReplicatedSession(session);
    return {count:figures.length,allPixels:figures.every(f=>f.rgba.length===f.record.width*f.record.height*4)};
  },study);
  expect(repeatProof).toEqual({count:9,allPixels:true});
  const zipDl=page.waitForEvent('download');
  await page.locator('#repeatExportZip').click();
  const zip=Buffer.from(await readFile(await (await zipDl).path()));
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  expect(zip.includes(Buffer.from('figures/trial-09.png'))).toBe(true);
  await expect(page.locator('#generatePaper')).toBeDisabled();
});
test('P3 malformed repeat study settings do not create evidence',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#repeatRun')).toBeEnabled({timeout:30000});
  await page.locator('#repeatStep').fill('99');
  await page.locator('#repeatRun').click();
  await expect(page.locator('#repeatStatus')).toContainText('Study rejected',{timeout:10000});
  await expect(page.locator('#repeatExportJson')).toBeDisabled();
});

test('P4 bibliography lists metadata-checked sources, quarantines pending citations',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#referenceList .audit-source')).toHaveCount(5,{timeout:15000});
  await expect(page.locator('#referenceStatus')).toContainText('4 sources in the reference registry');
  await expect(page.locator('#referenceStatus')).toContainText('1 source record awaiting reconciliation');
  await expect(page.locator('#auditExport')).toBeDisabled();
  const download=page.waitForEvent('download');
  await page.locator('#auditBibtex').click();
  const data=(await readFile(await (await download).path())).toString('utf8');
  expect(data).toContain('@manual{khronos-glsl-es300');
  expect(data).toContain('@article{sacks1989');
  expect(data).not.toContain('jeremias-quilez2013');
  await expect(page.locator('#generatePaper')).toBeDisabled();
});
test('P4 evidence-audit panel rejects unsupported study files without a report',async({page})=>{
  await page.goto('/glsl-lab.html');
  await page.locator('#auditStudyImport').setInputFiles({
    name:'unverified-study.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({schema:'unsupported',trials:[]}))
  });
  await expect(page.locator('#auditStatus')).toContainText('Audit rejected');
  await expect(page.locator('#auditExport')).toBeDisabled();
  await expect(page.locator('#auditResults')).toContainText('Manuscript gate remains locked');
});
test('P4 complete real WebGL sweep produces a hash-verified limited methodology audit',async({page})=>{
  test.setTimeout(120000);
  await page.goto('/glsl-lab.html');
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'Methodology audit requires an actual verified GPU study');
  await expect(page.locator('#sweepRun')).toBeEnabled({timeout:30000});
  await page.locator('#sweepRun').click();
  await expect(page.locator('#sweepStatus')).toContainText('Experiment verified',{timeout:60000});
  const dl=page.waitForEvent('download');
  await page.locator('#sweepExportJson').click();
  const raw=await readFile(await (await dl).path());
  await page.locator('#auditStudyImport').setInputFiles({
    name:'observed-study.json',mimeType:'application/json',buffer:raw
  });
  await expect(page.locator('#auditStatus')).toContainText('Methodology audit complete',{timeout:60000});
  await expect(page.locator('#auditResults')).toContainText('Observed GPU draws: 3');
  await expect(page.locator('#auditExport')).toBeEnabled();
  const auditDl=page.waitForEvent('download');
  await page.locator('#auditExport').click();
  const audit=JSON.parse((await readFile(await (await auditDl).path())).toString('utf8'));
  expect(audit.schema).toBe('glsl-lab/methodology-bundle/1');
  expect(audit.report.release.academicManuscriptUnlocked).toBe(false);
  expect(audit.report.measurements.observedGpuDraws).toBe(3);
  expect(audit.references.some(r=>r.id==='jeremias-quilez2013')).toBe(false);
  await expect(page.locator('#generatePaper')).toBeEnabled();
});

test('P4 verified GPU experiment unlocks research draft with styled HTML and evidence ZIP',async({page})=>{
  test.setTimeout(180000);
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#generatePaper')).toBeDisabled();
  const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
  test.skip(!available,'GPU verified study required for publication-style research draft');
  await expect(page.locator('#sweepRun')).toBeEnabled({timeout:30000});
  await page.locator('#sweepRun').click();
  await expect(page.locator('#sweepStatus')).toContainText('Experiment verified',{timeout:60000});
  const exported=page.waitForEvent('download');
  await page.locator('#sweepExportJson').click();
  const study=await readFile(await (await exported).path());
  await page.locator('#auditStudyImport').setInputFiles({
    name:'observed-experiment.json',mimeType:'application/json',buffer:study
  });
  await expect(page.locator('#auditStatus')).toContainText('Methodology audit complete',{timeout:60000});
  await expect(page.locator('#generatePaper')).toBeEnabled({timeout:10000});
  await page.locator('#generatePaper').click();
  await expect(page.locator('#paperStatus')).toContainText('Technical manuscript assembled',{timeout:60000});
  await expect(page.locator('#paperPreview')).toBeVisible();
  await expect(page.frameLocator('#paperPreview').locator('h1')).toContainText('Reproducible Descriptive Study');
  await expect(page.frameLocator('#paperPreview').locator('figure img')).toHaveCount(3);
  await expect(page.frameLocator('#paperPreview').locator('.status')).toContainText('UNREVIEWED');
  await expect(page.locator('#paperSource')).toContainText('3 source-scoped citations');
  const htmlDl=page.waitForEvent('download');
  await page.locator('#paperDownloadHtml').click();
  const html=(await readFile(await (await htmlDl).path())).toString('utf8');
  expect(html).toContain('Y′ = 0.2126 R');
  expect(html).toContain('data:image/png;base64,');
  expect(html).toContain('References');
  expect(html).toContain('Appendix A');
  expect(html).toContain('@page');
  const texDl=page.waitForEvent('download');
  await page.locator('#paperDirectPdf').click();
  const tex=(await readFile(await (await texDl).path())).toString('utf8');
  expect(tex).toContain('\\documentclass');
  expect(tex).toContain('\\begin{equation}');
  const reviewDl=page.waitForEvent('download');
  await page.locator('#paperReviewPacket').click();
  const review=JSON.parse((await readFile(await (await reviewDl).path())).toString('utf8'));
  expect(review.status).toBe('NOT_SUBMITTED_FOR_REVIEW');
  expect(review.humanReviewComplete).toBe(false);
  expect(review.publicationAuthorized).toBe(false);
  expect(review.criteria.length).toBeGreaterThanOrEqual(10);
  expect(review.criteria.every(item=>item.status==='pending')).toBe(true);
  await page.locator('#sourceReviewPacket').setInputFiles({
    name:'original-review-packet.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(review))
  });
  await expect(page.locator('#sourceReviewStatus')).toContainText('unsigned packet verified',{timeout:15000});
  await expect(page.locator('#sourceReviewAdd')).toBeEnabled();
  await page.locator('#sourceReviewCitation').selectOption('khronos-webgl2');
  await page.locator('#sourceReviewReader').fill('Example Human Reader');
  await page.locator('#sourceReviewDisposition').selectOption('supports_limited_claim');
  await page.locator('#sourceReviewLocator').fill('Reading back pixels, WebGL2 specification');
  await page.locator('#sourceReviewClaim').fill('The WebGL2 interface exposes framebuffer readPixels operations.');
  await page.locator('#sourceReviewNote').fill('The API specification defines readPixels behavior but does not certify platform equivalence.');
  await page.locator('#sourceReviewAdd').click();
  await expect(page.locator('#sourceReviewStatus')).toContainText('reviewer identity remain unverified');
  await expect(page.locator('#sourceReviewExport')).toBeEnabled();
  const dossierDl=page.waitForEvent('download');
  await page.locator('#sourceReviewExport').click();
  const dossier=JSON.parse((await readFile(await (await dossierDl).path())).toString('utf8'));
  expect(dossier.schema).toBe('glsl-lab/source-review-dossier/1');
  expect(dossier.assessmentCount).toBe(1);
  expect(dossier.publicationAuthorized).toBe(false);
  expect(dossier.assessments[0].referenceId).toBe('khronos-webgl2');
  await expect(page.locator('#sourceClaimCrosswalk')).toContainText('1/3 cited sources');
  await expect(page.locator('#sourceClaimCrosswalk')).toContainText('khronos-glsl-es300 [not_assessed]');
  await expect(page.locator('#sourceCrosswalkExport')).toBeEnabled();
  const crosswalkDl=page.waitForEvent('download');
  await page.locator('#sourceCrosswalkExport').click();
  const crosswalk=JSON.parse((await readFile(await (await crosswalkDl).path())).toString('utf8'));
  expect(crosswalk.schema).toBe('glsl-lab/source-claim-crosswalk/1');
  expect(crosswalk.summary.citedSources).toBe(3);
  expect(crosswalk.summary.sourcesWithAssessments).toBe(1);
  expect(crosswalk.publicationAuthorized).toBe(false);
  await page.locator('#sourceReviewImport').setInputFiles({
    name:'reviewer-dossier.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(dossier))
  });
  await expect(page.locator('#sourceReviewStatus')).toContainText('Dossier content verified');
  const tamperedDossier=structuredClone(dossier);
  tamperedDossier.assessments[0].assessment='contradicts_claim';
  await page.locator('#sourceReviewImport').setInputFiles({
    name:'altered-review.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(tamperedDossier))
  });
  await expect(page.locator('#sourceReviewStatus')).toContainText('Dossier rejected');
  await expect(page.frameLocator('#paperPreview').locator('.status')).toContainText('UNREVIEWED');
  const zipDl=page.waitForEvent('download');
  await page.locator('#paperExportZip').click();
  const zip=Buffer.from(await readFile(await (await zipDl).path()));
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  expect(zip.includes(Buffer.from('manuscript.html'))).toBe(true);
  expect(zip.includes(Buffer.from('figures/frame-03.png'))).toBe(true);
  expect(zip.includes(Buffer.from('references.bib'))).toBe(true);
  expect(zip.includes(Buffer.from('manuscript.tex'))).toBe(true);
   expect(zip.includes(Buffer.from('build-latex.sh'))).toBe(true);
  expect(zip.includes(Buffer.from('review-packet.json'))).toBe(true);
  const n=zip.readUInt16LE(26),offset=30+n+zip.readUInt16LE(28),size=zip.readUInt32LE(18);
  const manifest=JSON.parse(zip.toString('utf8',offset,offset+size));
  expect(manifest.verification.academicManuscriptUnlocked).toBe(false);
  expect(manifest.fileInventory.every(f=>/^[a-f0-9]{64}$/.test(f.sha256))).toBe(true);
  await page.locator('#manuscriptZipImport').setInputFiles({
    name:'manuscript-export.zip',mimeType:'application/zip',buffer:zip
  });
  await expect(page.locator('#manuscriptZipStatus')).toContainText('PASS',{timeout:60000});
  await expect(page.locator('#manuscriptZipResults')).toContainText('LaTeX source reproduced: true');
  
  const receiptDl=page.waitForEvent('download');
  await page.locator('#manuscriptZipExportReceipt').click();
  const importedReceipt=JSON.parse((await readFile(await (await receiptDl).path())).toString('utf8'));
  expect(importedReceipt.verdict).toBe('PASS');
  expect(importedReceipt.manuscriptReviewCompleted).toBe(false);
  const corrupted=Buffer.from(zip);corrupted[120]^=1;
  await page.locator('#manuscriptZipImport').setInputFiles({
    name:'tampered.zip',mimeType:'application/zip',buffer:corrupted
  });
  await expect(page.locator('#manuscriptZipStatus')).toContainText('rejected',{timeout:10000});
  await expect(page.locator('#manuscriptZipExportReceipt')).toBeDisabled();

});
test('P4 manuscript release gate closes again when a subsequent audit fails',async({page})=>{
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#generatePaper')).toBeDisabled();
  await page.locator('#auditStudyImport').setInputFiles({
    name:'unsupported.json',mimeType:'application/json',
    buffer:Buffer.from('{"schema":"invalid"}')
  });
  await expect(page.locator('#auditStatus')).toContainText('Audit rejected');
  await expect(page.locator('#generatePaper')).toBeDisabled();
  await expect(page.locator('#paperDownloadHtml')).toBeDisabled();
  await expect(page.locator('#paperExportZip')).toBeDisabled();
  await expect(page.locator('#paperDirectPdf')).toBeDisabled();
  await expect(page.locator('#paperReviewPacket')).toBeDisabled();
  await expect(page.locator('#paperPreview')).toBeHidden();
});


test('P9 mobile findings are read-only and list 13 research gaps, not approvals',async({page})=>{
 await page.goto('/glsl-lab.html');
 const status=page.locator('#p8EvidenceStatus');
 await expect(status).toHaveAttribute('data-evidence-state','ready',{timeout:15000});
 await expect(page.locator('#p8EvidenceRows details')).toHaveCount(13);
 await expect(status).toContainText('NOT ESTABLISHED');
 await page.locator('[data-claim-id="P8-C05"] summary').click();
 await expect(page.locator('[data-claim-id="P8-C05"]')).toHaveAttribute('open','');
 await expect(page.locator('[data-claim-id="P8-C05"]')).toContainText('Independently sampled experimental units');
 await expect(page.locator('[data-claim-id="P8-C05"]')).toContainText('Human approval: NONE');
 await expect(page.locator('#sourceReviewAdd')).toBeDisabled();
 await expect(page.locator('#sourceCrosswalkExport')).toBeDisabled();
 const width=await page.evaluate(()=>document.documentElement.scrollWidth);
 expect(width).toBeLessThanOrEqual(420);
});
test('P9 mobile research panel fails closed when its pinned register is substituted',async({page})=>{
 await page.route('**/docs/P8_EVIDENCE_REGISTER.json',route=>
  route.fulfill({status:200,contentType:'application/json',body:'{"schema":"forged"}'}));
 await page.goto('/glsl-lab.html');
 await expect(page.locator('#p8EvidenceStatus')).toHaveAttribute('data-evidence-state','error',{timeout:15000});
 await expect(page.locator('#p8EvidenceRows details')).toHaveCount(0);
 await expect(page.locator('#p8EvidenceStatus')).toContainText('Scientific approval remains unestablished');
});


test('Master/PhD/postdoc journey: author, experiment, audit, manuscript and TeX package',async({page})=>{
 test.setTimeout(180000);
 await page.goto('/glsl-lab.html');
 await page.locator('#workflowAuthor').click();
 await expect(page.locator('#paneBuild')).toBeVisible();
 await expect(page.locator('#demo')).toHaveCount(0);
 const available=await page.evaluate(()=>!!document.getElementById('glcanvas').getContext('webgl2'));
 test.skip(!available,'Real WebGL2 context required for study journey');
 await expect(page.locator('#saveBuild')).toBeEnabled({timeout:30000});
 await page.locator('#drawerToggle').click();
 await expect(page.locator('#drawerToggle')).toHaveAttribute('aria-expanded','false');
 await page.locator('#workflowStudy').click();
 await page.locator('#sweepRun').click();
 await expect(page.locator('#sweepStatus')).toContainText('Experiment verified',{timeout:60000});
 await expect(page.locator('#workflowStage')).toContainText('Experiment recorded');
 await page.locator('#workflowAudit').click();
 await expect(page.locator('#auditStatus')).toContainText('Study audit complete',{timeout:60000});
 await expect(page.locator('#workflowStage')).toContainText('Methodology verified');
 await page.locator('#workflowPaper').click();
 await expect(page.locator('#paperStatus')).toContainText('Technical manuscript assembled',{timeout:60000});
 await expect(page.locator('#workflowStage')).toContainText('Manuscript ready');
 const download=page.waitForEvent('download');
 await page.locator('#workflowLatex').click();
 const archive=Buffer.from(await readFile(await (await download).path()));
 expect(archive.includes(Buffer.from('manuscript.tex'))).toBe(true);
 expect(archive.includes(Buffer.from('shader.glsl'))).toBe(true);
 expect(archive.includes(Buffer.from('build-latex.sh'))).toBe(true);
 expect(archive.includes(Buffer.from('build-latex.ps1'))).toBe(true);
 expect(archive.includes(Buffer.from('manuscript.tex'))).toBe(true);
});
test('Academic UX structural audit: phone and desktop have no horizontal overflow or gallery controls',async({page})=>{
 for(const width of [360,390,1280]){
  await page.setViewportSize({width,height:900});
  await page.goto('/glsl-lab.html');
  await expect(page.locator('#workflowAuthor')).toBeVisible();
  await expect(page.locator('#workflowLatex')).toBeVisible();
  await expect(page.locator('#demo')).toHaveCount(0);
  const metrics=await page.evaluate(()=>({
   documentWidth:document.documentElement.scrollWidth,
   viewport:window.innerWidth,
   stageWidth:document.querySelector('.stage').getBoundingClientRect().width,
   canvasWidth:document.getElementById('glcanvas').getBoundingClientRect().width
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport+1);
  expect(metrics.stageWidth).toBeGreaterThan(200);
  expect(metrics.canvasWidth).toBeGreaterThan(200);
 }
});


test('Approved mobile interaction: pinned canvas and operable bottom drawer with swipeable modes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/glsl-lab.html');
 await expect(page.locator('#drawerToggle')).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,750));
 const canvas=await page.locator('#glcanvas').evaluate(el=>({
  top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom
 }));
 expect(canvas.top).toBeGreaterThanOrEqual(0);
 expect(canvas.bottom).toBeLessThanOrEqual(844);
 await page.locator('#drawerToggle').click();
 await expect(page.locator('#drawerToggle')).toHaveAttribute('aria-expanded','true');
 const placement=await page.locator('#labControls').evaluate(el=>getComputedStyle(el).position);
 expect(placement).toBe('fixed');
 await expect(page.locator('#panePlay')).toBeVisible();
 await page.locator('#labControls').evaluate(panel=>{
   const from=new Touch({identifier:1,target:panel,clientX:260,clientY:580});
   const to=new Touch({identifier:1,target:panel,clientX:100,clientY:580});
   panel.dispatchEvent(new TouchEvent('touchstart',{touches:[from],changedTouches:[from],bubbles:true}));
   panel.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[to],bubbles:true}));
 });
 await expect(page.locator('#paneBuild')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#drawerToggle')).toHaveAttribute('aria-expanded','false');
});

test('Academic visual contract evidence: fixed mobile and desktop app captures without reference asset',async({page})=>{
 const folder='test-results/visual-audit';
 await mkdir(folder,{recursive:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/glsl-lab.html');
 await expect(page.locator('#glcanvas')).toBeVisible();
 await page.screenshot({path:folder+'/mobile-390.png',animations:'disabled'});
 await page.locator('#drawerToggle').click();
 await expect(page.locator('#drawerToggle')).toHaveAttribute('aria-expanded','true');
 await page.screenshot({path:folder+'/mobile-drawer-390.png',animations:'disabled'});
 await page.locator('#drawerToggle').click();
 await page.setViewportSize({width:1280,height:800});
 await page.screenshot({path:folder+'/desktop-1280.png',animations:'disabled'});
 const geometry=await page.evaluate(()=>({
  width:document.documentElement.scrollWidth,
  viewport:window.innerWidth,
  stage:document.querySelector('.stage').getBoundingClientRect().width,
  panel:document.querySelector('.panel').getBoundingClientRect().width
 }));
 expect(geometry.width).toBeLessThanOrEqual(geometry.viewport+1);
 expect(geometry.stage).toBeGreaterThan(400);
 expect(geometry.panel).toBeGreaterThan(290);
});
