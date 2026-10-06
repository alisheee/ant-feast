// sync.js: sends the player's data (Telegram account, progress, settings) to the Google Sheet database
// Plain <script>, shared globals: load order matters (see index.html).
// Only runs inside Telegram (the server checks Telegram's signature) and only if SYNC_URL is set.

const inTelegram=()=>!!(tg&&tg.initData);
function snapshot(event){
  const s=settings(),progress={},P=persCat();
  CATS.filter(c=>!c.personal&&c.levels.length).forEach(c=>{progress[c.id]={done:doneOf(c),total:c.levels.length}});
  return{event,v:VER,initData:tg.initData,platform:tg.platform||'',tgv:tg.version||'',progress,personal:P?P.levels.length:0,
    music:s.music,sfx:s.sfx,vib:s.vib,mv:s.mv,sv:s.sv,theme:PROG.theme||'light'};
}
let syncTimer=0;
function syncNow(event){
  clearTimeout(syncTimer);
  if(!SYNC_URL||!inTelegram()||!CATS.length)return;
  try{fetch(SYNC_URL,{method:'POST',mode:'no-cors',keepalive:true,body:JSON.stringify(snapshot(event||'update'))}).catch(()=>{})}catch(e){}
}
// called whenever progress or settings are saved: send once things have calmed down
function syncSoon(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow('update'),4000)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)syncNow('hide')});
