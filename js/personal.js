// personal.js: «Особисте»: фото -> піксельна сітка, збереження своїх рівнів
// Підключається звичайним <script> (див. index.html): порядок файлів важливий, змінні спільні.

// ---- особисті фото: сховище, перетворення фото на піксельну сітку ----
const MAXP=10,TOL=40;
const kvSet=(k,v)=>new Promise(r=>{try{useTg()?tg.CloudStorage.setItem(k,v,()=>r()):(localStorage.setItem(k,v),r())}catch(e){r()}});
const kvGet=k=>new Promise(r=>{try{useTg()?tg.CloudStorage.getItem(k,(e,v)=>r(v||null)):r(localStorage.getItem(k))}catch(e){r(null)}});
const kvDel=k=>new Promise(r=>{try{useTg()?tg.CloudStorage.removeItem(k,()=>r()):(localStorage.removeItem(k),r())}catch(e){r()}});
const enc=d=>`${d.w},${d.h};${d.palette.map(h=>h.slice(1)).join('|')};${d.pixels.flat().map(v=>v<0?'.':v.toString(36)).join('')}`;
function dec(s){const[a,b,c]=s.split(';'),[w,h]=a.split(',').map(Number),px=[...c].map(ch=>ch==='.'?-1:parseInt(ch,36)),pixels=[];
  for(let y=0;y<h;y++)pixels.push(px.slice(y*w,(y+1)*w));return{w,h,palette:b.split('|').map(x=>'#'+x),pixels}}
