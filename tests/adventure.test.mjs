import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,createWorld,validateWorld} from '../src/world.mjs';
import {GameEngine,UPGRADES} from '../src/engine.mjs';

test('all five world layouts are structurally different and deterministic',()=>{
 assert.deepEqual(BIOMES.map(x=>x.id),['forest','crystal','cave','sky','eclipse']);
 const worlds=BIOMES.map((_,i)=>createWorld(i,94511));
 for(const world of worlds){assert.ok(validateWorld(world));assert.equal(world.items.filter(i=>i.type==='rune').length,3);assert.ok(world.links.length>=15);}
 assert.ok(Math.min(...worlds[1].platforms.map(p=>p.y))<-1900,'mountains have sustained vertical ascent');
 assert.ok(worlds[2].rooms.length>=20,'cave is a graph of connected chambers');
 assert.ok(worlds[0].platforms.some(p=>p.secret),'forest has optional trails');
 assert.ok(worlds[3].platforms.filter(p=>p.kind==='cloud').length>=19,'sky has floating islands');
 assert.ok(worlds[4].rooms.length>=5,'citadel has distinct arenas');
 assert.notDeepEqual(worlds[0].links,worlds[2].links);
});
test('500 reproducible seeds per biome preserve portal and all three runes reachability',()=>{
 for(let seed=1;seed<=500;seed++)for(let biome=0;biome<5;biome++){
  const w=createWorld(biome,(seed*2654435761)>>>0);
  assert.ok(validateWorld(w),`biome=${biome} seed=${seed}`);
  const alternate=createWorld(biome,(seed*2654435761)>>>0);
  assert.deepEqual(w,alternate);
 }
});
test('U pauses physics and effects, keeps S unchanged, refuses invalid purchases',()=>{
 const g=new GameEngine();g.newRun();g.player.coins=250;g.player.vx=100;
 const x=g.player.x,t=g.time,enemyX=g.world.enemies[0].x,oldMana=g.player.mana;
 assert.equal(g.openUpgradeMenu(),true);assert.equal(g.status,'upgrade-menu');
 g.tap('KeyW');g.tap('KeyA');g.setHeld('ArrowRight',true);
 for(let i=0;i<120;i++)g.update(1/60);
 assert.equal(g.player.x,x);assert.equal(g.time,t);assert.equal(g.world.enemies[0].x,enemyX);assert.equal(g.player.mana,oldMana);
 assert.equal(g.openSpellMenu(),false);
 assert.equal(g.upgrade('fire'),true);
 assert.equal(g.player.upgrades.fire,1);
 assert.equal(g.upgrade('doesNotExist'),false);
 assert.equal(g.closeUpgradeMenu(),true);
 assert.equal(g.held.size,0);assert.equal(g.edge.size,0);
 assert.equal(g.openSpellMenu(),true);assert.equal(g.closeSpellMenu(),true);
});
test('costs grow, upgrade caps hold, and actual player stats change',()=>{
 const g=new GameEngine();g.newRun();g.player.coins=100000;
 for(const u of UPGRADES){const first=g.upgradeCost(u.id);assert.equal(g.upgrade(u.id),true);assert.ok(g.upgradeCost(u.id)>first);}
 assert.ok(g.player.maxHp>5);assert.ok(g.player.maxMana>100);assert.ok(g.player.power>1);assert.ok(g.player.regen>10);
 const raw=g.spellCost('KeyE');assert.ok(raw<18);
 for(let j=1;j<5;j++)assert.equal(g.upgrade('fire'),true);
 assert.equal(g.upgrade('fire'),false);
 assert.equal(g.player.upgrades.fire,5);
 assert.equal(g.snapshot().upgradeDetails.fire.next,'MAX');
 g.loadBiome(1);assert.equal(g.player.upgrades.fire,5);
 g.newRun();assert.equal(g.player.upgrades.fire,0);assert.equal(g.player.maxHp,5);
});
test('fire burns, ice slows and freezes, lightning stuns, nova knocks back',()=>{
 const g=new GameEngine();g.newRun();g.player.coins=50000;
 for(let j=0;j<3;j++)g.upgrade('ice');
 const e=g.world.enemies.find(x=>x.hp>0);
 g.damageEnemy(e,.1,'fire');assert.ok(e.burn>0);
 const hp=e.hp;e.burnTick=.01;g.player.invuln=100;g.update(.04);assert.ok(e.hp<hp,'damage over time');
 g.damageEnemy(e,.1,'ice');assert.ok(e.slow>0);assert.ok(e.freeze>0);
 g.damageEnemy(e,.1,'lightning');assert.ok(e.stun>0);
 g.damageEnemy(e,.1,'nova');assert.notEqual(e.knock,0);
});
test('combat upgrades modify damage, healing, shield hits and mana efficiency',()=>{
 const g=new GameEngine();g.newRun();g.player.coins=50000;
 g.player.hp=1;g.upgrade('heal');g.cast('KeyR');assert.equal(g.player.hp,4);
 g.player.cast=0;g.upgrade('shield');g.cast('KeyC');assert.equal(g.player.shieldHits,2);
 const before=g.player.hp;g.player.invuln=0;g.damagePlayer(1);assert.equal(g.player.hp,before);
 g.player.invuln=0;g.damagePlayer(1);assert.equal(g.player.hp,before);
 g.player.invuln=0;g.damagePlayer(1);assert.ok(g.player.hp<before);
 const current=g.spellCost('KeyF');g.upgrade('efficiency');assert.ok(g.spellCost('KeyF')<current);
});
test('cave guardian drops unique ancient book; portal remains locked until collected',()=>{
 const g=new GameEngine();g.newRun();g.loadBiome(2);
 const guardian=g.world.enemies.find(e=>e.type==='guardian');assert.ok(guardian);
 g.world.runes=3;
 g.player.x=g.world.portal.x;g.player.y=g.world.portal.y+30;g.player.invuln=100;g.update(1/60);
 assert.equal(g.biomeIndex,2);
 g.damageEnemy(guardian,100,'spark');
 const book=g.world.items.find(i=>i.type==='book'&&i.active);assert.ok(book);
 g.player.x=book.x;g.player.y=book.y;g.update(1/60);
 assert.equal(g.world.bookCollected,true);
 g.player.x=g.world.portal.x;g.player.y=g.world.portal.y+30;g.update(1/60);
 assert.equal(g.biomeIndex,3);
});
test('cameras track height and full-run reset clears spell specialization',()=>{
 const g=new GameEngine();g.newRun();g.loadBiome(1);g.player.invuln=100;
 g.player.y=-1600;for(let i=0;i<60;i++)g.update(1/60);
 assert.ok(g.cameraY<0,'camera follows vertical player position');
 g.player.coins=1000;g.upgrade('spark');g.equippedSpell='KeyF';
 g.newRun();assert.equal(g.player.upgrades.spark,0);assert.equal(g.equippedSpell,'KeyQ');assert.equal(g.cameraY,0);
});


