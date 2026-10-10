// CLI fixture for independent PDF parser/raster smoke in CI.
// Uses synthetic pixels only; not empirical evidence.
import {webcrypto} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createBuildReceipt} from '../src/build-evidence.mjs';
import {createResearchCapture} from '../src/research-capture.mjs';
import {createFigureEvidence} from '../src/research-figures.mjs';
import {createSweepProtocol,createSweepSession} from '../src/research-experiments.mjs';
import {auditMethodology} from '../src/methodology-audit.mjs';
import {assembleManuscript} from '../src/manuscript-engine.mjs';
import {createDirectPdf} from '../src/research-pdf.mjs';
const subtle=webcrypto.subtle,dir='test-results/pdf-render';
globalThis.btoa??=s=>Buffer.from(s,'binary').toString('base64');
globalThis.atob??=s=>Buffer.from(s,'base64').toString('binary');
const params={zoom:1,angle:0,speed:1,hue:0,brightness:1};
const protocol=createSweepProtocol(params,'zoom',.2,2);
const time=i=>()=>new Date(Date.UTC(2026,9,10,10,0,i)).toISOString();
const figures=[];
for(let i=0;i<3;i++){
  const w=64,h=40,pixels=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const at=(y*w+x)*4;
    pixels[at]=Math.floor(255*x/(w-1));pixels[at+1]=Math.floor(255*y/(h-1));
    pixels[at+2]=(i*85)%256;pixels[at+3]=255;
  }
  const receipt=await createBuildReceipt({
    shaderBody:'o.rgb = vec3(.5);',
    expandedShader:'#version 300 es\nvoid main(){o.rgb = vec3(.5);}',
    demoId:'original',attribution:'@YoheiNishitsuji',
    checks:{vertexCompiled:true,fragmentCompiled:true,linked:true,frameDrawn:true,glError:0},
    viewport:{width:w,height:h},parameters:{...params,zoom:protocol.levels[i]},shaderTimeSeconds:2
  },{subtle,clock:time(i)});
  const capture=await createResearchCapture(receipt,pixels,{subtle,clock:time(i)});
  const fig=await createFigureEvidence(receipt,capture,pixels,{
    subtle,clock:time(i),drawSequence:10+i
  });
  figures.push({...fig,receipt,capture});
}
const study=await createSweepSession(protocol,figures,{
  sessionId:'pdf_smoke_001',clock:time(0),subtle
});
const audit=await auditMethodology(study,{subtle,clock:time(0)});
const manuscript=await assembleManuscript(study,{audit,subtle,clock:time(0)});
const pdf=await createDirectPdf(manuscript,{subtle});
await mkdir(dir,{recursive:true});
await writeFile(dir+'/shader-study.pdf',pdf);
process.stdout.write('Wrote '+dir+'/shader-study.pdf ('+pdf.length+' bytes)\n');
