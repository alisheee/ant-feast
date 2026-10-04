// menu.js: головне меню, каталог, категорії, завантаження рівнів
// Підключається звичайним <script> (див. index.html): порядок файлів важливий, змінні спільні.

// ---- меню, каталог, рівні ----
const show=id=>{setTrack(id==='game'?'game':'menu');document.querySelectorAll('.screen').forEach(e=>{if(e.parentElement===document.body)e.classList.toggle('on',e.id===id)})};
const doneOf=c=>Math.min(PROG.done[c.id]||0,c.levels.length);
const curCat=()=>CATS.find(c=>c.id===PROG.cat&&c.levels.length)||CATS.find(c=>c.levels.length);
const conv=d=>{const pal={};d.palette.forEach((h,i)=>pal[String.fromCharCode(97+i)]=h);
  return{pal,map:d.pixels.map(r=>r.map(v=>v<0?'.':String.fromCharCode(97+v)).join(''))}};
async function fetchLevel(c,i){
  const m=c.levels[i],k=c.id+(m.pid||i);
  if(!CACHE[k]){
    if(c.personal)CACHE[k]={...DIFF[autoDiff(m.data)],...conv(m.data),seed:i*7+3};
    else{const d=await(await fetch('levels/'+m.file+'?v='+VER)).json();CACHE[k]={...DIFF[m.difficulty||'easy'],...conv(d),seed:i*7+c.id.length}}}
  return CACHE[k];
}
async function playLevel(c,i){
  try{const L=await fetchLevel(c,i);cat=c;idx=i;PROG.cat=c.id;saveProg();show('game');startGame(L)}
  catch(e){alert('Could not load the level')}
}
function goHome(){clearInterval(TICK);if(S)S.over=true;$('ants').innerHTML='';$('ov').style.display='none';renderHome();show('home')}
function renderHome(){
  const c=curCat(),n=c.levels.length,d=doneOf(c);
  $('hcat').innerHTML=`${icon(c.icon,26)}<span>${c.name}</span>`;
  $('hnum').textContent=d>=n?n:d+1;
  $('hsub').textContent=d>=n?'category complete ✓':`out of ${n}`;
}
function renderCatalog(){
  const el=$('cats');el.innerHTML='';
  CATS.forEach(c=>{const n=c.levels.length,d=doneOf(c),b=document.createElement('button');
    b.className='card'+(n||c.personal?'':' soon');
    b.innerHTML=`<span class="em">${icon(c.icon,28)}</span><span class="ct"><b>${c.name}</b><i><u style="width:${n&&!c.personal?d/n*100:0}%"></u></i></span><span>${c.personal?n+'/'+MAXP:n?d+'/'+n:'soon'}</span>`;
    if(n||c.personal)b.onclick=()=>{delMode=false;openCat(c)};el.appendChild(b)});
}
let delMode=false;
function openCat(c){
  $('cpt').innerHTML=`${icon(c.icon,20)}<span>${c.name}</span>`;const el=$('lvls'),d=c.personal?c.levels.length:doneOf(c);el.innerHTML='';
  c.levels.forEach((_,i)=>{const b=document.createElement('button');
    b.className='lv'+(c.personal?'':i<d?' done':i===d?' cur':' lock');b.innerHTML=i<=d||c.personal?i+1:icon('lock',18);
    if(c.personal&&delMode){b.innerHTML=icon('trash-2',18);b.onclick=async()=>{if(confirm('Delete this photo?'))await delPersonal(i)}}
    else if(i<=d||c.personal)b.onclick=()=>playLevel(c,i);
    el.appendChild(b)});
  if(c.personal){
    if(c.levels.length<MAXP){const a=document.createElement('button');a.className='lv';a.innerHTML=icon('plus',22);a.onclick=openUpload;el.appendChild(a)}
    if(c.levels.length){const t=document.createElement('button');t.className='btn';t.style.gridColumn='1/-1';t.innerHTML=delMode?`${icon('check',16)} Done`:`${icon('trash-2',16)} Delete photos`;t.style.display='flex';t.style.gap='8px';t.style.justifyContent='center';t.onclick=()=>{delMode=!delMode;openCat(c)};el.appendChild(t)}
  }
  show('catpage');
}