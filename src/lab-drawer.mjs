// Mobile-only accessible bottom-drawer presentation of the scientific editor.
// Controls remain in ordinary document flow when the drawer is closed.
const trigger=document.getElementById('drawerToggle');
const panel=document.getElementById('labControls');
const tabIds=['tabPlay','tabBuild','tabCode'];
const mobile=()=>window.matchMedia('(max-width:820px)').matches;
function setOpen(open){
 const state=Boolean(open)&&mobile();
 document.body.classList.toggle('drawer-open',state);
 trigger.setAttribute('aria-expanded',String(state));
 trigger.textContent=state?'Close controls':'Controls';
 if(state)panel.scrollTop=0;
 return state;
}
trigger.addEventListener('click',()=>setOpen(!document.body.classList.contains('drawer-open')));
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&document.body.classList.contains('drawer-open')){
  setOpen(false);trigger.focus();
 }
});
window.addEventListener('resize',()=>{if(!mobile())setOpen(false);});
let start=null;
panel.addEventListener('touchstart',event=>{
 if(!document.body.classList.contains('drawer-open')||event.touches.length!==1)return;
 if(event.target.closest('input,textarea,select,button,a,.dag-scroll,canvas'))return;
 start={x:event.touches[0].clientX,y:event.touches[0].clientY};
},{passive:true});
panel.addEventListener('touchend',event=>{
 if(!start||!document.body.classList.contains('drawer-open'))return;
 const point=event.changedTouches[0];
 const dx=point.clientX-start.x,dy=point.clientY-start.y;
 start=null;
 if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.6)return;
 const active=tabIds.findIndex(id=>document.getElementById(id).getAttribute('aria-selected')==='true');
 const next=Math.max(0,Math.min(tabIds.length-1,active+(dx<0?1:-1)));
 if(next!==active)document.getElementById(tabIds[next]).click();
},{passive:true});
window.glslLabDrawer=Object.freeze({open:()=>setOpen(true),close:()=>setOpen(false),
 isOpen:()=>document.body.classList.contains('drawer-open')});
