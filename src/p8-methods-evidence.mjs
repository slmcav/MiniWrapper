// P9 read-only editorial research findings; never a scientific approval mechanism.
// Independent methodological analysis is separate from reviewer-declared P7 notes.
import {sha256Hex} from './build-evidence.mjs';
export const METHODS_EVIDENCE_SCHEMA='glsl-lab/methods-evidence-register/1';
// Pin exactly the reviewed P8 JSON bytes; changing the register requires an explicit code review.
export const METHODS_EVIDENCE_SHA256='1ed793d78bcf90a7aa4045d6ada2ef1968952a2512a6457d4815cf23147eebda';
export const METHODS_EVIDENCE_URL=new URL('../docs/P8_EVIDENCE_REGISTER.json',import.meta.url);
export const P8_CRITICAL_IDS=Object.freeze(['P8-C03','P8-C05','P8-C10','P8-C11','P8-C12','P8-C13']);
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const expect=(yes,message)=>{if(!yes)throw new TypeError('P8 evidence register: '+message);};
const ids=Array.from({length:13},(_,i)=>'P8-C'+String(i+1).padStart(2,'0'));
export function validateMethodsEvidence(record){
  expect(record&&typeof record==='object'&&!Array.isArray(record),'JSON object required');
  expect(record.schema===METHODS_EVIDENCE_SCHEMA,'unknown schema');
  expect(record.researchDate==='2026-10-10','unexpected research checkpoint');
  expect(record.companion==='docs/P8_INDEPENDENT_METHODS.md'&&
    record.sourceCrosswalk==='docs/SOURCE_CLAIM_CROSSWALK.md','source crosswalk mismatch');
  for(const field of ['sourcePacketModified','existingManuscriptsModified',
    'independentHumanPeerReviewEstablished','publicationAuthorized',
    'fullTextOfAllLiteratureReviewed','independentGpuExperimentRun']){
    expect(hasOwn(record,field)&&record[field]===false,'research clearance must remain false: '+field);
  }
  expect(Array.isArray(record.claimRows)&&record.claimRows.length===ids.length,
    'expected 13 bounded claim rows');
  for(let i=0;i<ids.length;i++){
    const row=record.claimRows[i];
    expect(row&&typeof row==='object'&&!Array.isArray(row),'invalid claim row');
    expect(row.id===ids[i],'missing, reordered or duplicate claim ID');
    expect(typeof row.claim==='string'&&row.claim.trim().length>=8&&row.claim.length<=200,
      'invalid bounded claim');
    expect(typeof row.strengtheningEvidenceRequired==='string'&&
      row.strengtheningEvidenceRequired.trim().length>=16&&
      row.strengtheningEvidenceRequired.length<=600,'evidence requirement missing');
    expect(row.strongerClaimEstablished===false&&
      row.evidenceStatus==='methodological_gap_identified'&&
      row.reviewAuthority==='none'&&row.readerDeclarationsPromoted===false,
      'claim must not imply verified evidence or scientific approval');
  }
  return true;
}
export async function loadMethodsEvidence({fetcher=globalThis.fetch,
  subtle=globalThis.crypto?.subtle}={}){
  expect(typeof fetcher==='function'&&subtle&&typeof subtle.digest==='function',
    'fetch and WebCrypto required');
  const response=await fetcher(METHODS_EVIDENCE_URL,{cache:'no-store'});
  expect(response&&response.ok,'reviewed research file unavailable');
  const text=await response.text();
  expect(text.length>0&&text.length<60000,'source exceeds bounded size');
  const checksum=await sha256Hex(text,subtle);
  expect(checksum===METHODS_EVIDENCE_SHA256,'pinned research file checksum mismatch');
  const record=JSON.parse(text);
  validateMethodsEvidence(record);
  return record; // read-only presentation; nothing in this API mutates papers or review packets
}
