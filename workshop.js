const $ = id => document.getElementById(id);
const slides = [...document.querySelectorAll('.slide')];
const names = ['Мурманск', 'Север как Другой', 'Глобальная деревня', 'Как удержать кадр', 'Город со стороны воды', 'Два исходника', 'Сравнение у причала', 'Рельеф в QGIS', 'Подключение программ', 'Материалы'];
const toc = $('toc'), viewer = $('viewer');
let active = -1, pictures = [], pictureIndex = 0;
const local = ['localhost','127.0.0.1'].includes(location.hostname) || location.protocol === 'file:';
if (local && !location.search.includes('public')) {
  const sheet=document.createElement('link'); sheet.rel='stylesheet'; sheet.href='../preview-fonts/fonts.css';
  sheet.onload=()=>{document.documentElement.style.setProperty('--display','"TT rehearsal",Manrope,sans-serif');}; document.head.append(sheet);
}
function show(n, changeHash=true) {
 n=Math.min(slides.length-1, Math.max(0,n)); if(n===active)return;
 active=n; slides.forEach((s,i)=>{s.classList.toggle('on',i===n);if(i===n)s.scrollTop=0;});
 [...$('chapters').children].forEach((b,i)=>{if(i===n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 $('current').textContent=String(n+1).padStart(2,'0');$('total').textContent=String(slides.length);$('progress').style.width=(100*(n+1)/slides.length)+'%';$('currentName').textContent=names[n];$('prev').disabled=n===0;$('next').disabled=n===slides.length-1;
 document.title=names[n]+' · Новый архитектор'; if(changeHash && location.hash!=='#'+slides[n].id) location.hash=slides[n].id;
}
names.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>{toc.close();show(i);};$('chapters').append(b);});
function fromHash(){const n=slides.findIndex(s=>location.hash==='#'+s.id);show(n<0?0:n,false);}
fromHash();addEventListener('hashchange',fromHash);
$('prev').onclick=()=>show(active-1);$('next').onclick=()=>show(active+1);$('openMenu').onclick=()=>toc.showModal();
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d)d.close();});});
function fullPic(i){pictureIndex=i;const pic=pictures[i];$('fullImg').src=pic.image;$('fullImg').alt=pic.caption;$('fullCaption').textContent=pic.caption;$('imgPrev').disabled=i===0;$('imgNext').disabled=i===pictures.length-1;}
function lightbox(group,ix){pictures=group;fullPic(ix);viewer.showModal();}
$('imgPrev').onclick=()=>fullPic(Math.max(0,pictureIndex-1));$('imgNext').onclick=()=>fullPic(Math.min(pictures.length-1,pictureIndex+1));
document.addEventListener('click',e=>{const b=e.target.closest('button[data-image]');if(!b)return;const siblings=[...b.closest('.slide').querySelectorAll('button[data-image]')];lightbox(siblings.map(x=>({image:x.dataset.image,caption:x.dataset.caption})),siblings.indexOf(b));});
document.addEventListener('keydown',e=>{
 if(viewer.open){if(e.key==='ArrowLeft')$('imgPrev').click();if(e.key==='ArrowRight')$('imgNext').click();return;}
 if(toc.open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey)return;
 const off={ArrowRight:1,PageDown:1,ArrowLeft:-1,PageUp:-1};
 if(e.key in off || e.key==='Home'||e.key==='End'){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?slides.length-1:active+off[e.key]);}
});
let lastWheel=0,scrollAmount=0,locked=false;
document.addEventListener('wheel',e=>{
 if(viewer.open||toc.open||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
 const d=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),now=performance.now();
 if(now-lastWheel>170){scrollAmount=0;locked=false;}lastWheel=now;
 for(let node=e.target;node&&node!==document.body;node=node.parentElement){if(node.scrollHeight>node.clientHeight+3 && ['auto','scroll'].includes(getComputedStyle(node).overflowY)&&((d>0&&node.scrollTop+node.clientHeight<node.scrollHeight-3)||(d<0&&node.scrollTop>2)))return;}
 e.preventDefault();if(locked)return;if(Math.sign(d)!==Math.sign(scrollAmount))scrollAmount=0;scrollAmount+=d;
 if(Math.abs(scrollAmount)>45){show(active+Math.sign(d));locked=true;scrollAmount=0;}
},{passive:false});
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
function panel(image,label,title){
 const figure=el('figure'),b=el('button','zoomTarget'),img=el('img');b.dataset.image=image;b.dataset.caption=title+' · '+label;b.setAttribute('aria-label','Увеличить: '+b.dataset.caption);img.src=image;img.alt=b.dataset.caption;b.append(img);figure.append(b,el('span','',label));return figure;
}
document.querySelectorAll('.gallery').forEach(g=>{
 const items=window.MURMANSK_INTERIORS.filter(x=>x.group===g.dataset.group);const pair=el('div','pair'),bar=el('div','galleryBar'),description=el('div'),title=el('p','galleryLabel'),anchor=el('p','anchorText'),thumbs=el('div','thumbs');description.append(title,anchor);bar.append(description,thumbs);g.append(pair,bar);
 function render(i){const x=items[i];pair.replaceChildren();pair.classList.toggle('solo',!x.before);if(x.before)pair.append(panel(x.before,'Модель',x.title));pair.append(panel(x.after,x.before?'Визуализация':'Проектный вид',x.title));title.textContent=x.title;anchor.textContent=x.anchor;[...thumbs.children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
 if(items.length>1)items.forEach((x,i)=>{const b=el('button'),img=el('img');b.setAttribute('aria-label',x.title);b.title=x.title;img.src=x.after;img.alt='';b.append(img);b.onclick=()=>render(i);thumbs.append(b);});
 render(0);
});
let stage=0;
const walkthrough=[
 ['Вид из модели','interiors/north-model.webp','Найдите угол стеклянного объёма в кадре.','Показать якорь'],
 ['Словесный якорь','interiors/north-model.webp','«Сохрани положение угла остеклённого объёма справа».','Показать результат'],
 ['Визуализация','interiors/north-hall.webp','Сравните угол, вертикали колонн и верхнюю галерею с моделью.','Сначала']
];
$('stageNext').onclick=()=>{stage=(stage+1)%3;const [label,image,caption,action]=walkthrough[stage];$('stageType').textContent=label;$('studioImg').src=image;$('studioImg').alt=label;$('studioZoom').dataset.image=image;$('studioZoom').dataset.caption=label+' · Тёплый объём внутри цеха';$('stageCaption').textContent=caption;$('stageNext').textContent=action;$('anchorStudio').querySelectorAll('.callout,.pointer').forEach(n=>n.hidden=stage!==1);};
const frames=[['Revit','model','Модель территории'],['Карта','satellite','Исходный вид сверху'],['Nano Banana Pro','existing','Визуальная реконструкция существующего состояния']];
[...$('frames').children].forEach((b,i)=>b.onclick=()=>{const [name,file,title]=frames[i],img=$('framePic');img.src='case/'+file+'.webp';img.alt=title;img.classList.remove('photoIn');void img.offsetWidth;img.classList.add('photoIn');$('frameZoom').dataset.image=img.getAttribute('src');$('frameZoom').dataset.caption=title;$('frameName').textContent=name;[...$('frames').children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('cut').oninput=e=>e.target.parentElement.style.setProperty('--cut',e.target.value+'%');
$('largeCompare').onclick=()=>lightbox([{image:'case/concept-a.webp',caption:'Территория · вариант А'},{image:'case/concept-b.webp',caption:'Территория · вариант Б'}],0);
document.querySelectorAll('.copyText').forEach(b=>b.onclick=async()=>{const p=$(b.dataset.copy),label=b.textContent;try{await navigator.clipboard.writeText(p.textContent);b.textContent='Скопировано';setTimeout(()=>b.textContent=label,1600);}catch{const r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r);b.textContent='Текст выделен. Нажмите Ctrl+C';}});

