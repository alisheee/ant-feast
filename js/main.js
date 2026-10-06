// main.js: прив'язка кнопок і запуск (підключається останнім)
// Підключається звичайним <script> (див. index.html): порядок файлів важливий, змінні спільні.

$('play').onclick=()=>{const c=curCat();playLevel(c,Math.min(doneOf(c),c.levels.length-1))};
$('tocat').onclick=()=>{renderCatalog();show('catalog')};
$('b1').onclick=goHome;$('b2').onclick=()=>{renderCatalog();show('catalog')};
$('profileBtn').onclick=openProfile;$('px').onclick=closeProfile;$('profile').onclick=e=>{if(e.target.id==='profile')closeProfile()};
$('gback').onclick=goHome;$('settingsBtn').onclick=openSettings;$('gset').onclick=openSettings;$('b4').onclick=closeSettings;$('settings').onclick=e=>{if(e.target.id==='settings')closeSettings()};
$('thL').onclick=()=>{setTheme('light');renderSettings()};$('thD').onclick=()=>{setTheme('dark');renderSettings()};
$('tgM').onclick=()=>{const s=settings();s.music=!s.music;saveProg();syncMusic();renderSettings()};
$('tgV').onclick=()=>{const s=settings();s.vib=!s.vib;saveProg();renderSettings();buzz('light')};
$('tgS').onclick=()=>{const s=settings();s.sfx=!s.sfx;saveProg();renderSettings()};
$('vM').oninput=e=>{settings().mv=e.target.value/100;applyVolumes()};$('vM').onchange=saveProg;
$('vS').oninput=e=>{settings().sv=e.target.value/100;applyVolumes()};$('vS').onchange=()=>{saveProg();sfx('click')};
const CHAT='https://t.me/pyataczka';
$('support').onclick=()=>{$('sup').style.display='flex'};$('supx').onclick=()=>{$('sup').style.display='none'};
document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>{tg&&tg.openTelegramLink?tg.openTelegramLink(CHAT):window.open(CHAT,'_blank')});
$('restart').onclick=()=>playLevel(cat,idx);
$('toup').onclick=openUpload;$('b3').onclick=goHome;$('psave').onclick=savePersonal;
$('sz').oninput=upd;$('nc').oninput=upd;
$('pf').onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();im.onload=()=>{IMG=im;upd()};im.onerror=()=>alert('Could not open the photo');im.src=URL.createObjectURL(f)};


paintIcons();
$('logoIcon').innerHTML=ANT.replace(/COL/g,'#e53935').replace('width="100%" height="100%"','width="20" height="34"');
(async()=>{
  try{CATS=await(await fetch('levels/index.json?v='+VER)).json()}
  catch(e){document.body.textContent='Could not load levels';return}
  await loadProg();applyTheme();AU.ready=true;applyVolumes();syncMusic();await loadPersonal();renderHome();show('home');syncNow('open');
})();