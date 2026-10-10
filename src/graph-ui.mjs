// Mobile-first P2 visual graph editor; UI uses the typed graph engine directly.
import {GraphHistory,graphOrder,insertOperation,removeOperation,moveOperation,setOperationParameter,parametersFor,exportGraph,importGraph,emitGLSL,createStarterGraph,OPERATION_LABELS} from './graph-editor.mjs';
const $=id=>document.getElementById(id);
const bridge=window.glslLabBridge;
if(!bridge)throw new Error('GLSL Lab WebGL bridge is missing');
let history=new GraphHistory();
let selected='rings';
const titles={
  coordinates:'Where is each pixel?', rotate:'Turn the coordinates',
  radius:'Measure distance', wave:'Make a repeating wave',palette:'Choose colors'
};
const details={
  coordinates:'Normalize the screen to centered coordinates.',
  rotate:'Rotate the location before measuring it.',
  radius:'Turn 2D coordinates into distance from the center.',
  wave:'Convert a distance into smoothly moving light.',
  palette:'Give the final light value a color.'
};
const status=(msg,error=false)=>{const n=$('builderStatus');n.textContent=msg;n.dataset.error=String(error);};
const nodeById=(id)=>history.graph.nodes.find(node=>node.id===id);
function button(text,onClick,disabled=false,cls=''){
  const el=document.createElement('button');
  el.type='button';el.textContent=text;el.disabled=disabled;
  if(cls)el.className=cls;
  el.addEventListener('click',onClick);
  return el;
}
function change(next,message){
  history.apply(next);
  if(!nodeById(selected))selected=history.graph.output;
  bridge.invalidate();
  render();
  status(message||'Graph changed. Choose Build & preview to compile.',false);
}
function render(){
  const graph=history.graph,order=graphOrder(graph);
  const chain=$('graphChain');chain.replaceChildren();
  for(const [index,id] of order.entries()){
    const node=nodeById(id),card=document.createElement('button');
    card.type='button';card.className='graph-node'+(selected===id?' is-selected':'');
    card.setAttribute('aria-pressed',String(selected===id));
    card.dataset.nodeId=id;
    const heading=document.createElement('strong');heading.textContent=OPERATION_LABELS[node.type]||node.type;
    const subtitle=document.createElement('span');
    subtitle.textContent=(node.input?node.input+' → ':'start → ')+id+' · '+node.type+' → '+({'coordinates':'vec2','rotate':'vec2','radius':'float','wave':'float','palette':'vec3'}[node.type]);
    card.append(heading,subtitle);
    card.addEventListener('click',()=>{selected=id;render();});
    chain.appendChild(card);
    if(index<order.length-1){const arrow=document.createElement('div');arrow.className='graph-connector';arrow.textContent='↓ connected';chain.appendChild(arrow);}
  }
  const node=nodeById(selected);
  $('selectedOperation').textContent=OPERATION_LABELS[node.type];
  $('operationDescription').textContent=titles[node.type]+' '+details[node.type];
  const fields=$('nodeFields');fields.replaceChildren();
  for(const spec of parametersFor(node)){
    const field=document.createElement('div');field.className='control';
    const label=document.createElement('label');const id='graph-'+node.id+'-'+spec.name;
    label.htmlFor=id;label.textContent=spec.name+' ';
    const number=document.createElement('output');number.textContent=String(spec.value);
    const input=document.createElement('input');
    input.id=id;input.type='range';input.min=String(spec.min);input.max=String(spec.max);
    input.step='0.01';input.value=String(spec.value);
    input.dataset.graphParam=spec.name;
    input.addEventListener('input',()=>{
      const val=Number(input.value);number.textContent=String(val);
      try{
        // Keep the mobile thumb active while dragging. Commit one undo step on release.
        const draft=setOperationParameter(history.graph,node.id,spec.name,val);
        $('builderCode').value=emitGLSL(draft);
        bridge.invalidate();
        status('Editing '+spec.name+'. Release the slider to commit.');
      }catch(error){status(String(error.message||error),true);}
    });
    input.addEventListener('change',()=>{
      try{change(setOperationParameter(history.graph,node.id,spec.name,Number(input.value)),
        'Updated '+spec.name+'. Build to preview.');}
      catch(error){status(String(error.message||error),true);}
    });
    field.append(label,number,input);fields.appendChild(field);
  }
  if(!fields.childNodes.length){
    const note=document.createElement('p');note.textContent='This operation has no adjustable parameters.';fields.appendChild(note);
  }
  const optional=node.type==='rotate'||node.type==='wave';
  const i=order.indexOf(selected);
  $('removeNode').disabled=!optional;
  $('moveNodeUp').disabled=!(optional&&i>0&&nodeById(order[i-1]).type===node.type);
  $('moveNodeDown').disabled=!(optional&&i<order.length-1&&nodeById(order[i+1]).type===node.type);
  $('builderUndo').disabled=!history.canUndo;
  $('builderRedo').disabled=!history.canRedo;
  $('builderCode').value=emitGLSL(graph);
  $('graphCount').textContent=order.length+' connected operations';
}
for(const type of ['rotate','wave']){
  $(type==='rotate'?'addTurn':'addWave').addEventListener('click',()=>{
    try{const g=insertOperation(history.graph,type);
      selected=graphOrder(g).find(id=>!history.graph.nodes.some(n=>n.id===id));
      change(g,'Added '+OPERATION_LABELS[type]+' with valid connections.');
    }catch(error){status(String(error.message||error),true);}
  });
}
$('removeNode').addEventListener('click',()=>{
  try{change(removeOperation(history.graph,selected),'Removed optional operation.');}
  catch(error){status(String(error.message||error),true);}
});
for(const [id,delta] of [['moveNodeUp',-1],['moveNodeDown',1]]){
  $(id).addEventListener('click',()=>{
    try{change(moveOperation(history.graph,selected,delta),'Reordered connected operations.');}
    catch(error){status(String(error.message||error),true);}
  });
}
$('builderUndo').addEventListener('click',()=>{
  history.undo();bridge.invalidate();
  if(!nodeById(selected))selected=history.graph.output;
  render();status('Undid graph change. Build again to preview.');
});
$('builderRedo').addEventListener('click',()=>{
  history.redo();bridge.invalidate();
  if(!nodeById(selected))selected=history.graph.output;
  render();status('Redid graph change. Build again to preview.');
});
$('builderReset').addEventListener('click',()=>{
  change(createStarterGraph(),'Starter expression restored.');
});
$('builderRender').addEventListener('click',()=>{
  try{const body=emitGLSL(history.graph);
    bridge.compileGraph(history.graph,body);
    status('GLSL submitted to WebGL2. A successful draw unlocks Save validated build.');
  }catch(error){status('Cannot build: '+String(error.message||error),true);}
});
$('graphExport').addEventListener('click',()=>{
  const raw=exportGraph(history.graph);
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='glsl-lab-expression-graph.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  status('Graph JSON exported.');
});
$('graphImport').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>100000)throw new Error('Graph JSON exceeds 100 KB');
    const g=importGraph(await file.text());
    selected=g.output;change(g,'Valid graph imported. Build to see it.');
  }catch(error){status('Import rejected: '+String(error.message||error),true);}
  finally{e.target.value='';}
});
window.glslLabBuilder={
  get graph(){return history.graph;},
  loadGraph(graph){
    // A valid project graph is explicitly retained and triggers a new render.
    const g=importGraph(exportGraph(graph));
    selected=g.output;history=new GraphHistory(g);
    bridge.invalidate();render();
    bridge.compileGraph(g,emitGLSL(g));
  }
};
render();
// The Lab starts from a user-editable typed graph, never a supplied gallery shader.
try{
 bridge.compileGraph(history.graph,emitGLSL(history.graph));
 status('Editable research graph ready. Change an operation or start a controlled capture.');
}catch(error){status('Graph compilation failed: '+String(error.message||error),true);}
