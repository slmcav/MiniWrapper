// P5 direct PDF export: static, dependency-free A4 PDF 1.4 with embedded full-resolution RGB figures.
// Uses archived pixel bytes (not screenshots) and the verified manuscript; no network or browser print UI.
import {verifyManuscript} from './manuscript-engine.mjs';
export const PDF_FORMAT='glsl-lab/direct-pdf/1';
const enc=new TextEncoder(),A4=[595.28,841.89],M=54;
const requireValid=(x,m)=>{if(!x)throw new TypeError(m);};
const ascii=(input)=>String(input).normalize('NFKD').replace(/\u00d7/g,'x').replace(/\u2212/g,'-')
  .replace(/[\u2010-\u2015]/g,'-').replace(/\u2019/g,"'").replace(/[\u201c\u201d]/g,'"')
  .replace(/[\u00a0]/g,' ').replace(/\u00b2/g,'2').replace(/\u2032/g,"'")
  .replace(/[^\x20-\x7e]/g,'?');
const escapePdf=s=>ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const wrap=(value,width,size,font='roman')=>{
  const text=ascii(value),words=text.split(/\s+/),lines=[];let line='';
  const limit=font==='courier'?Math.floor(width/(size*.6)):Math.floor(width/(size*.49));
  for(const word of words){
    if(!word)continue;
    const chunks=word.length>limit?Array.from({length:Math.ceil(word.length/limit)},(_,i)=>word.slice(i*limit,(i+1)*limit)):[word];
    for(const chunk of chunks){
      if(line.length+chunk.length+(line?1:0)>limit){lines.push(line);line='';}
      line+=(line?' ':'')+chunk;
    }
  }
  if(line)lines.push(line);return lines.length?lines:[''];
};
function adler32(bytes){
  let a=1,b=0;
  for(let k=0;k<bytes.length;k+=5552){const end=Math.min(k+5552,bytes.length);
    for(let i=k;i<end;i++){a+=bytes[i];b+=a;}a%=65521;b%=65521;}
  return ((b<<16)|a)>>>0;
}
const put32=(a,n)=>{a.push((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);};
const put16=(a,n)=>{a.push(n&255,(n>>>8)&255);};
function storedZlib(bytes){
  const out=[0x78,0x01];
  for(let at=0;at<bytes.length;){
    const len=Math.min(65535,bytes.length-at),last=at+len===bytes.length;
    out.push(last?1:0);put16(out,len);put16(out,(~len)&65535);
    for(let j=0;j<len;j++)out.push(bytes[at+j]);
    at+=len;
  }
  put32(out,adler32(bytes));return Uint8Array.from(out);
}
function frameRgb(trial){
  const {width,height}=trial.receipt.viewport,n=width*height;
  requireValid(n>0&&n<=500000,'PDF figure too large');
  const binary=atob(trial.rgbaBase64);
  requireValid(binary.length===n*4,'Figure RGBA buffer mismatch');
  // PDF DeviceRGB: composite any alpha against white; reverse WebGL bottom-left row order.
  const rgb=new Uint8Array(n*3),stride=width*4;
  for(let y=0;y<height;y++){
    const sourceRow=height-y-1;
    for(let x=0;x<width;x++){
      const src=sourceRow*stride+x*4,dst=(y*width+x)*3,a=binary.charCodeAt(src+3)/255;
      for(let ch=0;ch<3;ch++)rgb[dst+ch]=Math.round(binary.charCodeAt(src+ch)*a+255*(1-a));
    }
  }
  return {width,height,bytes:storedZlib(rgb)};
}
class Article{
  constructor(){this.pages=[];this.current=null;this.y=0;this.pageWidth=A4[0]-M*2;this.fonts={roman:'F1',bold:'F2',courier:'F3'};}
  newPage(){
    this.current={commands:[],usedImages:new Set()};this.pages.push(this.current);this.y=A4[1]-M;
  }
  ensure(space=28){if(!this.current||this.y-space<M+24)this.newPage();}
  text(value,{size=10,font='roman',indent=0,leading=1.45,color='0.09 0.13 0.18'}={}){
    const lines=wrap(value,this.pageWidth-indent,size,font),height=lines.length*size*leading;
    this.ensure(height+4);
    for(const line of lines){
      if(this.y-size*leading<M+20)this.newPage();
      const x=M+indent,y=this.y-size;
      this.current.commands.push('BT /'+this.fonts[font]+' '+size+' Tf '+color+' rg 1 0 0 1 '+
        x.toFixed(2)+' '+y.toFixed(2)+' Tm ('+escapePdf(line)+') Tj ET');
      this.y-=size*leading;
    }
    this.y-=4;
  }
  heading(value,level=1){
    const size=level===1?13.8:11.3;
    this.ensure(40);this.y-=level===1?15:8;
    this.current.commands.push('0.16 0.29 0.38 RG 0.6 w '+M+' '+(this.y-8).toFixed(2)+
      ' m '+(A4[0]-M)+' '+(this.y-8).toFixed(2)+' l S');
    this.text(value,{size,font:'bold',leading:1.3});this.y-=5;
  }
  paragraph(value){this.text(value,{size:10.2});this.y-=5;}
  rule(){this.ensure(18);this.current.commands.push('0.71 0.78 0.82 RG 0.6 w '+M+' '+this.y.toFixed(2)+' m '+
     (A4[0]-M)+' '+this.y.toFixed(2)+' l S');this.y-=12;}
  rows(headers,rows){
    const columnWidths=[.21,.13,.22,.2,.24].map(f=>f*this.pageWidth);
    const draw=(cells,bold)=>{
      this.ensure(24);
      let x=M;
      for(let i=0;i<5;i++){
        const size=bold?8.6:8.3;
        const value=ascii(cells[i]).slice(0,24);
        this.current.commands.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf 0.13 0.21 0.28 rg 1 0 0 1 '+
          (x+5).toFixed(2)+' '+(this.y-10).toFixed(2)+' Tm ('+escapePdf(value)+') Tj ET');
        x+=columnWidths[i];
      }
      this.current.commands.push('0.80 0.84 0.87 RG 0.4 w '+M+' '+(this.y-18).toFixed(2)+
        ' m '+(A4[0]-M)+' '+(this.y-18).toFixed(2)+' l S');
      this.y-=24;
    };
    draw(headers,true);for(const cells of rows)draw(cells,false);this.y-=8;
  }
  figure(index,trial,caption){
    const {width,height}=trial.receipt.viewport;
    const targetW=Math.min(this.pageWidth-50,375),targetH=Math.min(235,targetW*height/width);
    const scaledW=Math.min(targetW,targetH*width/height);
    const total=targetH+50;
    this.ensure(total);
    const x=(A4[0]-scaledW)/2,y=this.y-targetH;
    this.current.usedImages.add(index);
    this.current.commands.push('q '+scaledW.toFixed(2)+' 0 0 '+targetH.toFixed(2)+' '+x.toFixed(2)+' '+y.toFixed(2)+
      ' cm /Im'+index+' Do Q');
    this.y-=targetH+8;
    this.text(caption,{size:8.2,leading:1.33});
    this.y-=12;
  }
  code(text){
    this.heading('Appendix A. Exact archived GLSL fragment body');
    const lines=String(text).replace(/\r/g,'').split('\n');
    for(let line of lines){
      while(line.length>100){this.text(line.slice(0,100),{size:7.1,font:'courier',leading:1.2});line=line.slice(100);}
      this.text(line||' ',{size:7.1,font:'courier',leading:1.2});
    }
  }
}
function serializePdf(article,images,title){
  const chunks=[],offsets=[0];let length=0;
  const push=bytes=>{const data=typeof bytes==='string'?enc.encode(bytes):bytes;chunks.push(data);length+=data.length;};
  const obj=(index,body)=>{
    offsets[index]=length;push(index+' 0 obj\n');push(body);push('\nendobj\n');
  };
  const binary=(index,dict,bytes)=>{
    offsets[index]=length;push(index+' 0 obj\n<< '+dict+' /Length '+bytes.length+' >>\nstream\n');
    push(bytes);push('\nendstream\nendobj\n');
  };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const firstImage=6,firstPage=firstImage+images.length;
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+article.pages.map((_,i)=>(firstPage+i*2)+' 0 R').join(' ')+
    '] /Count '+article.pages.length+' >>');
  obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>');
  obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>');
  obj(5,'<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  images.forEach((img,i)=>{
    binary(firstImage+i,'/Type /XObject /Subtype /Image /Width '+img.width+
      ' /Height '+img.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode',img.bytes);
  });
  for(let i=0;i<article.pages.length;i++){
    const p=article.pages[i],number=i+1;
    p.commands.push('BT /F1 8 Tf 0.38 0.46 0.51 rg 1 0 0 1 '+M+
      ' 31 Tm (UNREVIEWED RESEARCH DRAFT - NOT PEER REVIEWED) Tj ET');
    p.commands.push('BT /F1 8 Tf 0.38 0.46 0.51 rg 1 0 0 1 '+
      (A4[0]-95).toFixed(2)+' 31 Tm (Page '+number+'/'+article.pages.length+') Tj ET');
    const resourceImages=[...p.usedImages].map(idx=>'/Im'+idx+' '+(firstImage+idx-1)+' 0 R').join(' ');
    const content=enc.encode(p.commands.join('\n')+'\n');
    obj(firstPage+i*2,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+A4.join(' ')+
      '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> /XObject << '+
      resourceImages+' >> >> /Contents '+(firstPage+i*2+1)+' 0 R >>');
    binary(firstPage+i*2+1,'',content);
  }
  const size=firstPage+article.pages.length*2,where=length;
  push('xref\n0 '+size+'\n0000000000 65535 f \n');
  for(let i=1;i<size;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  push('trailer\n<< /Size '+size+' /Root 1 0 R >>\nstartxref\n'+where+'\n%%EOF\n');
  const output=new Uint8Array(length);let at=0;for(const c of chunks){output.set(c,at);at+=c.length;}
  return output;
}
export async function createDirectPdf(bundle,{subtle=globalThis.crypto?.subtle}={}){
  await verifyManuscript(bundle,subtle);
  const r=bundle.record,article=new Article();article.newPage();
  const treatment=r.treatments;
  article.text('COMPUTATIONAL GRAPHICS / REPRODUCIBLE OBSERVATION',{size:9,font:'bold',color:'0.20 0.34 0.44'});
  article.y-=17;article.text(r.title,{size:19,font:'bold',leading:1.27});
  article.y-=7;article.text(r.authorship,{size:10});article.rule();
  article.text('UNREVIEWED TECHNICAL RESEARCH DRAFT - NOT A PEER-REVIEWED PUBLICATION',
    {font:'bold',size:9,color:'0.54 0.25 0.13'});
  article.text('Study SHA-256: '+r.studySha256,{size:7.3,font:'courier'});
  article.text('Methodology SHA-256: '+r.auditSha256,{size:7.3,font:'courier'});
  article.text('Manuscript SHA-256: '+r.sha256,{size:7.3,font:'courier'});article.y-=12;
  article.heading('Abstract');
  article.paragraph('This descriptive computational study records '+r.observedDraws+
    ' WebGL2 fragment-shader framebuffer observations at '+r.parameter+' values '+
    r.levels.map(n=>n.toFixed(3)).join(', ')+', with shader time fixed at '+
    r.shaderTimeSeconds.toFixed(3)+' seconds. Complete RGBA8 frame data, exact GLSL, '+
    'lossless figures, and SHA-256 content receipts accompany the report. '+
    (r.drawsPerTreatment===3?'Each of three levels has three serial GPU draws in position-balanced blocks.':
    'Each of three levels has one GPU draw.')+
    ' Conclusions are descriptive only: independence, novelty and statistical significance are not established.');
  article.heading('1. Introduction');
  article.paragraph('Fragment shaders follow a defined language specification [1]. WebGL2 provides the browser drawing '+
    'and pixel-readback context [2]. Methodological discussion of computer experiments [3] does not justify '+
    'unperformed controls. The present work reports one source-linked shader study rather than proposing '+
    'or validating a new graphics algorithm.');
  article.heading('2. Materials and methods');
  article.paragraph('The shader source is archived exactly in Appendix A. Viewport: '+r.viewport.width+' x '+
    r.viewport.height+' RGBA8 pixels. Manipulated parameter: '+r.parameter+'. Fixed GLSL shader time: '+
    r.shaderTimeSeconds.toFixed(3)+' seconds. Observation ordering: '+r.orderDescription+'.');
  article.paragraph('Archived shader identifier: '+r.shaderIdentifier+
    '. Shader attribution in the recorded source receipt: '+r.shaderAttribution+
    ' (not independently authenticated).');
  article.heading('2.1. Measurement equation',2);
  article.paragraph('For encoded 8-bit RGB channel values, define the Rec.709-weighted encoded-channel '+
    'luma proxy. It is not calibrated physical luminance:');
  article.text("Y' = 0.2126 R + 0.7152 G + 0.0722 B",{font:'courier',size:10,indent:30});
  article.text("Mean Y' = sum(Y' over all W x H pixels) / (W x H)",{font:'courier',size:9,indent:30});
  if(r.drawsPerTreatment===3)
    article.text('Sample SD = sqrt[ sum((frame_mean - group_mean)^2) / (3 - 1) ]',
      {font:'courier',size:8.6,indent:20});
  else article.paragraph('Within-condition variance is not estimated: each condition contains one observed frame.');
  article.heading('2.2. Integrity and observational scope',2);
  article.paragraph('Study verification recomputes each full-frame byte digest, PNG, grid sample, shader-build '+
    'receipt, treatment level and recorded metrics. These hashes detect subsequent alteration; they do '+
    'not identify a participant, prove hardware equivalence or authenticate scientific authorship.');
  article.heading('3. Results');
  article.paragraph('Table 1. Frame-wide mean encoded-channel luma values (0-255), three-decimal display. '+
    'A single-frame treatment has no estimable sample SD.');
  article.rows(['Setting','n','Mean Y','SD','Range'],treatment.map(x=>[
    x.value.toFixed(3),String(x.n),x.meanLuma8.toFixed(3),
    x.stdevLuma8===null?'Not est.':x.stdevLuma8.toFixed(3),
    x.minLuma8.toFixed(2)+'-'+x.maxLuma8.toFixed(2)
  ]));
  const imageIndices=treatment.map(t=>t.firstTrialIndex);
  const imageData=imageIndices.map(i=>frameRgb(bundle.study.trials[i]));
  treatment.forEach((row,i)=>article.figure(i+1,bundle.study.trials[row.firstTrialIndex],
    'Figure '+(i+1)+'. First archived GPU observation at '+r.parameter+' = '+
    row.value.toFixed(3)+'. PNG SHA-256: '+bundle.figures[row.firstTrialIndex].record.pngSha256));
  article.heading('4. Discussion');
  article.paragraph('These results describe observed shader output at a bounded set of control values. '+
    'The design does not establish causal attribution, inferential significance, GPU benchmark timing, '+
    'generalization to other devices, or research novelty. Separate serial GPU draws cannot automatically '+
    'be treated as independent experimental units.');
  article.heading('5. Limitations and scholarly status');
  for(let i=0;i<r.claimLimits.length;i++)article.paragraph((i+1)+'. '+r.claimLimits[i]);
  article.heading('6. Reproducibility and data availability');
  article.paragraph('The associated archive contains study.json with complete RGBA8 frame data, '+
    'methodology-audit.json, the exact shader source, eligible bibliography and all lossless PNG figures. '+
    'The PDF is a human-readable account and is not a substitute for the original data.');
  article.heading('References');
  for(let i=0;i<bundle.references.length;i++){
    const ref=bundle.references[i];
    article.paragraph('['+(i+1)+'] '+ref.authors.join(', ')+' ('+ref.year+'). '+
      ref.title+'. '+ref.venue+'. '+(ref.doi?'DOI: '+ref.doi+'. ':'')+ref.url);
  }
  article.code(bundle.shader);
  return serializePdf(article,imageData,r.title);
}
