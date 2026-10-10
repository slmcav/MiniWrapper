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
