// game.js: game logic (level generation, tiles, slots, ants, win/lose)
// Plain <script>, shared globals: load order matters (see index.html).

let TICK=0;
const idx2=(W,x,y)=>(y+1)*(W+2)+(x+1);
// BFS over empty cells (outside the picture counts as empty). Returns step distances, -1 = unreachable.
function bfs(g,W,H,sx,sy){
  const D=new Int32Array((W+2)*(H+2)).fill(-1),q=[[sx,sy]];D[idx2(W,sx,sy)]=0;
  for(let h=0;h<q.length;h++){const[x,y]=q[h],d=D[idx2(W,x,y)];
    for(const[dx,dy]of N4){const a=x+dx,b=y+dy;
      if(a<-1||b<-1||a>W||b>H||D[idx2(W,a,b)]>=0)continue;
      if(a>=0&&b>=0&&a<W&&b<H&&g[b][a])continue;
      D[idx2(W,a,b)]=d+1;q.push([a,b])}}
  return D;
}
// A pixel is edible if it touches an empty cell that is reachable from outside (enclosed gaps don't count)
const acc=(g,W,H,D,x,y)=>!!g[y][x]&&N4.some(([dx,dy])=>D[idx2(W,x+dx,y+dy)]>=0);
// Generator: simulates a real game, so every level is solvable
function build(L){
  const r=rng(L.seed),map=L.map,H=map.length,W=map[0].length,mk=()=>map.map(s=>[...s].map(ch=>ch==='.'?null:ch)),g=mk();
  let left=g.flat().filter(Boolean).length;
  const total=left,seq=[],f=Math.max(1,total/250),mn=Math.round(L.min*f),mx=Math.round(L.max*f);
  while(left>0){
    const D=bfs(g,W,H,-1,-1),cells=[];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(acc(g,W,H,D,x,y))cells.push([x,y]);
    const cs=[...new Set(cells.map(([x,y])=>g[y][x]))],c=cs[Math.floor(r()*cs.length)];
    const mine=cells.filter(([x,y])=>g[y][x]===c).sort(()=>r()-.5);
    const k=Math.min(mine.length,mn+Math.floor(r()*(mx-mn+1)));
    for(let i=0;i<k;i++)g[mine[i][1]][mine[i][0]]=null;
    seq.push({c,n:k});left-=k;
  }
  const cols=Array.from({length:L.cols},()=>[]);
  seq.forEach(t=>cols[Math.floor(r()*L.cols)].push(t));
  return{W,H,cols,total,g:mk()};
}
function startGame(L){
  const b=build(L);CUR=L.pal;
  S={g:b.g,W:b.W,H:b.H,cols:b.cols,slots:Array(L.slots).fill(null),res:new Set(),ants:0,left:b.total,over:false,speed:0.17*Math.max(1,Math.min(3,b.total/800))};
  clearInterval(TICK);TICK=setInterval(tick,40);
  $('title').innerHTML=`${icon(cat.icon,18)}<span>${idx+1}/${cat.levels.length} · ${L.type}</span>`;
  $('ov').style.display='none';$('ants').innerHTML='';
  const bd=$('board');bd.innerHTML='';bd.style.gridTemplateColumns=`repeat(${S.W},1fr)`;cellEls=[];
  bd.style.width=Math.min(innerWidth*0.92,Math.max(300,Math.min(520,S.W*6)))+'px';
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){const d=document.createElement('div'),c=S.g[y][x];if(c){d.style.background=CUR[c];d.className='on'}cellEls.push(d);bd.appendChild(d)}
  const sl=$('slots');sl.innerHTML='';slotEls=[];
  for(let k=0;k<L.slots;k++){const d=document.createElement('div');d.className='slot';slotEls.push(d);sl.appendChild(d)}
  renderCols();renderSlots();fit();
}
// Shrink the whole play area so the full picture, slots and tiles fit on screen
function fit(){
  const st=$('stage');if(!st||!$('game').classList.contains('on'))return;
  st.style.transform='none';st.style.marginBottom='0';
  const top=st.getBoundingClientRect().top,h=st.offsetHeight,w=st.offsetWidth;
  const s=Math.min(1,(innerHeight-top-10)/(h||1),(innerWidth-12)/(w||1));
  st.style.transformOrigin='top center';st.style.transform=`scale(${s})`;st.style.marginBottom=-(h*(1-s))+'px';
}
addEventListener('resize',fit);
function renderCols(){
  const el=$('cols');el.innerHTML='';
  S.cols.forEach((col,ci)=>{
    const d=document.createElement('div');d.className='col';
    col.slice(0,3).forEach((t,k)=>{const b=document.createElement('button');b.className='tile'+(k?' lock':'');
      b.textContent=t.n;b.style.background=CUR[t.c];if(t.n>99)b.style.fontSize='13px';if(!k)b.onclick=()=>tap(ci);d.appendChild(b)});
    if(col.length>3){const m=document.createElement('div');m.className='more';m.textContent='+'+(col.length-3);d.appendChild(m)}
    el.appendChild(d)});
}
function renderSlots(){S.slots.forEach((t,i)=>{const e=slotEls[i];e.style.background=t?CUR[t.c]:'transparent';e.style.borderStyle=t?'solid':'dashed';e.style.fontSize=t&&t.n>99?'13px':'';e.textContent=t?t.n:''})}
function tap(ci){
  if(S.over)return;const col=S.cols[ci];if(!col.length)return;
  const si=S.slots.indexOf(null);if(si<0)return;
  const t=col.shift();t.next=0;t.iv=t.n<=20?260:Math.max(45,260*20/t.n);
  S.slots[si]=t;renderCols();renderSlots();check();
}
function slotCx(si){
  const a=slotEls[si].getBoundingClientRect(),c0=cellEls[0].getBoundingClientRect(),c1=cellEls[1].getBoundingClientRect();
  return Math.max(0,Math.min(S.W-1,Math.round((a.left+a.width/2-c0.left-c0.width/2)/(c1.left-c0.left))||0));
}
const dists=cx=>bfs(S.g,S.W,S.H,cx,S.H);
// nearest edible pixel of colour c (by walking distance); pixels already targeted by an ant are skipped
function pick(c,D){
  let best=null,bd=1e9;
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){
    if(S.g[y][x]!==c||S.res.has(y*S.W+x))continue;
    for(const[dx,dy]of N4){const d=D[idx2(S.W,x+dx,y+dy)];if(d>=0&&d<bd){bd=d;best=[x,y]}}}
  return best;
}
// Every tick each occupied slot may release ONE ant; the slot stays busy until its last ant has left
function tick(){
  if(!S||S.over)return;
  const now=performance.now();let acted=false;
  S.slots.forEach((t,i)=>{
    if(!t||now<t.next||S.ants>=150)return;
    const D=dists(slotCx(i)),p=pick(t.c,D);if(!p)return;
    sendAnt(i,p,t.c,D);t.n--;t.next=now+t.iv;acted=true;
    if(t.n<=0)S.slots[i]=null;
  });
  if(acted)renderSlots();
}
// walking path: from the start cell down the distance gradient back to the cell next to the target
function route(D,tx,ty){
  const W=S.W;let best=null,bd=1e9;
  for(const[dx,dy]of N4){const d=D[idx2(W,tx+dx,ty+dy)];if(d>=0&&d<bd){bd=d;best=[tx+dx,ty+dy]}}
  if(!best)return[];
  const out=[best];let[x,y]=best,d=bd;
  while(d>0){for(const[dx,dy]of N4){const a=x+dx,b=y+dy;if(a<-1||b<-1||a>W||b>S.H)continue;if(D[idx2(W,a,b)]===d-1){x=a;y=b;break}}out.push([x,y]);d--}
  return out.reverse();
}
const ANT='<svg viewBox="0 0 14 24" width="100%" height="100%"><g stroke="#1b1b1b" stroke-width="0.9" stroke-linecap="round"><path fill="none" d="M5.8 3L3.6 0.6M8.2 3L10.4 0.6M6.8 9L1.8 6.4M6.8 11L1.2 11.6M6.8 13L2.2 17.6M7.2 9L12.2 6.4M7.2 11L12.8 11.6M7.2 13L11.8 17.6"/><ellipse cx="7" cy="18.2" rx="3.4" ry="4.8" fill="COL"/><ellipse cx="7" cy="10.8" rx="2.4" ry="3" fill="COL"/><ellipse cx="7" cy="5.2" rx="2.7" ry="2.4" fill="COL"/></g></svg>';
function sendAnt(si,[x,y],c,D){
  S.res.add(y*S.W+x);S.ants++;
  const a=slotEls[si].getBoundingClientRect(),c0=cellEls[0].getBoundingClientRect(),c1=cellEls[1].getBoundingClientRect(),cw=cellEls[S.W].getBoundingClientRect();
  const ox=c0.left+c0.width/2,oy=c0.top+c0.height/2,sx=c1.left-c0.left,sy=cw.top-c0.top;
  const P=(i,k)=>[ox+i*sx,oy+k*sy],st=[a.left+a.width/2,a.top+a.height/2];
  const pts=[st,...route(D,x,y).map(([i,k])=>P(i,k)),P(x,y)];
  const cum=[0],A=[];
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1];cum.push(cum[i-1]+Math.hypot(dx,dy));
    let g=Math.hypot(dx,dy)<0.01?(A.length?A[A.length-1]:0):Math.atan2(dy,dx)*180/Math.PI+90;
    if(A.length){const p=A[A.length-1];while(g-p>180)g-=360;while(g-p<-180)g+=360}
    A.push(g);
  }
  const total=cum[cum.length-1]||1,sz=Math.max(18,Math.min(32,sx*3.4)),aw=sz*0.58;
  const e=document.createElement('div');e.className='ant';
  e.style.cssText=`left:${st[0]}px;top:${st[1]}px;width:${aw}px;height:${sz}px;margin:${-sz/2}px 0 0 ${-aw/2}px`;
  e.innerHTML=ANT.replace(/COL/g,CUR[c]);$('ants').appendChild(e);
  const fr=[];
  pts.forEach((p,i)=>{
    const off=cum[i]/total,tr=`translate(${p[0]-st[0]}px,${p[1]-st[1]}px)`;
    if(i>0)fr.push({transform:`${tr} rotate(${A[i-1]}deg)`,offset:off});
    fr.push({transform:`${tr} rotate(${A[Math.min(i,A.length-1)]}deg)`,offset:off});
  });
  const an=e.animate(fr,{duration:total/S.speed,easing:'linear',fill:'both'});
  an.onfinish=()=>{
    e.remove();S.g[y][x]=null;S.res.delete(y*S.W+x);S.ants--;S.left--;
    const cell=cellEls[y*S.W+x];cell.style.background='';cell.className='';
    check();
  };
}
function canMove(t,i){return pick(t.c,dists(slotCx(i)))!==null}
function check(){
  if(S.over||S.ants>0)return;
  if(S.left<=0)return end(true);
  const moving=S.slots.some((t,i)=>t&&canMove(t,i));
  if(!moving&&!(S.slots.includes(null)&&S.cols.some(c=>c.length)))end(false);
}
function end(win){
  S.over=true;clearInterval(TICK);const n=cat.levels.length;
  if(win){PROG.done[cat.id]=Math.max(doneOf(cat),idx+1);saveProg()}
  const next=win&&idx+1<n,hide=()=>{$('ov').style.display='none'};
  $('msg').textContent=win?'All eaten!':'Slots jammed';
  $('sub2').textContent=win?(next?'':'Category complete!'):'Try a different order.';
  $('act').textContent=win?(next?'Next':'Menu'):'Retry';
  $('act2').textContent=win&&!next?'Category':'Menu';
  $('act').onclick=()=>{hide();win?(next?playLevel(cat,idx+1):goHome()):playLevel(cat,idx)};
  $('act2').onclick=()=>{hide();win&&!next?openCat(cat):goHome()};
  $('ov').style.display='flex';
}
