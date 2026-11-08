(() => {
  'use strict';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const TILE=32,W=220,H=38;
  const T={AIR:0,GRASS:1,DIRT:2,STONE:3,LOG:4,LEAVES:5,PLANK:6,FLOWER:7,ORE:8};
  const info={1:{name:'Meadow turf',color:'#72b956'},2:{name:'Earth',color:'#a9784e'},3:{name:'Fieldstone',color:'#87949a'},4:{name:'Sunwood log',color:'#a96f43'},5:{name:'Canopy',color:'#4c9e61'},6:{name:'Wood planks',color:'#ca9b5b'},7:{name:'Wild bloom',color:'#ec8ca1'},8:{name:'Copper ore',color:'#c77d57'}};
  const ids=[T.DIRT,T.GRASS,T.LOG,T.PLANK,T.STONE,T.LEAVES,T.FLOWER,T.ORE];
  let world=Array.from({length:W},()=>Array(H).fill(T.AIR)),tops=[],seed=418,dayTime=.16,day=1,elapsed=0,last=0;
  let inv={[T.DIRT]:12,[T.GRASS]:0,[T.LOG]:0,[T.PLANK]:0,[T.STONE]:0,[T.LEAVES]:0,[T.FLOWER]:0,[T.ORE]:0};
  let selected=T.DIRT, cameraX=0,cameraY=0,keys={},touch={},mouse={x:0,y:0,down:false,button:0},target=null,mining=0;
  let health=100,food=100,woodGoal=0,started=false,toastTimer=0,muted=false;
  let player={x:8*TILE+TILE/2,y:0,w:21,h:44,vx:0,vy:0,onGround:false,face:1,walk:0,invuln:0},clouds=[];
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<16;i++)clouds.push({x:rand()*W*TILE,y:88+rand()*195,s:.65+rand()*1.05,v:3+rand()*9});
  function generate(){let h=18;for(let x=0;x<W;x++){h+=(rand()-.5)*.8;h=Math.max(14,Math.min(23,h));let top=Math.round(h);tops[x]=top;for(let y=top;y<H;y++)world[x][y]=y===top?T.GRASS:y<top+4?T.DIRT:(rand()<.035&&y>top+5?T.ORE:T.STONE);
      if(x>4&&x<W-5&&rand()<.075&&Math.abs(top-tops[x-1])<2){let trunk=3+Math.floor(rand()*2);for(let n=1;n<=trunk;n++)world[x][top-n]=T.LOG;for(let dy=-2;dy<=1;dy++)for(let dx=-2;dx<=2;dx++){let xx=x+dx,yy=top-trunk+dy;if(xx>=0&&xx<W&&yy>=0&&yy<H&&Math.abs(dx)+Math.abs(dy)<5&&world[xx][yy]===T.AIR)world[xx][yy]=T.LEAVES;}}
      else if(x>2&&rand()<.12)world[x][top-1]=T.FLOWER;}
    for(let x=5;x<15;x++)for(let y=0;y<tops[x];y++)if(world[x][y]===T.LOG||world[x][y]===T.LEAVES)world[x][y]=T.AIR;
    for(let x=0;x<W;x++)if(x%17===7&&tops[x]===tops[x-1])world[x][tops[x]-1]=T.STONE;
  }
  generate();
  function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
  addEventListener('resize',resize);resize();
  function showToast(text){let el=document.getElementById('toast');el.textContent=text;el.classList.add('show');toastTimer=2.1;}
  function save(){try{localStorage.setItem('blockwild-save-v1',JSON.stringify({world,inv,player:{x:player.x,y:player.y},health,food,day,dayTime,woodGoal}));}catch(e){}}
  function load(){try{let s=JSON.parse(localStorage.getItem('blockwild-save-v1')||'null');if(s&&s.world?.length===W){world=s.world;inv={...inv,...s.inv};player.x=s.player.x;player.y=s.player.y;health=s.health;food=s.food;day=s.day||1;dayTime=s.dayTime||.16;woodGoal=s.woodGoal||0;return true;}}catch(e){}return false;}
  const hadSave=load();
  function drawIcon(c,id){let g=c.getContext('2d');g.clearRect(0,0,40,40);g.imageSmoothingEnabled=false;let x=7,y=7,s=26;
    if(id===T.FLOWER){g.fillStyle='#538d50';g.fillRect(19,18,3,14);g.fillStyle='#79b85b';g.fillRect(15,24,5,3);g.fillStyle='#e98ca1';[[17,12],[22,12],[15,17],[20,17],[18,15]].forEach(p=>g.fillRect(p[0],p[1],5,5));g.fillStyle='#f8d76b';g.fillRect(18,16,4,4);return;}
    if(id===T.LOG){g.fillStyle='#885632';g.fillRect(x+4,y,s-8,s);g.fillStyle='#b9814c';g.fillRect(x+7,y+1,s-14,s-2);g.fillStyle='#d5a26c';g.fillRect(x+10,y+3,4,s-6);g.fillStyle='#795037';g.fillRect(x+4,y,s-8,4);g.fillRect(x+4,y+s-4,s-8,4);return;}
    let colors={1:['#70b857','#a9784e'],2:['#a9784e','#8d6243'],3:['#929da0','#778489'],4:['#ca9b5b','#a67845'],5:['#4c9e61','#3e8752'],6:['#c99a5c','#b5824a'],8:['#87949a','#c77d57']},cc=colors[id]||colors[2];g.fillStyle=cc[1];g.fillRect(x,y,s,s);g.fillStyle=cc[0];g.fillRect(x,y,s,id===T.GRASS?8:5);
    if(id===T.GRASS){g.fillStyle='#a9784e';g.fillRect(x,y+8,s,s-8);g.fillStyle='#80c260';g.fillRect(x+2,y+2,7,3);g.fillRect(x+16,y+1,5,4);}else if(id===T.PLANK){g.fillStyle='#e0b873';g.fillRect(x+2,y+9,s-4,2);g.fillRect(x+2,y+18,s-4,2);g.fillRect(x+14,y+3,2,6);g.fillRect(x+24,y+12,2,6);g.fillRect(x+9,y+21,2,5);}else if(id===T.STONE||id===T.ORE){g.fillStyle='#aeb8b7';g.fillRect(x+4,y+9,4,3);g.fillRect(x+18,y+16,5,3);g.fillStyle='#75848a';g.fillRect(x+8,y+20,5,3);if(id===T.ORE){g.fillStyle='#d3895b';g.fillRect(x+5,y+5,5,4);g.fillRect(x+18,y+12,5,4);g.fillRect(x+12,y+23,4,3);}}else if(id===T.LEAVES){g.fillStyle='#64b26b';g.fillRect(x+3,y+3,7,5);g.fillRect(x+16,y+7,7,5);g.fillRect(x+7,y+18,8,5);g.fillStyle='#367b4b';g.fillRect(x+19,y+21,5,4);}else{g.fillStyle='#986942';g.fillRect(x+5,y+12,4,3);g.fillRect(x+20,y+20,3,4);}g.strokeStyle='rgba(35,52,43,.18)';g.strokeRect(x+.5,y+.5,s-1,s-1);
  }
  function makeSlot(item,key,large=false){let b=document.createElement('button');b.className=large?'inv-item':'slot';b.dataset.item=item;if(!large)b.innerHTML=`<small class="slot-key">${key}</small><canvas width="40" height="40"></canvas><span class="slot-count"></span><span class="slot-name">${info[item].name}</span>`;else b.innerHTML=`<small>${info[item].name}</small><canvas width="40" height="40"></canvas><span></span>`;drawIcon(b.querySelector('canvas'),item);return b;}
  let hotbar=document.getElementById('hotbar'),invGrid=document.getElementById('inventory-grid'),slots={};
  ids.forEach((id,i)=>{let b=makeSlot(id,i+1);b.addEventListener('click',()=>select(id));hotbar.append(b);slots[id]=b;let item=makeSlot(id,'',true);item.addEventListener('click',()=>{select(id);closeBag();});invGrid.append(item);});
  function select(id){selected=id;refreshUI();}
  function refreshUI(){Object.entries(slots).forEach(([id,b])=>{b.classList.toggle('selected',+id===selected);b.querySelector('.slot-count').textContent=inv[id]>0?inv[id]:'';});invGrid.querySelectorAll('.inv-item').forEach(b=>b.querySelector('span').textContent=inv[b.dataset.item]||0);document.getElementById('craft-btn').disabled=inv[T.LOG]<1;}
  refreshUI();

  function tileAt(tx,ty){if(tx<0||tx>=W||ty>=H)return T.STONE;if(ty<0)return T.AIR;return world[tx][ty];}
  function solid(id){return id!==T.AIR&&id!==T.FLOWER;}
  function collide(x,y){let l=Math.floor((x-player.w/2)/TILE),r=Math.floor((x+player.w/2-1)/TILE),t=Math.floor(y/TILE),b=Math.floor((y+player.h-1)/TILE);for(let tx=l;tx<=r;tx++)for(let ty=t;ty<=b;ty++)if(solid(tileAt(tx,ty)))return true;return false;}
  function movePlayer(dt){let axis=(keys.KeyA||keys.ArrowLeft||touch.left? -1:0)+(keys.KeyD||keys.ArrowRight||touch.right?1:0);player.vx=axis*188;if(axis)player.face=axis;player.x+=player.vx*dt;if(player.vx&&collide(player.x,player.y)){let step=Math.sign(player.vx),guard=0;while(collide(player.x,player.y)&&guard++<TILE)player.x-=step;player.vx=0;}player.onGround=false;player.vy=Math.min(620,player.vy+1200*dt);player.y+=player.vy*dt;if(collide(player.x,player.y)){let step=Math.sign(player.vy)||1,guard=0;while(collide(player.x,player.y)&&guard++<TILE)player.y-=step;if(step>0)player.onGround=true;player.vy=0;}player.walk+=Math.abs(player.vx)*dt/23;if(player.y>H*TILE){player.y=0;player.vy=0;health=Math.max(1,health-15);}
    if((keys.Space||keys.KeyW||keys.ArrowUp||touch.jump)&&player.onGround){player.vy=-430;player.onGround=false;}
    if(player.invuln>0)player.invuln-=dt;
  }
  function worldPoint(){return {x:mouse.x+cameraX,y:mouse.y+cameraY};}
  function canReach(tx,ty){let px=player.x,py=player.y+player.h*.46;return Math.hypot((tx+.5)*TILE-px,(ty+.5)*TILE-py)<TILE*5.2;}
  function updateTarget(){let p=worldPoint(),tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);if(tx>=0&&tx<W&&ty>=0&&ty<H&&canReach(tx,ty)&&tileAt(tx,ty)!==T.AIR){let progress=target&&target.x===tx&&target.y===ty?target.progress||0:0;target={x:tx,y:ty,progress};}else target=null;}
  function mineTile(){if(!target)return;let id=world[target.x][target.y];if(id===T.AIR)return;world[target.x][target.y]=T.AIR;let drop=id===T.ORE?T.ORE:id===T.FLOWER?T.FLOWER:id;inv[drop]=(inv[drop]||0)+1;if(id===T.LOG){woodGoal++;if(woodGoal>=5){document.getElementById('quest-title').textContent='A tiny forest, yours';document.getElementById('quest-subtitle').textContent='Craft planks and build a cozy nook.';}}refreshUI();if(id===T.ORE)showToast('Copper! A little treasure for later.');save();}
  function placeBlock(){let p=worldPoint(),tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);if(tx<0||tx>=W||ty<0||ty>=H||!canReach(tx,ty))return;if(world[tx][ty]!==T.AIR||inv[selected]<=0)return;let cx=(tx+.5)*TILE,cy=(ty+.5)*TILE;if(Math.abs(cx-player.x)<player.w*.5+TILE*.49&&cy>player.y&&cy<player.y+player.h)return;world[tx][ty]=selected;inv[selected]--;refreshUI();save();}
  function drawBackground(w,h,dt){let phase=(Math.sin(dayTime*Math.PI*2-Math.PI/2)+1)/2;let night=1-phase;let sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,`rgb(${Math.round(123+94*phase)},${Math.round(180+48*phase)},${Math.round(207+29*phase)})`);sky.addColorStop(1,`rgb(${Math.round(190+36*phase)},${Math.round(221+27*phase)},${Math.round(207+19*phase)})`);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // Distant rolling hills
    for(let layer=0;layer<3;layer++){let base=h*.68+layer*42;ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,base);for(let x=0;x<=w+10;x+=10){let xx=x+cameraX*(.12+layer*.09);let yy=base- Math.sin(xx*.002+layer*2)*35-Math.sin(xx*.008+layer)*12;ctx.lineTo(x,yy);}ctx.lineTo(w,h);ctx.closePath();ctx.fillStyle=['#a4d5c0','#83c2a2','#6cac87'][layer];ctx.globalAlpha=.35+layer*.12;ctx.fill();ctx.globalAlpha=1;}
    let sx=w*(.78-.48*dayTime), sy=92+Math.sin(dayTime*6.28)*25;ctx.fillStyle=`rgba(255,244,183,${.8+phase*.18})`;ctx.beginPath();ctx.arc(sx,sy,26,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,250,217,.25)';ctx.beginPath();ctx.arc(sx,sy,38,0,Math.PI*2);ctx.fill();
    clouds.forEach(c=>{c.x+=c.v*dt;if(c.x-cameraX> w+150)c.x=cameraX-200;let x=c.x-cameraX*.22,y=c.y;ctx.fillStyle=`rgba(255,255,255,${.24+phase*.4})`;ctx.beginPath();ctx.ellipse(x,y,36*c.s,10*c.s,0,0,Math.PI*2);ctx.ellipse(x-14*c.s,y+1,19*c.s,9*c.s,0,0,Math.PI*2);ctx.ellipse(x+13*c.s,y-5,20*c.s,13*c.s,0,0,Math.PI*2);ctx.fill();});
    if(night>.35){ctx.fillStyle=`rgba(20,37,62,${night*.27})`;ctx.fillRect(0,0,w,h);for(let i=0;i<30;i++){let x=(i*137-cameraX*.03)%w,y=(i*71)%Math.max(1,h*.5);ctx.fillStyle=`rgba(255,255,220,${night*.7})`;ctx.fillRect((x+w)%w,y,2,2);}}
  }
  function drawTile(tx,ty,id){let x=tx*TILE-cameraX,y=ty*TILE-cameraY;ctx.fillStyle=info[id]?.color||'#aaa';ctx.fillRect(x,y,TILE,TILE);
    if(id===T.GRASS){ctx.fillStyle='#82c765';ctx.fillRect(x,y,TILE,7);ctx.fillStyle='#9bd777';ctx.fillRect(x+3,y+1,8,2);ctx.fillRect(x+19,y+2,5,2);ctx.fillStyle='#8c6242';ctx.fillRect(x+5,y+13,5,3);ctx.fillRect(x+20,y+23,4,3);ctx.fillStyle='#b17f53';ctx.fillRect(x+14,y+11,3,2);}
    else if(id===T.DIRT){ctx.fillStyle='#b7855a';ctx.fillRect(x+4,y+6,5,3);ctx.fillStyle='#8e6243';ctx.fillRect(x+20,y+19,5,3);ctx.fillRect(x+9,y+25,3,2);}
    else if(id===T.STONE||id===T.ORE){ctx.fillStyle='#aab4b4';ctx.fillRect(x+4,y+7,7,3);ctx.fillRect(x+19,y+15,6,3);ctx.fillStyle='#748287';ctx.fillRect(x+10,y+23,5,3);ctx.fillRect(x+23,y+5,3,2);if(id===T.ORE){ctx.fillStyle='#ca8057';ctx.fillRect(x+5,y+17,5,5);ctx.fillRect(x+20,y+6,5,5);ctx.fillRect(x+15,y+25,4,4);}}
    else if(id===T.LOG){ctx.fillStyle='#855430';ctx.fillRect(x+6,y,TILE-12,TILE);ctx.fillStyle='#c38b52';ctx.fillRect(x+10,y+1,5,TILE-2);ctx.fillStyle='#9b673d';ctx.fillRect(x+19,y+2,5,TILE-4);ctx.fillStyle='#d2a16b';ctx.fillRect(x+11,y+3,2,TILE-6);}
    else if(id===T.PLANK){ctx.fillStyle='#e1b976';ctx.fillRect(x+2,y+8,TILE-4,2);ctx.fillRect(x+2,y+19,TILE-4,2);ctx.fillStyle='#a97b49';ctx.fillRect(x+9,y+2,2,6);ctx.fillRect(x+23,y+10,2,9);ctx.fillRect(x+14,y+21,2,9);}
    else if(id===T.LEAVES){ctx.fillStyle='#67b86e';ctx.fillRect(x+3,y+4,7,5);ctx.fillRect(x+18,y+11,8,6);ctx.fillRect(x+7,y+22,8,5);ctx.fillStyle='#398552';ctx.fillRect(x+16,y+3,5,4);ctx.fillRect(x+3,y+17,4,5);}
    else if(id===T.FLOWER){ctx.fillStyle='#589650';ctx.fillRect(x+15,y+14,3,18);ctx.fillRect(x+10,y+22,6,3);ctx.fillStyle='#e993a2';ctx.fillRect(x+12,y+7,5,6);ctx.fillRect(x+18,y+10,5,5);ctx.fillRect(x+9,y+12,5,5);ctx.fillStyle='#f6d16e';ctx.fillRect(x+14,y+11,5,5);}
    ctx.strokeStyle='rgba(37,54,49,.09)';ctx.strokeRect(x+.5,y+.5,TILE-1,TILE-1);
  }
  function drawPlayer(){let x=player.x-cameraX,y=player.y-cameraY,step=Math.sin(player.walk)*3,flip=player.face<0;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.fillStyle='rgba(43,65,57,.16)';ctx.beginPath();ctx.ellipse(0,player.h+1,14,4,0,0,7);ctx.fill();
    // Little explorer: moss jacket, mustard scarf and a very oversized backpack.
    let leg=player.onGround?step:0;ctx.fillStyle='#384e50';ctx.fillRect(-8,31+leg,7,12-leg);ctx.fillRect(2,31-leg,7,12+leg);ctx.fillStyle='#dcaa70';ctx.fillRect(-9,41+leg,9,3);ctx.fillRect(1,41+leg,9,3);
    ctx.fillStyle='#cd8b5e';ctx.fillRect(-10,14,21,19);ctx.fillStyle='#739b58';ctx.fillRect(-8,16,17,16);ctx.fillStyle='#e8bd68';ctx.fillRect(-8,16,17,4);ctx.fillStyle='#446b4d';ctx.fillRect(7,19,6,13);ctx.fillStyle='#d49b69';ctx.fillRect(-10,3,21,15);ctx.fillStyle='#536d50';ctx.fillRect(-12,0,24,7);ctx.fillRect(-10,-3,20,5);ctx.fillStyle='#f3d37e';ctx.fillRect(-10,8,21,3);ctx.fillStyle='#263e45';ctx.fillRect(3,9,3,4);ctx.fillStyle='#fff3d4';ctx.fillRect(4,9,1,1);ctx.fillStyle='#bc7655';ctx.fillRect(-8,13,6,2);
    if(mouse.down&&target&&player.walk%2<1){ctx.strokeStyle='#a8754d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(10,20);ctx.lineTo(20,11);ctx.stroke();ctx.fillStyle='#84949a';ctx.fillRect(17,7,9,5);}
    ctx.restore();}
  function draw(){let w=innerWidth,h=innerHeight;drawBackground(w,h,Math.min(.04,(performance.now()-last)/1000||0));ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();let x0=Math.max(0,Math.floor(cameraX/TILE)-1),x1=Math.min(W,Math.ceil((cameraX+w)/TILE)+1),y0=Math.max(0,Math.floor(cameraY/TILE)-1),y1=Math.min(H,Math.ceil((cameraY+h)/TILE)+1);
    for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++){let id=world[x][y];if(id!==T.AIR)drawTile(x,y,id);}
    if(target){let x=target.x*TILE-cameraX,y=target.y*TILE-cameraY;ctx.strokeStyle='rgba(255,249,203,.95)';ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,TILE-4,TILE-4);if(mouse.down){let hp=target.progress||0;ctx.fillStyle='rgba(255,255,255,.82)';ctx.fillRect(x+6,y+TILE-5,(TILE-12)*Math.min(1,hp),2);}}
    drawPlayer();ctx.restore();
    // Gentle warm vignette at the horizon, never obscuring the game.
    let grad=ctx.createLinearGradient(0,h*.66,0,h);grad.addColorStop(0,'rgba(255,238,180,0)');grad.addColorStop(1,'rgba(31,57,43,.12)');ctx.fillStyle=grad;ctx.fillRect(0,h*.66,w,h*.34);
  }
  function updateHUD(){let hh=Math.round(health),ff=Math.round(food);document.getElementById('health-fill').style.width=hh+'%';document.getElementById('food-fill').style.width=ff+'%';document.getElementById('health-value').textContent=hh;document.getElementById('food-value').textContent=ff;let count=Math.min(5,woodGoal);document.getElementById('quest-count').textContent=`${count} / 5`;document.getElementById('progress-fill').style.width=(count*20)+'%';let mins=Math.floor(dayTime*24*60),hrs=Math.floor(mins/60)%24,mm=mins%60;document.getElementById('clock').textContent=`DAY ${String(day).padStart(2,'0')} · ${String(hrs).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}
  function toggleBag(){let bag=document.getElementById('inventory-panel');bag.classList.toggle('open');bag.setAttribute('aria-hidden',String(!bag.classList.contains('open')));}
  function closeBag(){document.getElementById('inventory-panel').classList.remove('open');document.getElementById('inventory-panel').setAttribute('aria-hidden','true');}
  document.getElementById('bag-btn').addEventListener('click',toggleBag);document.getElementById('close-inventory').addEventListener('click',closeBag);
  document.getElementById('craft-btn').addEventListener('click',()=>{if(inv[T.LOG]<1)return;inv[T.LOG]--;inv[T.PLANK]+=4;select(T.PLANK);document.getElementById('quest-title').textContent='A tiny forest, yours';document.getElementById('quest-subtitle').textContent='Place planks and make a cozy nook.';showToast('Crafted 4 wood planks!');refreshUI();save();});
  document.getElementById('play-btn').addEventListener('click',()=>{document.getElementById('center-message').classList.add('hidden');started=true;if(!hadSave){player.y=tops[8]*TILE-player.h;}last=performance.now();});
  document.getElementById('sound-btn').addEventListener('click',e=>{muted=!muted;e.currentTarget.textContent=muted?'♪̸':'♪';showToast(muted?'Sound off':'Sound on');});
  canvas.addEventListener('pointermove',e=>{let r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
  canvas.addEventListener('pointerdown',e=>{if(!started||document.getElementById('inventory-panel').classList.contains('open'))return;e.preventDefault();mouse.down=true;mouse.button=e.button;canvas.setPointerCapture?.(e.pointerId);if(e.button===2)placeBlock();});
  addEventListener('pointerup',e=>{mouse.down=false;mining=0;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyE'){toggleBag();}if(e.code==='Escape')closeBag();if(/^Digit[1-8]$/.test(e.code))select(ids[+e.code.slice(5)-1]);});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};mouse.down=false;});
  function aimTouch(){mouse.x=player.x+player.face*TILE*1.25-cameraX;mouse.y=player.y+player.h*.72-cameraY;}
  document.querySelectorAll('.touch-controls button').forEach(b=>{let name=b.dataset.control;b.addEventListener('pointerdown',e=>{e.preventDefault();touch[name]=true;if(name==='mine'){aimTouch();mouse.down=true;mouse.button=0;}if(name==='place'){aimTouch();placeBlock();}});for(let event of ['pointerup','pointercancel','pointerleave'])b.addEventListener(event,e=>{e.preventDefault();touch[name]=false;if(name==='mine'){mouse.down=false;mining=0;}});});
  function step(now){let dt=Math.min(.04,(now-last)/1000||0);last=now;if(started){elapsed+=dt;dayTime+=dt/240;if(dayTime>=1){dayTime-=1;day++;}movePlayer(dt);cameraX=Math.max(0,Math.min(W*TILE-innerWidth,player.x-innerWidth*.49));cameraY=Math.max(0,Math.min(H*TILE-innerHeight,player.y-innerHeight*.55));updateTarget();
      if(mouse.down&&mouse.button===0&&target){let toughness=target&&world[target.x][target.y]===T.STONE||target&&world[target.x][target.y]===T.ORE?1.05:0.62;if(!target.progress)target.progress=0;target.progress+=dt/toughness;if(target.progress>=1){mineTile();target=null;mining=0;}}else if(target)target.progress=0;
      if(elapsed>0&&Math.floor(elapsed)%72===0&&food>0&&Math.floor(elapsed-dt)!==Math.floor(elapsed)){food=Math.max(0,food-3);if(food===0)health=Math.max(20,health-2);}
      if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)document.getElementById('toast').classList.remove('show');}updateHUD();
    }draw();requestAnimationFrame(step);}
  if(hadSave){started=false;document.querySelector('.message-kicker').textContent='WELCOME BACK TO';document.querySelector('.message-card p').textContent='Your little patch of wild is right where you left it.';document.getElementById('play-btn').innerHTML='BACK TO YOUR WORLD <span>→</span>';}
  if(!hadSave){player.y=tops[8]*TILE-player.h;}
  cameraX=Math.max(0,player.x-innerWidth*.49);cameraY=Math.max(0,player.y-innerHeight*.55);updateHUD();requestAnimationFrame(step);
})();
