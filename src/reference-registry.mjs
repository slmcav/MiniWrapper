// Authored bibliographic custody: publisher/standard registry metadata checks, NOT peer review.
// Entries marked pending are excluded from automated manuscript citation.
export const REFERENCE_SCHEMA='glsl-lab/reference-registry/1';
export const REFERENCE_REVIEW_DATE='2026-10-10';
export const REFERENCES=Object.freeze([
  Object.freeze({
    id:'khronos-glsl-es300',type:'standard',status:'metadata_verified',
    authors:['Khronos Group'],year:2016,
    title:'The OpenGL ES Shading Language, Version 3.00, Revision 6',
    venue:'Khronos OpenGL ES Registry',doi:null,
    url:'https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf',
    metadataSource:'https://registry.khronos.org/OpenGL/index_es.php',
    scope:['glsl_language'],note:'Normative language specification; no experimental performance or novelty claim',
    checkedAt:REFERENCE_REVIEW_DATE
  }),
  Object.freeze({
    id:'khronos-webgl2',type:'standard',status:'metadata_verified',
    authors:['Khronos Group'],year:2026,
    title:'WebGL 2.0 Specification (Editors Draft)',
    venue:'Khronos WebGL Registry',doi:null,
    url:'https://registry.khronos.org/webgl/specs/latest/2.0/',
    metadataSource:'https://registry.khronos.org/webgl/specs/latest/2.0/',
    scope:['webgl_api','pixel_readback'],note:'Living editor draft; cite as specification, not finalized standard or evidence of hardware determinism',
    checkedAt:REFERENCE_REVIEW_DATE
  }),
  Object.freeze({
    id:'sacks1989',type:'journal',status:'metadata_verified',
    authors:['Jerome Sacks','William J. Welch','Toby J. Mitchell','Henry P. Wynn'],year:1989,
    title:'Design and Analysis of Computer Experiments',venue:'Statistical Science, 4(4), 409–423',
    doi:'10.1214/ss/1177012413',url:'https://doi.org/10.1214/ss/1177012413',
    metadataSource:'https://projecteuclid.org/journals/statistical-science/volume-4/issue-4/Design-and-Analysis-of-Computer-Experiments/10.1214/ss/1177012413.full',
    scope:['experiment_design'],note:'Methodological context; does not authorize inferential statistics from three or nine serial frames',
    checkedAt:REFERENCE_REVIEW_DATE
  }),
  Object.freeze({
    id:'lagae2010',type:'journal',status:'metadata_verified',
    authors:['A. Lagae','S. Lefebvre','R. Cook','T. DeRose','G. Drettakis','D. S. Ebert','J. P. Lewis','K. Perlin','M. Zwicker'],
    year:2010,title:'A Survey of Procedural Noise Functions',
    venue:'Computer Graphics Forum, 29(8), 2579–2600',
    doi:'10.1111/j.1467-8659.2010.01827.x',
    url:'https://doi.org/10.1111/j.1467-8659.2010.01827.x',
    metadataSource:'https://onlinelibrary.wiley.com/doi/10.1111/j.1467-8659.2010.01827.x',
    scope:['procedural_noise_context'],
    note:'Survey of procedural noise; contextual only until a shader or graph actually implements a relevant noise method',
    checkedAt:REFERENCE_REVIEW_DATE
  }),
  Object.freeze({
    id:'jeremias-quilez2013',type:'conference',status:'pending_primary_metadata',
    authors:['Pol Jeremias','Iñigo Quilez'],year:2013,
    title:'Shadertoy: Live Coding for Reactive Shaders',venue:'ACM SIGGRAPH 2013 Computer Animation Festival',
    doi:'10.1145/2503541.2503644',url:'https://doi.org/10.1145/2503541.2503644',
    metadataSource:'https://www.researchgate.net/publication/262366982_Shadertoy_live_coding_for_reactive_shaders',
    scope:['shader_tool_history'],
    note:'DOI and bibliographic metadata appear in secondary listing only; verify against ACM publisher before citation',
    checkedAt:REFERENCE_REVIEW_DATE
  })
]);
const allowedTypes=new Set(['standard','journal','conference']);
const allowedScopes=new Set(['glsl_language','webgl_api','pixel_readback','experiment_design','procedural_noise_context','shader_tool_history']);
const safeId=/^[a-z][a-z0-9_-]{3,79}$/;
const knownStatuses=new Set(['metadata_verified','pending_primary_metadata']);
const required=['id','type','status','authors','year','title','venue','doi','url','metadataSource','scope','note','checkedAt'];
const accept=(ok,msg)=>{if(!ok)throw new TypeError(msg);};
export function validateReferences(items=REFERENCES){
  accept(Array.isArray(items)&&items.length>0&&items.length<=100,'Bibliography must contain 1 to 100 records');
  const ids=new Set(),dois=new Set();
  for(const r of items){
    accept(r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).sort().join(',')===required.slice().sort().join(','),'Malformed reference record');
    accept(safeId.test(r.id)&&!ids.has(r.id),'Duplicate or unsafe reference id');
    ids.add(r.id);
    accept(allowedTypes.has(r.type)&&knownStatuses.has(r.status),'Unknown source type or metadata status');
    accept(Array.isArray(r.authors)&&r.authors.length>0&&r.authors.length<=20&&r.authors.every(a=>typeof a==='string'&&a.trim().length>=2&&a.length<=140),'Invalid authors');
    accept(Number.isSafeInteger(r.year)&&r.year>=1900&&r.year<=2100,'Invalid publication year');
    for(const field of ['title','venue','note'])accept(typeof r[field]==='string'&&r[field].trim().length>3&&r[field].length<=600,'Invalid bibliographic '+field);
    for(const field of ['url','metadataSource']) {
      accept(typeof r[field]==='string'&&r[field].length<1000&&r[field].startsWith('https://'),'Source locator must be HTTPS');
      const uri=new URL(r[field]);accept(uri.protocol==='https:'&&!!uri.hostname,'Invalid reference locator');
    }
    if(r.doi!==null){
      accept(typeof r.doi==='string'&&/^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(r.doi),'Malformed DOI');
      const doi=r.doi.toLowerCase();accept(!dois.has(doi),'Duplicate DOI');dois.add(doi);
      accept(r.url.toLowerCase()==='https://doi.org/'+doi,'DOI and resolver mismatch');
    }
    accept(Array.isArray(r.scope)&&r.scope.length>0&&r.scope.every(s=>allowedScopes.has(s)),'Unknown applicability claim');
    accept(/^\d{4}-\d\d-\d\d$/.test(r.checkedAt)&&Number.isFinite(Date.parse(r.checkedAt)),'Invalid metadata review date');
  }
  return true;
}
export function bibliographicReadiness(items=REFERENCES){
  validateReferences(items);
  const verified=items.filter(r=>r.status==='metadata_verified');
  const pending=items.filter(r=>r.status!=='metadata_verified');
  const covered=new Set(verified.flatMap(r=>r.scope));
  const requiredScopes=['glsl_language','webgl_api','pixel_readback','experiment_design'];
  return {
    registrySchema:REFERENCE_SCHEMA,verifiedCount:verified.length,pendingIds:pending.map(r=>r.id),
    coveredScopes:[...covered].sort(),missingRequiredScopes:requiredScopes.filter(k=>!covered.has(k)),
    humanSourceReviewSigned:false,publicationPermissionVerified:false,
    note:'Publisher/registry metadata checks are not independent peer review or manuscript reference sign-off'
  };
}
export function vettedReferences(scopes,items=REFERENCES){
  validateReferences(items);
  accept(Array.isArray(scopes)&&scopes.length>0&&scopes.every(s=>allowedScopes.has(s)),'Claim scope invalid');
  return items.filter(r=>r.status==='metadata_verified'&&r.scope.some(s=>scopes.includes(s)));
}
const tex=v=>v.replace(/\\/g,'\\textbackslash{}').replace(/([{}$%&#_])/g,'\\$1');
export function exportBibtex(scopes=['glsl_language','webgl_api','pixel_readback','experiment_design'],items=REFERENCES){
  return vettedReferences(scopes,items).map(r=>{
    const type=r.type==='journal'?'article':r.type==='conference'?'inproceedings':'manual';
    const fields=[
      ['title',r.title],['author',r.authors.join(' and ')],['year',String(r.year)],
      [r.type==='journal'?'journal':r.type==='conference'?'booktitle':'organization',r.venue],
      ['url',r.url],...(r.doi?[['doi',r.doi]]:[])
    ];
    return '@'+type+'{'+r.id+',\n'+fields.map(([k,v])=>'  '+k+' = {'+tex(v)+'}').join(',\n')+'\n}';
  }).join('\n\n')+'\n';
}
