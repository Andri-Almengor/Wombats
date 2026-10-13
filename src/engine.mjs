import {BIOMES,FLOOR,HEIGHT,WIDTH,createWorld,validateWorld} from './world.mjs';
import {wantsJump} from './controls.mjs';
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
// These four offensive spells can be equipped on W. A, D and R are always fixed.
export const SELECTABLE_SPELLS=SPELLS.filter(spell=>['KeyQ','KeyW','KeyE','KeyF'].includes(spell.key));
export const UPGRADES=[
 {id:'health',label:'Corazones',icon:'♥',max:5,description:'Más puntos de vida'},
 {id:'recovery',label:'Recuperación',icon:'♡',max:5,description:'Recupera un corazón periódicamente'},
 {id:'mana',label:'Reserva arcana',icon:'✦',max:5,description:'Amplía la barra de magia'},
 {id:'regen',label:'Regeneración',icon:'◈',max:5,description:'Recupera magia más rápido'},
 {id:'power',label:'Poder general',icon:'⚡',max:5,description:'Incrementa todos los daños directos'},
 {id:'resistance',label:'Resistencia',icon:'⬟',max:5,description:'Reduce el daño recibido'},
 {id:'spark',label:'Chispa',icon:'✧',max:5,description:'Mejora el proyectil gratuito'},
 {id:'fire',label:'Llamas',icon:'🔥',max:5,description:'Daño inicial y quemadura por segundo'},
 {id:'fireDuration',label:'Combustión',icon:'♨',max:5,description:'Amplía el tiempo de quemadura'},
 {id:'ice',label:'Escarcha',icon:'❄',max:5,description:'Mayor daño y ralentización; congela al nivel 3'},
 {id:'iceDuration',label:'Hielo duradero',icon:'◇',max:5,description:'Amplía el tiempo de frío y congelación'},
 {id:'lightning',label:'Rayo',icon:'ϟ',max:5,description:'Daño y aturdimiento eléctrico'},
 {id:'lightningChain',label:'Cadena eléctrica',icon:'⌁',max:4,description:'Aumenta enemigos encadenados'},
 {id:'nova',label:'Nova',icon:'✺',max:5,description:'Más daño y retroceso'},
 {id:'novaRadius',label:'Onda arcana',icon:'◎',max:5,description:'Amplía el radio de Nova'},
 {id:'heal',label:'Sanación',icon:'♥',max:5,description:'Recupera más vida con D'},
 {id:'shield',label:'Barrera',icon:'⬡',max:5,description:'Aumenta la resistencia del escudo'},
 {id:'shieldDuration',label:'Escudo persistente',icon:'◉',max:5,description:'Aumenta su duración'},
 {id:'efficiency',label:'Eficiencia',icon:'◌',max:5,description:'Reduce coste de magia, excepto Chispa'},
 {id:'cooldown',label:'Concentración',icon:'⏱',max:5,description:'Reduce intervalos entre hechizos'}
];
export const upgradeValue=(id,level)=>({
 health:()=>5+level,recovery:()=>level?Math.max(9,30-level*3)+' s':'Inactiva',
 mana:()=>100+25*level,regen:()=>10+3*level,
 power:()=>(1+level*.22).toFixed(2)+'x',resistance:()=>Math.round(level*10)+'%',
 spark:()=>(1+level*.22).toFixed(2),fire:()=>(2.4+level*.45).toFixed(2),
 fireDuration:()=>(3+level*.9).toFixed(1)+' s',ice:()=>(1.2+level*.32).toFixed(2),
 iceDuration:()=>(3+level*.7).toFixed(1)+' s',
 lightning:()=>(2.5+level*.42).toFixed(2),lightningChain:()=>4+level,
 nova:()=>(4+level*.7).toFixed(2),novaRadius:()=>250+level*28,
 heal:()=>2+level,shield:()=>1+level,
 shieldDuration:()=>(4.6+level*.75).toFixed(1)+' s',
 efficiency:()=>Math.round(level*8)+'%',cooldown:()=>Math.round(level*7)+'%'
})[id]?.()??'—';
const randomSeed=()=>((Date.now()^Math.floor(Math.random()*4294967296))>>>0)||1;
export function freshPlayer(){return{x:100,y:FLOOR-70,w:45,h:68,vx:0,vy:0,dir:1,hp:5,maxHp:5,mana:100,maxMana:100,power:1,regen:10,grounded:false,jumps:0,coyote:0,buffer:0,dash:0,dashCd:0,invuln:0,shield:0,shieldHits:0,cast:0,hit:0,healFx:0,step:0,coins:0,earned:0,spawn:0,recoveryTime:0,upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,0]))};}
export class GameEngine{
 constructor(notify=()=>{}){this.notify=notify;this.status='menu';this.equippedSpell='KeyQ';this.menuIndex=0;this.held=new Set();this.edge=new Set();this.world=null;this.player=freshPlayer();this.biomeIndex=0;this.seed=0;this.elapsed=0;this.kills=0;this.score=0;this.time=0;this.camera=0;this.cameraY=0;this.discovered=new Set();this.lastSafe=null;this.shake=0;this.projectiles=[];this.hostile=[];this.particles=[];this.banner='';this.bannerTime=0;this.deadTimer=0;this.sfx=()=>{};this.lastPublish=0;}
 snapshot(){const p=this.player,w=this.world;return{status:this.status,equippedSpell:this.equippedSpell,menuIndex:this.menuIndex,seed:this.seed,biomeIndex:this.biomeIndex,biome:w?.biome.name||'',subtitle:w?.biome.subtitle||'',hp:p.hp,maxHp:p.maxHp,mana:Math.floor(p.mana),maxMana:p.maxMana,shield:p.shield,coins:p.coins,score:this.score,kills:this.kills,runes:w?.runes||0,progress:w?Math.floor(100*(w.runes+(w.bookRequired?(w.bookCollected?1:0):1))/ (w.requiredRunes+1)):0,bookCollected:w?.bookCollected||false,bookRequired:w?.bookRequired||false,upgrades:{...p.upgrades},upgradeCosts:Object.fromEntries(UPGRADES.map(u=>[u.id,this.upgradeCost(u.id)])),upgradeDetails:Object.fromEntries(UPGRADES.map(u=>[u.id,{current:upgradeValue(u.id,p.upgrades[u.id]),next:p.upgrades[u.id]<u.max?upgradeValue(u.id,p.upgrades[u.id]+1):'MAX',max:u.max}])),boss:w?.enemies.find(e=>(e.type==='boss'||e.type==='guardian')&&e.hp>0)?.hp||0,bossMax:w?.enemies.find(e=>e.type==='boss'||e.type==='guardian')?.maxHp||52,effects:{shield:p.shield,invulnerability:p.invuln},position:{x:Math.round(p.x),y:Math.round(p.y)},map:w?{width:w.length,minY:w.minY,maxY:w.maxY,portal:w.portal,nodes:w.platforms.filter(p=>this.discovered.has(p.id)).map(p=>({x:p.x+p.w/2,y:p.y,id:p.id})),links:w.links.filter(([a,b])=>this.discovered.has(a)&&this.discovered.has(b)),items:w.items.filter(i=>i.active&&this.discovered.has(i.nodeId)&&(i.type==='rune'||i.type==='book')).map(i=>({x:i.x,y:i.y,type:i.type})),player:{x:p.x,y:p.y}}:null,banner:this.banner,elapsed:this.elapsed};}
 emit(){this.notify(this.snapshot());}
 makeSeed(){let next=randomSeed();if(next===this.seed)next=(next+0x9e3779b9)>>>0;return next;}
 newRun(){this.equippedSpell='KeyQ';this.menuIndex=0;this.seed=this.makeSeed();this.biomeIndex=0;this.player=freshPlayer();this.score=0;this.kills=0;this.elapsed=0;this.time=0;this.held.clear();this.edge.clear();this.loadBiome(0);this.status='playing';this.emit();}
 loadBiome(index){this.biomeIndex=index;this.world=createWorld(index,this.seed);if(!validateWorld(this.world))throw Error('Procedural map not reachable');const p=this.player;p.x=this.world.spawn.x;p.y=this.world.spawn.y;this.lastSafe={...this.world.spawn};this.discovered=new Set([this.world.platforms[0].id]);p.vx=p.vy=0;p.grounded=false;p.jumps=0;p.shield=0;p.invuln=1;p.spawn=1.1;p.mana=p.maxMana;this.camera=0;this.cameraY=0;this.projectiles=[];this.hostile=[];this.particles=[];this.status='playing';this.say(this.world.biome.subtitle,3.4);this.emit();}
 openSpellMenu(){if(this.status!=='playing')return false;this.status='spell-menu';this.menuIndex=Math.max(0,SELECTABLE_SPELLS.findIndex(spell=>spell.key===this.equippedSpell));this.held.clear();this.edge.clear();this.emit();return true;}
 setMenuIndex(index){if(this.status!=='spell-menu'||!Number.isInteger(index)||index<0||index>=SELECTABLE_SPELLS.length)return false;if(this.menuIndex!==index){this.menuIndex=index;this.emit();}return true;}
 navigateSpellMenu(direction){if(this.status!=='spell-menu')return false;const size=SELECTABLE_SPELLS.length;this.menuIndex=(this.menuIndex+direction%size+size)%size;this.emit();return true;}
 selectSpell(key){if(this.status!=='spell-menu'||!SELECTABLE_SPELLS.some(spell=>spell.key===key))return false;this.equippedSpell=key;this.status='playing';this.held.clear();this.edge.clear();this.say('Hechizo equipado en W: '+SELECTABLE_SPELLS.find(spell=>spell.key===key).name,2);this.emit();return true;}
 confirmSpellMenu(){if(this.status!=='spell-menu')return false;return this.selectSpell(SELECTABLE_SPELLS[this.menuIndex].key);}
 closeSpellMenu(){if(this.status!=='spell-menu')return false;this.status='playing';this.held.clear();this.edge.clear();this.emit();return true;}
 openUpgradeMenu(){if(this.status!=='playing')return false;this.status='upgrade-menu';this.held.clear();this.edge.clear();this.emit();return true;}
 closeUpgradeMenu(){if(this.status!=='upgrade-menu')return false;this.status='playing';this.held.clear();this.edge.clear();this.emit();return true;}
 togglePause(){if(this.status==='playing'){this.status='paused';this.held.clear();this.edge.clear();}else if(this.status==='paused')this.status='playing';this.emit();}
 setHeld(key,down){if(down){if(!this.held.has(key))this.edge.add(key);this.held.add(key);}else this.held.delete(key);}
 tap(key){this.edge.add(key);}
 upgradeCost(id){const u=UPGRADES.find(x=>x.id===id);if(!u)return Infinity;const level=this.player.upgrades[id];return level>=u.max?Infinity:Math.round((id==='health'||id==='mana'?95:70)+level*55+level*level*20);}
 upgrade(id){const u=UPGRADES.find(x=>x.id===id);if(!u||(this.status!=='playing'&&this.status!=='upgrade-menu'))return false;const p=this.player,cost=this.upgradeCost(id);if(!Number.isFinite(cost)||p.coins<cost)return false;
  p.coins-=cost;p.upgrades[id]++;
  if(id==='health'){p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}
  if(id==='mana'){p.maxMana+=25;p.mana=Math.min(p.maxMana,p.mana+25);}
  if(id==='power')p.power=1+p.upgrades.power*.22;
  if(id==='regen')p.regen=10+p.upgrades.regen*3;
  this.say('¡Mejora desbloqueada: '+u.label+'!',1.7);this.sfx('upgrade');this.sparks(p.x+22,p.y+22,'#fce9a9',20);this.emit();return true;
 }
 spellCost(key){const s=SPELLS.find(x=>x.key===key);if(!s)return Infinity;return key==='KeyQ'?0:Math.max(1,Math.ceil(s.cost*(1-this.player.upgrades.efficiency*.08)));}
 say(message,duration=2){this.banner=message;this.bannerTime=duration;}
 sparks(x,y,color,n=12,force=160){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(.3+Math.random())*force;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.4,color,size:2+Math.random()*4});}if(this.particles.length>350)this.particles.splice(0,this.particles.length-350);}
 damagePlayer(d=1,sourceX){const p=this.player;if(p.invuln>0||p.dash>0||this.status!=='playing')return;if(p.shield>0){p.shieldHits=Math.max(0,p.shieldHits-1);if(p.shieldHits===0)p.shield=0;this.sparks(p.x+22,p.y+25,'#b0eafb',13);return;}p.hp=Math.max(0,Math.round((p.hp-d*(1-p.upgrades.resistance*.10))*100)/100);p.invuln=1.25;p.hit=.5;p.vy=-240;if(sourceX!==undefined)p.vx=p.x<sourceX?-260:260;this.shake=12;this.sparks(p.x+22,p.y+30,'#ff958b',25);this.sfx('hurt');if(p.hp===0){this.status='dead';this.deadTimer=2.5;this.say('La magia renace: un mundo nuevo se está formando…',2.5);this.emit();}}
 damageEnemy(e,amount,kind='spark'){
  if(e.hp<=0)return;
  const p=this.player,u=p.upgrades;
  const modifier=(kind==='fire'&&e.type==='slime'||kind==='ice'&&e.type==='golem'||kind==='lightning'&&e.type==='bat')?1.3:(kind==='spark'&&e.type==='boss'?0.72:1);
  e.hp=Math.max(0,e.hp-amount*modifier);e.hit=.18;
  this.sparks(e.x+e.w/2,e.y+e.h/2,kind==='ice'?'#b3ecff':kind==='fire'||kind==='burn-dot'?'#ffc88a':'#d9e6a3',kind==='burn-dot'?2:9);
  if(kind==='fire'){e.burn=Math.max(e.burn||0,3+u.fireDuration*.9);e.burnPower=.65+u.fire*.28;e.burnTick=.5;}
  if(kind==='ice'){e.slow=Math.max(e.slow||0,3+u.iceDuration*.7);if(u.ice>=3)e.freeze=Math.max(e.freeze||0,.4+u.ice*.12+u.iceDuration*.12);}
  if(kind==='lightning')e.stun=Math.max(e.stun||0,.14+u.lightning*.075);
  if(kind==='nova')e.knock=(e.x>p.x?1:-1)*(220+u.nova*44);
  if(e.hp<=0){
   this.kills++;const miniboss=e.type==='guardian',boss=e.type==='boss',reward=boss?450:miniboss?280:65;
   this.score+=reward;p.coins+=boss?180:miniboss?155:45;p.earned+=reward;p.mana=limit(p.mana+12,0,p.maxMana);
   this.sparks(e.x+e.w/2,e.y+e.h/2,'#ffe2a4',24,210);this.sfx('kill');
   if(miniboss){const chamber=this.world.platforms.find(n=>n.id===e.nodeId);this.world.items.push({id:-e.id,x:chamber.x+20,y:chamber.y-54,w:22,h:24,type:'book',active:true,phase:0,nodeId:e.nodeId});this.say('¡Guardián derrotado! Recupera el libro antiguo.',4);}
   if(boss)this.say('¡El Rey del Eclipse cayó! Entra al portal.',4);
  }
 }
 nearbyEnemies(x,y,distance){return this.world.enemies.filter(e=>e.hp>0&&Math.hypot(e.x+e.w/2-x,e.y+e.h/2-y)<distance).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));}
 cast(key){if(this.status!=='playing')return;const spell=SPELLS.find(s=>s.key===key);if(!spell)return;const p=this.player;const cost=this.spellCost(key);if(p.cast>0||p.mana<cost){if(p.mana<cost)this.say('Necesitas más energía arcana',.8);return;}if(key==='KeyR'&&p.hp>=p.maxHp)return;
 p.mana-=cost;p.cast=(key==='KeyQ'?.17:key==='KeyF'?.52:.36)*(1-p.upgrades.cooldown*.07);
 const ox=p.x+p.w/2+p.dir*22,oy=p.y+28;const power=p.power;
 if(key==='KeyQ'||key==='KeyW'||key==='KeyE'){
  this.projectiles.push({x:ox,y:oy,w:25,h:18,vx:p.dir*(key==='KeyW'?500:key==='KeyE'?580:760),vy:0,life:key==='KeyE'?1.15:1.05,damage:(key==='KeyE'?2.4+p.upgrades.fire*.45:key==='KeyW'?1.2+p.upgrades.ice*.32:1+p.upgrades.spark*.22)*power,kind:key==='KeyQ'?'spark':key==='KeyW'?'ice':'fire',radius:key==='KeyE'?112:0});
 }else if(key==='KeyR'){const amount=2+p.upgrades.heal;p.hp=Math.min(p.maxHp,p.hp+amount);p.healFx=.9;this.sparks(p.x+23,p.y+20,'#a8f9bd',30);this.say('+'+amount+' corazones',1.6);}
 else if(key==='KeyF'){const targets=this.nearbyEnemies(p.x+25,p.y+30,490).slice(0,4+p.upgrades.lightningChain);for(const [i,e] of targets.entries()){this.damageEnemy(e,Math.max(.9,2.5+p.upgrades.lightning*.42-i*.25)*power,'lightning');this.particles.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:0,vy:0,life:.3,color:'#c0e9ff',size:18,bolt:true});}if(!targets.length)p.mana=Math.min(p.maxMana,p.mana+15);this.sparks(ox,oy,'#b4ddff',12);}
 else if(key==='KeyC'){p.shield=4.6+p.upgrades.shieldDuration*.75;p.shieldHits=1+p.upgrades.shield;this.sparks(p.x+23,p.y+28,'#a9e7ff',22);}
 else if(key==='KeyX'){this.shake=8;const radius=250+p.upgrades.novaRadius*28;for(const e of this.nearbyEnemies(p.x+22,p.y+30,radius))this.damageEnemy(e,(4+p.upgrades.nova*.7)*power,'nova');this.hostile=this.hostile.filter(s=>Math.hypot(s.x-p.x,s.y-p.y)>radius);this.sparks(p.x+22,p.y+30,'#d2c0ff',56,330);p.healFx=-.6;}
 this.sfx(key);this.emit();
 }
 explode(x,y,r,damage){this.shake=7;this.sparks(x,y,'#ffbd71',30,235);for(const e of this.nearbyEnemies(x,y,r))this.damageEnemy(e,damage,'fire');}
 fireEnemy(e){const p=this.player,dx=p.x-e.x,dy=p.y-e.y;if(Math.abs(dx)>740)return;const l=Math.hypot(dx,dy)||1;const speed=e.type==='boss'?390:e.type==='bomber'?310:270;this.hostile.push({x:e.x+e.w/2,y:e.y+e.h/2,w:17,h:17,vx:dx/l*speed,vy:dy/l*speed,life:3,kind:e.type==='boss'?'eclipse':e.type==='bomber'?'toxic':'dark'});this.sfx('enemy');}
 update(dt){dt=limit(dt,0,.05);
 // Completely freeze physics, scenery animation, enemy AI, projectiles and timers in menus.
 if(this.status==='spell-menu'||this.status==='upgrade-menu'||this.status==='paused'||this.status==='menu'||this.status==='victory'){this.edge.clear();return;}
 this.time+=dt;
 if(this.status==='dead'){this.deadTimer-=dt;if(this.deadTimer<=0)this.newRun();this.edge.clear();return;}
 if(this.status!=='playing'){this.edge.clear();return;}
 const p=this.player,w=this.world,edge=this.edge,held=this.held;this.elapsed+=dt;
 for(const key of ['invuln','shield','hit','cast','dash','dashCd','coyote','buffer','spawn','healFx']){if(key==='healFx'){p.healFx+=(p.healFx>0?-1:1)*dt;if(Math.abs(p.healFx)<dt)p.healFx=0;}else p[key]=Math.max(0,p[key]-dt);}
 this.bannerTime-=dt;if(this.bannerTime<=0)this.banner='';
 this.shake=Math.max(0,this.shake-dt*35);
 p.mana=Math.min(p.maxMana,p.mana+p.regen*dt);
 if(p.upgrades.recovery&&p.hp<p.maxHp){p.recoveryTime+=dt;if(p.recoveryTime>=Math.max(9,30-p.upgrades.recovery*3)){p.recoveryTime=0;p.hp=Math.min(p.maxHp,p.hp+1);p.healFx=.4;}}
 else p.recoveryTime=0;
 const dir=Number(held.has('ArrowRight'))-Number(held.has('ArrowLeft'));
 if(wantsJump(edge))p.buffer=.16;
 if(p.grounded){p.coyote=.11;p.jumps=0;}
 if(p.buffer>0&&(p.coyote>0||p.jumps<2)){if(!p.grounded&&p.coyote===0&&p.jumps===0)p.jumps=1;p.vy=p.jumps===0?-650:-600;p.jumps++;p.grounded=false;p.coyote=0;p.buffer=0;this.sparks(p.x+22,p.y+p.h,'#e8e3c0',11,130);this.sfx('jump');}
 if(edge.has('ShiftLeft')||edge.has('ShiftRight')){if(p.dashCd===0){p.dash=.19;p.dashCd=1.05;p.vx=p.dir*850;this.sparks(p.x+20,p.y+40,'#bde6ff',24);this.sfx('dash');}}
 if(dir)p.dir=dir;
 if(p.dash===0){const target=dir*310;p.vx+=(target-p.vx)*Math.min(1,dt*(p.grounded?16:7));}
 p.vy+=w.biome.gravity*dt;
 if(w.biome.wind&&p.dash===0&&!p.grounded)p.vx+=Math.sin(this.time*1.5+w.seed)*w.biome.wind*dt;
 for(const platform of w.platforms)if(platform.kind!=='ground'&&platform.move)platform.y=platform.baseY+Math.sin(this.time*1.3+platform.phase)*platform.move;
 const oldBottom=p.y+p.h,oldTop=p.y,oldX=p.x;
 p.x=limit(p.x+p.vx*dt,0,w.length-p.w);p.y+=p.vy*dt;p.grounded=false;
 // Solid cave barriers close off non-connected passages and have real side collision.
 for(const wall of w.walls||[]){
  if(!touches(p,wall))continue;
  if(p.vx>0&&oldX+p.w<=wall.x+4){p.x=wall.x-p.w;p.vx=0;}
  else if(p.vx<0&&oldX>=wall.x+wall.w-4){p.x=wall.x+wall.w;p.vx=0;}
  else if(p.vy>=0&&oldBottom<=wall.y+5){p.y=wall.y-p.h;p.vy=0;p.grounded=true;}
  else if(p.vy<0&&oldTop>=wall.y+wall.h-5){p.y=wall.y+wall.h;p.vy=0;}
  else{p.x=oldX;p.vx=0;}
 }
 // Solid ground and moving platforms. Upward movement passes through platform undersides.
 for(const platform of w.platforms){if(p.x+p.w<=platform.x+5||p.x>=platform.x+platform.w-5)continue;
  const wasTop=oldBottom<=platform.y+11,willLand=p.vy>=0&&wasTop&&p.y+p.h>=platform.y&&p.y+p.h<=platform.y+45;
  if(willLand){p.y=platform.y-p.h;p.vy=0;p.grounded=true;if(platform.move)p.x+=Math.cos(this.time*1.3+platform.phase)*platform.move*dt*.65;}
  else if(platform.kind==='ground'&&p.y<platform.y+platform.h&&p.y+p.h>platform.y&&oldTop>=platform.y+platform.h&&p.vy<0){p.y=platform.y+platform.h;p.vy=0;}
 }
 if(p.grounded){p.step+=Math.abs(p.vx)*dt/28;this.lastSafe={x:p.x,y:p.y};}
 for(const platform of w.platforms){
  if(this.discovered.has(platform.id))continue;
  if(Math.hypot(p.x+p.w/2-(platform.x+platform.w/2),p.y+p.h-platform.y)>125)continue;
  this.discovered.add(platform.id);
  if(platform.secret){p.coins+=30;this.score+=40;this.say('¡Ruta secreta descubierta! +30 esencias',2);this.sfx('pickup');}
 }
 if(p.y>w.maxY+160){this.damagePlayer(1);const safe=this.lastSafe||w.spawn;p.x=safe.x;p.y=safe.y-65;p.vx=0;p.vy=0;p.invuln=Math.max(p.invuln,.7);}
 // The left hand controls four abilities; W casts whichever offensive spell the player equipped.
 if(edge.has('KeyW')||held.has('KeyW'))this.cast(this.equippedSpell);
 if(edge.has('KeyA'))this.cast('KeyX'); // Nova
 if(edge.has('KeyD'))this.cast('KeyR'); // Heal
 if(edge.has('KeyR'))this.cast('KeyC'); // Shield
 for(const enemy of w.enemies){if(enemy.hp<=0)continue;enemy.hit=Math.max(0,enemy.hit-dt);enemy.slow=Math.max(0,(enemy.slow||0)-dt);enemy.freeze=Math.max(0,(enemy.freeze||0)-dt);enemy.stun=Math.max(0,(enemy.stun||0)-dt);enemy.burn=Math.max(0,(enemy.burn||0)-dt);
  if(enemy.burn>0){enemy.burnTick=(enemy.burnTick||.5)-dt;if(enemy.burnTick<=0){enemy.burnTick+=.5;this.damageEnemy(enemy,(enemy.burnPower||.65)*.5,'burn-dot');}}
  if(enemy.hp<=0)continue;
  if(enemy.knock){enemy.x=limit(enemy.x+enemy.knock*dt,0,w.length-enemy.w);enemy.knock*=Math.max(0,1-dt*9);if(Math.abs(enemy.knock)<2)enemy.knock=0;}
  const locked=enemy.freeze>0||enemy.stun>0;enemy.attackTimer-=locked?0:dt*(enemy.slow>0?.55:1);
  const speed=locked?0:enemy.slow>0?Math.max(.16,.43-p.upgrades.ice*.045):1;const dx=p.x-enemy.x;
  if(enemy.type==='bat'){enemy.x+=Math.sign(dx)*Math.min(Math.abs(dx),62*dt*speed);enemy.y=enemy.spawnY+Math.sin(this.time*3.2+enemy.phase)*38;}
  else if(enemy.type==='boss'){enemy.x=enemy.spawnX+Math.sin(this.time*.9)*110;enemy.dir=dx>0?1:-1;
   if(enemy.telegraph>0){
    enemy.telegraph=Math.max(0,enemy.telegraph-dt);
    if(enemy.telegraph===0){const phase=enemy.queuedPhase||1;for(let i=-phase;i<=phase;i++)this.hostile.push({x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:20,h:20,vx:enemy.dir*(250+Math.abs(i)*30),vy:i*92,life:2.8,kind:'eclipse'});this.shake=4;this.sfx('enemy');}
   }
   if(enemy.attackTimer<=0&&!locked&&enemy.telegraph===0){
    const phase=enemy.hp/enemy.maxHp<.33?3:enemy.hp/enemy.maxHp<.67?2:1;
    enemy.queuedPhase=phase;enemy.telegraph=.55;enemy.attackTimer=phase===3?.9:phase===2?1.25:1.75;
   }
  }
  else{enemy.dir=dx>0?1:-1;const chase=Math.abs(dx)<300;enemy.x+=((chase?enemy.dir:Math.sin(this.time+enemy.phase)>0?1:-1)*(enemy.type==='wolf'?112:enemy.type==='golem'?45:70)*speed*dt);enemy.x=limit(enemy.x,enemy.spawnX-enemy.range,enemy.spawnX+enemy.range);
   if(enemy.type==='wolf')enemy.y=enemy.spawnY+Math.sin(this.time*8+enemy.phase)*6;
   if(enemy.type==='mushroom'||enemy.type==='slime')enemy.y=enemy.spawnY+Math.abs(Math.sin(this.time*4+enemy.phase))*-10;
  }
  if(enemy.attackTimer<=0&&!locked){if(['caster','bomber','golem','guardian'].includes(enemy.type)&&Math.abs(dx)<700)this.fireEnemy(enemy);enemy.attackTimer=enemy.type==='guardian'?1.3:enemy.type==='bomber'?1.6:enemy.type==='caster'?2.1:2.9;}
  if(touches(p,enemy))this.damagePlayer(enemy.type==='boss'?2:1,enemy.x);
 }
 for(const s of this.projectiles){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0)continue;const target=w.enemies.find(e=>e.hp>0&&touches(s,e));if(target){this.damageEnemy(target,s.damage,s.kind);if(s.radius)this.explode(s.x,s.y,s.radius,s.damage*.65);s.life=0;}else if(w.platforms.some(pl=>pl.kind==='ground'&&touches(s,pl))){if(s.radius)this.explode(s.x,s.y,s.radius,s.damage*.5);s.life=0;}}
 this.projectiles=this.projectiles.filter(s=>s.life>0&&s.x>0&&s.x<w.length);
 for(const s of this.hostile){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life>0&&touches(s,p)){this.damagePlayer(1,s.x);s.life=0;}}
 this.hostile=this.hostile.filter(s=>s.life>0);
 for(const h of w.hazards)if(touches(p,h))this.damagePlayer(1,h.x);
 for(const item of w.items){if(!item.active||!touches(p,item))continue;item.active=false;this.sparks(item.x+11,item.y+12,item.type==='rune'?'#ffdc9d':'#b4ebce',15,135);
  if(item.type==='rune'){w.runes++;this.score+=100;this.say(w.runes===3?'¡Portal desbloqueado!':'Runa encontrada · '+w.runes+'/3',2.4);}
  else if(item.type==='book'){w.bookCollected=true;this.score+=350;p.coins+=120;this.say('¡Libro antiguo recuperado! Regresa al portal.',4);}else if(item.type==='heart')p.hp=Math.min(p.maxHp,p.hp+1);
  else if(item.type==='mana')p.mana=p.maxMana;
  else {this.score+=10;p.coins+=5;}
  this.sfx('pickup');
 }
 if(touches(p,w.portal)){
  if(w.runes<3){if(!this.bannerTime)this.say('Busca las 3 runas para abrir el portal',2);}else if(w.bookRequired&&!w.bookCollected){if(!this.bannerTime)this.say('Derrota al guardián y encuentra el libro',2);}
  else if(w.enemies.some(e=>e.type==='boss'&&e.hp>0)){if(!this.bannerTime)this.say('Derrota al Rey del Eclipse',2);}
  else if(this.biomeIndex===BIOMES.length-1){this.status='victory';this.score+=1000;this.held.clear();this.sfx('victory');this.emit();}
  else{this.score+=250;p.hp=Math.min(p.maxHp,p.hp+1);this.loadBiome(this.biomeIndex+1);this.sfx('portal');}
 }
 for(const v of this.particles){v.x+=v.vx*dt;v.y+=v.vy*dt;v.vy+=240*dt;v.life-=dt;}this.particles=this.particles.filter(v=>v.life>0);
 this.camera+=(limit(p.x-WIDTH*.34,0,Math.max(0,w.length-WIDTH))-this.camera)*Math.min(1,dt*7);
 this.cameraY+=(limit(p.y-HEIGHT*.46,w.minY,Math.max(w.minY,w.maxY-HEIGHT))-this.cameraY)*Math.min(1,dt*6);
 edge.clear();this.lastPublish+=dt;if(this.lastPublish>.09){this.lastPublish=0;this.emit();}
 }
}
