import { test, expect } from '@playwright/test';

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
  await page.reload();
  await page.locator('#projectPicker').selectOption(saved.id);
  await expect(page.locator('#paneBuild')).toBeVisible();
  await expect(page.locator('#graphChain .graph-node')).toHaveCount(6);
});