test('closed maze passages have collision, not just decorations',()=>{
 const g=new GameEngine();g.newRun();g.loadBiome(2);g.world.enemies=[];
 assert.ok(g.world.walls.length>0,'maze has locked shortcuts');
 const wall=g.world.walls[0];g.player.x=wall.x-g.player.w-1;g.player.y=wall.y+15;g.player.vx=310;g.player.invuln=100;
 g.setHeld('ArrowRight',true);g.update(1/60);
 assert.ok(g.player.x+g.player.w<=wall.x+.01,'solid wall blocks walking through closed passage');
});
test('eclipse phase volleys issue a visible warning before projectiles',()=>{
 const g=new GameEngine();g.newRun();g.loadBiome(4);
 const boss=g.world.enemies.find(e=>e.type==='boss');g.world.enemies=[boss];
 boss.attackTimer=0;g.player.invuln=100;g.update(.02);
 assert.ok(boss.telegraph>.45);assert.equal(g.hostile.length,0);
 for(let j=0;j<8;j++)g.update(.05);
 assert.ok(boss.telegraph>0&&g.hostile.length===0,'warning precedes attack');
 for(let j=0;j<5;j++)g.update(.05);
 assert.equal(boss.telegraph,0);assert.ok(g.hostile.length>=3,'warning resolves into phase volley');
});
