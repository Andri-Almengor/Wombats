import {BIOMES,FLOOR,HEIGHT,WIDTH,createWorld,validateWorld} from './world.mjs';
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
const touches=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export const SPELLS=[
 {key:'KeyQ',name:'Chispa',icon:'✦',cost:0,description:'Ataque rápido'},
 {key:'KeyW',name:'Escarcha',icon:'❄',cost:12,description:'Ralentiza'},
 {key:'KeyE',name:'Fuego',icon:'🔥',cost:18,description:'Explosión'},
 {key:'KeyR',name:'Sanar',icon:'♥',cost:28,description:'Recupera 2 vidas'},
 {key:'KeyF',name:'Rayo',icon:'ϟ',cost:35,description:'Impacta a varios'},
 {key:'KeyC',name:'Escudo',icon:'⬡',cost:25,description:'Protección temporal'},
 {key:'KeyX',name:'Nova',icon:'✺',cost:50,description:'Ataque circular'}
];
export const UPGRADES=[
 {id:'health',label:'Corazones',icon:'♥',description:'Aumenta tu vida máxima'},
 {id:'mana',label:'Magia',icon:'✦',description:'Más energía arcana'},
 {id:'power',label:'Poder',icon:'⚡',description:'Más daño por hechizo'},
 {id:'regen',label:'Recarga',icon:'◈',description:'Regenera magia antes'}
];
const randomSeed=()=>((Date.now()^Math.floor(Math.random()*4294967296))>>>0)||1;
export function freshPlayer(){return{x:100,y:FLOOR-70,w:45,h:68,vx:0,vy:0,dir:1,hp:5,maxHp:5,mana:100,maxMana:100,power:1,regen:10,grounded:false,jumps:0,coyote:0,buffer:0,dash:0,dashCd:0,invuln:0,shield:0,cast:0,hit:0,healFx:0,step:0,coins:0,earned:0,spawn:0,upgrades:{health:0,mana:0,power:0,regen:0}};}
export class GameEngine{
 constructor(notify=()=>{}){this.notify=notify;this.status='menu';this.held=new Set();this.edge=new Set();this.world=null;this.player=freshPlayer();this.biomeIndex=0;this.seed=0;this.elapsed=0;this.kills=0;this.score=0;this.time=0;this.camera=0;this.shake=0;this.projectiles=[];this.hostile=[];this.particles=[];this.banner='';this.bannerTime=0;this.deadTimer=0;this.sfx=()=>{};this.lastPublish=0;}
 snapshot(){const p=this.player,w=this.world;return{status:this.status,seed:this.seed,biomeIndex:this.biomeIndex,biome:w?.biome.name||'',subtitle:w?.biome.subtitle||'',hp:p.hp,maxHp:p.maxHp,mana:Math.floor(p.mana),maxMana:p.maxMana,shield:p.shield,coins:p.coins,score:this.score,kills:this.kills,runes:w?.runes||0,progress:w?Math.floor(100*limit(p.x/w.length,0,1)):0,upgrades:{...p.upgrades},upgradeCosts:Object.fromEntries(UPGRADES.map(u=>[u.id,this.upgradeCost(u.id)])),boss:w?.enemies.find(e=>e.type==='boss'&&e.hp>0)?.hp||0,bossMax:46,banner:this.banner,elapsed:this.elapsed};}
 emit(){this.notify(this.snapshot());}
 makeSeed(){let next=randomSeed();if(next===this.seed)next=(next+0x9e3779b9)>>>0;return next;}
 newRun(){this.seed=this.makeSeed();this.biomeIndex=0;this.player=freshPlayer();this.score=0;this.kills=0;this.elapsed=0;this.time=0;this.held.clear();this.edge.clear();this.loadBiome(0);this.status='playing';this.emit();}
 loadBiome(index){this.biomeIndex=index;this.world=createWorld(index,this.seed);if(!validateWorld(this.world))throw Error('Procedural map not reachable');const p=this.player;p.x=100;p.y=FLOOR-p.h;p.vx=p.vy=0;p.grounded=false;p.jumps=0;p.shield=0;p.invuln=1;p.spawn=1.1;p.mana=p.maxMana;this.camera=0;this.projectiles=[];this.hostile=[];this.particles=[];this.status='playing';this.say(this.world.biome.subtitle,3.4);this.emit();}
 togglePause(){if(this.status==='playing'){this.status='paused';this.held.clear();this.edge.clear();}else if(this.status==='paused')this.status='playing';this.emit();}
 setHeld(key,down){if(down){if(!this.held.has(key))this.edge.add(key);this.held.add(key);}else this.held.delete(key);}
 tap(key){this.edge.add(key);}
 upgradeCost(id){return 100+this.player.upgrades[id]*85;}
 upgrade(id){if(!UPGRADES.some(u=>u.id===id)||this.status!=='playing')return false;const p=this.player,cost=this.upgradeCost(id);if(p.coins<cost)return false;if(id==='health'&&p.maxHp>=10||id==='mana'&&p.maxMana>=220||id==='power'&&p.power>=4||id==='regen'&&p.regen>=27)return false;p.coins-=cost;p.upgrades[id]++;if(id==='health'){p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+2);}if(id==='mana'){p.maxMana+=30;p.mana=Math.min(p.maxMana,p.mana+55);}if(id==='power')p.power+=.5;if(id==='regen')p.regen+=4;this.say('¡Mejora desbloqueada!',1.7);this.sfx('upgrade');this.emit();return true;}
 say(message,duration=2){this.banner=message;this.bannerTime=duration;}
 sparks(x,y,color,n=12,force=160){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(.3+Math.random())*force;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.4,color,size:2+Math.random()*4});}if(this.particles.length>350)this.particles.splice(0,this.particles.length-350);}
 damagePlayer(d=1,sourceX){const p=this.player;if(p.invuln>0||p.dash>0||this.status!=='playing')return;if(p.shield>0){p.shield=Math.max(0,p.shield-1.1);this.sparks(p.x+22,p.y+25,'#b0eafb',13);return;}p.hp=Math.max(0,p.hp-d);p.invuln=1.25;p.hit=.5;p.vy=-240;if(sourceX!==undefined)p.vx=p.x<sourceX?-260:260;this.shake=12;this.sparks(p.x+22,p.y+30,'#ff958b',25);this.sfx('hurt');if(p.hp===0){this.status='dead';this.deadTimer=2.5;this.say('La magia renace: un mundo nuevo se está formando…',2.5);this.emit();}}
 damageEnemy(e,amount,kind='spark'){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.hit=.18;this.sparks(e.x+e.w/2,e.y+e.h/2,kind==='ice'?'#b3ecff':kind==='fire'?'#ffc88a':'#d9e6a3',9);if(kind==='ice')e.slow=3;if(e.hp===0){this.kills++;const reward=e.type==='boss'?450:65;this.score+=reward;this.player.coins+=e.type==='boss'?150:45;this.player.earned+=reward;this.player.mana=limit(this.player.mana+12,0,this.player.maxMana);this.sparks(e.x+e.w/2,e.y+e.h/2,'#ffe2a4',24,210);this.sfx('kill');if(e.type==='boss')this.say('¡El Rey del Eclipse cayó! Entra al portal.',4);}}
 nearbyEnemies(x,y,distance){return this.world.enemies.filter(e=>e.hp>0&&Math.hypot(e.x+e.w/2-x,e.y+e.h/2-y)<distance).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));}
 cast(key){if(this.status!=='playing')return;const spell=SPELLS.find(s=>s.key===key);if(!spell)return;const p=this.player;if(p.cast>0||p.mana<spell.cost){if(p.mana<spell.cost)this.say('Necesitas más energía arcana',.8);return;}if(key==='KeyR'&&p.hp>=p.maxHp)return;
 p.mana-=spell.cost;p.cast=key==='KeyQ'?.17:key==='KeyF'?.52:.36;
 const ox=p.x+p.w/2+p.dir*22,oy=p.y+28;const power=p.power;
 if(key==='KeyQ'||key==='KeyW'||key==='KeyE'){
  this.projectiles.push({x:ox,y:oy,w:25,h:18,vx:p.dir*(key==='KeyW'?500:key==='KeyE'?580:760),vy:0,life:key==='KeyE'?1.15:1.05,damage:(key==='KeyE'?2.4:key==='KeyW'?1.2:1)*power,kind:key==='KeyQ'?'spark':key==='KeyW'?'ice':'fire',radius:key==='KeyE'?112:0});
 }else if(key==='KeyR'){p.hp=Math.min(p.maxHp,p.hp+2);p.healFx=.9;this.sparks(p.x+23,p.y+20,'#a8f9bd',30);this.say('+2 corazones',1.6);}
 else if(key==='KeyF'){const targets=this.nearbyEnemies(p.x+25,p.y+30,490).slice(0,4);for(const [i,e] of targets.entries()){this.damageEnemy(e,(2.5-i*.25)*power,'lightning');this.particles.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:0,vy:0,life:.3,color:'#c0e9ff',size:18,bolt:true});}if(!targets.length)p.mana=Math.min(p.maxMana,p.mana+15);this.sparks(ox,oy,'#b4ddff',12);}
 else if(key==='KeyC'){p.shield=4.6;this.sparks(p.x+23,p.y+28,'#a9e7ff',22);}
 else if(key==='KeyX'){this.shake=8;for(const e of this.nearbyEnemies(p.x+22,p.y+30,250))this.damageEnemy(e,4*power,'lightning');this.hostile=this.hostile.filter(s=>Math.hypot(s.x-p.x,s.y-p.y)>260);this.sparks(p.x+22,p.y+30,'#d2c0ff',56,330);p.healFx=-.6;}
 this.sfx(key);this.emit();
 }
 explode(x,y,r,damage){this.shake=7;this.sparks(x,y,'#ffbd71',30,235);for(const e of this.nearbyEnemies(x,y,r))this.damageEnemy(e,damage,'fire');}
 fireEnemy(e){const p=this.player,dx=p.x-e.x,dy=p.y-e.y;if(Math.abs(dx)>740)return;const l=Math.hypot(dx,dy)||1;const speed=e.type==='boss'?390:e.type==='bomber'?310:270;this.hostile.push({x:e.x+e.w/2,y:e.y+e.h/2,w:17,h:17,vx:dx/l*speed,vy:dy/l*speed,life:3,kind:e.type==='boss'?'eclipse':e.type==='bomber'?'toxic':'dark'});this.sfx('enemy');}
 update(dt){dt=limit(dt,0,.05);this.time+=dt;
 if(this.status==='dead'){this.deadTimer-=dt;if(this.deadTimer<=0)this.newRun();this.edge.clear();return;}
 if(this.status!=='playing'){this.edge.clear();return;}
 const p=this.player,w=this.world,edge=this.edge,held=this.held;this.elapsed+=dt;
 for(const key of ['invuln','shield','hit','cast','dash','dashCd','coyote','buffer','spawn','healFx']){if(key==='healFx'){p.healFx+=(p.healFx>0?-1:1)*dt;if(Math.abs(p.healFx)<dt)p.healFx=0;}else p[key]=Math.max(0,p[key]-dt);}
 this.bannerTime-=dt;if(this.bannerTime<=0)this.banner='';
 this.shake=Math.max(0,this.shake-dt*35);
 p.mana=Math.min(p.maxMana,p.mana+p.regen*dt);
 const dir=Number(held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('KeyA')||held.has('ArrowLeft'));
 if(edge.has('Space')||edge.has('ArrowUp')||edge.has('KeyZ'))p.buffer=.16;
 if(p.grounded){p.coyote=.11;p.jumps=0;}
 if(p.buffer>0&&(p.coyote>0||p.jumps<2)){if(!p.grounded&&p.coyote===0&&p.jumps===0)p.jumps=1;p.vy=p.jumps===0?-650:-600;p.jumps++;p.grounded=false;p.coyote=0;p.buffer=0;this.sparks(p.x+22,p.y+p.h,'#e8e3c0',11,130);this.sfx('jump');}
 if(edge.has('ShiftLeft')||edge.has('ShiftRight')){if(p.dashCd===0){p.dash=.19;p.dashCd=1.05;p.vx=p.dir*850;this.sparks(p.x+20,p.y+40,'#bde6ff',24);this.sfx('dash');}}
 if(dir)p.dir=dir;
 if(p.dash===0){const target=dir*310;p.vx+=(target-p.vx)*Math.min(1,dt*(p.grounded?16:7));}
 p.vy+=w.biome.gravity*dt;
 if(w.biome.wind&&p.dash===0&&!p.grounded)p.vx+=Math.sin(this.time*1.5+w.seed)*w.biome.wind*dt;
 for(const platform of w.platforms)if(platform.kind!=='ground'&&platform.move)platform.y=platform.baseY+Math.sin(this.time*1.3+platform.phase)*platform.move;
 const oldBottom=p.y+p.h,oldTop=p.y;
 p.x=limit(p.x+p.vx*dt,0,w.length-p.w);p.y+=p.vy*dt;p.grounded=false;
 // Solid ground and moving platforms. Upward movement passes through platform undersides.
 for(const platform of w.platforms){if(p.x+p.w<=platform.x+5||p.x>=platform.x+platform.w-5)continue;
  const wasTop=oldBottom<=platform.y+11,willLand=p.vy>=0&&wasTop&&p.y+p.h>=platform.y&&p.y+p.h<=platform.y+45;
  if(willLand){p.y=platform.y-p.h;p.vy=0;p.grounded=true;if(platform.move)p.x+=Math.cos(this.time*1.3+platform.phase)*platform.move*dt*.65;}
  else if(platform.kind==='ground'&&p.y<platform.y+platform.h&&p.y+p.h>platform.y&&oldTop>=platform.y+platform.h&&p.vy<0){p.y=platform.y+platform.h;p.vy=0;}
 }
 if(p.grounded){p.step+=Math.abs(p.vx)*dt/28;}
 if(p.y>HEIGHT+200){this.damagePlayer(1);p.x=limit(p.x-140,80,w.length-350);p.y=FLOOR-180;p.vy=0;p.invuln=Math.max(p.invuln,.7);}
 // Spells on the left-hand keyboard; Q can be held to fire repeatedly.
 for(const spell of SPELLS){if(edge.has(spell.key)||(spell.key==='KeyQ'&&held.has(spell.key)))this.cast(spell.key);}
 for(const enemy of w.enemies){if(enemy.hp<=0)continue;enemy.hit=Math.max(0,enemy.hit-dt);enemy.slow=Math.max(0,enemy.slow-dt);enemy.attackTimer-=dt;const speed=enemy.slow>0?.43:1;const dx=p.x-enemy.x;
  if(enemy.type==='bat'){enemy.x+=Math.sign(dx)*Math.min(Math.abs(dx),62*dt*speed);enemy.y=FLOOR-171+Math.sin(this.time*3.2+enemy.phase)*38;}
  else if(enemy.type==='boss'){enemy.x=enemy.spawnX+Math.sin(this.time*.9)*110;enemy.dir=dx>0?1:-1;if(enemy.attackTimer<=0){for(let i=-1;i<=1;i++)this.hostile.push({x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:20,h:20,vx:enemy.dir*(270+Math.abs(i)*30),vy:i*125,life:2.8,kind:'eclipse'});enemy.attackTimer=enemy.hp<enemy.maxHp*.5?1.05:1.75;this.shake=4;}}
  else{enemy.dir=dx>0?1:-1;const chase=Math.abs(dx)<300;enemy.x+=((chase?enemy.dir:Math.sin(this.time+enemy.phase)>0?1:-1)*(enemy.type==='wolf'?112:enemy.type==='golem'?45:70)*speed*dt);enemy.x=limit(enemy.x,enemy.spawnX-enemy.range,enemy.spawnX+enemy.range);
   if(enemy.type==='wolf')enemy.y=FLOOR-48+Math.sin(this.time*8+enemy.phase)*6;
   if(enemy.type==='mushroom'||enemy.type==='slime')enemy.y=FLOOR-48+Math.abs(Math.sin(this.time*4+enemy.phase))*-10;
  }
  if(enemy.attackTimer<=0){if(['caster','bomber','golem'].includes(enemy.type)&&Math.abs(dx)<700)this.fireEnemy(enemy);enemy.attackTimer=enemy.type==='bomber'?1.6:enemy.type==='caster'?2.1:2.9;}
  if(touches(p,enemy))this.damagePlayer(enemy.type==='boss'?2:1,enemy.x);
 }
 for(const s of this.projectiles){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0)continue;const target=w.enemies.find(e=>e.hp>0&&touches(s,e));if(target){this.damageEnemy(target,s.damage,s.kind);if(s.radius)this.explode(s.x,s.y,s.radius,s.damage*.65);s.life=0;}else if(w.platforms.some(pl=>pl.kind==='ground'&&touches(s,pl))){if(s.radius)this.explode(s.x,s.y,s.radius,s.damage*.5);s.life=0;}}
 this.projectiles=this.projectiles.filter(s=>s.life>0&&s.x>0&&s.x<w.length);
 for(const s of this.hostile){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life>0&&touches(s,p)){this.damagePlayer(1,s.x);s.life=0;}}
 this.hostile=this.hostile.filter(s=>s.life>0);
 for(const h of w.hazards)if(touches(p,h))this.damagePlayer(1,h.x);
 for(const item of w.items){if(!item.active||!touches(p,item))continue;item.active=false;this.sparks(item.x+11,item.y+12,item.type==='rune'?'#ffdc9d':'#b4ebce',15,135);
  if(item.type==='rune'){w.runes++;this.score+=100;this.say(w.runes===3?'¡Portal desbloqueado!':'Runa encontrada · '+w.runes+'/3',2.4);}
  else if(item.type==='heart')p.hp=Math.min(p.maxHp,p.hp+1);
  else if(item.type==='mana')p.mana=p.maxMana;
  else {this.score+=10;p.coins+=5;}
  this.sfx('pickup');
 }
 if(touches(p,w.portal)){
  if(w.runes<3){if(!this.bannerTime)this.say('Busca las 3 runas para abrir el portal',2);}
  else if(w.enemies.some(e=>e.type==='boss'&&e.hp>0)){if(!this.bannerTime)this.say('Derrota al Rey del Eclipse',2);}
  else if(this.biomeIndex===BIOMES.length-1){this.status='victory';this.score+=1000;this.held.clear();this.sfx('victory');this.emit();}
  else{this.score+=250;p.hp=Math.min(p.maxHp,p.hp+1);this.loadBiome(this.biomeIndex+1);this.sfx('portal');}
 }
 for(const v of this.particles){v.x+=v.vx*dt;v.y+=v.vy*dt;v.vy+=240*dt;v.life-=dt;}this.particles=this.particles.filter(v=>v.life>0);
 this.camera+=(limit(p.x-WIDTH*.34,0,Math.max(0,w.length-WIDTH))-this.camera)*Math.min(1,dt*7);
 edge.clear();this.lastPublish+=dt;if(this.lastPublish>.09){this.lastPublish=0;this.emit();}
 }
}
