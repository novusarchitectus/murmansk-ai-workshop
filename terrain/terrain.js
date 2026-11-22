"use strict";
const grid=window.terrainGrid, z=grid.rows, rows=z.length, cols=z[0].length;
const $=s=>document.getElementById(s);
const A=grid.controls.A,B=grid.controls.B;
const fl=(n,d=1)=>n.toLocaleString("ru-RU",{minimumFractionDigits:d,maximumFractionDigits:d});
const meters=n=>fl(n)+" м";
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dark="#173750",blue="#176ab0";
let step=0, measuring=false, visited=new Set();
function svgText(x,y,t,attrs=""){return '<text x="'+x+'" y="'+y+'" font-family="Onest,Segoe UI,sans-serif" font-size="14" fill="'+dark+'" '+attrs+'>'+t+'</text>';}
function project(c,r,model){
  if(!model) return [96+439*c/(cols-1),16+317*r/(rows-1)];
  const x=c/(cols-1), y=r/(rows-1);
  return [40+x*358+y*200,151-x*79+y*135-(z[r][c]-74)*1.46];
}
const xy=p=>p.map(n=>n.toFixed(1)).join(",");
function surface(){
  let mesh='';
  for(let r=0;r<rows-1;r++)for(let c=cols-2;c>=0;c--){
    const corners=[[c,r],[c+1,r],[c+1,r+1],[c,r+1]];
    const p=corners.map(([c,r])=>project(c,r,true));
    const v=z[r][c], gz=z[r+1][c]-v, gx=z[r][c+1]-v;
    const l=Math.min(88,Math.max(47,78+(v-100)*.09+.75*gz-.7*gx));
    const col='hsl(203,26%,'+l+'%)';
    mesh+='<polygon points="'+p.map(xy).join(" ")+'" fill="'+col+'" stroke="#7c98ae" stroke-width=".55"/>';
  }
  return '<g class="floating">'+mesh+'</g>';
}
function map(){
  return '<image href="terrain/lake-relief.webp" x="96" y="16" width="439" height="317" preserveAspectRatio="none"/>'+
  '<rect x="96" y="16" width="439" height="317" fill="none" stroke="#7995a3" stroke-width=".75"/>'+
  svgText(550,38,"С",'font-weight="700"')+'<path d="M555 64 V46 m-5 7 5-8 5 8" stroke="#425d70" stroke-width="2" fill="none"/>'+
  '<path d="M96 340 v4 h81.3 v-4" stroke="#294c67" fill="none"/>'+svgText(184,349,"200 м");
}
function mark(name,model){
  const t=grid.controls[name],[x,y]=project(t.col,t.row,model),set=visited.has(name);
  const pretty=name==="A"?"А":"Б", side=name==="B"?-1:1, ww=set?95:25;
  const bx=side>0?10:-ww-10;
  const label=set?pretty+"  "+meters(t.z):pretty;
  const active=!model&&!set;
  return '<g data-name="'+name+'" class="'+(active?"hotspot":"")+'" '+(active?'role="button" tabindex="0" aria-label="Измерить точку '+pretty+'"':'')+' transform="translate('+x+' '+y+')">'+
  ('<rect x="-32" y="-28" width="65" height="51" fill="transparent"/>')+
  (!set?'<circle class="pulsing" r="16" fill="#4ea8e8"/>':'')+
  '<circle r="9.5" fill="white" stroke="'+blue+'" stroke-width="1.8"/><circle r="4.3" fill="'+blue+'"/>'+
  '<rect x="'+bx+'" y="-26" width="'+ww+'" height="22" rx="3" fill="'+dark+'"/>'+
  '<text x="'+(bx+ww/2)+'" y="-10.5" font-family="Onest,Segoe UI,sans-serif" font-size="13" fill="white" font-weight="600" text-anchor="middle">'+label+'</text></g>';
}
const cursor='<g id="mouse" class="cursor" aria-hidden="true"><path d="M0 0 L2 21 L7 15 L12 24 L16 22 L11 13 L19 12 Z" fill="#172e45" stroke="white" stroke-width="1.4"/></g>';
function place(name,model=false){
 const q=grid.controls[name],[x,y]=project(q.col,q.row,model);
 $("mouse").style.transform="translate("+(x+3)+"px,"+(y+2)+"px)";
}
function draw(){
 const model=step===2;let image=model?surface():map();
 if(visited.size===2){
   const p=project(A.col,A.row,model),q=project(B.col,B.row,model);
   image+='<path d="M'+xy(p)+' L'+xy(q)+'" stroke="#fff" stroke-width="3.5" fill="none"/><path d="M'+xy(p)+' L'+xy(q)+'" stroke="'+blue+'" stroke-width="1.8" stroke-dasharray="6 4" fill="none"/>';
 }
 $("canvas").innerHTML=image+mark("A",model)+mark("B",model)+cursor;
 for(const g of document.querySelectorAll(".hotspot")){
   const run=()=>{if(!measuring&&!model)read(g.dataset.name);};
   g.addEventListener("click",run);g.addEventListener("keydown",e=>{if(["Enter"," "].includes(e.key)){e.preventDefault();run();}});
 }
 if(visited.size)place([...visited].at(-1),model);else $("mouse").style.transform="translate(71px,201px)";
 $("program").textContent=model?"Revit":"QGIS";$("logo").textContent=model?"R":"Q";
 $("filename").textContent=model?"Поверхность по XYZ":"murmansk-lake.qgs";$("panel").textContent=model?"Состав модели":"Слои проекта";
 $("crs").textContent=model?"XYZ · метры · высота показана с увеличением":"UTM 36N · шаг 30 м";
 $("type").textContent=model?"Схема переноса":"Схема интерфейса";
 if(model){$("title").textContent="Перепад сохранился · "+meters(B.z-A.z);$("tip").textContent="X и Y отсчитаны от местного нуля. Высоты сохранены."; $("action").textContent="Повторить";}
 else if(visited.size===2){$("title").textContent="Точка Б выше на "+meters(B.z-A.z);$("tip").textContent="Сверьте те же отметки после переноса точек в объём."; $("action").textContent="Собрать модель";}
 else if(visited.size){$("title").textContent="Одна отметка получена";$("tip").textContent="Выберите вторую точку на карте."; $("action").textContent="Вторая точка";}
 else{$("title").textContent="Какая точка выше?";$("tip").textContent="Нажмите на метку или запустите измерение."; $("action").textContent="Измерить";}
}
const wait=t=>new Promise(done=>setTimeout(done,reduced?50:t));
async function read(key){
 const keyboard=document.activeElement?.classList?.contains("hotspot");
 measuring=true;$("action").disabled=true;place(key);await wait(730);
 visited.add(key);if(visited.size===2)step=1;draw();measuring=false;$("action").disabled=false;
 if(keyboard)$("action").focus();
}
$("action").addEventListener("click",async()=>{
 if(measuring)return;
 if(step===2){step=0;visited.clear();draw();return;}
 if(step===1){step=2;draw();return;}
 for(const key of ["A","B"]){if(!visited.has(key))await read(key);}
});
draw();

// A wheel event inside an embedded document never bubbles into the slide deck.
if (parent !== window) {
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const delta = event.deltaY * scale;
    const panel = event.target.closest('aside');
    if (panel && ((delta < 0 && panel.scrollTop > 1) ||
        (delta > 0 && panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1))) return;
    event.preventDefault();
    parent.postMessage({type:'terrain-scroll', delta}, location.protocol === 'file:' ? '*' : location.origin);
  }, {passive:false});
}
