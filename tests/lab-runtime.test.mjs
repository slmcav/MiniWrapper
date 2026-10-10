import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../glsl-lab.html',import.meta.url),'utf8');
const js=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1];

function buildLab() {
  const map=new Map(),queue=[];
  class El {
    constructor(id){this.id=id;this.listeners={};this.dataset={};this.attributes={};this.hidden=false;this.value='';this.textContent='';}
    addEventListener(key,fn){(this.listeners[key]??=[]).push(fn);}
    dispatch(key){for(const fn of this.listeners[key]??[])fn({target:this,preventDefault(){}});}
    click(){this.dispatch('click');}
    setAttribute(k,v){this.attributes[k]=v;}
    getBoundingClientRect(){return {width:390,height:260};}
    select(){}
  }
  function el(id){if(!map.has(id))map.set(id,new El(id));return map.get(id);}
  const sliders=['zoom','angle','speed','hue','brightness'].map(k=>{
    const n=el(k);n.dataset.key=k;n.value=({zoom:1,angle:0,speed:1,hue:0,brightness:1})[k];return n;
  });
  el('paneCode').hidden=true;
  let compiled=0,draws=0,now=1000,glError=0;
  const uniforms={};
  const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,STATIC_DRAW:35044,FLOAT:5126,TRIANGLE_STRIP:5,NO_ERROR:0,RGBA:6408,UNSIGNED_BYTE:5121,getError(){return glError;},readPixels(x,y,w,h,fmt,type,dest){dest.fill(127);},
    createBuffer:()=>({}),bindBuffer(){},bufferData(){},createVertexArray:()=>({}),bindVertexArray(){},enableVertexAttribArray(){},vertexAttribPointer(){},
    createShader:()=>({}),shaderSource(){},compileShader(){compiled++;},getShaderParameter:()=>true,deleteShader(){},
    createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,deleteProgram(){},
    getUniformLocation:(p,k)=>k,uniform1f:(k,v)=>{uniforms[k]=v;},uniform2f(){},viewport(){},useProgram(){},drawArrays(){draws++;}
  };
  el('glcanvas').getContext=()=>gl;
  const doc={hidden:false,getElementById:el,querySelectorAll:s=>s==='input[data-key]'?sliders:[],body:{appendChild(){}},createElement:el,addEventListener(){}};
  const win=new El('window');win.devicePixelRatio=1;
  vm.runInNewContext(js,{document:doc,window:win,devicePixelRatio:1,performance:{now:()=>now},
    requestAnimationFrame:fn=>(queue.push(fn),queue.length),cancelAnimationFrame(){},setTimeout(){},
    URL:{createObjectURL:()=>'',revokeObjectURL(){}},navigator:{clipboard:{writeText:async()=>{}}},
    Float32Array,console},{timeout:1000});
  // External graph-ui module compiles a typed graph on initial load.
  // Model that explicit module handoff in the isolated inline-runtime fixture.
  win.glslLabBridge.compileGraph({version:1,nodes:[{id:'research-node'}],output:'research-node'},
    'o.rgb=vec3(0.4,0.3,0.8);');
  return {el,uniforms,bridge:win.glslLabBridge,failGL(code){glError=code;},frame:()=>{now+=16;queue.shift()?.(now);},get compiled(){return compiled;},get draws(){return draws;}};
}
test('Lab compiles an authored graph through the external module and draws a frame',()=>{
  const l=buildLab();assert.equal(l.compiled,2);assert.match(l.el('code').value,/o\.rgb=vec3/);
  l.frame();assert.ok(l.draws>0);
});
test('slider adjustments update uniforms without recompilation',()=>{
  const l=buildLab();l.frame();const initial=l.compiled;
  l.el('zoom').value='1.75';l.el('zoom').dispatch('input');l.frame();
  assert.equal(l.compiled,initial);assert.equal(l.uniforms.uZoom,1.75);
  assert.equal(l.el('zoomValue').textContent,'175%');
});
test('hue and brightness modify GPU uniforms, but not source expression',()=>{
  const l=buildLab(),source=l.el('code').value;
  l.el('hue').value='120';l.el('hue').dispatch('input');
  l.el('brightness').value='1.5';l.el('brightness').dispatch('input');
  l.frame();assert.ok(Math.abs(l.uniforms.uHue-1/3)<1e-9);
  assert.equal(l.uniforms.uBrightness,1.5);assert.equal(l.el('code').value,source);
});
test('recompilation requires an authored graph and reset restores uniform defaults',()=>{
  const l=buildLab(),before=l.compiled;
  l.bridge.compileGraph({version:1,nodes:[{id:'another'}],output:'another'},'o.rgb=vec3(0.6);');
  assert.equal(l.compiled,before+2);assert.match(l.el('code').value,/0.6/);
  l.el('zoom').value='2';l.el('zoom').dispatch('input');l.el('resetControls').click();
  l.frame();assert.equal(l.uniforms.uZoom,1);
});
test('Play, Code, Pause and Restart remain connected',()=>{
  const l=buildLab();l.el('tabCode').click();
  assert.equal(l.el('panePlay').hidden,true);assert.equal(l.el('paneCode').hidden,false);
  l.el('tabPlay').click();assert.equal(l.el('panePlay').hidden,false);
  l.el('playPause').click();assert.equal(l.el('playPause').textContent,'Play');
  l.el('playPause').click();assert.equal(l.el('playPause').textContent,'Pause');
  l.el('restart').click();assert.match(l.el('values').textContent,/t = 0\.00 seconds/);
});

