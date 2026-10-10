// Evidence-gated publication-style research draft. No peer-review or publication claim.
import {assembleManuscript,verifyManuscript} from './manuscript-engine.mjs';
import {renderManuscriptHTML,exportManuscriptBundle} from './manuscript-render.mjs';
const $=id=>document.getElementById(id);
let draft=null,markup='',busy=false;
const label=(s,error=false)=>{$('paperStatus').textContent=s;$('paperStatus').dataset.error=String(error);};
function save(name,data,mime){
  const url=URL.createObjectURL(new Blob([data],{type:mime}));
  const link=document.createElement('a');link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function invalidate(){
  draft=null;markup='';
  $('paperPreview').hidden=true;$('paperPreview').removeAttribute('srcdoc');
  $('paperSource').textContent='No evidence-grounded manuscript generated.';
  for(const id of ['paperDownloadHtml','paperPrint','paperExportZip'])$(id).disabled=true;
}
function controls(){
  $('generatePaper').disabled=busy||!window.glslLabAuditedStudy?.current();
  for(const id of ['paperDownloadHtml','paperPrint','paperExportZip'])$(id).disabled=busy||!draft;
}
window.addEventListener('glsl-lab-audit-updated',()=>{
  invalidate();controls();
  label(window.glslLabAuditedStudy?.current()?
    'Study verified. Generate a source-grounded manuscript draft from the frozen evidence.':
    'No accepted study. Import a verified experiment through the methodology audit above.');
});
$('generatePaper').addEventListener('click',async()=>{
  if(busy)return;
  const current=window.glslLabAuditedStudy?.current();
  if(!current){label('A verified experiment and methodology audit are required.',true);return;}
  busy=true;controls();label('Rechecking archived pixels, citations, equations and manuscript figures.');
  try{
    const prepared=await assembleManuscript(current.study,{audit:current.audit});
    await verifyManuscript(prepared);
    const html=renderManuscriptHTML(prepared,{embedImages:true});
    draft=prepared;markup=html;
    $('paperPreview').srcdoc=html;$('paperPreview').hidden=false;
    $('paperSource').textContent='Manuscript SHA-256: '+draft.record.sha256+
      '\n'+draft.record.observedDraws+' verified GPU observations; '+
      draft.references.length+' source-scoped citations; '+draft.figures.length+
      ' full-resolution figures in evidence bundle.\nStatus: UNREVIEWED RESEARCH DRAFT';
    label('Evidence-grounded technical manuscript assembled. Publication/peer-review status remains unverified.');
  }catch(e){
    invalidate();label('Manuscript generation blocked: '+String(e.message||e),true);
  }finally{busy=false;controls();}
});
$('paperDownloadHtml').addEventListener('click',async()=>{
  if(!draft||busy)return;
  busy=true;controls();
  try{
    await verifyManuscript(draft);
    save('glsl-research-draft-'+draft.record.sha256.slice(0,12)+'.html',markup,
      'text/html;charset=utf-8');
    label('Downloaded offline print-ready HTML with embedded, source-verified figures.');
  }catch(e){label('HTML export blocked: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('paperExportZip').addEventListener('click',async()=>{
  if(!draft||busy)return;
  busy=true;controls();label('Revalidating study, figures, bibliography and all archive file digests.');
  try{
    const product=await exportManuscriptBundle(draft);
    save('glsl-research-manuscript-'+draft.record.sha256.slice(0,12)+'.zip',
      product.zip,'application/zip');
    label('Downloaded research ZIP: manuscript, GLSL, hashed figures, data, methodology and BibTeX.');
  }catch(e){label('Manuscript bundle export rejected: '+String(e.message||e),true);}
  finally{busy=false;controls();}
});
$('paperPrint').addEventListener('click',()=>{
  if(!draft||!markup)return;
  // Browser print UX provides the native Save as PDF target; no unobserved PDF output is claimed.
  const frame=$('paperPreview');
  try{
    const context=frame.contentWindow;
    if(!context||typeof context.print!=='function')throw new Error('Print is not available on this device');
    context.focus();context.print();
    label('Print dialog requested. Choose Save as PDF in your browser to create the PDF.');
  }catch(e){label('Use downloaded HTML and your browser Print / Save as PDF: '+String(e.message||e),true);}
});
invalidate();controls();
label('Import and verify a complete experiment in the methodology audit to begin.');
