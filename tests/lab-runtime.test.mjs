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
  let compiled=0,draws=0,now=1000;
  const uniforms={};
  const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,STATIC_DRAW:35044,FLOAT:5126,TRIANGLE_STRIP:5,
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
  return {el,uniforms,frame:()=>{now+=16;queue.shift()?.(now);},get compiled(){return compiled;},get draws(){return draws;}};
}
test('Lab initially compiles the first shader and draws a frame',()=>{
  const l=buildLab();assert.equal(l.compiled,2);assert.match(l.el('code').value,/float i,e,R,s/);
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
test('changing demo recompiles only when needed, reset restores defaults',()=>{
  const l=buildLab(),before=l.compiled;
  l.el('demo').value='rotation';l.el('demo').dispatch('change');
  assert.equal(l.compiled,before+2);assert.match(l.el('code').value,/rotate3D/);
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