const autoDiff=d=>{const m=Math.max(d.w,d.h),c=d.palette.length;return c<=4&&m<=12?'easy':c<=6&&m<=20?'mid':'hard'};
// Telegram cloud values are limited to ~4 KB, so big grids are stored in chunks
const CH=3800;
async function kvSetBig(k,s){const p=s.match(new RegExp('[^]{1,'+CH+'}','g'))||[''];await kvSet(k,p.length+':'+p[0]);for(let i=1;i<p.length;i++)await kvSet(k+'_'+i,p[i])}
async function kvGetBig(k){const f=await kvGet(k);if(!f)return null;const m=f.match(/^(\d+):([^]*)$/);if(!m)return f;let s=m[2];for(let i=1;i<+m[1];i++)s+=(await kvGet(k+'_'+i))||'';return s}
async function kvDelBig(k){const f=await kvGet(k),m=f&&f.match(/^(\d+):/);await kvDel(k);for(let i=1;i<(m?+m[1]:1);i++)await kvDel(k+'_'+i)}
const persCat=()=>CATS.find(c=>c.personal);
async function loadPersonal(){
  const P={id:'personal',name:'Personal',icon:'camera',personal:true,levels:[]};
  try{for(const id of JSON.parse(await kvGet('pl')||'[]')){const s=await kvGetBig('p_'+id);if(s)P.levels.push({pid:id,data:dec(s)})}}catch(e){}
  CATS.unshift(P);
}
async function savePersonal(){
  const P=persCat();
  if(P.levels.length>=MAXP)return alert('Limit: '+MAXP+' photos. Delete one in Personal first.');
  const id=Date.now().toString(36),s=enc(RES);
  await kvSetBig('p_'+id,s);await kvSet('pl',JSON.stringify(P.levels.map(l=>l.pid).concat(id)));
  P.levels.push({pid:id,data:RES});delMode=false;openCat(P);
}
async function delPersonal(i){
  const P=persCat(),id=P.levels[i].pid;await kvDelBig('p_'+id);P.levels.splice(i,1);
  await kvSet('pl',JSON.stringify(P.levels.map(l=>l.pid)));if(!P.levels.length)delMode=false;openCat(P);
}
function kmeans(pts,k){
  const dist=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  const u=[...new Map(pts.map(p=>{const r=p.map(Math.round);return[r.join(),r]})).values()];
  k=Math.min(k,u.length);
  const C=[[0,1,2].map(i=>pts.reduce((a,p)=>a+p[i],0)/pts.length)];
  while(C.length<k){let best=u[0],bd=-1;for(const p of u){const dd=Math.min(...C.map(c=>dist(p,c)));if(dd>bd){bd=dd;best=p}}C.push(best.slice())}
  let lab=[];
  for(let it=0;it<12;it++){
    lab=pts.map(p=>{let bi=0,bd=1e18;C.forEach((c,i)=>{const dd=dist(p,c);if(dd<bd){bd=dd;bi=i}});return bi});
    C.forEach((c,i)=>{const m=pts.filter((_,j)=>lab[j]===i);if(m.length)C[i]=[0,1,2].map(t=>m.reduce((a,p)=>a+p[t],0)/m.length)});
  }
  return{lab,C:C.map(c=>c.map(Math.round))};
}
function clean(g){
  const o=g.map(r=>r.slice());
  g.forEach((row,y)=>row.forEach((c,x)=>{if(c<0)return;
    const nb=N4.map(([dx,dy])=>g[y+dy]?.[x+dx]).filter(v=>v>=0);
    if(nb.length&&!nb.includes(c)){const n={};nb.forEach(v=>n[v]=(n[v]||0)+1);o[y][x]=+Object.keys(n).sort((a,b)=>n[b]-n[a])[0]}}));
  return o;
}
// фото -> {w,h,palette,pixels}; фон прибирається автоматично (прозорість або однотонний фон)
function pix(img,size,nc){
  const sc=Math.min(1,400/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*sc)),h=Math.max(1,Math.round(img.naturalHeight*sc));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,w,h);
  const d=cx.getImageData(0,0,w,h).data,N=w*h,mask=new Uint8Array(N);
  let hasA=false;for(let i=0;i<N;i++)if(d[i*4+3]<250){hasA=true;break}
  if(hasA){for(let i=0;i<N;i++)mask[i]=d[i*4+3]>128?1:0}
  else{
    const cs=[0,w-1,(h-1)*w,N-1],bg=[0,1,2].map(k=>{const v=cs.map(i=>d[i*4+k]).sort((a,b)=>a-b);return(v[1]+v[2])/2});
    const sim=i=>Math.abs(d[i*4]-bg[0])+Math.abs(d[i*4+1]-bg[1])+Math.abs(d[i*4+2]-bg[2])<=TOL*1.5+10;
    const isbg=new Uint8Array(N),q=[],push=i=>{if(!isbg[i]&&sim(i)){isbg[i]=1;q.push(i)}};
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
    while(q.length){const i=q.pop(),x=i%w,y=(i/w)|0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(y>0)push(i-w);if(y<h-1)push(i+w)}
    for(let i=0;i<N;i++)mask[i]=isbg[i]?0:1;
  }
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return null;
  const bw=x1-x0+1,bh=y1-y0+1,gw=bw>=bh?size:Math.max(1,Math.round(size*bw/bh)),gh=bw>=bh?Math.max(1,Math.round(size*bh/bw)):size;
  const cells=[],pts=[];
  for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
    const xs=Math.floor(x0+gx*bw/gw),xe=Math.max(xs+1,Math.floor(x0+(gx+1)*bw/gw)),ys=Math.floor(y0+gy*bh/gh),ye=Math.max(ys+1,Math.floor(y0+(gy+1)*bh/gh));
    let r=0,g=0,b=0,n=0,t=0;
    for(let y=ys;y<ye&&y<h;y++)for(let x=xs;x<xe&&x<w;x++){t++;const i=y*w+x;if(mask[i]){n++;r+=d[i*4];g+=d[i*4+1];b+=d[i*4+2]}}
    if(t&&n/t>0.5){cells.push(pts.length);pts.push([r/n,g/n,b/n])}else cells.push(-1);
  }
  if(!pts.length)return null;
  const{lab,C}=kmeans(pts,nc),used=[...new Set(lab)].sort((a,b)=>a-b),mp=new Map(used.map((o,i)=>[o,i]));
  let grid=[];for(let gy=0;gy<gh;gy++){const row=[];for(let gx=0;gx<gw;gx++){const c=cells[gy*gw+gx];row.push(c<0?-1:mp.get(lab[c]))}grid.push(row)}
  return{w:gw,h:gh,palette:used.map(i=>'#'+C[i].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')),pixels:clean(grid)};
}
let IMG=null,RES=null;
function openUpload(){$('pf').value='';IMG=null;RES=null;$('pv').style.display='none';$('psave').disabled=true;$('pinfo').textContent='';show('upload')}
function upd(){
  $('szv').textContent=$('sz').value;$('ncv').textContent=$('nc').value;if(!IMG)return;
  const d=pix(IMG,+$('sz').value,+$('nc').value);
  if(!d){RES=null;$('psave').disabled=true;$('pv').style.display='none';$('pinfo').textContent='Could not find an object in the photo. Try another one.';return}
  RES=d;const cs=Math.max(4,Math.min(14,Math.floor(300/Math.max(d.w,d.h)))),cv=$('pv'),ctx=cv.getContext('2d');
  cv.width=d.w*cs;cv.height=d.h*cs;cv.style.display='block';
  d.pixels.forEach((r,y)=>r.forEach((v,x)=>{if(v>=0){ctx.fillStyle=d.palette[v];ctx.fillRect(x*cs,y*cs,cs-1,cs-1)}}));
  const n=d.pixels.flat().filter(v=>v>=0).length;
  $('pinfo').textContent=`${d.w}×${d.h}, colours: ${d.palette.length}, pixels: ${n}, difficulty: ${autoDiff(d)}`+(n>2500?'. The game will be very long.':'');
  $('psave').disabled=false;
}
