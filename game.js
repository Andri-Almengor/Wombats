/* Wombat — original Canvas artwork and fixed-step platformer. No external assets. */
'use strict';
(() => {
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id), W = 1280, H = 720, FLOOR = 592;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const themes = [
 {name:'Bosque del despertar',sky:['#102e38','#376c62'],ground:'#234643',top:'#7bab78',glow:'#c9e9a1',accent:'#afcdb0',desc:'Sigue las luciérnagas. Tu primera magia empieza aquí.'},
 {name:'Grutas de cristal',sky:['#171c3b','#41416b'],ground:'#343c59',top:'#8f9cc9',glow:'#acddf0',accent:'#a6b6dc',desc:'Los cristales esconden caminos sobre el vacío.'},
 {name:'Pantano de los susurros',sky:['#182e34','#416052'],ground:'#34463e',top:'#a4b36b',glow:'#d7e48e',accent:'#b1c194',desc:'Cuidado con las espinas y los guardianes del pantano.'},
 {name:'Cumbres de la luna',sky:['#15283e','#667b91'],ground:'#3e5064',top:'#cfdfdf',glow:'#e0e5f6',accent:'#d0daed',desc:'Respira hondo. El doble salto te llevará más lejos.'},
 {name:'La torre del eclipse',sky:['#241b39','#614257'],ground:'#413443',top:'#b58d9a',glow:'#f4cf92',accent:'#d8a6aa',desc:'La última estrella está en manos del Rey del Eclipse.'}
];
let state='menu',level=0,world,player,camera=0,time=0,score=0,kills=0,elapsed=0,best=0;
let shots=[],particles=[],enemyShots=[],keys=new Set(),pressed=new Set(),shake=0,toastTimer=0,transition=0,nextAction=null;
let audio=null,sound=false,musicClock=0,musicStep=0;
try { best=Number(localStorage.getItem('wombat-best'))||0; } catch {}
$('record').textContent=`RÉCORD · ${best}`;
function tone(freq,duration=.12,type='sine',volume=.035){
 if(!sound||!audio)return;
 const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);
 g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
 o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
}
function toggleSound(){sound=!sound;if(sound){audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();tone(523,.2);} $('sound').innerHTML=`♫ <span>Sonido: ${sound?'sí':'no'}</span>`;$('sound').setAttribute('aria-label',sound?'Silenciar sonido':'Activar sonido');}
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function makeWorld(index){
 const random=rng(912+index*197), length=8500+index*1000;
 const w={length,platforms:[],hazards:[],enemies:[],items:[],runes:0,portal:{x:length-180,y:442,w:86,h:150},boss:null};
 const plat=(x,y,width,moving=false)=>w.platforms.push({x,y,w:width,h:y===FLOOR?H-FLOOR+80:22,baseY:y,moving,phase:random()*6});
 const item=(x,y,type)=>w.items.push({x,y,w:24,h:28,type,active:true,phase:random()*6});
 // Each 1000px segment has a safe landing after a 130px gap, a high route and an optional moving lift.
 for(let x=0,seg=0;x<length;x+=1000,seg++){
  plat(x,FLOOR,seg===0?850:820);
  if(x+1000<length)plat(x+865,FLOOR-68,90,index>=1&&seg%2===0);
  plat(x+300,466,150);plat(x+560,366,155);plat(x+750,446,100);
  if(seg%3===1)plat(x+430,270,100,index>=2);
  for(let j=0;j<5;j++)item(x+320+j*27,423,'crystal');
  for(let j=0;j<4;j++)item(x+565+j*33,323,'crystal');
  if(seg>0&&seg%3===0)item(x+615,322,'heart');
  if(seg%3===2)item(x+470,228,'energy');
  if(seg>0){
   const type=index>=1&&seg%3===0?'caster':(seg%3===2?'bat':'slime');
   const hp=type==='caster'?3:type==='bat'?2:2+(index>2?1:0);
   w.enemies.push({x:x+440,y:type==='bat'?400:FLOOR-38,w:42,h:38,type,hp,max:hp,vx:-(48+index*9),min:x+150,maxX:x+750,baseY:400,cooldown:1+random(),hit:0,phase:random()*6});
   if(index>1)w.hazards.push({x:x+680,y:FLOOR-20,w:56,h:20});
   if(index>2)w.enemies.push({x:x+680,y:330,w:42,h:38,type:'bat',hp:2,max:2,vx:65,min:x+430,maxX:x+780,baseY:330,cooldown:2,hit:0,phase:random()*6});
  }
 }
 // Rune locations stay within double-jump reach and outside the boss arena.
 [Math.floor(length*.23/1000)*1000,Math.floor(length*.52/1000)*1000,Math.floor(length*.77/1000)*1000].forEach(x=>item(x+620,310,'rune'));
 // Continuous final arena prevents accidental pits around the portal.
 plat(length-650,FLOOR,650);
 if(index===4){w.boss={x:length-440,y:FLOOR-115,w:105,h:115,type:'boss',hp:36,max:36,cooldown:2,hit:0,phase:0,origin:length-440};w.enemies.push(w.boss);}
 return w;
}
function newPlayer(){return{x:90,y:480,w:42,h:58,vx:0,vy:0,facing:1,hp:5,mana:100,grounded:false,jumps:0,coyote:0,buffer:0,invuln:0,attack:0,dash:0,dashCooldown:0,nova:0,safeX:90,safeY:480};}
function setPanel(id){$('overlay').classList.toggle('hidden',!id);['menu','pause-panel','loading','victory'].forEach(p=>$(p).classList.toggle('hidden',p!==id));if(id){const b=$(id).querySelector('button');if(b)b.focus({preventScroll:true});}}
function announce(text,seconds=3.5){$('toast').textContent=text;$('toast').classList.add('visible');toastTimer=seconds;}
function loadLevel(i){level=i;world=makeWorld(i);const hp=player?.hp??5;player=newPlayer();player.hp=hp;shots=[];enemyShots=[];particles=[];camera=0;state='playing';setPanel(null);$('hud').classList.remove('hidden');$('boss-hud').classList.add('hidden');$('chapter').textContent=`CAPÍTULO ${String(i+1).padStart(2,'0')} / 05`;$('level-name').textContent=themes[i].name;announce(themes[i].desc,5);updateHUD();}
function newGame(){score=0;kills=0;elapsed=0;player=newPlayer();keys.clear();pressed.clear();loadLevel(0);}
function startTransition(title,text,action,death=false){state='loading';transition=2.8;nextAction=action;keys.clear();pressed.clear();$('loading-title').textContent=title;$('loading-text').textContent=text;$('loading-label').textContent=death?'LA MAGIA NUNCA SE RINDE':'UNA ESTRELLA MÁS CERCA';$('load-fill').style.width='0%';setPanel('loading');$('boss-hud').classList.add('hidden');}
function saveBest(){if(score>best){best=score;try{localStorage.setItem('wombat-best',String(best));}catch{}$('record').textContent=`RÉCORD · ${best}`;}}
function win(){state='victory';score+=1000;saveBest();setPanel('victory');$('boss-hud').classList.add('hidden');$('victory-stats').textContent=`Cinco mundos liberados · ${score} puntos · ${kills} enemigos vencidos · ${Math.floor(elapsed/60)} min ${Math.floor(elapsed%60)} s`;tone(784,.5);}
function pause(){if(state==='playing'){state='paused';setPanel('pause-panel');keys.clear();pressed.clear();$('pause').setAttribute('aria-label','Continuar juego');}else if(state==='paused'){state='playing';setPanel(null);$('pause').setAttribute('aria-label','Pausar juego');}}
function burst(x,y,color,count=15){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*160;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.5,max:1,color,size:2+Math.random()*4});}if(particles.length>400)particles.splice(0,particles.length-400);}
function hurt(){if(state!=='playing'||player.invuln>0||player.dash>0)return;player.hp--;player.invuln=1.5;player.vy=-240;shake=12;burst(player.x+20,player.y+25,'#f4a5a0');tone(110,.25,'sawtooth');if(player.hp<=0){saveBest();startTransition('De vuelta al comienzo','Perdiste tus cinco corazones. La aventura comienza otra vez en el nivel 1.',newGame,true);}}
function damageEnemy(e,amount){if(e.hp<=0)return;e.hp-=amount;e.hit=.15;burst(e.x+e.w/2,e.y+e.h/2,e.type==='boss'?'#edbbdb':'#ccecb6',8);tone(e.hp<=0?620:270,.08,'triangle');if(e.hp<=0){kills++;score+=e.type==='boss'?500:50;player.mana=clamp(player.mana+12,0,100);if(e.type==='boss')announce('El eclipse terminó. ¡El portal está libre!',5);}}
function shoot(){if(player.attack>0)return;player.attack=.26;shots.push({x:player.x+21+player.facing*28,y:player.y+25,w:22,h:13,vx:player.facing*690,life:1.05});burst(player.x+21+player.facing*34,player.y+25,'#c6f4d6',3);tone(660,.08,'triangle');}
function nova(){if(player.mana<45||player.nova>0)return;player.mana-=45;player.nova=.65;shake=6;burst(player.x+20,player.y+28,'#d2e9ff',60);world.enemies.forEach(e=>{if(Math.hypot(e.x-player.x,e.y-player.y)<240)damageEnemy(e,4);});enemyShots=enemyShots.filter(s=>Math.hypot(s.x-player.x,s.y-player.y)>250);tone(180,.4,'sine',.1);}
function updateHUD(){ $('hearts').textContent=Array.from({length:5},(_,i)=>i<player.hp?'♥':'♡').join(' ');$('hearts').setAttribute('aria-label',`${player.hp} de 5 corazones`);$('mana-fill').style.width=`${player.mana}%`;$('crystals').textContent=score;$('runes').textContent=`✧ ${world.runes} / 3`;$('progress-fill').style.width=`${clamp(player.x/world.length*100,0,100)}%`;}
function update(dt){
 if(state!=='paused')time+=dt;
 if(state==='loading'){transition-=dt;$('load-fill').style.width=`${clamp((2.8-transition)/2.8*100,0,100)}%`;if(transition<=0){const fn=nextAction;nextAction=null;fn();}pressed.clear();return;}
 if(state!=='playing'){pressed.clear();return;}
 elapsed+=dt;musicClock-=dt;if(musicClock<=0){musicClock=.48;const notes=[196,293.66,392,440,392,293.66,246.94,293.66];tone(notes[musicStep++%8]*(level===4?.75:1),.45,'sine',.012);}
 toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');
 for(const k of ['invuln','attack','dash','dashCooldown','nova','coyote','buffer'])player[k]=Math.max(0,player[k]-dt);
 player.mana=Math.min(100,player.mana+9*dt);shake=Math.max(0,shake-dt*35);
 const left=keys.has('KeyA')||keys.has('ArrowLeft'),right=keys.has('KeyD')||keys.has('ArrowRight');
 if(pressed.has('Space')||pressed.has('KeyW')||pressed.has('ArrowUp'))player.buffer=.14;
 if(player.grounded){player.coyote=.1;player.jumps=0;}
 if(player.buffer>0&&(player.coyote>0||player.jumps<2)){
  if(!player.grounded&&player.coyote<=0&&player.jumps===0)player.jumps=1;
  player.vy=-590;player.jumps++;player.grounded=false;player.coyote=0;player.buffer=0;burst(player.x+20,player.y+58,'#deefc3',8);tone(player.jumps===1?380:520,.12,'triangle');
 }
 if(pressed.has('ShiftLeft')||pressed.has('ShiftRight')){if(player.dashCooldown<=0){player.dash=.19;player.dashCooldown=1.2;tone(220,.13,'sawtooth',.025);}}
 if(keys.has('KeyJ')||keys.has('KeyZ'))shoot();if(pressed.has('KeyK')||pressed.has('KeyX'))nova();
 const dir=Number(right)-Number(left);if(dir)player.facing=dir;
 player.vx=player.dash>0?player.facing*800:dir*290;
 if(player.dash>0){player.vy=0;if(Math.random()<.4)burst(player.x+20,player.y+30,'#9fdcda',2);}else player.vy=Math.min(850,player.vy+1550*dt);
 const previousBottom=player.y+player.h;
 player.x=clamp(player.x+player.vx*dt,0,world.length-player.w);player.y+=player.vy*dt;player.grounded=false;
 for(const p of world.platforms){const oldY=p.y;p.y=p.moving?p.baseY+Math.sin(time*1.3+p.phase)*36:p.baseY;
  if(player.vy>=0&&player.x+player.w>p.x&&player.x<p.x+p.w&&previousBottom<=Math.max(oldY,p.y)+8&&player.y+player.h>=p.y){player.y=p.y-player.h;player.vy=0;player.grounded=true;
   if(p.baseY===FLOOR&&player.x>p.x+45&&player.x+player.w<p.x+p.w-70&&!world.hazards.some(h=>Math.abs(h.x-player.x)<110)){player.safeX=player.x;player.safeY=player.y;}
  }
 }
 if(player.y>H+90){player.dash=0;player.invuln=0;hurt();if(state!=='playing')return;player.x=player.safeX;player.y=player.safeY-5;player.vy=0;player.invuln=1.5;}
 for(const h of world.hazards){if(overlap(player,h))hurt();if(state!=='playing')return;}
 for(const e of world.enemies){
  if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);
  if(Math.abs(e.x-player.x)>1100)continue;
  if(e.type==='boss'){
   e.phase+=dt;e.x=e.origin+Math.sin(e.phase*.8)*115;e.cooldown-=dt;
   if(e.cooldown<=0){e.cooldown=e.hp<18?1.2:1.9;const angle=Math.atan2(player.y+20-(e.y+45),player.x+20-(e.x+40));for(let n=-1;n<=1;n++)enemyShots.push({x:e.x+40,y:e.y+45,w:18,h:18,vx:Math.cos(angle+n*.22)*260,vy:Math.sin(angle+n*.22)*260,life:5});tone(130,.15,'triangle');}
  }else{
   e.x+=e.vx*dt;if(e.x<e.min||e.x>e.maxX){e.x=clamp(e.x,e.min,e.maxX);e.vx*=-1;}
   if(e.type==='bat')e.y=e.baseY+Math.sin(time*2.8+e.phase)*58;
   if(e.type==='caster'){e.cooldown-=dt;if(e.cooldown<=0&&Math.abs(e.x-player.x)<660){e.cooldown=2.4;const a=Math.atan2(player.y+25-e.y,player.x-e.x);enemyShots.push({x:e.x+20,y:e.y,w:14,h:14,vx:Math.cos(a)*210,vy:Math.sin(a)*210,life:4});}}
  }
  if(overlap(player,e))hurt();if(state!=='playing')return;
 }
 for(const s of shots){s.x+=s.vx*dt;s.life-=dt;for(const e of world.enemies){if(e.hp>0&&s.life>0&&overlap(s,e)){damageEnemy(e,1);s.life=0;}}}
 shots=shots.filter(s=>s.life>0);
 for(const s of enemyShots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(overlap(player,s)){hurt();s.life=0;}if(state!=='playing')return;}enemyShots=enemyShots.filter(s=>s.life>0);
 for(const item of world.items){if(!item.active||!overlap(player,item))continue;item.active=false;burst(item.x+12,item.y+12,item.type==='rune'?'#efcd86':'#bcf0d8');
  if(item.type==='rune'){world.runes++;score+=100;announce(world.runes===3?'¡Tres runas! Busca el portal al final del camino.':`Runa encontrada · ${world.runes} de 3`);tone(880,.3,'triangle');}
  else if(item.type==='heart'){player.hp=Math.min(5,player.hp+1);announce('Un corazón del bosque. +1 de vida',2);tone(550,.2);}
  else if(item.type==='energy'){player.mana=100;announce('Energía arcana restaurada',2);tone(720,.2);}
  else{score+=10;tone(900+Math.random()*180,.045,'sine',.015);}
 }
 if(overlap(player,world.portal)){
  if(world.runes<3){if(toastTimer<=0)announce(`El portal necesita 3 runas. Tienes ${world.runes}. Regresa por las que faltan.`,4);}
  else if(world.boss&&world.boss.hp>0){if(toastTimer<=0)announce('Vence al Rey del Eclipse para liberar la última estrella.',3);}
  else{score+=250;saveBest();if(level===4)win();else{const next=level+1;startTransition(themes[next].name,'Las runas abren un nuevo camino. Recuperas un corazón y toda tu energía.',()=>{player.hp=Math.min(5,player.hp+1);loadLevel(next);});}return;}
 }
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=170*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
 camera+=(clamp(player.x-W*.32,0,world.length-W)-camera)*Math.min(1,dt*7);
 const bossVisible=world.boss&&world.boss.hp>0&&Math.abs(player.x-world.boss.x)<1000;$('boss-hud').classList.toggle('hidden',!bossVisible);if(bossVisible)$('boss-fill').style.width=`${world.boss.hp/world.boss.max*100}%`;
 updateHUD();pressed.clear();
}
// All scenery and characters are drawn locally, so the game works offline.
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function tree(x,y,scale,color){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);poly([[-18,0],[-9,-280],[5,-360],[15,-215],[29,0]],color);poly([[0,-170],[-80,-253],[-60,-252],[7,-214]],color);poly([[6,-234],[80,-305],[77,-280],[10,-201]],color);ellipse(-40,-315,90,65,color);ellipse(34,-350,99,75,color);ellipse(93,-307,77,62,color);ellipse(-77,-274,65,50,color);ctx.restore();}
function drawBackground(){
 const t=themes[level], g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,t.sky[0]);g.addColorStop(1,t.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 glow(910-camera*.02,140,180,'#d2e9c514');ellipse(910-camera*.02,140,46,46,t.glow);ellipse(928-camera*.02,126,44,44,t.sky[0]);
 for(let i=0;i<65;i++){const x=((i*149.1-camera*.08)%W+W)%W,y=25+(i*73)%370;ctx.globalAlpha=.2+Math.sin(time*.7+i)*.15;ellipse(x,y,1.3,1.3,'#e5f5cc');}ctx.globalAlpha=1;
 for(let layer=0;layer<3;layer++){
  const par=.12+layer*.14,col=['#16333b','#183e40','#1d4944'][layer];
  for(let i=-1;i<9;i++){const x=i*235-((camera*par)%235),y=570+layer*35;
   if(level===0||level===2)tree(x,y,.85+layer*.14,col);
   else if(level===1)poly([[x-70,0],[x+180,0],[x+80,250+layer*50]],['#23243e','#2b2c4a','#303452'][layer]);
   else if(level===3)poly([[x-170,y],[x+70,190+layer*70],[x+290,y]],['#2e435b','#3e586b','#4e6c7b'][layer]);
   else{ctx.fillStyle=['#2b243b','#332940','#3c3045'][layer];ctx.fillRect(x,170+i%3*45,100,y);for(let j=0;j<4;j++)ctx.fillRect(x+j*28,158+i%3*45,16,22);}
  }
 }
 for(let i=0;i<32;i++){const x=((i*173-camera*.32+Math.sin(time*.3+i)*15)%W+W)%W,y=200+(i*51)%350+Math.sin(time+i)*15;glow(x,y,13,'#d9eda914');ellipse(x,y,1.7,1.7,t.glow);}
}
function drawPlatform(p){
 const t=themes[level];ctx.fillStyle=t.ground;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=t.top;ctx.fillRect(p.x,p.y,p.w,7);ctx.fillStyle='#0002';ctx.fillRect(p.x,p.y+9,p.w,5);
 if(p.h>30){for(let i=0;i<p.w;i+=34){const y=p.y+32+(i*17%63);rounded(p.x+i+5,y,16,5,2,'#ffffff07');}for(let i=4;i<p.w;i+=26){poly([[p.x+i,p.y],[p.x+i+5,p.y-7-(i%9)],[p.x+i+8,p.y]],t.top);}}
 else{poly([[p.x+6,p.y+p.h],[p.x+30,p.y+p.h+17],[p.x+50,p.y+p.h]],t.ground);}
}
function drawWombat(x,y,scale=1,facing=1,animated=true){
 ctx.save();ctx.translate(x+21*scale,y+29*scale);ctx.scale(scale*facing,scale);
 if(animated&&player?.invuln>0&&Math.floor(time*14)%2===0)ctx.globalAlpha=.4;
 const walk=animated&&player?.grounded?Math.sin(time*15)*Math.min(1,Math.abs(player.vx)/100):0;
 ellipse(0,30,26,6,'#0003');ellipse(-12,20+walk*3,10,8,'#756358');ellipse(12,20-walk*3,10,8,'#756358');
 poly([[-18,-8],[-25,23],[22,23],[17,-8]],'#658a92');poly([[-17,-5],[-23,21],[-3,21],[0,-5]],'#476c79');
 ellipse(0,-10,24,22,'#bba68b');ellipse(-17,-29,8,11,'#bba68b');ellipse(15,-29,8,11,'#bba68b');ellipse(-17,-29,4,7,'#877769');ellipse(15,-29,4,7,'#877769');ellipse(10,-5,13,10,'#d3bfa0');rounded(9,-12,10,8,3,'#4d4644');ellipse(2,-16,2.7,3.2,'#252e30');ellipse(2.7,-17,1,1,'#fff');ellipse(-13,-9,4,2,'#c38d7a');
 poly([[-25,-31],[22,-31],[9,-70],[-1,-63],[-10,-66]],'#668ba0');poly([[-25,-31],[-5,-32],[-1,-63],[-10,-66]],'#476a84');ellipse(-1,-31,29,5,'#80a2ad');poly([[-1,-53],[1,-48],[6,-48],[2,-45],[3,-40],[-1,-43],[-5,-40],[-4,-46],[-8,-49],[-3,-49]],'#eed394');
 rounded(-10,3,29,5,2,'#d2b777');ellipse(20,7,8,7,'#bba68b');ctx.strokeStyle='#aa9063';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(32,30);ctx.lineTo(30,-28);ctx.stroke();glow(30,-34,22,'#c3f5da44');poly([[30,-45],[38,-34],[30,-23],[23,-34]],'#c4efd5');ellipse(28,-36,2,3,'#fff8');
 ctx.restore();
}
function drawEnemy(e){
 if(e.hp<=0)return;ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);if(e.hit>0)ctx.globalAlpha=.5;
 if(e.type==='slime'){ellipse(0,16,26,5,'#0003');ellipse(0,5,25,20+Math.sin(time*4)*2,'#a59a83');ellipse(-7,0,4,4,'#302f33');ellipse(9,0,4,4,'#302f33');poly([[-29,-3],[0,-29],[28,-3]],'#bb746e');ellipse(0,-3,29,6,'#cb8c7c');ellipse(-10,-13,4,3,'#eac9a2');ellipse(7,-19,3,3,'#eac9a2');}
 else if(e.type==='bat'){const flap=Math.sin(time*13)*15;poly([[-8,0],[-43,-15+flap],[-27,15],[-10,11]],'#938aaa');poly([[8,0],[43,-15+flap],[27,15],[10,11]],'#938aaa');ellipse(0,2,14,17,'#62597e');poly([[-12,-4],[-11,-25],[-1,-11]],'#62597e');poly([[12,-4],[11,-25],[1,-11]],'#62597e');ellipse(-5,0,3,3,'#e4d59d');ellipse(5,0,3,3,'#e4d59d');}
 else if(e.type==='caster'){poly([[-24,20],[0,-34],[23,20]],'#827592');ellipse(0,-4,12,11,'#293544');ellipse(-4,-5,2,3,'#eccc91');ellipse(5,-5,2,3,'#eccc91');glow(23,0,21,'#ebc49044');ellipse(23,0,6,6,'#e6b99f');}
 else{ellipse(0,55,65,10,'#0003');poly([[-54,56],[-42,-20],[0,-50],[43,-20],[56,56]],'#78617c');poly([[-33,47],[-27,-20],[0,-35],[27,-20],[33,47]],'#3a334d');ellipse(0,-18,30,27,'#b1a2af');poly([[-31,-33],[-40,-67],[-17,-51],[0,-74],[15,-49],[38,-65],[29,-31]],'#c8ad78');ellipse(-12,-19,5,7,'#f7c18d');ellipse(12,-19,5,7,'#f7c18d');glow(0,15,55,'#e7a2d333');ellipse(0,16,12,16,'#df9bca');}
 ctx.restore();if(e.hp<e.max&&e.type!=='boss'){rounded(e.x-3,e.y-20,e.w+6,4,2,'#102329');rounded(e.x-3,e.y-20,(e.w+6)*Math.max(0,e.hp/e.max),4,2,'#edbc9c');}
}
function drawItem(i){if(!i.active)return;const y=i.y+Math.sin(time*2+i.phase)*5;
 if(i.type==='crystal'){poly([[i.x+12,y],[i.x+20,y+12],[i.x+12,y+25],[i.x+4,y+12]],'#b7d7c6');poly([[i.x+12,y+3],[i.x+12,y+22],[i.x+6,y+12]],'#e5edd2');}
 else if(i.type==='rune'){glow(i.x+12,y+13,50,'#f8ce8733');ctx.save();ctx.translate(i.x+12,y+13);ctx.rotate(Math.sin(time)*.1);rounded(-17,-20,34,40,7,'#617976');ctx.strokeStyle='#eed08a';ctx.lineWidth=2;ctx.strokeRect(-13,-16,26,32);poly([[0,-12],[8,0],[0,12],[-8,0]],'#eed08a');ctx.restore();}
 else{glow(i.x+12,y+12,25,i.type==='heart'?'#ff998833':'#aabbff33');ctx.font='26px Georgia';ctx.fillStyle=i.type==='heart'?'#efa190':'#bacdf0';ctx.fillText(i.type==='heart'?'♥':'✦',i.x,y+24);}
}
function drawPortal(){const p=world.portal,open=world.runes===3&&(!world.boss||world.boss.hp<=0);glow(p.x+43,p.y+75,120,open?'#cfeec133':'#cdbaf511');ctx.strokeStyle='#79958b';ctx.lineWidth=15;ctx.beginPath();ctx.ellipse(p.x+43,p.y+76,45,73,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=open?'#d7ecc3':'#8194a9';ctx.lineWidth=3;ctx.stroke();ellipse(p.x+43,p.y+76,33,62,open?'#b1d6bb55':'#172937aa');for(let i=0;i<3;i++){ellipse(p.x+14+i*29,p.y-9-(i===1?8:0),5,5,i<world.runes?'#efd58e':'#465855');}if(open){for(let i=0;i<8;i++)ellipse(p.x+43+Math.sin(time+i)*25,p.y+30+(i*17+time*30)%95,2,2,'#ecf6c9');}}
function draw(){
 ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawBackground();
 if(state==='menu'){
  ctx.save();ctx.translate(0,30);drawPlatform({x:0,y:620,w:W,h:150});tree(1190,630,1.55,'#143b37');tree(770,630,.9,'#254f46');
  for(let i=0;i<8;i++){ellipse(760+i*80,622,18,5,'#83a685');ctx.fillStyle='#567b65';ctx.fillRect(765+i*80,620,5,15);}
  glow(960,455,165,'#bae3b21a');drawWombat(882,448,2.8,1,false);for(let i=0;i<9;i++){const x=795+i*38,y=390+Math.sin(i+time*.7)*65;glow(x,y,15,'#efdfa31a');ellipse(x,y,2,2,'#f2db9e');}ctx.restore();
 }else if(world){
  ctx.save();ctx.translate(-camera,0);
  for(const p of world.platforms)if(p.x+p.w>camera-50&&p.x<camera+W+50)drawPlatform(p);
  // Ground ornaments repeat deterministically and never affect collision.
  for(let i=Math.floor(camera/170);i<(camera+W)/170;i++){const x=i*170+30;if(world.platforms.some(p=>p.baseY===FLOOR&&x>p.x&&x+40<p.x+p.w)){if(level===1){poly([[x,FLOOR],[x+7,FLOOR-43],[x+24,FLOOR]],'#8c9ec0');poly([[x+17,FLOOR],[x+29,FLOOR-24],[x+40,FLOOR]],'#a6c3cf');}else{ctx.fillStyle='#698c72';ctx.fillRect(x+10,FLOOR-20,5,20);ellipse(x+12,FLOOR-20,15,6,level===4?'#b38793':'#a3b592');}}}
  for(const h of world.hazards)for(let x=h.x;x<h.x+h.w;x+=14)poly([[x,h.y+h.h],[x+7,h.y],[x+14,h.y+h.h]],'#cdb5ac');
  for(const i of world.items)if(i.x>camera-50&&i.x<camera+W+50)drawItem(i);
  drawPortal();for(const e of world.enemies)if(e.x>camera-100&&e.x<camera+W+100)drawEnemy(e);
  for(const s of shots){glow(s.x+10,s.y+7,27,'#d6ffc655');ellipse(s.x+10,s.y+7,12,6,'#dcf5c8');ctx.fillStyle='#c8f2d644';ctx.fillRect(s.x-s.vx*.022,s.y+4,s.vx*.022,5);}
  for(const s of enemyShots){glow(s.x+7,s.y+7,24,'#ec9aae44');ellipse(s.x+7,s.y+7,8,8,'#e4a0b5');}
  if(player.nova>0){ctx.strokeStyle=`rgba(200,232,255,${player.nova})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.x+20,player.y+25,(1-player.nova/.65)*240,0,Math.PI*2);ctx.stroke();}
  drawWombat(player.x,player.y,1,player.facing);
  for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);ellipse(p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
  if(player.x<900&&level===0){ctx.fillStyle='#d7e5c4';ctx.font='13px Arial';ctx.textAlign='center';ctx.fillText('ESPACIO · SALTA DOS VECES',420,390);ctx.fillText('J · LANZA MAGIA',760,520);ctx.textAlign='left';}
  ctx.restore();
 }
 // Subtle vignette keeps the player and luminous spells in focus.
 const vignette=ctx.createRadialGradient(W/2,H/2,230,W/2,H/2,800);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#07181b66');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);ctx.restore();
}
const controlCodes=new Set(['KeyA','KeyD','ArrowLeft','ArrowRight','KeyW','ArrowUp','Space','KeyJ','KeyZ','KeyK','KeyX','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',e=>{
 if(controlCodes.has(e.code)&&state==='playing'){e.preventDefault();if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);}
 if((e.code==='Escape'||e.code==='KeyP')&&!e.repeat)pause();
});window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();pressed.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);pressed.add(b.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));}
$('start').onclick=newGame;$('again').onclick=newGame;$('restart').onclick=()=>startTransition('Una nueva aventura','Preparando el Bosque del despertar…',newGame);$('resume').onclick=pause;$('pause').onclick=pause;$('sound').onclick=toggleSound;
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{announce('Tu navegador no permite pantalla completa.',3);}};
let previous=0,accumulator=0;
function frame(stamp){const dt=previous?Math.min((stamp-previous)/1000,.1):0;previous=stamp;accumulator+=dt;while(accumulator>=1/60){update(1/60);accumulator-=1/60;}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Read-only diagnostics: useful for browser checks without enabling gameplay cheats.
window.wombatDebug=Object.freeze({snapshot:()=>({state,level:level+1,hp:player?.hp,score,runes:world?.runes,x:player?.x,y:player?.y,enemies:world?.enemies.filter(e=>e.hp>0).length}),levelSummary:()=>themes.map((t,i)=>{const w=makeWorld(i);return{name:t.name,length:w.length,runes:w.items.filter(v=>v.type==='rune').length,enemies:w.enemies.length};})});
})();
