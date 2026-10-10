import { test, expect } from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('mobile navigation: classic editor opens Lab without losing presets',async({page})=>{
  await page.goto('/index.html');
  await expect(page.locator('#example option')).toHaveCount(17);
  await expect(page.locator('#recording-indicator')).toBeHidden();
  await page.getByRole('link',{name:/Open GLSL Lab/}).click();
  await expect(page).toHaveURL(/glsl-lab\.html/);
  await expect(page.locator('#demo option')).toHaveCount(3);
  await expect(page.locator('#tabPlay')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#code')).toHaveValue(/float i,e,R,s/);
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
test('GPU smoke: three demos compile, changing slider does not recompile',async({page})=>{
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
  for(const name of ['rotation','yohei']){
    await page.locator('#demo').selectOption(name);
    await expect(page.locator('#state')).toHaveText('Live',{timeout:30000});
    await expect(page.locator('#error')).toBeEmpty();
  }
  const file=page.waitForEvent('download',{timeout:30000});
  await page.locator('#savePng').click();
  expect((await file).suggestedFilename()).toBe('glsl-lab-yohei.png');
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
