import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const classic=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const lab=readFileSync(new URL('../glsl-lab.html',import.meta.url),'utf8');
const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
const inline=html=>{const m=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);assert.ok(m);return m[1];};
const classicJs=inline(classic),labJs=inline(lab);
function demos(script,endMarker) {
  const start=script.indexOf('const DEMOS = '),end=script.indexOf(endMarker,start);
  assert.ok(start>=0&&end>start);
  return vm.runInNewContext(script.slice(start,end)+'\nDEMOS;');
}
const original=demos(classicJs,'const codeEl');
const labPresets=demos(labJs,'const LABELS');
const lockedHashes={
  original:'deb0b018',rotation:'3dffcc5a',yohei:'bee505cd',demo4:'b9f0942a',
  demo5:'1a239088',demo6:'895a3665',demo7:'76b58235',demo8:'64e61f32',
  demo9:'b7f89db8',demo10:'86d04344',demo11:'2e18b65b',demo12:'388b9875',
  demo13:'dc3d7903',demo14:'2fa1e13b',demo15:'6fcf1386',demo16:'dccfc35b',demo17:'a273b355'
};
function fnv32(value){let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}

test('both inline apps pass JavaScript parsing',()=>{
  assert.doesNotThrow(()=>new vm.Script(classicJs));
  assert.doesNotThrow(()=>new vm.Script(labJs));
});
test('all 17 supplied GLSL strings stay unchanged',()=>{
  assert.deepEqual(Object.keys(original),Object.keys(lockedHashes));
  for(const [key,source] of Object.entries(original))assert.equal(fnv32(source),lockedHashes[key],key+' changed unexpectedly');
});
test('Lab presets match the first 3 exact source expressions',()=>{
  assert.deepEqual(Object.keys(labPresets),['original','rotation','yohei']);
  for(const k of Object.keys(labPresets))assert.equal(labPresets[k],original[k]);
});
test('classic remains linked and retains its 17 shader controls',()=>{
  for(const token of ['href="./glsl-lab.html"','id="example"','id="download-image"','id="record-video"','id="recording-indicator"'])
    assert.ok(classic.includes(token),token);
});
test('Lab has a mobile sticky canvas, 2 tabs and 5 labeled sliders',()=>{
  for(const token of ['name="viewport"','position:sticky','id="tabPlay"','id="tabCode"','id="panePlay"','id="paneCode"','href="./index.html"'])
    assert.ok(lab.includes(token),token);
  for(const k of ['zoom','angle','speed','hue','brightness']){
    assert.ok(lab.includes('id="'+k+'" data-key="'+k+'"'),k+' slider missing');
    assert.ok(lab.includes('id="'+k+'Value"'),k+' output missing');
  }
});
test('GLSL Lab keeps live shader parameters on uniforms',()=>{
  assert.match(lab,/uniform float uZoom,uAngle,uHue,uBrightness/);
  assert.match(lab,/settings\.speed/);
  assert.match(lab,/gl\.uniform1f/);
});
test('classic retains compatibility helpers and proper attribution',()=>{
  for(const s of ['mat2 rotate2D','mat3 rotate3D','const float PI','All 17 demo expressions by'])
    assert.ok(classic.includes(s),s);
  assert.match(readme,/GLSL Lab/);
});
