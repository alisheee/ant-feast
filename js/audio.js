// audio.js: background music + sound effects (Web Audio, so volume also works on iPhone)
// Plain <script>, shared globals: load order matters (see index.html).

const SET_DEF={music:true,sfx:true,vib:true,mv:0.35,sv:0.8};
const settings=()=>(PROG.set=Object.assign({},SET_DEF,PROG.set));
const AU={ctx:null,buf:{},mg:null,sg:null,src:null,tg:null,srcName:null,ready:false};
const FILES={menu:'audio/music.mp3',game:'audio/game.mp3',click:'audio/click.mp3',tile:'audio/tile.mp3',retry:'audio/retry.mp3',win:'audio/win.mp3',lose:'audio/lose.mp3',eat:'audio/eat.mp3',blocked:'audio/blocked.mp3'};
let TRACK='menu',musicTimer=0;const GAP=450;   // short silence (ms) between two songs
function setTrack(t){TRACK=t;syncMusic()}
function applyVolumes(){if(!AU.ctx)return;AU.mg.gain.value=settings().mv;AU.sg.gain.value=settings().sv}
// The audio context is created at once and every file is decoded as soon as it arrives,
// so the first tap only has to "unlock" it (browsers block sound before a tap).
(function(){
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  AU.ctx=new C();AU.mg=AU.ctx.createGain();AU.sg=AU.ctx.createGain();
  AU.mg.connect(AU.ctx.destination);AU.sg.connect(AU.ctx.destination);applyVolumes();
  Object.entries(FILES).forEach(([k,u])=>fetch(u+'?v='+VER).then(r=>r.arrayBuffer())
    .then(b=>AU.ctx.decodeAudioData(b,buf=>{AU.buf[k]=buf;if(k==='menu'||k==='game')syncMusic()},()=>{})).catch(()=>{}));
})();
function unlock(){if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume().then(syncMusic).catch(()=>{})}
function startTrack(){
  musicTimer=0;
  const want=settings().music&&AU.buf[TRACK]?TRACK:null;
  if(!want||AU.src)return;
  const s=AU.ctx.createBufferSource(),g=AU.ctx.createGain(),t=AU.ctx.currentTime;
  s.buffer=AU.buf[want];s.loop=true;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+0.25);
  s.connect(g);g.connect(AU.mg);s.start(0);AU.src=s;AU.tg=g;AU.srcName=want;AU.t0=t;
}
function syncMusic(){
  if(!AU.ctx||!AU.ready)return;
  const want=settings().music&&AU.buf[TRACK]?TRACK:null;
  if(want===AU.srcName&&!musicTimer)return;
  if(AU.src&&AU.srcName!==want){            // fade the old song out, then a short silence before the next one
    const s=AU.src,g=AU.tg,t=AU.ctx.currentTime,heard=t-(AU.t0||0)>0.4;AU.src=null;AU.srcName=null;
    if(!heard){try{s.stop()}catch(e){}clearTimeout(musicTimer);musicTimer=0;if(want)startTrack();return}   // the old song never played yet: no pause needed
    try{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0,t+0.15);s.stop(t+0.2)}catch(e){}
    clearTimeout(musicTimer);musicTimer=want?setTimeout(startTrack,GAP):0;return;
  }
  if(want&&!AU.src){if(!musicTimer)startTrack()}   // first start: no pause
  else if(!want){clearTimeout(musicTimer);musicTimer=0}
}
const SFX_VOL={eat:0.6},SFX_GAP={eat:70},LAST={};   // eat: quieter and at most one sound per 70 ms (many ants at once)
function sfx(name){
  if(!AU.ctx||!AU.buf[name]||!settings().sfx)return;
  const now=performance.now();if(SFX_GAP[name]&&now-(LAST[name]||0)<SFX_GAP[name])return;LAST[name]=now;
  const s=AU.ctx.createBufferSource(),g=AU.ctx.createGain();s.buffer=AU.buf[name];g.gain.value=SFX_VOL[name]||1;
  s.connect(g);g.connect(AU.sg);s.start(0);
}
// light vibration: Telegram haptics inside Telegram, the browser Vibration API elsewhere (can be switched off in settings)
function buzz(kind){
  if(!settings().vib)return;
  if(kind==='tick'){const now=performance.now();if(now-(LAST.tick||0)<90)return;LAST.tick=now}   // pixel eaten: very light, at most every 90 ms
  try{
    if(tg&&tg.initData&&tg.HapticFeedback){kind==='tick'?tg.HapticFeedback.impactOccurred('soft'):kind==='light'?tg.HapticFeedback.impactOccurred('light'):tg.HapticFeedback.notificationOccurred(kind)}
    else if(navigator.vibrate)navigator.vibrate(kind==='tick'?6:kind==='light'?10:kind==='success'?[15,40,15]:25);
  }catch(e){}
}
['pointerdown','click','touchend'].forEach(ev=>document.addEventListener(ev,unlock,true));
// button sounds: tile pick, restart button and a generic click for everything else
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest&&e.target.closest('button,label.btn,.card,.lv');
  if(!b||b.disabled)return;
  if(b.classList.contains('lock')){if(b.classList.contains('tile')){sfx('blocked');buzz('warning')}return}   // greyed tile: only the 'blocked' sound
  const full=S&&!S.over&&!S.slots.includes(null);   // every slot is busy: the tile cannot be taken
  sfx(b.classList.contains('tile')?(full?'blocked':'tile'):b.id==='restart'?'retry':'click');
},true);
// silence when the app goes to the background
document.addEventListener('visibilitychange',()=>{if(AU.ctx)document.hidden?AU.ctx.suspend():AU.ctx.resume()});