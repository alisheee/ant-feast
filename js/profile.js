// profile.js: player profile window (Telegram account + progress)
// Plain <script>, shared globals: load order matters (see index.html).

const tgUser=()=>(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user)||null;
function renderProfile(){
  $('pSync').textContent='Sync status: '+syncStatus+' · game v'+VER;
  const u=tgUser(),name=u?[u.first_name,u.last_name].filter(Boolean).join(' '):'Guest';
  $('pName').textContent=name||'Player';
  $('pUser').textContent=u?(u.username?'@'+u.username:'ID '+u.id):'Open the game in Telegram to see your account';
  const av=$('pAv');av.innerHTML='';
  if(u&&u.photo_url){const im=new Image();im.referrerPolicy='no-referrer';im.alt='';im.src=u.photo_url;im.onerror=()=>{av.textContent=(name[0]||'?').toUpperCase()};av.appendChild(im)}
  else av.textContent=(name[0]||'?').toUpperCase();
  const box=$('pStats');box.innerHTML='';
  let done=0,total=0;
  CATS.filter(c=>!c.personal&&c.levels.length).forEach(c=>{
    const d=doneOf(c),n=c.levels.length;done+=d;total+=n;
    const r=document.createElement('div');r.className='prow';
    r.innerHTML=`<span class="em">${icon(c.icon,20)}</span><span class="ct"><b></b><i><u style="width:${d/n*100}%"></u></i></span><span>${d}/${n}</span>`;
    r.querySelector('b').textContent=c.name;box.appendChild(r)});
  const P=persCat(),h=document.createElement('div');h.className='ptot';
  h.textContent=`Levels completed: ${done}/${total}`+(P?` · Your photos: ${P.levels.length}`:'');
  box.prepend(h);
}
function openProfile(){renderProfile();$('profile').style.display='flex'}
function closeProfile(){$('profile').style.display='none'}