// P3 replicated fixed-time shader observations.
// Three treatment levels x three positional counterbalance blocks = nine *observed* draws.
// Descriptive within-treatment dispersion only, not independent experimental trials.
import {canonicalJson,sha256Hex,verifyBuildReceipt} from './build-evidence.mjs';
import {assertResearchEligibleShader} from './research-source-policy.mjs';
import {createSweepProtocol} from './research-experiments.mjs';
import {verifyResearchCapture} from './research-capture.mjs';
import {createFigureEvidence,zipStored} from './research-figures.mjs';
export const REPLICATION_SCHEMA='glsl-lab/replicated-session/1';
export const REPLICATION_PROTOCOL='glsl-lab/replicated-protocol/1';
const check=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const copy=v=>JSON.parse(JSON.stringify(v));
const round=v=>Math.round(v*1e6)/1e6;
const hex=/^[a-f0-9]{64}$/;
const BASE64=/^[A-Za-z0-9+/]+={0,2}$/;
const platformFields=['api','webglVersion','shadingLanguageVersion','vendor','renderer',
  'maxTextureSize','maxRenderbufferSize','maxVertexAttribs','fragmentHighpPrecision','devicePixelRatio'];
export function validateGraphicsPlatform(platform){
  check(obj(platform)&&Object.keys(platform).sort().join(',')===platformFields.slice().sort().join(','),
    'Graphics platform capability fields missing or unexpected');
  check(platform.api==='WebGL2','WebGL2 required');
  for(const key of ['webglVersion','shadingLanguageVersion','vendor','renderer']){
    check(typeof platform[key]==='string'&&platform[key].length>0&&platform[key].length<=200,
      'Invalid graphics platform '+key);
  }
  for(const key of ['maxTextureSize','maxRenderbufferSize','maxVertexAttribs','fragmentHighpPrecision']){
    check(Number.isSafeInteger(platform[key])&&platform[key]>=0&&platform[key]<1000000,
      'Invalid graphics capability '+key);
  }
  check(typeof platform.devicePixelRatio==='number'&&Number.isFinite(platform.devicePixelRatio)&&
    platform.devicePixelRatio>0&&platform.devicePixelRatio<=16,'Invalid device pixel ratio');
  return true;
}
export function createReplicatedProtocol(baseline,parameter='zoom',step=.2,time=2,phase=0){
  const base=createSweepProtocol(baseline,parameter,step,time);
  check(Number.isSafeInteger(phase)&&phase>=0&&phase<3,'Counterbalance phase must be 0, 1 or 2');
  // Every treatment occupies every within-block serial position exactly once.
  const sequence=[];
  for(let block=0;block<3;block++)
    for(let position=0;position<3;position++)
      sequence.push({block,position,levelIndex:(block+position+phase)%3});
  return {schema:REPLICATION_PROTOCOL,sweep:base,phase,sequence,
    design:'Three fixed-time observations per level in 3 cyclic counterbalanced blocks; no randomization or independence claim'};
}
function assertProtocol(p){
  check(obj(p)&&p.schema===REPLICATION_PROTOCOL,'Unsupported replicated protocol');
  const s=p.sweep||{};
  const expected=createReplicatedProtocol(s.baseline,s.parameter,s.step,s.shaderTimeSeconds,p.phase);
  check(canonicalJson(p)===canonicalJson(expected),'Counterbalance schedule or protocol altered');
}
function baseIdentity(receipt){
  return canonicalJson({shader:receipt.shader,graph:receipt.graph||null,
    viewport:receipt.viewport,runtime:receipt.runtime});
}
const fromBase64=str=>{
  check(typeof str==='string'&&str.length>0&&str.length<=2000000&&BASE64.test(str),
    'Invalid or oversized RGBA trial data');
  return Uint8Array.from(atob(str),c=>c.charCodeAt(0));
};
const toBase64=bytes=>{
  let binary='';for(let at=0;at<bytes.length;at+=8192)
    binary+=String.fromCharCode(...bytes.subarray(at,at+8192));
  return btoa(binary);
};
function summarize(trials){
  const out=[];
  for(let levelIndex=0;levelIndex<3;levelIndex++){
    const subset=trials.filter(t=>t.levelIndex===levelIndex);
    check(subset.length===3,'Exactly three observations required per treatment');
    const values=subset.map(t=>t.figure.fullFrameMetrics.meanLuma8);
    const mean=values.reduce((a,b)=>a+b,0)/3;
    const sd=Math.sqrt(values.reduce((sum,v)=>sum+(v-mean)**2,0)/2);
    out.push({levelIndex,observationCount:3,meanLuma8:round(mean),
      sampleStdevLuma8:round(sd),minLuma8:Math.min(...values),
      maxLuma8:Math.max(...values)});
  }
  return out;
}
async function reconstruct(protocol,trials,platform,subtle){
  assertProtocol(protocol);validateGraphicsPlatform(platform);
  check(Array.isArray(trials)&&trials.length===9,'Exactly nine observations required');
  let identity=null,lastDraw=-1,lastTime=-Infinity;
  const figures=[];
  for(let index=0;index<9;index++){
    const trial=trials[index],slot=protocol.sequence[index];
    check(obj(trial)&&trial.block===slot.block&&trial.position===slot.position&&
      trial.levelIndex===slot.levelIndex,'Observed order violates counterbalance protocol');
    check(obj(trial.receipt)&&obj(trial.capture)&&obj(trial.figure),'Incomplete trial provenance');
    await verifyBuildReceipt(trial.receipt,subtle);
    assertResearchEligibleShader({body:trial.receipt.shader.body,
      identifier:trial.receipt.shader.identifier,attribution:trial.receipt.shader.attribution});
    await verifyResearchCapture(trial.capture,trial.receipt,subtle);
    const settings={...protocol.sweep.baseline,
      [protocol.sweep.parameter]:protocol.sweep.levels[slot.levelIndex]};
    check(canonicalJson(trial.receipt.parameters)===canonicalJson(settings),
      'Recorded treatment controls differ from preregistered settings');
    check(Math.abs(trial.receipt.shaderTimeSeconds-protocol.sweep.shaderTimeSeconds)<=1e-6,
      'Shader time differs from fixed-time protocol');
    const fingerprint=baseIdentity(trial.receipt);
    if(identity===null)identity=fingerprint;
    else check(fingerprint===identity,'Shader, graph, runtime or dimensions changed between trials');
    const {width,height}=trial.receipt.viewport;
    check(width*height<=180000,'Replicated protocol requires 180,000 pixels or fewer per draw');
    const bytes=fromBase64(trial.rgbaBase64);
    check(bytes.length===width*height*4,'Full framebuffer RGBA byte length differs');
    check(Number.isSafeInteger(trial.figure.drawSequence)&&trial.figure.drawSequence>lastDraw,
      'Draw numbers must be strictly increasing');
    check(Date.parse(trial.figure.capturedAt)>=lastTime,
      'Capture timestamps must be chronologically ordered');
    lastDraw=trial.figure.drawSequence;lastTime=Date.parse(trial.figure.capturedAt);
    const rebuilt=await createFigureEvidence(trial.receipt,trial.capture,bytes,{
      subtle,clock:()=>trial.figure.capturedAt,drawSequence:trial.figure.drawSequence
    });
    check(canonicalJson(rebuilt.record)===canonicalJson(trial.figure),
      'Replicate image metrics or PNG provenance could not be reconstructed');
    figures.push({...rebuilt,receipt:trial.receipt,capture:trial.capture});
  }
  return {figures,identity,summary:summarize(trials)};
}
export async function createReplicatedSession(protocol,figures,platform,{
  sessionId,clock=()=>new Date().toISOString(),subtle=globalThis.crypto?.subtle}={}){
  assertProtocol(protocol);validateGraphicsPlatform(platform);
  check(typeof sessionId==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(sessionId),'Invalid experiment session identifier');
  check(Array.isArray(figures)&&figures.length===9,'Exactly nine observed figures required');
  const trials=figures.map((f,i)=>{
    check(f.rgba instanceof Uint8Array&&f.record&&f.receipt&&f.capture,'Figure evidence required');
    return {...protocol.sequence[i],receipt:copy(f.receipt),capture:copy(f.capture),
      figure:copy(f.record),rgbaBase64:toBase64(f.rgba)};
  });
  const {identity,summary}=await reconstruct(protocol,trials,platform,subtle);
  const createdAt=clock();
  check(typeof createdAt==='string'&&createdAt.endsWith('Z')&&Number.isFinite(Date.parse(createdAt)),
    'UTC study timestamp required');
  const body={schema:REPLICATION_SCHEMA,sessionId,createdAt,
    protocol:copy(protocol),platform:copy(platform),shaderIdentity:identity,
    trials,summary,inferenceScope:'Within-session descriptive variation from 3 GPU draws per treatment; serially ordered draws are not independent experiments'};
  return {...body,sha256:await sha256Hex(canonicalJson(body),subtle)};
}
export async function verifyReplicatedSession(record,subtle=globalThis.crypto?.subtle){
  check(obj(record)&&record.schema===REPLICATION_SCHEMA&&typeof record.sha256==='string'&&hex.test(record.sha256),
    'Invalid replicated session record');
  const {sha256,...body}=record;
  check(await sha256Hex(canonicalJson(body),subtle)===sha256,'Replicated experiment SHA-256 mismatch');
  check(record.inferenceScope==='Within-session descriptive variation from 3 GPU draws per treatment; serially ordered draws are not independent experiments',
    'Invalid inferential scope');
  const {figures,identity,summary}=await reconstruct(record.protocol,record.trials,record.platform,subtle);
  check(identity===record.shaderIdentity,'Replicated shader identity changed');
  check(canonicalJson(summary)===canonicalJson(record.summary),'Replicated treatment dispersions do not reproduce');
  return figures;
}
export async function compareReplicatedSessions(a,b,subtle=globalThis.crypto?.subtle){
  await Promise.all([verifyReplicatedSession(a,subtle),verifyReplicatedSession(b,subtle)]);
  check(a.sessionId!==b.sessionId,'A session cannot be compared against itself');
  check(canonicalJson(a.protocol)===canonicalJson(b.protocol),'Counterbalanced treatment protocols differ');
  check(a.shaderIdentity===b.shaderIdentity,'Shader or viewport differs between sessions');
  check(canonicalJson(a.platform)===canonicalJson(b.platform),
    'Reported graphics platform capabilities differ; comparison is not platform-controlled');
  const differences=a.summary.map((x,i)=>({
    levelIndex:i,levelValue:a.protocol.sweep.levels[i],
    previousMeanLuma8:x.meanLuma8,currentMeanLuma8:b.summary[i].meanLuma8,
    differenceMeanLuma8:round(b.summary[i].meanLuma8-x.meanLuma8),
    previousSampleStdevLuma8:x.sampleStdevLuma8,currentSampleStdevLuma8:b.summary[i].sampleStdevLuma8
  }));
  const body={schema:'glsl-lab/replicated-comparison/1',
    sessionIds:[a.sessionId,b.sessionId],differences,
    inferenceScope:'Descriptive within/between-session variation; no random sample, p-value or hardware independence inferred'};
  return {...body,sha256:await sha256Hex(canonicalJson(body),subtle)};
}
export async function exportReplicatedZip(record,subtle=globalThis.crypto?.subtle){
  const figures=await verifyReplicatedSession(record,subtle);
  const encoder=new TextEncoder();
  const files=[{name:'experiment.json',data:encoder.encode(JSON.stringify(record,null,2)+'\n')}];
  for(let i=0;i<figures.length;i++)
    files.push({name:'figures/trial-'+String(i+1).padStart(2,'0')+'.png',data:figures[i].png});
  return zipStored(files);
}
export function parseReplicatedJson(text){
  check(typeof text==='string'&&text.length>0&&text.length<=28000000,
    'Replicated experiment JSON exceeds the 28 MB limit');
  return JSON.parse(text);
}
