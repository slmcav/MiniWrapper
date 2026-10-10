// P3: three-point controlled shader sweeps, self-contained auditable archives,
// and descriptive between-session comparisons. No inferential statistics.
import {canonicalJson,sha256Hex,verifyBuildReceipt} from './build-evidence.mjs';
import {assertResearchEligibleShader} from './research-source-policy.mjs';
import {verifyResearchCapture} from './research-capture.mjs';
import {createFigureEvidence,compareFullFrames,zipStored} from './research-figures.mjs';
export const SWEEP_SCHEMA='glsl-lab/sweep-session/1';
export const SWEEP_PROTOCOL='glsl-lab/sweep-protocol/1';
const LIMITS={zoom:[.5,2.5],angle:[-180,180],hue:[-180,180],brightness:[.25,2]};
const PARAMS=['zoom','angle','speed','hue','brightness'];
const assert=(v,m)=>{if(!v)throw new TypeError(m);};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const decode=text=>{assert(typeof text==='string'&&text.length>0&&text.length<=12000000&&/^[a-zA-Z0-9+/]+={0,2}$/.test(text),'Invalid RGBA archive encoding');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));};
const rounded=v=>Math.round(v*1e6)/1e6;
function checkParams(p){
 assert(plain(p)&&Object.keys(p).sort().join(',')===PARAMS.slice().sort().join(','),'Five baseline parameters required');
 for(const [key,[min,max]] of Object.entries({...LIMITS,speed:[0,2.5]}))
   assert(finite(p[key])&&p[key]>=min&&p[key]<=max,'Invalid parameter '+key);
}
export function createSweepProtocol(parameters,parameter='zoom',step=.2,shaderTimeSeconds=2){
 checkParams(parameters);
 assert(Object.hasOwn(LIMITS,parameter),'Only shader-uniform parameters can be swept');
 assert(finite(step)&&step>0&&step<=Math.min(60,(LIMITS[parameter][1]-LIMITS[parameter][0])/2),'Invalid sweep step');
 assert(finite(shaderTimeSeconds)&&shaderTimeSeconds>=0&&shaderTimeSeconds<=3600,'Fixed shader time must be between 0 and 3600 seconds');
 const center=parameters[parameter],levels=[rounded(center-step),rounded(center),rounded(center+step)];
 assert(levels[0]>=LIMITS[parameter][0]&&levels[2]<=LIMITS[parameter][1]&&
   levels[0]<levels[1]&&levels[1]<levels[2],'Sweep values exceed parameter limits');
 return {schema:SWEEP_PROTOCOL,parameter,step,shaderTimeSeconds,
   baseline:clone(parameters),levels,design:'three fixed levels; one observed draw per condition; no randomization or inferential replication'};
}
function inspectProtocol(p){
 assert(plain(p)&&p.schema===SWEEP_PROTOCOL,'Unsupported sweep protocol');
 const expected=createSweepProtocol(p.baseline,p.parameter,p.step,p.shaderTimeSeconds);
 assert(canonicalJson(expected)===canonicalJson(p),'Sweep protocol was modified');
 return expected;
}
function expectedSettings(p,index){
 return {...p.baseline,[p.parameter]:p.levels[index]};
}
function shaderIdentity(receipt){
 return canonicalJson({shader:receipt.shader,graph:receipt.graph||null,viewport:receipt.viewport,
    runtime:receipt.runtime});
}
function frameBytes(trial){
 return decode(trial.rgbaBase64);
}
async function auditCore(protocol,trials,subtle){
 inspectProtocol(protocol);
 assert(Array.isArray(trials)&&trials.length===3,'Exactly three observed sweep conditions required');
 let identity=null,viewport=null;
 const rebuilt=[];
 for(let i=0;i<3;i++){
   const entry=trials[i];
   assert(plain(entry)&&plain(entry.receipt)&&plain(entry.capture)&&plain(entry.figure),'Incomplete trial archive');
   await verifyBuildReceipt(entry.receipt,subtle);
   assertResearchEligibleShader({body:entry.receipt.shader.body,
     identifier:entry.receipt.shader.identifier,attribution:entry.receipt.shader.attribution});
   await verifyResearchCapture(entry.capture,entry.receipt,subtle);
   assert(canonicalJson(entry.receipt.parameters)===canonicalJson(expectedSettings(protocol,i)),
     'Trial settings do not match preregistered sweep level '+i);
   assert(Math.abs(entry.receipt.shaderTimeSeconds-protocol.shaderTimeSeconds)<=1e-6,
     'Sweep trial did not use the fixed shader time');
   const fingerprint=shaderIdentity(entry.receipt);
   if(identity===null){identity=fingerprint;viewport=entry.receipt.viewport;}
   else assert(identity===fingerprint,'Shader, compiled source, graph, viewport or runtime changed between trials');
   assert(entry.receipt.viewport.width*entry.receipt.viewport.height<=500000,
     'Sweep archive exceeds the 500,000-pixel-per-frame mobile limit');
   const rgba=frameBytes(entry);
   const figure=await createFigureEvidence(entry.receipt,entry.capture,rgba,{
     subtle,clock:()=>entry.figure.capturedAt,
     ...(entry.figure.drawSequence===undefined?{}:{drawSequence:entry.figure.drawSequence})
   });
   assert(canonicalJson(figure.record)===canonicalJson(entry.figure),
     'Archived lossless figure does not reproduce its recorded pixel evidence');
   rebuilt.push({...figure,receipt:entry.receipt,capture:entry.capture});
 }
 for(let i=1;i<trials.length;i++){
   const prior=trials[i-1].figure,current=trials[i].figure;
   assert(Date.parse(current.capturedAt)>=Date.parse(prior.capturedAt),
     'Sweep observations must be chronologically ordered');
   if(prior.drawSequence!==undefined||current.drawSequence!==undefined)
     assert(Number.isSafeInteger(prior.drawSequence)&&Number.isSafeInteger(current.drawSequence)&&
       current.drawSequence>prior.drawSequence,'Sweep requires distinct ordered GPU draws');
 }
 // Comparisons are ordered by treatment level, not timing; presentation order is recorded.
 return {identity,viewport,figures:rebuilt};
}
export async function createSweepSession(protocol,figures,{sessionId,clock=()=>new Date().toISOString(),subtle=globalThis.crypto?.subtle}={}){
 inspectProtocol(protocol);
 assert(typeof sessionId==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId),'Session ID must be a unique safe identifier');
 assert(Array.isArray(figures)&&figures.length===3,'Exactly three observed figures required');
 const trials=figures.map(f=>{
   assert(f.rgba instanceof Uint8Array&&f.record&&f.receipt&&f.capture,'Invalid observed figure');
   return {receipt:clone(f.receipt),capture:clone(f.capture),figure:clone(f.record),rgbaBase64:encode(f.rgba)};
 });
 const {identity}=await auditCore(protocol,trials,subtle);
 const createdAt=clock();
 assert(typeof createdAt==='string'&&createdAt.endsWith('Z')&&!Number.isNaN(Date.parse(createdAt)),'Session creation requires UTC timestamp');
 const body={schema:SWEEP_SCHEMA,sessionId,createdAt,protocol:clone(protocol),
   shaderIdentity:identity,trials,
   inferenceScope:'Three fixed treatments in one browser capture session; descriptive pixels only, no inferential replication'};
 return {...body,sha256:await sha256Hex(canonicalJson(body),subtle)};
}
export async function verifySweepSession(session,subtle=globalThis.crypto?.subtle){
 assert(plain(session)&&session.schema===SWEEP_SCHEMA&&typeof session.sha256==='string','Unsupported sweep archive');
 const {sha256,...body}=session;
 assert(await sha256Hex(canonicalJson(body),subtle)===sha256,'Sweep archive content SHA-256 mismatch');
 const {identity,figures}=await auditCore(session.protocol,session.trials,subtle);
 assert(identity===session.shaderIdentity,'Sweep shader identity hash mismatch');
 assert(session.inferenceScope==='Three fixed treatments in one browser capture session; descriptive pixels only, no inferential replication','Unsupported inference scope');
 return figures;
}
export async function compareSweepSessions(a,b,subtle=globalThis.crypto?.subtle){
 const [af,bf]=await Promise.all([verifySweepSession(a,subtle),verifySweepSession(b,subtle)]);
 assert(a.sessionId!==b.sessionId,'Cannot compare one session with itself');
 assert(canonicalJson(a.protocol)===canonicalJson(b.protocol),'Sweep protocols differ: no controlled cross-session comparison');
 assert(a.shaderIdentity===b.shaderIdentity,'Shader, graph, dimensions or runtime differ across sessions');
 const comparisons=[];
 for(let i=0;i<3;i++){
   const frameDifference=compareFullFrames(af[i].rgba,bf[i].rgba);
   comparisons.push({
     parameterValue:a.protocol.levels[i],...frameDifference,
     firstMeanLuma8:af[i].record.fullFrameMetrics.meanLuma8,
     secondMeanLuma8:bf[i].record.fullFrameMetrics.meanLuma8,
     deltaMeanLuma8:rounded(bf[i].record.fullFrameMetrics.meanLuma8-af[i].record.fullFrameMetrics.meanLuma8)
   });
 }
 const content={schema:'glsl-lab/sweep-comparison/1',sessionIds:[a.sessionId,b.sessionId],
   protocol:a.protocol,comparisons,
   inferenceScope:'Descriptive agreement between separately initiated sessions; hardware/software independence not established'};
 return {...content,sha256:await sha256Hex(canonicalJson(content),subtle)};
}
export async function exportSweepZip(session,subtle=globalThis.crypto?.subtle){
 const figures=await verifySweepSession(session,subtle);
 const entries=[{name:'experiment.json',data:new TextEncoder().encode(JSON.stringify(session,null,2)+'\n')}];
 for(let i=0;i<figures.length;i++)
   entries.push({name:'figures/treatment-'+(i+1)+'.png',data:figures[i].png});
 return zipStored(entries);
}
export function parseSweepJson(raw){
 assert(typeof raw==='string'&&raw.length<=24000000,'Experiment JSON must be smaller than 24 MB');
 return JSON.parse(raw);
}
