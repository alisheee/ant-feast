// settings.js: settings screen (theme, music, sound effects, volume)
// Plain <script>, shared globals: load order matters (see index.html).

function renderSettings(){
  const s=settings(),dk=isDark();
  $('thL').classList.toggle('on',!dk);$('thD').classList.toggle('on',dk);
  $('tgM').classList.toggle('on',s.music);$('tgS').classList.toggle('on',s.sfx);
  $('vM').value=Math.round(s.mv*100);$('vS').value=Math.round(s.sv*100);
}
