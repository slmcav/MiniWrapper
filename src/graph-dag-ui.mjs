// GLSL Lab P2 Advanced Wiring: touch-movable cards and explicit typed input ports.
import {DAG_TYPES,DAGHistory,createStarterDAG,inspectDAG,emitDAG,addDAGNode,connectDAG,setDAGParam,moveDAGNode,removeDAGNode,layoutDAG,importDAG,exportDAG} from './graph-dag.mjs';
const $=id=>document.getElementById(id);
const bridge=window.glslLabBridge;
if(!bridge)throw new Error('WebGL validation bridge missing');
let history=new DAGHistory();
let selected='blend';
const workspace=$('dagSurface'),wires=$('dagWires');
const note=(msg,error=false)=>{$('dagStatus').textContent=msg;$('dagStatus').dataset.error=String(error);};
const get=id=>history.graph.nodes.find(n=>n.id===id);
const selectedType=()=>get(selected)?.type;
const buttons=['coordinates','rotate','radius','wave','constant','add','blend','palette'];
for(const type of buttons){
  const option=document.createElement('option');
  option.value=type;option.textContent=DAG_TYPES[type].label;
  $('dagNewType').appendChild(option);
}
$('dagNewType').value='wave';
const dynamic=(tag,cls='',text='')=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  node.textContent=text;
  return node;
};
function apply(next,description,selection=selected){
  history.apply(next);
  selected=next.nodes.some(n=>n.id===selection)?selection:next.output;
  bridge.invalidate();
  render();
  note(description);
}
function drawWires(graph){
  wires.replaceChildren();
  for(const node of graph.nodes){
    const spec=DAG_TYPES[node.type],keys=Object.keys(spec.ports);
    keys.forEach((port,i)=>{
      const source=graph.nodes.find(n=>n.id===node.inputs[port]);
      if(!source)return;
      const x1=source.position.x+198,y1=source.position.y+55,x2=node.position.x,y2=node.position.y+55+i*18;
      const segment=document.createElementNS('http://www.w3.org/2000/svg','path');
      segment.setAttribute('d','M '+x1+' '+y1+' C '+(x1+65)+' '+y1+' '+(x2-65)+' '+y2+' '+x2+' '+y2);
      segment.setAttribute('fill','none');
      segment.setAttribute('stroke',source.type==='coordinates'?'#80b7e0':'#53cbbb');
      segment.setAttribute('stroke-width','3');
      segment.setAttribute('stroke-linecap','round');
      wires.appendChild(segment);
    });
  }
}
function render(){
  const graph=history.graph,report=inspectDAG(graph);
  for(const element of [...workspace.querySelectorAll('.dag-card')])element.remove();
  for(const node of graph.nodes){
    const spec=DAG_TYPES[node.type],card=dynamic('article','dag-card'+(selected===node.id?' selected':'')),
      title=dynamic('button','dag-title',spec.label+' · '+node.id);
    title.type='button';title.dataset.dagNode=node.id;
    title.addEventListener('click',()=>{selected=node.id;render();});
    const meta=dynamic('div','dag-meta',spec.out+' • '+(report.unused.includes(node.id)?'unused':'connected'));
    const grab=dynamic('button','dag-grab','Move');
    grab.type='button';grab.setAttribute('aria-label','Drag '+spec.label+' '+node.id);
    grab.addEventListener('pointerdown',event=>{
      event.preventDefault();selected=node.id;renderSelection();
      const startX=event.clientX,startY=event.clientY,original={...node.position};
      grab.setPointerCapture?.(event.pointerId);
      let nx=original.x,ny=original.y;
      const scale=Number($('dagScale').value)||.65;
      const moved=ev=>{
        nx=Math.max(0,Math.min(2400,original.x+(ev.clientX-startX)/scale));
        ny=Math.max(0,Math.min(2400,original.y+(ev.clientY-startY)/scale));
        card.style.left=Math.round(nx)+'px';card.style.top=Math.round(ny)+'px';
        const preview=history.graph;
        preview.nodes.find(n=>n.id===node.id).position={x:Math.round(nx),y:Math.round(ny)};
        drawWires(preview);
      };
      const finished=()=>{
        grab.removeEventListener('pointermove',moved);
        grab.removeEventListener('pointerup',finished);
        grab.removeEventListener('pointercancel',finished);
        try{apply(moveDAGNode(history.graph,node.id,nx,ny),'Moved '+spec.label,node.id);}
        catch(e){note(String(e.message||e),true);render();}
      };
      grab.addEventListener('pointermove',moved);
      grab.addEventListener('pointerup',finished);
      grab.addEventListener('pointercancel',finished);
    });
    card.style.left=node.position.x+'px';card.style.top=node.position.y+'px';
    card.append(title,meta,grab);
    workspace.appendChild(card);
  }
  drawWires(graph);
  renderSelection();
  $('dagUndo').disabled=!history.canUndo;
  $('dagRedo').disabled=!history.canRedo;
  $('dagNodes').textContent=graph.nodes.length+' nodes · '+report.unused.length+' unconnected to output';
  try{
    $('dagGenerated').value=emitDAG(graph);
    $('dagBuild').disabled=false;
    $('dagReady').textContent='Ready to compile';
  }catch(e){
    $('dagGenerated').value='// Connect remaining operations to the Output node before building.\n// '+String(e.message||e);
    $('dagBuild').disabled=true;
    $('dagReady').textContent=String(e.message||e);
  }
}
function renderSelection(){
  const graph=history.graph,node=get(selected);
  if(!node)return;
  $('dagSelected').textContent=DAG_TYPES[node.type].label+' · '+node.id;
  for(const card of workspace.querySelectorAll('.dag-card'))
    card.classList.toggle('selected',card.querySelector('[data-dag-node]')?.dataset.dagNode===selected);
  const ports=$('dagPorts');ports.replaceChildren();
  for(const [key,want] of Object.entries(DAG_TYPES[node.type].ports)){
    const label=dynamic('label','dag-field','Input '+key+' ('+want+')');
    const select=document.createElement('select');
    select.dataset.dagPort=key;
    const nullOption=document.createElement('option');nullOption.value='';nullOption.textContent='Not connected';
    select.appendChild(nullOption);
    for(const source of graph.nodes.filter(n=>DAG_TYPES[n.type].out===want&&n.id!==node.id)){
      const opt=document.createElement('option');
      opt.value=source.id;opt.textContent=DAG_TYPES[source.type].label+' · '+source.id;
      select.appendChild(opt);
    }
    select.value=node.inputs[key]||'';
    select.addEventListener('change',()=>{
      try{apply(connectDAG(history.graph,node.id,key,select.value||null),'Connected '+key+' to '+(select.value||'nothing'),node.id);}
      catch(e){note('Connection rejected: '+String(e.message||e),true);renderSelection();}
    });
    label.appendChild(select);ports.appendChild(label);
  }
  const controls=$('dagParams');controls.replaceChildren();
  for(const [name,[min,max]] of Object.entries(DAG_TYPES[node.type].params)){
    const label=dynamic('label','dag-field',name+' ');
    const value=dynamic('output','',String(node.params[name]));
    const slider=document.createElement('input');
    slider.type='range';slider.min=min;slider.max=max;slider.step=.01;slider.value=node.params[name];
    slider.dataset.dagParam=name;
    label.append(value,slider);
    slider.addEventListener('input',()=>{value.textContent=String(slider.value);bridge.invalidate();});
    slider.addEventListener('change',()=>{
      try{apply(setDAGParam(history.graph,node.id,name,Number(slider.value)),'Updated '+name,node.id);}
      catch(e){note(String(e.message||e),true);}
    });
    controls.appendChild(label);
  }
  $('dagRemove').disabled=node.id===graph.output||graph.nodes.some(n=>Object.values(n.inputs).includes(node.id));
}
$('dagAdd').addEventListener('click',()=>{
  try{
    const type=$('dagNewType').value,graph=addDAGNode(history.graph,type);
    const added=graph.nodes.at(-1).id;
    apply(graph,'Added '+DAG_TYPES[type].label+'. Choose a matching input port on another node to use it.',added);
  }catch(e){note(String(e.message||e),true);}
});
$('dagRemove').addEventListener('click',()=>{
  try{apply(removeDAGNode(history.graph,selected),'Deleted operation.');}
  catch(e){note(String(e.message||e),true);}
});
$('dagAutoLayout').addEventListener('click',()=>apply(layoutDAG(history.graph),'Automatically arranged the graph.'));
$('dagUndo').addEventListener('click',()=>{history.undo();bridge.invalidate();render();note('Undid graph edit.');});
$('dagRedo').addEventListener('click',()=>{history.redo();bridge.invalidate();render();note('Redid graph edit.');});
$('dagNudgeLeft').addEventListener('click',()=>nudge(-30,0));
$('dagNudgeRight').addEventListener('click',()=>nudge(30,0));
$('dagNudgeUp').addEventListener('click',()=>nudge(0,-30));
$('dagNudgeDown').addEventListener('click',()=>nudge(0,30));
function nudge(x,y){
  try{const n=get(selected);apply(moveDAGNode(history.graph,selected,n.position.x+x,n.position.y+y),'Moved '+n.id,selected);}
  catch(e){note(String(e.message||e),true);}
}
$('dagScale').addEventListener('change',()=>{
  workspace.style.zoom=$('dagScale').value;
  note('Canvas zoom set to '+Math.round(Number($('dagScale').value)*100)+'%.');
});
$('dagBuild').addEventListener('click',()=>{
  try{
    const graph=history.graph,source=emitDAG(graph);
    bridge.compileGraph(graph,source);
    note('Submitted graph v2 to WebGL2. A successful draw enables build evidence.');
  }catch(e){note(String(e.message||e),true);}
});
$('dagExport').addEventListener('click',()=>{
  const bytes=exportDAG(history.graph),url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='glsl-lab-wiring-v2.json';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
});
$('dagImport').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>100000)throw new Error('Graph file exceeds 100 KB');
    const graph=importDAG(await file.text());
    history=new DAGHistory(graph);selected=graph.output;bridge.invalidate();render();
    note('Imported graph v2. Verify wiring before compiling.');
  }catch(e){note('Import rejected: '+String(e.message||e),true);}
  finally{event.target.value='';}
});
function selectMode(mode){
  const isAdvanced=mode==='advanced';
  window.glslLabGraphMode=isAdvanced?'advanced':'quick';
  $('quickBuilder').hidden=isAdvanced;
  $('advancedBuilder').hidden=!isAdvanced;
  $('advancedToggle').textContent=isAdvanced?'Switch to Quick Build':'Switch to Advanced Wiring';
  bridge.invalidate();
  render();
}
$('advancedToggle').addEventListener('click',()=>selectMode(window.glslLabGraphMode==='advanced'?'quick':'advanced'));
window.glslLabAdvanced={
  get graph(){return history.graph;},
  loadGraph(graph){
    const g=importDAG(exportDAG(graph));
    history=new DAGHistory(g);selected=g.output;
    selectMode('advanced');
    bridge.compileGraph(g,emitDAG(g));
    note('Rebuilt saved wiring graph.');
  },
  selectMode
};
window.glslLabGraphMode='quick';
workspace.style.zoom=$('dagScale').value;
render();
note('Branching workspace ready. Select nodes and rewire their input ports.');
