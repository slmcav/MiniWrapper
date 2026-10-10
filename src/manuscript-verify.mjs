// P6 standalone, non-network research-bundle verifier.
// Reconstructs a manuscript from archived study bytes, then compares the ENTIRE
// canonical export byte-for-byte. A ZIP SHA or manifest alone proves no authorship.
import {canonicalJson} from './build-evidence.mjs';
import {assembleManuscript} from './manuscript-engine.mjs';
import {exportManuscriptBundle} from './manuscript-render.mjs';
export const BUNDLE_VERIFICATION_SCHEMA='glsl-lab/bundle-verification/1';
const LIMIT=48*1024*1024,decoder=new TextDecoder('utf-8',{fatal:true});
const need=(x,m)=>{if(!x)throw new TypeError(m);};
const le16=(b,i)=>b[i]|(b[i+1]<<8);
const le32=(b,i)=>(b[i]|(b[i+1]<<8)|(b[i+2]<<16)|(b[i+3]<<24))>>>0;
function crc32(b){
  let crc=0xffffffff;
  for(let i=0;i<b.length;i++){crc^=b[i];for(let j=0;j<8;j++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}
  return (crc^0xffffffff)>>>0;
}
function readEntries(input){
  need(input instanceof Uint8Array&&input.length>=70&&input.length<=LIMIT,
    'Research ZIP exceeds bounds or has invalid binary data');
  let cursor=0;
  const entries=new Map();
  while(cursor<input.length-22&&le32(input,cursor)===0x04034b50){
    need(entries.size<32,'Research ZIP exceeds supported entry count');
    need(cursor+30<=input.length,'ZIP local header truncated');
    const generalFlags=le16(input,cursor+6),method=le16(input,cursor+8),
      crc=le32(input,cursor+14),length=le32(input,cursor+18),
      expandedLength=le32(input,cursor+22),nameLength=le16(input,cursor+26),
      extraLength=le16(input,cursor+28);
    need(generalFlags===0&&method===0&&length===expandedLength&&
      length<=32e6&&extraLength===0,'Research ZIP must contain bounded, uncompressed files');
    const nameStart=cursor+30,bodyStart=nameStart+nameLength;
    need(nameLength>0&&bodyStart+length<=input.length,'ZIP file entry outside bounds');
    const name=decoder.decode(input.subarray(nameStart,bodyStart));
    need(/^[a-z0-9][a-z0-9/_\-.]{0,100}$/.test(name)&&
      !name.includes('..')&&!entries.has(name),'Unsafe or duplicate ZIP entry');
    const data=input.subarray(bodyStart,bodyStart+length);
    need(crc32(data)===crc,'Research ZIP CRC-32 mismatch for '+name);
    entries.set(name,data);
    cursor=bodyStart+length;
  }
  need(le32(input,cursor)===0x02014b50&&entries.size>=8,
    'Research ZIP central directory missing or incomplete');
  need(le32(input,input.length-22)===0x06054b50,'Research ZIP end record missing');
  need(le16(input,input.length-12)===entries.size,
    'Research ZIP entry count does not match central directory');
  need(le32(input,input.length-6)===cursor,'Research ZIP central directory offset mismatch');
  return entries;
}
function parseJSON(entries,name){
  const data=entries.get(name);
  need(!!data,'Research bundle missing '+name);
  return JSON.parse(decoder.decode(data));
}
export async function verifyManuscriptZip(zip,{
  subtle=globalThis.crypto?.subtle
}={}){
  need(subtle&&typeof subtle.digest==='function','Web Crypto required for independent bundle verification');
  const incoming=zip instanceof ArrayBuffer?new Uint8Array(zip):zip;
  const files=readEntries(incoming);
  const manifest=parseJSON(files,'manifest.json');
  need(manifest?.schema==='glsl-lab/manuscript-bundle/1'&&
    manifest.verification?.academicManuscriptUnlocked===false&&
    manifest.verification?.manuscriptReviewCompleted===false,
    'Bundle does not have an unreviewed research manifest');
  const study=parseJSON(files,'study.json'),audit=parseJSON(files,'methodology-audit.json');
  need(typeof manifest.manuscript?.generatedAt==='string','Bundle manuscript timestamp absent');
  const regenerated=await assembleManuscript(study,{
    audit,subtle,clock:()=>manifest.manuscript.generatedAt
  });
  need(canonicalJson(regenerated.record)===canonicalJson(manifest.manuscript),
    'Archived manuscript does not reproduce from the source study');
  // This independently rechecks full frame receipts, PNGs, reviewer packet,
  // bibliography and PDF; not merely the untrusted fileInventory strings.
  const expected=await exportManuscriptBundle(regenerated,{subtle});
  need(incoming.length===expected.zip.length&&
    incoming.every((value,index)=>value===expected.zip[index]),
    'Research ZIP file content, source chain, PDF or central-directory bytes do not reproduce');
  need(canonicalJson(manifest)===canonicalJson(expected.manifest),'Research manifest differs');
  const digest=new Uint8Array(await subtle.digest('SHA-256',incoming));
  const archiveSha256=Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('');
  return {
    schema:BUNDLE_VERIFICATION_SCHEMA,verdict:'PASS',
    archiveSha256,
    observedGpuDraws:study.trials.length,studySha256:study.sha256,
    manuscriptSha256:regenerated.record.sha256,auditSha256:audit.sha256,
    inventoryEntries:manifest.fileInventory.length,
    pdfVerified:true,sourceFiguresVerified:regenerated.figures.length,
    bibliographyAndReviewPacketVerified:true,
    manuscriptReviewCompleted:false,publicationAuthorized:false,
    meaning:'Complete canonical archive, evidence, PDF and unsigned review handoff reproduced; NOT proof of authorship, independent experimental replication or peer review'
  };
}
