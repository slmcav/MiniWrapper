// Academic LaTeX source is generated exclusively from the frozen study and its evidence.
import {verifyManuscript} from './manuscript-engine.mjs';
export const LATEX_SCHEMA='glsl-lab/latex-source/1';
const esc=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[\u2010-\u2015\u2212]/g,'-').replace(/[^\x20-\x7E]/g,'?')
 .replace(/[\\{}%$&#_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}',
 '%':'\\%','$':'\\$','&':'\\&','#':'\\#','_':'\\_',
 '^':'\\textasciicircum{}','~':'\\textasciitilde{}'})[c]);
const fixed=n=>Number(n).toFixed(3);
export async function renderLaTeXManuscript(bundle,subtle=globalThis.crypto?.subtle){
 await verifyManuscript(bundle,subtle);
 const r=bundle.record;
 if(r.release.academicManuscriptUnlocked!==false)throw new TypeError('Invalid manuscript provenance state');
 const figures=r.treatments.map((t,i)=>{
  const item=bundle.figures[t.firstTrialIndex];
  if(!/^figures\/frame-[0-9]{2}\.png$/.test(item?.path))
   throw new TypeError('Original PNG source path invalid');
  return [
   '\\begin{figure}[htbp]','\\centering',
   '\\includegraphics[width=.85\\linewidth,height=57mm,keepaspectratio]{'+item.path+'}',
   '\\caption{Observed framebuffer at '+esc(r.parameter)+' = '+fixed(t.value)+
     '; '+item.record.width+' x '+item.record.height+' RGBA8 pixels.}',
   '\\label{fig:frame'+(i+1)+'}','\\end{figure}'
  ].join('\n');
 });
 const rows=r.treatments.map(t=>fixed(t.value)+' & '+t.n+' & '+fixed(t.meanLuma8)+
  ' & '+(t.stdevLuma8===null?'n/a':fixed(t.stdevLuma8))+
  ' & '+fixed(t.minLuma8)+'--'+fixed(t.maxLuma8)+' \\\\');
 const references=bundle.references.map(ref=>
  '\\bibitem{'+ref.id+'} '+esc(ref.authors.join(', '))+
  ' ('+ref.year+'). '+esc(ref.title)+'. '+esc(ref.venue)+
  (ref.doi?' DOI: \\url{https://doi.org/'+ref.doi+'}.':'')+
  ' \\url{'+ref.url+'}.'
 );
 const provenance=(name,hash)=>name+': \\texttt{'+hash.slice(0,32)+'}\\\\\n'+
  '\\texttt{'+hash.slice(32)+'}.';
 const sections=[
  '\\documentclass[11pt,a4paper]{article}',
  '\\usepackage[T1]{fontenc}','\\usepackage[utf8]{inputenc}',
  '\\usepackage[margin=24mm]{geometry}',
  '\\usepackage{amsmath,booktabs,graphicx,hyperref,listings}',
  '\\hypersetup{colorlinks=true,allcolors=blue}',
  '\\lstset{basicstyle=\\ttfamily\\footnotesize,breaklines=true,columns=fullflexible,frame=single}',
  '\\title{'+esc(r.title)+'}','\\author{GLSL Lab Research Study}','\\date{}',
  '\\begin{document}','\\maketitle','\\begin{abstract}',
  'This study records '+r.observedDraws+' WebGL2 framebuffer observations for '+
   esc(r.parameter)+' across '+r.levels.map(fixed).join(', ')+
   '. The fixed shader time is '+fixed(r.shaderTimeSeconds)+
   ' seconds. Original image bytes and source are retained in the accompanying archive.',
  '\\end{abstract}',
  '\\section{Introduction}',
  'GLSL ES 3.00 establishes the shader-language contract \\cite{'+r.citationIds[0]+
   '}; WebGL2 specifies framebuffer readback \\cite{'+r.citationIds[1]+
   '}. Computer-experiment design is addressed by Sacks et al. \\cite{'+r.citationIds[2]+'}.',
  '\\section{Materials and methods}',
  'Shader source identifier: '+esc(r.shaderIdentifier)+'. Source attribution: '+
   esc(r.shaderAttribution)+'. The viewport is '+r.viewport.width+' x '+r.viewport.height+
   ' RGBA8 pixels. The manipulated uniform is '+esc(r.parameter)+'.',
  'Experimental order: '+esc(r.orderDescription)+'.',
  '\\subsection{Encoded-channel measurements}',
  'The weighted quantity is an encoded-RGB luma proxy; linear-light colorimetry is not inferred.',
  '\\begin{equation}Y^\\prime(x,y)=0.2126R(x,y)+0.7152G(x,y)+0.0722B(x,y)\\end{equation}',
  '\\begin{equation}\\overline{Y^\\prime}=\\frac{1}{WH}\\sum_{x=1}^{W}\\sum_{y=1}^{H}Y^\\prime(x,y)\\end{equation}',
  '\\section{Results}',
  '\\begin{table}[htbp]','\\centering','\\small',
  '\\begin{tabular}{rrrrr}','\\toprule',
  'Level & $n$ & Mean $Y^\\prime$ & SD & Range \\\\',
  '\\midrule',...rows,'\\bottomrule','\\end{tabular}',
  '\\caption{Frame-wide encoded-channel metrics computed from original RGBA8 bytes.}',
  '\\label{tab:results}','\\end{table}',...figures,
  '\\section{Discussion}',
  'Results describe the archived framebuffer observations under controlled parameter changes. '+
  'Serial GPU draws are not assumed to be independent physical device-level replicates.',
  '\\section{Scope of inference}','\\begin{itemize}',
  ...r.claimLimits.map(limit=>'\\item '+esc(limit)),
  '\\end{itemize}','\\section{Data and reproducibility}',
  provenance('Study SHA-256',r.studySha256),
  provenance('Methodology SHA-256',r.auditSha256),
  provenance('Manuscript SHA-256',r.sha256),
  'The associated dataset preserves original shaders, capture bytes, source lineage, figures and bibliography.',
  '\\begin{thebibliography}{99}',...references,'\\end{thebibliography}',
  '\\appendix','\\section{Original GLSL source}',
  '\\lstinputlisting{shader.glsl}','\\end{document}'
 ];
 return sections.join('\n')+'\n';
}
