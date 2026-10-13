import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WOMBAT_ANIMATIONS,SPRITE_CELL,SPRITE_COLS,WOMBAT_FRAME_COUNT} from '../src/assets/meta/wombat-animations.mjs';
import {NAMED_WOMBAT_ANIMATIONS,NAMED_WOMBAT_FRAME_COUNT} from '../src/assets/meta/wombat-named-animations.mjs';
import {selectWombatAnimation,chooseWombatFrame} from '../src/wombat-sprites.mjs';

test('original core sprites remain as a safe historical asset',()=>{
 const file=new URL('../public/assets/sprites/wombat/atlases/wombat.png',import.meta.url);
 const bytes=readFileSync(file);
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),SPRITE_CELL*SPRITE_COLS);
 assert.equal(bytes.readUInt32BE(20),SPRITE_CELL*5);
 assert.equal(WOMBAT_FRAME_COUNT,37);
 for(const clip of Object.values(WOMBAT_ANIMATIONS))assert.ok(clip.frames.length>=2);
});
test('new selector and frame bounds follow named sprite ZIP',()=>{
 assert.equal(NAMED_WOMBAT_FRAME_COUNT,156);
 const p={x:0,y:0,w:45,h:68,dir:1,grounded:true,vx:0,vy:0,dash:0,cast:0,hit:0,healFx:0,jumps:0};
 const before={x:p.x,y:p.y,w:p.w,h:p.h};
 assert.equal(selectWombatAnimation(p),'idle');
 p.vx=160;assert.equal(selectWombatAnimation(p),'walk');
 p.vx=320;assert.equal(selectWombatAnimation(p),'run');
 p.grounded=false;p.vy=-500;p.jumps=1;assert.equal(selectWombatAnimation(p),'jump_start');
 p.jumps=2;assert.equal(selectWombatAnimation(p),'double_jump');
 p.vy=0;assert.equal(selectWombatAnimation(p),'jump_air');
 p.vy=300;assert.equal(selectWombatAnimation(p),'fall');
 p.dash=.15;assert.equal(selectWombatAnimation(p),'dash');
 p.dash=0;p.cast=.25;p.visualSpell='KeyE';assert.equal(selectWombatAnimation(p),'cast_fire');
 assert.deepEqual({x:p.x,y:p.y,w:p.w,h:p.h},before);
 for(const clip of Object.values(NAMED_WOMBAT_ANIMATIONS.sano)){
  for(let t=0;t<1.8;t+=.09)assert.ok(clip.frames[chooseWombatFrame(clip.name,t,p)],clip.name);
 }
});
test('death and restart do not choose non-existent frames',()=>{
 for(let i=0;i<250;i++){
  const p={grounded:i%3===0,vx:i%2?320:0,vy:i%2?-500:190,dash:0,cast:0,hit:0};
  const action=selectWombatAnimation(p,i%17===0?'dead':'playing');
  assert.ok(NAMED_WOMBAT_ANIMATIONS.sano[action]);
  assert.ok(NAMED_WOMBAT_ANIMATIONS.sano[action].frames[chooseWombatFrame(action,i*.037,p)]);
 }
});
