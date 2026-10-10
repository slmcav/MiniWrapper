// Phase P1: immutable, content-addressed shader-build evidence (no UI or fake metrics).
export const BUILD_RECEIPT_SCHEMA = 'glsl-lab/build/1';
const PARAMETER_RANGES = Object.freeze({
  zoom: [0.5,2.5],
  angle: [-180,180],
  speed: [0,2.5],
  hue: [-180,180],
  brightness: [0.25,2]
});
const OWN = (x,key) => Object.prototype.hasOwnProperty.call(x,key);
const isPlain = x => !!x && typeof x === 'object' && !Array.isArray(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
function requireCondition(check,message) { if(!check) throw new TypeError(message); }
function stringField(value,label) {
  requireCondition(typeof value==='string' && value.trim().length>0,label+' must be nonempty text');
  return value;
}
function finite(value,label) {
  requireCondition(typeof value==='number' && Number.isFinite(value),label+' must be a finite number');
  return value;
}
function positiveInteger(value,label) {
  requireCondition(Number.isSafeInteger(value) && value>0 && value<=16384,label+' must be an integer from 1 to 16384');
  return value;
}
function canonical(value) {
  if(value===null || typeof value==='string' || typeof value==='boolean') return value;
  if(typeof value==='number') return finite(value,'canonical number');
  if(Array.isArray(value)) return value.map(canonical);
  requireCondition(isPlain(value),'Canonical data must be JSON-only');
  const out={};
  for(const key of Object.keys(value).sort()) {
    requireCondition(!['__proto__','constructor','prototype'].includes(key),'Unsafe canonical key');
    out[key]=canonical(value[key]);
  }
  return out;
}
function deepFreeze(value) {
  if (Array.isArray(value) || isPlain(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return Object.freeze(value);
}
export function canonicalJson(value) { return JSON.stringify(canonical(value)); }
export async function sha256Hex(value, subtle=globalThis.crypto?.subtle) {
  stringField(value,'SHA-256 input');
  requireCondition(!!subtle && typeof subtle.digest==='function','Web Crypto SubtleCrypto required');
  const raw=await subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(raw),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function createBuildReceipt(input,{subtle=globalThis.crypto?.subtle,clock=()=>new Date().toISOString()}={}) {
  requireCondition(isPlain(input),'Build record must be a plain object');
  for(const key of Object.keys(input)) {
    requireCondition(['shaderBody','expandedShader','demoId','attribution','checks','viewport','parameters','shaderTimeSeconds','compileCpuMs'].includes(key),'Unexpected build field: '+key);
  }
  const shaderBody=stringField(input.shaderBody,'Shader body');
  const expandedShader=stringField(input.expandedShader,'Compiled fragment shader');
  const demoId=stringField(input.demoId,'Shader or graph identifier');
  const attribution=stringField(input.attribution,'Source attribution');
  requireCondition(isPlain(input.checks),'Compile/link/draw checks required');
  for(const field of ['vertexCompiled','fragmentCompiled','linked','frameDrawn']) {
    requireCondition(input.checks[field]===true,'Build not validated: '+field);
  }
  requireCondition(input.checks.glError===0,'Build not validated: WebGL error code');
  requireCondition(Object.keys(input.checks).every(x=>['vertexCompiled','fragmentCompiled','linked','frameDrawn','glError'].includes(x)),'Unknown check field');
  requireCondition(isPlain(input.viewport),'Viewport dimensions required');
  requireCondition(Object.keys(input.viewport).sort().join(',')==='height,width','Viewport must contain width and height only');
  const viewport={width:positiveInteger(input.viewport.width,'Viewport width'),height:positiveInteger(input.viewport.height,'Viewport height')};
  requireCondition(isPlain(input.parameters),'Named parameters required');
  const parameters={};
  for(const [field,[min,max]] of Object.entries(PARAMETER_RANGES)) {
    const value=finite(input.parameters[field],field);
    requireCondition(value>=min&&value<=max,field+' out of range');
    parameters[field]=value;
  }
  requireCondition(Object.keys(input.parameters).sort().join(',')===Object.keys(PARAMETER_RANGES).sort().join(','),'Unexpected/missing shader parameters');
  const shaderTimeSeconds=finite(input.shaderTimeSeconds,'Shader time');
  requireCondition(shaderTimeSeconds>=0,'Shader time must be nonnegative');
  const content={
    schema:BUILD_RECEIPT_SCHEMA,
    shader:{body:shaderBody,expanded:expandedShader,identifier:demoId,attribution},
    checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
    viewport,parameters,shaderTimeSeconds,
    runtime:{api:'WebGL2',shadingLanguage:'GLSL ES 3.00'}
  };
  if(OWN(input,'compileCpuMs')) {
    const milliseconds=finite(input.compileCpuMs,'Compile CPU milliseconds');
    requireCondition(milliseconds>=0,'Compile CPU milliseconds must be nonnegative');
    content.compileCpuMs=milliseconds;
  }
  const capturedAt=clock();
  requireCondition(typeof capturedAt==='string' && !Number.isNaN(Date.parse(capturedAt)) && /Z$/.test(capturedAt),'Timestamp must be UTC ISO-8601');
  const digest=await sha256Hex(canonicalJson(content),subtle);
  return deepFreeze({...content,sha256:digest,capturedAt,evidenceClass:'observed-compile-link-draw'});
}
export function validateBuildReceipt(receipt) {
  requireCondition(isPlain(receipt),'Receipt must be a plain object');
  requireCondition(receipt.schema===BUILD_RECEIPT_SCHEMA,'Unexpected build receipt schema');
  requireCondition(typeof receipt.sha256==='string' && /^[a-f0-9]{64}$/.test(receipt.sha256),'Invalid SHA-256 digest');
  requireCondition(receipt.evidenceClass==='observed-compile-link-draw','Build evidence class invalid');
  requireCondition(receipt.checks?.vertexCompiled===true && receipt.checks?.fragmentCompiled===true &&
    receipt.checks?.linked===true && receipt.checks?.frameDrawn===true && receipt.checks?.glError===0,'Receipt was not a validated build');
  return true;
}
export async function verifyBuildReceipt(receipt,subtle=globalThis.crypto?.subtle) {
  validateBuildReceipt(receipt);
  const {sha256,capturedAt,evidenceClass,...content}=receipt;
  const digest=await sha256Hex(canonicalJson(content),subtle);
  requireCondition(digest===sha256,'Build receipt content hash mismatch');
  return true;
}
