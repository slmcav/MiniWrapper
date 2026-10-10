// Static print-ready article and portable evidence bundle. No external JS, fonts or assets.
import {canonicalJson} from './build-evidence.mjs';
import {verifyManuscript,MANUSCRIPT_SCHEMA} from './manuscript-engine.mjs';
import {zipStored} from './research-figures.mjs';
import {createDirectPdf} from './research-pdf.mjs';
const ok=(p,m)=>{if(!p)throw new TypeError(m);};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const f=n=>Number(n).toFixed(3);
const enc=new TextEncoder();
function base64(bytes){
  let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(out);
}
const style=[
':root{color-scheme:light}*{box-sizing:border-box}html{background:#e8edf0;color:#161d24}',
'body{margin:0;font:11pt/1.52 Georgia,"Times New Roman",serif}',
'.paper{max-width:8.5in;margin:24px auto;padding:0.75in .82in;background:#fff;box-shadow:0 10px 35px #22384b22}',
'.mast{border-top:4px solid #233d50;padding-top:17px;text-align:center}',
'.kicker{font:700 9pt Arial,sans-serif;color:#4b6270;letter-spacing:.09em;text-transform:uppercase}',
'h1{font-size:21pt;line-height:1.16;margin:16px 0}h2{font-size:13pt;border-bottom:1px solid #b7c6cd;padding-bottom:4px;margin:24px 0 10px}',
'h3{font-size:11pt;margin:14px 0 8px}p{margin:9px 0;text-align:justify}',
'a{color:#205777;overflow-wrap:anywhere}.status{margin:17px 0;border:1px solid #aa6c52;padding:9px;color:#8a482d;font:700 9pt Arial,sans-serif}',
'.meta{font:8.4pt/1.55 Arial,sans-serif;overflow-wrap:anywhere;color:#344f5f}.abstract{padding:0 12px;border-left:3px solid #63808f}',
'.equation{border:1px solid #d8e2e8;background:#f7f9fa;margin:11px 0;padding:12px;text-align:center;overflow-wrap:anywhere}',
'table{border-collapse:collapse;width:100%;font:9pt/1.5 Arial,sans-serif}th,td{border-bottom:1px solid #ced7dd;padding:8px;text-align:right}',
'th:first-child,td:first-child{text-align:left}th{background:#eef4f6;border-top:2px solid #38596b}',
'.caption,figcaption{font:8.5pt/1.5 Arial,sans-serif;color:#415c6c;overflow-wrap:anywhere}',
'figure{margin:16px auto 23px;break-inside:avoid}figure img{display:block;max-width:100%;max-height:3.2in;width:auto;margin:auto;border:1px solid #cbd8de}',
'figcaption{margin-top:8px}pre{font:8pt/1.4 ui-monospace,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f9fa;border:1px solid #d2e0e5;padding:12px}',
'li{margin:7px 0;overflow-wrap:anywhere}.footer{border-top:1px solid #bdc9cf;margin-top:25px;padding-top:10px;color:#455d6a;font:8pt Arial,sans-serif}',
'@page{size:A4;margin:18mm}',
'@media print{html{background:#fff}.paper{margin:0;padding:0;max-width:none;box-shadow:none}h2{break-after:avoid}table,figure{break-inside:avoid}a{color:inherit;text-decoration:none}}',
'@media(max-width:600px){.paper{margin:0;padding:22px 15px;box-shadow:none}h1{font-size:17pt}table{font-size:8pt}}'
].join('');
function figures(bundle,embed){
  return bundle.record.treatments.map((row,i)=>{
    const data=bundle.figures[row.firstTrialIndex],src=embed?
      'data:image/png;base64,'+base64(data.png):data.path;
    return '<figure><img src="'+esc(src)+'" alt="Observed shader pixels for treatment '+esc(f(row.value))+'">'+
      '<figcaption>Figure '+(i+1)+'. Earliest archived observation at '+
      esc(bundle.record.parameter)+' = '+esc(f(row.value))+'. Image '+data.record.width+' × '+data.record.height+
      ' RGBA8 pixels; PNG SHA-256: <code>'+esc(data.record.pngSha256)+
      '</code>. All additional frames are provided in the supporting archive.</figcaption></figure>';
  }).join('\n');
}
function references(b){
  return b.references.map((r,i)=>{
    return '<li id="citation-'+(i+1)+'">'+esc(r.authors.join(', '))+' ('+r.year+'). <em>'+
      esc(r.title)+'</em>. '+esc(r.venue)+(r.doi?'. DOI: '+esc(r.doi):'')+
      '. <a href="'+esc(r.url)+'">'+esc(r.url)+'</a>.</li>';
  }).join('');
}
function tableRows(r){
  return r.treatments.map(x=>'<tr><td>'+f(x.value)+'</td><td>'+x.n+'</td><td>'+f(x.meanLuma8)+
    '</td><td>'+(x.stdevLuma8===null?'Not estimated':f(x.stdevLuma8))+'</td><td>'+
    f(x.minLuma8)+'–'+f(x.maxLuma8)+'</td></tr>').join('');
}
export function renderManuscriptHTML(bundle,{embedImages=true}={}){
  ok(bundle?.record?.schema===MANUSCRIPT_SCHEMA&&bundle.record.release.academicManuscriptUnlocked===false,
    'Only an unreviewed, evidence-grounded draft may be rendered');
  const r=bundle.record,repeated=r.drawsPerTreatment>1;
  const cites=['[<a href="#citation-1">1</a>]','[<a href="#citation-2">2</a>]','[<a href="#citation-3">3</a>]'];
  const text=[
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>'+esc(r.title)+' — unreviewed draft</title><style>'+style+'</style></head>',
    '<body><article class="paper">',
    '<header class="mast"><div class="kicker">Computational Graphics · Reproducible Shader Observation</div>',
    '<h1>'+esc(r.title)+'</h1><p style="text-align:center">'+esc(r.authorship)+'</p></header>',
    '<div class="status">'+esc(r.publicationStatus)+'. External scholarly review and authorship sign-off are pending.</div>',
    '<div class="meta">Experiment SHA-256: '+esc(r.studySha256)+'<br>Methodology audit SHA-256: '+esc(r.auditSha256)+
       '<br>Manuscript content SHA-256: '+esc(r.sha256)+'<br>Generated UTC: '+esc(r.generatedAt)+'</div>',
    '<section><h2>Abstract</h2><div class="abstract"><p>We document '+r.observedDraws+
      ' recorded WebGL2 fragment-shader GPU draw submissions across three specified '+esc(r.parameter)+
      ' values ('+r.levels.map(f).join(', ')+'), with GLSL time fixed at '+f(r.shaderTimeSeconds)+' seconds. '+
      'The study includes complete RGBA8 framebuffers, original shader and uniform receipts, and hashed PNG evidence. '+
      (repeated?'Each condition has three serial observations arranged in cyclic position-balanced blocks. ':
      'Each condition has one observed frame. ')+
      'We report descriptive full-frame encoded-channel luma statistics only. '+
      'The design does not establish independent replication, significance, performance, causality or technical novelty.</p></div></section>',
    '<section><h2>1. Introduction</h2><p>Fragment shaders operate under a defined graphics language contract '+
      cites[0]+'. WebGL2 supports browser framebuffer rendering and pixel readback '+cites[1]+
      '. Computer-experiment methodology calls for explicit treatment specification and appropriate replication '+
      cites[2]+'. Here, one archived shader is observed under a controlled uniform variation; no new graphics '+
      'method or comparison with established benchmark algorithms is claimed.</p></section>',
    '<section><h2>2. Materials and methods</h2><h3>2.1 Shader and apparatus</h3>',
    '<p>The archived GLSL body is reproduced verbatim in Appendix A. The viewport was '+r.viewport.width+
      ' × '+r.viewport.height+' pixels ('+(r.viewport.width*r.viewport.height)+
      ' total RGBA8 pixels). The manipulated uniform was '+esc(r.parameter)+
      '; the other recorded uniform controls were held at their baseline. Shader time was fixed at '+
      f(r.shaderTimeSeconds)+' s.</p>',
    '<p>Source identifier: '+esc(r.shaderIdentifier)+'. Source attribution (as recorded in the original build receipt, not independently authenticated): '+esc(r.shaderAttribution)+'.</p>',
    '<p>Experimental order: '+esc(r.orderDescription)+'. Figure selection: '+
      esc(r.figureSelectionRule)+'. The archive retains all recorded images and their digests.</p>',
    '<h3>2.2 Pixel measurements</h3><p>For 8-bit encoded RGB channel values, the weighted quantity Y′ is '+
      'an <em>encoded-channel luma proxy</em>, not color-managed linear-light luminance. Full-frame '+
      'means use every archived pixel and must not be confused with the separate grid-sampling diagnostic.</p>',
    '<div class="equation" role="math" aria-label="Y prime equals 0.2126 R plus 0.7152 G plus 0.0722 B">'+
      'Y′ = 0.2126 R + 0.7152 G + 0.0722 B</div>',
    '<div class="equation" role="math" aria-label="Mean luma equals sum of all pixel luma divided by width times height">'+
      'Ȳ′ = [Σ<sub>x=1…W, y=1…H</sub> Y′(x, y)] / (W × H)</div>',
    repeated?'<p>Three frame-wide means per condition produce a descriptive sample standard deviation '+
      'with divisor n − 1 = 2:</p><div class="equation" role="math">s = √[Σ<sub>i=1…3</sub> '+
      '(Ȳ′<sub>i</sub> − μ)² / 2]</div>':
      '<p>Because each treatment has n = 1 observed frame, within-condition variance and sample SD are not estimated.</p>',
    '<h3>2.3 Evidence provenance</h3><p>The original build, full framebuffer RGBA8 content, center-grid '+
      'sample, lossless figure, shader input values and deterministic content hashes are supplied '+
      'in the accompanying archive. Integrity checks do not authenticate original authorship or hardware.</p></section>',
    '<section><h2>3. Results</h2><p>Table 1 presents authenticated means of the encoded-channel '+
      'luma proxy in 8-bit channel units. Values are rounded for display; original pixel data '+
      'and measurement fields remain archived.</p><table><thead><tr><th>'+esc(r.parameter)+' level</th>'+
      '<th>Draws (n)</th><th>Mean Y′</th><th>Descriptive SD</th><th>Frame-mean range</th></tr></thead>'+
      '<tbody>'+tableRows(r)+'</tbody></table><p class="caption">Table 1. Descriptive full-frame results; '+
      '“Not estimated” denotes a single observation, not zero variance.</p>',
    figures(bundle,embedImages),
    '<p>Shown frames were chosen by the fixed earliest-observation rule, not appearance. '+
      'All supporting images and their provenance appear in the research bundle.</p></section>',
    '<section><h2>4. Discussion</h2><p>The values constitute a reproducible description of one shader '+
      'under selected input conditions. Three treatment levels alone do not establish response-model adequacy, '+
      'statistical significance, generalized performance or novelty. Broader experimental-methodology '+
      'literature '+cites[2]+' supplies context but cannot validate unperformed controls.</p></section>',
    '<section><h2>5. Limitations and scholarly status</h2><ol>'+
      r.claimLimits.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ol><p>No author credentials, '+
      'affiliation, ethics approval, journal acceptance, inferential p-values or independent '+
      'review have been attributed by the generator.</p></section>',
    '<section><h2>6. Data and reproducibility</h2><p>The attached bundle provides this print-ready HTML, '+
      r.observedDraws+' lossless PNG images, the complete study JSON with source image bytes, '+
      'a methodology audit, original GLSL and a scope-filtered BibTeX bibliography. '+
      'Each file is indexed by a SHA-256 digest in the accompanying manifest.</p></section>',
    '<section><h2>References</h2><ol>'+references(bundle)+'</ol></section>',
    '<section><h2>Appendix A. Exact GLSL fragment body</h2><pre>'+esc(bundle.shader)+'</pre></section>',
    '<footer class="footer">Programmatically assembled research draft; it has not undergone human '+
      'academic manuscript review. Do not cite as a peer-reviewed publication.</footer>',
    '</article></body></html>'
  ];
  return text.join('\n');
}
async function hash(bytes,subtle){
  const digest=await subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function exportManuscriptBundle(bundle,{
  subtle=globalThis.crypto?.subtle
}={}){
  await verifyManuscript(bundle,subtle);
  const files=[
    {name:'manuscript.html',data:enc.encode(renderManuscriptHTML(bundle,{embedImages:false}))},
    {name:'study.json',data:enc.encode(JSON.stringify(bundle.study,null,2)+'\n')},
    {name:'methodology-audit.json',data:enc.encode(JSON.stringify(bundle.audit,null,2)+'\n')},
    {name:'references.bib',data:enc.encode(bundle.bibtex)},
    {name:'shader.glsl',data:enc.encode(bundle.shader)},
    {name:'manuscript.pdf',data:await createDirectPdf(bundle,{subtle})}
  ];
  for(const fig of bundle.figures)files.push({name:fig.path,data:fig.png});
  const fileInventory=[];
  for(const file of files)fileInventory.push({path:file.name,bytes:file.data.length,
    sha256:await hash(file.data,subtle)});
  const manifest={
    schema:'glsl-lab/manuscript-bundle/1',manuscript:bundle.record,
    verification:{studySha256:bundle.study.sha256,auditSha256:bundle.audit.sha256,
      manuscriptReviewCompleted:false,academicManuscriptUnlocked:false},
    fileInventory
  };
  files.unshift({name:'manifest.json',data:enc.encode(JSON.stringify(manifest,null,2)+'\n')});
  return {zip:zipStored(files),manifest};
}
