// Guided academic workflow; navigates existing validated actions without bypassing any gate.
const $=id=>document.getElementById(id);
function visit(id){const item=$(id);if(!item)throw new Error('Research step missing: '+id);
 item.scrollIntoView({behavior:'smooth',block:'start'});item.focus?.({preventScroll:true});}
$('workflowAuthor').addEventListener('click',()=>{
 $('tabBuild').click();visit('builderRender');
});
$('workflowStudy').addEventListener('click',()=>visit('sweepRun'));
$('workflowAudit').addEventListener('click',()=>{
 const btn=$('auditCurrentStudy');
 if(!btn.disabled)btn.click();
 visit('auditCurrentStudy');
});
$('workflowPaper').addEventListener('click',()=>{
 const btn=$('generatePaper');
 if(!btn.disabled)btn.click();
 visit('generatePaper');
});
$('workflowLatex').addEventListener('click',()=>{
 const btn=$('paperExportZip');
 if(!btn.disabled)btn.click();
 visit('paperExportZip');
});
function refresh(){
 const step=$('workflowStage'),verified=window.glslLabAuditedStudy?.current();
 const compiled=$('saveBuild')&&!$('saveBuild').disabled;
 if($('paperDirectPdf')&&!$('paperDirectPdf').disabled){
  step.textContent='Manuscript ready · download the LaTeX research package and compile with TeX Live.';
 }else if(verified){
  step.textContent='Methodology verified · generate manuscript.';
 }else if(window.glslLabLatestExperiment){
  step.textContent='Experiment recorded · audit the current study.';
 }else if(compiled){
  step.textContent='Shader validated · run a controlled experiment.';
 }else{
  step.textContent='Author a typed shader graph to begin.';
 }
}
window.addEventListener('glsl-lab-study-ready',refresh);
window.addEventListener('glsl-lab-audit-updated',refresh);
window.addEventListener('glsl-lab-manuscript-ready',refresh);
window.glslLabBridge?.onValidationChange(()=>refresh());
refresh();
