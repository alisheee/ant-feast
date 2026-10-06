// core.js: допоміжні функції, спільний стан, Telegram, збереження прогресу
// Підключається звичайним <script> (див. index.html): порядок файлів важливий, змінні спільні.

const VER='14';
const $=id=>document.getElementById(id),N4=[[1,0],[-1,0],[0,1],[0,-1]];
const DIFF={easy:{type:'easy',slots:5,cols:3,min:2,max:5},mid:{type:'medium',slots:5,cols:4,min:2,max:6},hard:{type:'HARD',slots:5,cols:5,min:3,max:8}};
let CATS=[],CACHE={},PROG={cat:null,done:{}},CUR={},S,cat,idx=0,cellEls=[],slotEls=[];
const tg=window.Telegram&&Telegram.WebApp;
if(tg){try{tg.ready();tg.expand()}catch(e){}}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ---- прогрес (хмара Telegram або localStorage) ----
const useTg=()=>tg&&tg.initData&&tg.CloudStorage;
function saveProg(){const v=JSON.stringify(PROG);try{useTg()?tg.CloudStorage.setItem('prog',v):localStorage.setItem('prog',v)}catch(e){}if(typeof syncSoon==='function')syncSoon()}
function loadProg(){return new Promise(res=>{const f=v=>{try{if(v)PROG=JSON.parse(v)}catch(e){}res()};
  try{useTg()?tg.CloudStorage.getItem('prog',(e,v)=>f(v)):f(localStorage.getItem('prog'))}catch(e){res()}})}


// ---- theme (light/dark), remembered in progress ----
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)};
function applyTheme(){document.documentElement.dataset.theme=PROG.theme||'light'}
function setTheme(t){PROG.theme=t;saveProg();applyTheme()}