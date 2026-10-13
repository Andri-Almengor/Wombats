import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine,SPELLS,SELECTABLE_SPELLS,UPGRADES} from '../src/engine.mjs';
test('new adventure resets stats and changes its generation seed',()=>{
 const g=new GameEngine();g.newRun();const first=g.seed;g.player.hp=1;g.player.coins=500;g.newRun();assert.notEqual(g.seed,first);assert.equal(g.biomeIndex,0);assert.equal(g.player.hp,5);assert.equal(g.player.coins,0);
});
test('all seven spell effects stay available after controls are remapped',()=>{
 assert.deepEqual(SPELLS.map(s=>s.key),['KeyQ','KeyW','KeyE','KeyR','KeyF','KeyC','KeyX']);
 const g=new GameEngine();g.newRun();
 for(const spell of SPELLS){g.player.mana=g.player.maxMana;g.player.cast=0;g.cast(spell.key);assert.ok(g.player.cast>0||spell.key==='KeyR');}
});
test('heal, shield and upgrades affect player stats',()=>{
 const g=new GameEngine();g.newRun();g.player.hp=2;g.cast('KeyR');assert.equal(g.player.hp,4);
 g.player.cast=0;g.cast('KeyC');assert.ok(g.player.shield>0);
 g.player.coins=1500;for(const upgrade of UPGRADES){const previous=g.player.upgrades[upgrade.id];assert.ok(g.upgrade(upgrade.id));assert.equal(g.player.upgrades[upgrade.id],previous+1);}
 assert.ok(g.player.maxHp>5);assert.ok(g.player.maxMana>100);assert.ok(g.player.power>1);assert.ok(g.player.regen>10);
});
test('invulnerability, shield and death restart behaviour',()=>{
 const g=new GameEngine();g.newRun();g.player.invuln=0;g.player.shield=0;g.damagePlayer(1);assert.equal(g.player.hp,4);g.damagePlayer(1);assert.equal(g.player.hp,4);
 g.player.invuln=0;g.player.shield=3;g.damagePlayer(1);assert.equal(g.player.hp,4);
 g.player.shield=0;g.player.invuln=0;g.player.hp=1;const seed=g.seed;g.damagePlayer(1);assert.equal(g.status,'dead');for(let i=0;i<180;i++)g.update(1/60);assert.equal(g.status,'playing');assert.notEqual(g.seed,seed);
});
test('runes unlock a safe portal progression to next biome',()=>{
 const g=new GameEngine();g.newRun();const oldSeed=g.seed;g.world.runes=3;
 g.player.x=g.world.portal.x;g.player.y=g.world.portal.y+30;g.player.invuln=1;
 g.update(1/60);assert.equal(g.biomeIndex,1);assert.equal(g.seed,oldSeed);
});
test('combat rewards experience currency and mana',()=>{
 const g=new GameEngine();g.newRun();const target=g.world.enemies[0],initial=g.player.coins;
 g.damageEnemy(target,100);assert.equal(target.hp,0);assert.equal(g.kills,1);assert.ok(g.player.coins>initial);
});

test('quick S menu freezes absolutely and arrows navigate before Enter confirms the W spell',()=>{
 const g=new GameEngine();g.newRun();g.player.invuln=0;g.player.vx=120;
 const start={x:g.player.x,time:g.time,elapsed:g.elapsed,enemyX:g.world.enemies[0].x,spell:g.equippedSpell};
 assert.equal(g.openSpellMenu(),true);
 assert.equal(g.status,'spell-menu');
 assert.equal(g.held.size,0);
 assert.equal(g.menuIndex,0);
 assert.equal(g.setMenuIndex(2),true);
 assert.equal(g.menuIndex,2);
 assert.equal(g.navigateSpellMenu(1),true);
 assert.equal(g.menuIndex,3);
 assert.equal(g.navigateSpellMenu(1),true);
 assert.equal(g.menuIndex,0);
 assert.equal(g.navigateSpellMenu(-1),true);
 assert.equal(g.menuIndex,3);
 g.tap('KeyW');g.tap('KeyA');g.setHeld('ArrowRight',true);
 for(let i=0;i<90;i++)g.update(1/60);
 assert.equal(g.player.x,start.x);
 assert.equal(g.time,start.time);
 assert.equal(g.elapsed,start.elapsed);
 assert.equal(g.world.enemies[0].x,start.enemyX);
 assert.equal(g.equippedSpell,start.spell);
 assert.equal(g.confirmSpellMenu(),true);
 assert.equal(g.equippedSpell,SELECTABLE_SPELLS[3].key);
 assert.equal(g.status,'playing');
 assert.equal(g.held.size,0);
 assert.equal(g.edge.size,0);
 assert.equal(g.openSpellMenu(),true);
 g.navigateSpellMenu(1);
 assert.equal(g.closeSpellMenu(),true);
 assert.equal(g.equippedSpell,SELECTABLE_SPELLS[3].key,'cancel should not replace equipped spell');
});
test('arrow keys move and fixed A / D / R hotkeys never move the player',()=>{
 const g=new GameEngine();g.newRun();const x=g.player.x;
 g.player.cast=0;g.player.hp=2;g.player.invuln=3;
 g.setHeld('KeyD',true);g.update(1/60);
 assert.equal(g.player.hp,4,'D heals');
 assert.equal(g.player.x,x,'D is no longer movement');
 g.setHeld('KeyD',false);g.player.cast=0;
 g.setHeld('KeyR',true);g.update(1/60);
 assert.ok(g.player.shield>0,'R casts shield');
 assert.equal(g.player.x,x);
 g.setHeld('KeyR',false);g.player.cast=0;g.player.mana=g.player.maxMana;
 g.setHeld('KeyA',true);g.update(1/60);
 assert.ok(g.player.mana<g.player.maxMana-45,'A launches nova');
 assert.equal(g.player.x,x,'A is no longer movement');
 g.setHeld('KeyA',false);
 g.setHeld('ArrowRight',true);g.update(1/60);
 assert.ok(g.player.x>x,'right arrow moves');
});
test('W fires equipped ice, fire, lightning and spark; the menu persists between biomes',()=>{
 const g=new GameEngine();g.newRun();
 for(const spell of SELECTABLE_SPELLS){
  assert.equal(g.openSpellMenu(),true);
  assert.equal(g.selectSpell(spell.key),true);
  g.player.cast=0;g.player.mana=g.player.maxMana;
  const before=g.projectiles.length;
  g.setHeld('KeyW',true);g.update(1/60);g.setHeld('KeyW',false);
  if(['KeyQ','KeyW','KeyE'].includes(spell.key))assert.ok(g.projectiles.length>before,spell.name+' fires a projectile');
  else assert.ok(g.player.cast>0,'lightning triggers casting cooldown');
 }
 const selected=g.equippedSpell;
 g.loadBiome(1);
 assert.equal(g.equippedSpell,selected,'level transitions keep assignment');
 g.newRun();
 assert.equal(g.equippedSpell,'KeyQ','new adventures start on spark');
});
