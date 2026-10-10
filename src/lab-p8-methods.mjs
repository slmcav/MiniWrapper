// P9 mobile-first presentation of P8 analytical findings; this module has no write paths.
import {loadMethodsEvidence,P8_CRITICAL_IDS} from './p8-methods-evidence.mjs';
const target=document.getElementById('p8EvidenceRows');
const status=document.getElementById('p8EvidenceStatus');
const critical=new Set(P8_CRITICAL_IDS);
function el(tag,text,cls){
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  element.textContent=text;
  return element;
}
async function showEvidence(){
  target.replaceChildren();
  status.dataset.evidenceState='loading';
  status.textContent='Loading version-pinned methodological assessment…';
  try{
    const data=await loadMethodsEvidence();
    const rows=document.createDocumentFragment();
    for(const item of data.claimRows){
      const details=document.createElement('details');
      details.className='p8-claim';
      details.dataset.claimId=item.id;
      const rank=critical.has(item.id)?'Critical':'High';
      details.append(el('summary',item.id+' — '+item.claim+' ('+rank+' evidence gap)'));
      details.append(el('p','Evidence required: '+item.strengtheningEvidenceRequired));
      details.append(el('p','Research status: methodological evidence gap identified.','research-status'));
      rows.append(details);
    }
    target.replaceChildren(rows);
    status.dataset.evidenceState='ready';
    status.textContent=data.claimRows.length+
      ' source-grounded methodological findings; '+critical.size+
      ' critical requirements prioritized for further study.';
  }catch(error){
    target.replaceChildren(); // never retain stale findings after a failed verification
    status.dataset.evidenceState='error';
    status.textContent='P8 read-only findings unavailable: '+String(error.message||error)+
      '. Research findings were not loaded.';
  }
}
if(target&&status)showEvidence();
