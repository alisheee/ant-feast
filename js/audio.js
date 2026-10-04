// audio.js: background music + sound effects (Web Audio, so volume also works on iPhone)
// Plain <script>, shared globals: load order matters (see index.html).

const SET_DEF={music:true,sfx:true,mv:0.35,sv:0.8};
const settings=()=>(PROG.set=Object.assign({},SET_DEF,PROG.set));
const AU={ctx:null,buf:{},mg:null,sg:null,src:null};
const FILES={menu:'audio/music.mp3',game:'audio/game.mp3',click:'audio/click.mp3',tile:'audio/tile.mp3',retry:'audio/retry.mp3',win:'audio/win.mp3',lose:'audio/lose.mp3'};
let TRACK='menu';
function setTrack(t){TRACK=t;syncMusic()}
const RAW={};
// download the files right away; they are decoded after the first tap (browsers block sound before that)
const rawLoaded=Promise.all(Object.entries(FILES).map(([k,u])=>fetch(u+'?v='+VER).then(r=>r.arrayBuffer()).then(b=>{RAW[k]=b}).catch(()=>{})));
function applyVolumes(){if(!AU.ctx)return;AU.mg.gain.value=settings().mv;AU.sg.gain.value=settings().sv}
function unlock(){
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!AU.ctx){
    AU.ctx=new C();AU.mg=AU.ctx.createGain();AU.sg=AU.ctx.createGain();
    AU.mg.connect(AU.ctx.destination);AU.sg.connect(AU.ctx.destination);applyVolumes();
    rawLoaded.then(()=>Object.keys(RAW).forEach(k=>AU.ctx.decodeAudioData(RAW[k].slice(0),b=>{AU.buf[k]=b;if(k==='menu'||k==='game')syncMusic()},()=>{})));
  }
  if(AU.ctx.state==='suspended')AU.ctx.resume();
}
function syncMusic(){
  if(!AU.ctx)return;
  const want=settings().music&&AU.buf[TRACK]?TRACK:null;
  if(AU.src&&AU.srcName!==want){try{AU.src.stop()}catch(e){}AU.src=null}
  if(want&&!AU.src){const s=AU.ctx.createBufferSource();s.buffer=AU.buf[want];s.loop=true;s.connect(AU.mg);s.start(0);AU.src=s;AU.srcName=want}
}
function sfx(name){
  if(!AU.ctx||!AU.buf[name]||!settings().sfx)return;
  const s=AU.ctx.createBufferSource();s.buffer=AU.buf[name];s.connect(AU.sg);s.start(0);
}
['pointerdown','click','touchend'].forEach(ev=>document.addEventListener(ev,unlock,true));
// button sounds: tile pick, restart button and a generic click for everything else
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest&&e.target.closest('button,label.btn,.card,.lv');
  if(!b||b.disabled||b.classList.contains('lock'))return;
  sfx(b.classList.contains('tile')?'tile':b.id==='restart'?'retry':'click');
},true);
// silence when the app goes to the background
document.addEventListener('visibilitychange',()=>{if(AU.ctx)document.hidden?AU.ctx.suspend():AU.ctx.resume()});