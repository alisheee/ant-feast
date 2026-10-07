// profile.js: player profile window (Telegram account + progress)
// Plain <script>, shared globals: load order matters (see index.html).

const tgUser=()=>(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user)||null;
function renderProfile(){
  const u=tgUser(),name=u?[u.first_name,u.last_name].filter(Boolean).join(' '):'Guest';
  $('pName').textContent=name||'Player';
  $('pUser').textContent=u?(u.username?'@'+u.username:'ID '+u.id):'Open the game in Telegram to see your account';
  const av=$('pAv');av.innerHTML='';
  if(u&&u.photo_url){const im=new Image();im.referrerPolicy='no-referrer';im.alt='';im.src=u.photo_url;im.onerror=()=>{av.textContent=(name[0]||'?').toUpperCase()};av.appendChild(im)}
  else av.textContent=(name[0]||'?').toUpperCase();
  const box=$('pStats');box.innerHTML='';
  let done=0,total=0;
  CATS.filter(c=>!c.personal&&c.levels.length).forEach(c=>{done+=doneOf(c);total+=c.levels.length});
  const P=persCat(),h=document.createElement('div');h.className='ptot';
  h.textContent=`Levels completed: ${done}/${total}`+(P?` · Your photos: ${P.levels.length}`:'');
  box.prepend(h);
}
function openProfile(){renderProfile();$('profile').style.display='flex'}
function closeProfile(){$('profile').style.display='none'}