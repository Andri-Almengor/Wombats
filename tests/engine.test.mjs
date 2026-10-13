import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine,SPELLS,UPGRADES} from '../src/engine.mjs';
test('new adventure resets stats and changes its generation seed',()=>{
 const g=new GameEngine();g.newRun();const first=g.seed;g.player.hp=1;g.player.coins=500;g.newRun();assert.notEqual(g.seed,first);assert.equal(g.biomeIndex,0);assert.equal(g.player.hp,5);assert.equal(g.player.coins,0);
});
test('all seven spells are present on the left half of the keyboard',()=>{
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
 g.player.shield=0;g.player.invuln=0;g.player.hp=1;const seed=g.seed;g.damagePlayer(1);assert.equal(g.status,'dead');g.update(2.6);assert.equal(g.status,'playing');assert.notEqual(g.seed,seed);
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
