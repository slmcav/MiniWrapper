// Original-component layout for the approved research dashboard.
import {REFERENCES} from './reference-registry.mjs';
const $=id=>document.getElementById(id);
const layout=document.querySelector('main.layout'),stage=document.querySelector('.stage');
const panel=$('labControls'),paper=document.querySelector('.paper-draft-panel');
const research=document.querySelector('.research-panel'),workflow=document.querySelector('.workflow-guide'),codePane=$('paneCode');
const wide=matchMedia('(min-width:1280px)');
if(!layout||!stage||!panel||!paper||!research||!workflow||!codePane)throw new Error('Research workspace incomplete');
document.body.classList.add('contract-dashboard');layout.classList.add('contract-layout');
const originals=new Map([paper,research,workflow,codePane].map(el=>[el,{parent:el.parentNode,next:el.nextSibling}]));
const restore=el=>{const old=originals.get(el);old.parent.insertBefore(el,old.next?.parentNode===old.parent?old.next:null);};
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;}
const heading=document.querySelector('.brand > div');
heading?.classList.add('contract-heading');
if(heading){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('role','img');
 svg.setAttribute('aria-label','GLSL Lab symbol');svg.setAttribute('class','contract-mark');
 const path=document.createElementNS(svg.namespaceURI,'path');
 path.setAttribute('d','M23 3 3 41h41l-10-17-5 5 4 6H13L27 9z M23 20 15 34h23l-7-12-5 5 2 3h-5l7-11z');
 path.setAttribute('fill','#3ce7c7');path.setAttribute('fill-rule','evenodd');svg.append(path);heading.prepend(svg);
 const tagline=node('div','contract-headline');tagline.append(node('strong',null,'From visual ideas to reproducible research.'),node('span',null,'Build shaders. Explore visual systems. Generate research outputs.'));
 document.querySelector('.brand').insertBefore(tagline,document.querySelector('.brand .back'));
}
const sidebar=node('aside','contract-sidebar');sidebar.setAttribute('aria-label','Project navigation');
sidebar.append(node('h2',null,'PROJECTS'));
const projectList=node('div','contract-project-list');sidebar.append(projectList);
const separator=node('div','contract-divider');sidebar.append(separator);
const nav=node('nav','contract-nav');nav.setAttribute('aria-label','Project navigation');sidebar.append(nav);
function scrollToNode(id){$(id)?.scrollIntoView({behavior:'smooth',block:'center'});}
const ICON_PATHS=Object.freeze({
 Projects:'M3 7h6l2 2h10v11H3z M3 7V5h7l2 2',
 Demos:'M7 5v14l12-7z',
 Builder:'M4 4h6v6H4z M14 14h6v6h-6z M10 7h4 M17 10v4',
 Papers:'M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7',
 References:'M3 4h8c2 0 3 1 3 3v14c0-2-1-3-3H3z M14 7c0-2 1-3 3-3h4v14h-4c-2 0-3 1-3 3',
 Export:'M12 3v13 M7 8l5-5 5 5 M4 15v5h16v-5',
 Settings:'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2 2 M16.4 16.4l2 2 M18.4 5.6l-2 2 M7.6 16.4l-2 2 M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
 Preview:'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 Code:'M8 6 2 12l6 6 M16 6l6 6-6 6'
});
function navIcon(name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','contract-nav-icon');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');
 svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS(svg.namespaceURI,'path');
 path.setAttribute('d',ICON_PATHS[name]||ICON_PATHS.Builder);svg.append(path);
 return svg;
}
function action(name,callback){const b=node('button');b.append(navIcon(name),document.createTextNode(name));b.type='button';b.addEventListener('click',callback);nav.append(b);}
const science=node('details','contract-science');science.id='contractScience';
science.append(node('summary',null,'Experiment methods, evidence, source reviews and research archive'));
function openResearch(id){science.open=true;requestAnimationFrame(()=>scrollToNode(id));}
action('Projects',()=>{$('projectName').focus();scrollToNode('projectName');});
const demo=document.createElement('a');demo.href='./index.html';demo.append(navIcon('Demos'),document.createTextNode('Demos'));nav.append(demo);
action('Builder',()=>{$('tabBuild').click();scrollToNode('graphChain');});
action('Papers',()=>scrollToNode('paperStatus'));
action('References',()=>openResearch('auditResults'));
action('Export',()=>{$('paperExportZip').disabled?openResearch('paperExportZip'):$('paperExportZip').click();});
action('Settings',()=>{$('tabPlay').click();if(!wide.matches)window.glslLabDrawer?.open();});
function syncProjects(){
 const options=[...$('projectPicker').options].filter(x=>x.value);projectList.replaceChildren();
 if(!options.length)projectList.append(node('p',null,'No saved projects yet'));
 for(const opt of options){const b=node('button',null,opt.textContent);b.type='button';b.addEventListener('click',()=>{
   $('projectPicker').value=opt.value;$('projectPicker').dispatchEvent(new Event('change',{bubbles:true}));
 });projectList.append(b);}
}
syncProjects();new MutationObserver(syncProjects).observe($('projectPicker'),{childList:true,subtree:true});
const paperCard=node('aside','contract-paper');
paperCard.setAttribute('aria-label','Academic research manuscript');
const paperTitle=node('div','contract-workbench-title');
paperTitle.append(node('span',null,'Academic Paper Output'),node('span',null,'LaTeX manuscript'));
paperCard.append(paperTitle);
const paperEmpty=node('div','contract-paper-empty');
paperEmpty.setAttribute('aria-label','Manuscript awaiting experimental evidence');
paperEmpty.append(node('small',null,'RESEARCH MANUSCRIPT'),node('h3',null,'A Reproducible Study of Shader Output'),node('div','contract-paper-rule'),node('p',null,'Your verified measurements, original framebuffer figures, mathematical methods and cited sources will appear here after the study audit.'),node('div','contract-paper-lines'),node('small',null,'Complete a study to generate the manuscript'));
paperCard.append(paperEmpty);
const syncPaper=()=>{paperEmpty.hidden=!$('paperPreview').hidden;};
new MutationObserver(syncPaper).observe($('paperPreview'),{attributes:true,attributeFilter:['hidden']});
const bottom=node('section','contract-lower');
bottom.setAttribute('aria-label','Generated code, build provenance and scholarly references');
const codeCard=node('section','contract-code');codeCard.id='contractCodePane';
const codeTitle=node('div','contract-workbench-title');codeTitle.append(node('span',null,'GLSL Code (Generated)'),node('span',null,'Verified source'));codeCard.append(codeTitle);
const metaCard=node('section','contract-metadata'),metaTitle=node('div','contract-workbench-title');
metaTitle.append(node('span',null,'Build Metadata'),node('span',null,'Recorded measurements'));metaCard.append(metaTitle);
const metadata=node('dl','contract-meta');metaCard.append(metadata);
const sourceCard=node('section','contract-references'),sourceTitle=node('div','contract-workbench-title');
sourceTitle.append(node('span',null,'References & Data Sources'),node('span',null,'Bibliographic registry'));sourceCard.append(sourceTitle);
const sources=node('div','contract-sources');sourceCard.append(sources);
for(const ref of REFERENCES.filter(x=>x.status==='metadata_verified')){
 const a=document.createElement('a');a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';
 a.append(document.createTextNode(ref.title),node('small',null,ref.authors[0]+' · '+ref.year+' · '+ref.type));sources.append(a);
}
bottom.append(codeCard,metaCard,sourceCard);
layout.prepend(sidebar);layout.append(paperCard,bottom,science);
for(const id of ['workflowStudy','workflowAudit','workflowPaper','workflowLatex'])$(id)?.addEventListener('click',()=>{if(wide.matches)science.open=true;},true);
const chain=$('graphChain'),svgNS='http://www.w3.org/2000/svg';
function drawWires(){
 if(!wide.matches)return;
 const cards=[...chain.querySelectorAll('.graph-node')];if(!cards.length)return;
 let svg=chain.querySelector('.contract-wires');
 if(!svg){svg=document.createElementNS(svgNS,'svg');svg.setAttribute('class','contract-wires');svg.setAttribute('aria-hidden','true');chain.prepend(svg);}
 const area=chain.getBoundingClientRect();svg.setAttribute('viewBox','0 0 '+Math.max(1,area.width)+' '+Math.max(1,area.height));svg.replaceChildren();
 for(const card of cards){const type=(card.querySelector('span')?.textContent||'').split('·').at(-1)?.trim().split(' ')[0];card.dataset.operation=type||'';}
 for(let i=0;i<cards.length-1;i++){
  const r=cards[i].getBoundingClientRect(),n=cards[i+1].getBoundingClientRect(),x1=r.right-area.left-3,y1=r.top-area.top+r.height/2,x2=n.left-area.left+3,y2=n.top-area.top+n.height/2;
  const d=x2>x1+12?'M'+x1+','+y1+' C'+(x1+(x2-x1)*.45)+','+y1+' '+(x2-(x2-x1)*.45)+','+y2+' '+x2+','+y2:
   'M'+x1+','+y1+' C'+(x1+35)+','+(y1+38)+' '+(x2-35)+','+(y2+38)+' '+x2+','+y2;
  const path=document.createElementNS(svgNS,'path');path.setAttribute('d',d);path.setAttribute('stroke',i%2?'#9e87e9':'#36d9c0');path.setAttribute('stroke-width','2.5');path.setAttribute('fill','none');svg.append(path);
 }
}
new MutationObserver(()=>{if(wide.matches&&chain.querySelector('.graph-node'))requestAnimationFrame(drawWires);}).observe(chain,{childList:true});
window.addEventListener('resize',()=>requestAnimationFrame(drawWires));
async function updateMeta(ok){
 metadata.replaceChildren();let frame=null;
 try{if(ok)frame=window.glslLabBridge.capture();}catch{}
 const fields=[['GPU state',frame?'Live · verified draw':'Awaiting GPU draw'],['Graphics API','WebGL2']];
 if(frame)fields.push(['Resolution',frame.viewport.width+' × '+frame.viewport.height],['Shader ID',frame.demoId],['Graph nodes',String(frame.graph?.nodes?.length??'—')],['Shader time',Number(frame.shaderTimeSeconds).toFixed(2)+' s'],['Compilation',Number(frame.compileCpuMs||0).toFixed(2)+' ms'],['Source size',frame.shaderBody.length+' characters']);
 for(const [k,v] of fields){const row=node('div');row.append(node('dt',null,k),node('dd',null,v));metadata.append(row);}
 if(frame?.shaderBody&&crypto.subtle){
  const source=frame.shaderBody;const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  try{if(window.glslLabBridge.capture().shaderBody!==source)return;}catch{return;}
  const hash=[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
  const row=node('div');row.append(node('dt',null,'Source SHA-256'),node('dd',null,hash.slice(0,20)+'…'));metadata.append(row);
 }
}
window.glslLabBridge?.onValidationChange(valid=>{$('buildState').dataset.verified=String(valid);updateMeta(valid);drawWires();});
function mode(){
 if(wide.matches){
  stage.append(workflow);
  science.append(research);paperCard.append(paper);codeCard.append(codePane);
  $('tabBuild').click();science.open=false;
 }else{restore(codePane);restore(paper);restore(research);restore(workflow);}
 syncPaper();drawWires();
}
wide.addEventListener('change',mode);
const mobileNav=node('nav','contract-mobile-nav');mobileNav.setAttribute('aria-label','Mobile research navigation');
for(const [label,fn] of [
 ['Preview',()=>{window.glslLabDrawer?.close();scrollToNode('glcanvas');}],
 ['Builder',()=>{window.glslLabDrawer?.open();$('tabBuild').click();}],
 ['Code',()=>{window.glslLabDrawer?.open();$('tabCode').click();}],
 ['Papers',()=>{window.glslLabDrawer?.close();scrollToNode('paperStatus');}]
]){
 const b=node('button');b.append(navIcon(label),node('span',null,label));b.type='button';b.addEventListener('click',fn);mobileNav.append(b);
}
document.body.append(mobileNav);
mode();