test('P1 bridge refuses a build before a verified frame draw',()=>{
  const l=buildLab();
  assert.throws(()=>l.bridge.capture(),/successfully drawn frame/);
  l.frame();
  const verified=l.bridge.capture();
  assert.equal(verified.checks.frameDrawn,true);
  assert.equal(verified.checks.glError,0);
  assert.equal(verified.demoId,'builder');
  assert.equal(verified.shaderBody,l.el('code').value);
  assert.equal(verified.parameters.zoom,1);
});
test('P1 slider edits invalidate prior draw until next successful frame',()=>{
  const l=buildLab();l.frame();assert.ok(l.bridge.capture());
  const zoom=l.el('zoom');zoom.value='2';zoom.dispatch('input');
  assert.throws(()=>l.bridge.capture(),/successfully drawn frame/);
  l.frame();assert.equal(l.bridge.capture().parameters.zoom,2);
});
test('P1 nonzero GL error prevents all successful build snapshots',()=>{
  const l=buildLab();l.failGL(1282);l.frame();
  assert.throws(()=>l.bridge.capture(),/successfully drawn frame/);
  assert.match(l.el('error').textContent,/WebGL drawing failed/);
});
test('P1 gallery project import is refused; authored graph changes invalidate old evidence',()=>{
  const l=buildLab();l.frame();const prior=l.bridge.capture();
  assert.throws(()=>l.bridge.applyProject({demoId:'rotation',parameters:{zoom:1,angle:0,speed:1,hue:0,brightness:1}}),/Gallery presets/);
  l.bridge.compileGraph({version:1,nodes:[{id:'new'}],output:'new'},'o.rgb=vec3(0.1,0.2,0.9);');
  assert.throws(()=>l.bridge.capture(),/successfully drawn frame/);
  l.frame();const frame=l.bridge.capture();
  assert.equal(frame.demoId,'builder');
  assert.notEqual(frame.shaderBody,prior.shaderBody);
});

test('P3 WebGL readback bridge refuses unvalidated frames and preserves dimensions',()=>{
  const app=buildLab();
  assert.throws(()=>app.bridge.readPixelsForResearch(),/verified WebGL draw/);
  app.frame();
  const {observation,pixels}=app.bridge.readPixelsForResearch();
  assert.equal(observation.checks.frameDrawn,true);
  assert.equal(pixels.length,observation.viewport.width*observation.viewport.height*4);
  assert.equal(pixels[0],127);
});
test('P3 readPixels GL errors invalidate research and shader-build eligibility',()=>{
  const app=buildLab();app.frame();
  app.failGL(1282);
  assert.throws(()=>app.bridge.readPixelsForResearch(),/readPixels failed/);
  assert.throws(()=>app.bridge.capture(),/successfully drawn frame/);
});
