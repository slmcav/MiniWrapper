// P6 client-side external export verification; no user-provided archive executes code.
import {verifyManuscriptZip} from './manuscript-verify.mjs';
const $=id=>document.getElementById(id);
let receipt=null,busy=false;
function status(message,error=false){
  $('manuscriptZipStatus').textContent=message;
  $('manuscriptZipStatus').dataset.error=String(error);
}
function download(name,text){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('manuscriptZipImport').addEventListener('change',async e=>{
  if(busy)return;
  const file=e.target.files?.[0];if(!file)return;
  busy=true;receipt=null;
  $('manuscriptZipImport').disabled=true;
  $('manuscriptZipExportReceipt').disabled=true;
  status('Reconstructing original study, figures, PDF, citations and ZIP byte inventory.');
  try{
    if(file.size>48*1024*1024)throw new Error('Research ZIP is larger than 48 MiB');
    const result=await verifyManuscriptZip(await file.arrayBuffer());
    receipt={...result,verifiedAt:new Date().toISOString(),sourceFileName:file.name};
    $('manuscriptZipResults').textContent=[
      'Verification: '+result.verdict,
      'Exact ZIP SHA-256: '+result.archiveSha256,
      'GPU observations: '+result.observedGpuDraws,
      'Study SHA-256: '+result.studySha256,
      'Manuscript SHA-256: '+result.manuscriptSha256,
      'Methodology SHA-256: '+result.auditSha256,
      'Verified data files: '+result.inventoryEntries,
      'Reproduced source PNGs: '+result.sourceFiguresVerified,
      'PDF reproduced: '+result.pdfVerified,
      'Bibliography and unsigned review packet: '+result.bibliographyAndReviewPacketVerified,
      'Publication authorized: NO',
      result.meaning
    ].join('\n');
    $('manuscriptZipExportReceipt').disabled=false;
    status('PASS: complete archived research bundle independently reconstructed.');
  }catch(error){
    receipt=null;
    $('manuscriptZipResults').textContent='FAIL: archive not independently verified. Manuscript publication status is unchanged.';
    status('Research bundle rejected: '+String(error.message||error),true);
  }finally{
    busy=false;e.target.value='';$('manuscriptZipImport').disabled=false;
  }
});
$('manuscriptZipExportReceipt').addEventListener('click',()=>{
  if(!receipt||busy)return;
  download('glsl-research-verification-'+receipt.manuscriptSha256.slice(0,12)+'.json',
    JSON.stringify(receipt,null,2)+'\n');
  status('Downloaded machine-verification receipt; this is not a researcher identity signature.');
});
status('Import a previously exported research ZIP to verify its complete evidence independently.');
