import test from 'node:test';
import assert from 'node:assert/strict';
import {GAMEPLAY_KEYS,JUMP_KEYS,wantsJump} from '../src/controls.mjs';
import {GameEngine} from '../src/engine.mjs';

test('browser input accepts ArrowUp and Space while preserving horizontal controls',()=>{
 assert.ok(GAMEPLAY_KEYS.has('ArrowUp'),'ArrowUp must reach the engine from App keydown');
 assert.ok(GAMEPLAY_KEYS.has('Space'));
 assert.ok(GAMEPLAY_KEYS.has('ArrowLeft'));
 assert.ok(GAMEPLAY_KEYS.has('ArrowRight'));
 assert.deepEqual(JUMP_KEYS,['Space','ArrowUp']);
 assert.equal(wantsJump(new Set(['ArrowUp'])),true);
 assert.equal(wantsJump(new Set(['Space'])),true);
 assert.equal(wantsJump(new Set(['ArrowRight'])),false);
});

test('ArrowUp and Space can both perform first and double jumps',()=>{
 for(const key of ['ArrowUp','Space']){
  const g=new GameEngine();g.newRun();
  g.setHeld(key,true);g.update(1/60);
  assert.equal(g.player.jumps,1, key+' should trigger the first jump');
  assert.ok(g.player.vy<0);
  g.update(1/60);
  assert.equal(g.player.jumps,1,'holding '+key+' must not double-jump automatically');
  g.setHeld(key,false);
  g.setHeld(key,true);g.update(1/60);
  assert.equal(g.player.jumps,2,'a new '+key+' press triggers the second jump');
  g.setHeld(key,false);
  g.setHeld(key,true);g.update(1/60);
  assert.equal(g.player.jumps,2,'third jump should be blocked until landing');
 }
});

test('ArrowUp during S selector is reserved for selecting spells and freezes movement',()=>{
 const g=new GameEngine();g.newRun();
 assert.equal(g.openSpellMenu(),true);
 const initial={y:g.player.y,vy:g.player.vy,time:g.time};
 g.navigateSpellMenu(-1);
 assert.equal(g.menuIndex,3,'up arrow navigates backwards in S selector');
 g.tap('ArrowUp');g.update(1/60);
 assert.equal(g.player.y,initial.y);
 assert.equal(g.player.vy,initial.vy);
 assert.equal(g.time,initial.time);
 assert.equal(g.closeSpellMenu(),true);
 g.setHeld('ArrowUp',true);g.update(1/60);
 assert.equal(g.player.jumps,1,'jump returns immediately after closing S');
});
