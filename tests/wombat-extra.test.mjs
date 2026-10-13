import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_SPRITE_CELL,EXTRA_SPRITE_COLS,EXTRA_SPRITE_ROWS,EXTRA_WOMBAT_FRAME_COUNT,EXTRA_WOMBAT_ANIMATIONS} from '../src/assets/meta/wombat-extra-animations.mjs';
import {NAMED_WOMBAT_ANIMATIONS} from '../src/assets/meta/wombat-named-animations.mjs';
import {selectWombatAnimation,chooseWombatFrame} from '../src/wombat-sprites.mjs';
test('old supplementary atlas remains available for rollback',()=>{
 const buf=readFileSync(new URL('../public/assets/sprites/wombat/atlases/wombat-extra.png',import.meta.url));
 assert.equal(buf.subarray(1,4).toString(),'PNG');
 assert.equal(buf.readUInt32BE(16),EXTRA_SPRITE_CELL*EXTRA_SPRITE_COLS);
 assert.equal(buf.readUInt32BE(20),EXTRA_SPRITE_CELL*EXTRA_SPRITE_ROWS);
 assert.equal(EXTRA_WOMBAT_FRAME_COUNT,121);
 let n=0;for(const clip of Object.values(EXTRA_WOMBAT_ANIMATIONS))for(const frame of clip.frames)assert.equal(frame.index,n++);
});
test('historical extra metadata stays consistent for existing imports',()=>{
 const metadata=JSON.parse(readFileSync(new URL('../public/assets/sprites/wombat/atlas-extra.json',import.meta.url),'utf8'));
 for(const [name,clip] of Object.entries(EXTRA_WOMBAT_ANIMATIONS)){
  assert.equal(metadata.animations[name].frames.length,clip.frames.length);
 }
});
test('jump and double jump do not switch to fake levitation',()=>{
 const p={grounded:false,vy:-570,jumps:1,vx:200,dash:0,cast:0,hit:0};
 assert.equal(selectWombatAnimation(p),'jump_start');
 p.vy=-200;p.jumps=2;assert.equal(selectWombatAnimation(p),'double_jump');
 p.vy=0;assert.equal(selectWombatAnimation(p),'jump_air');
 p.vy=410;assert.equal(selectWombatAnimation(p),'fall');
 p.levitating=true;assert.equal(selectWombatAnimation(p),'jump_air');
});
test('spell names and durations match each real named action',()=>{
 const p={x:30,y:90,w:45,h:68,grounded:true,vy:0,vx:0,dash:0,cast:.4,hit:0,healFx:0};
 const untouched={x:p.x,y:p.y,w:p.w,h:p.h};
 const mapped={KeyQ:'cast_basic',KeyW:'cast_ice',KeyE:'cast_fire',KeyF:'cast_lightning',KeyR:'cast_heal',KeyC:'cast_shield',KeyX:'cast_nova'};
 for(const [key,name] of Object.entries(mapped)){
  p.visualSpell=key;assert.equal(selectWombatAnimation(p),name);
  const clip=NAMED_WOMBAT_ANIMATIONS.sano[name];
  for(let t=0;t<2;t+=.07)assert.ok(clip.frames[chooseWombatFrame(name,t,p)]);
 }
 assert.deepEqual({x:p.x,y:p.y,w:p.w,h:p.h},untouched);
});
test('run, hurt, death and victory use dedicated named sequences',()=>{
 const p={grounded:true,vx:320,cast:0,hit:0,dash:0};
 assert.equal(selectWombatAnimation(p),'run');
 p.hit=.5;assert.equal(selectWombatAnimation(p),'hurt');
 assert.equal(selectWombatAnimation(p,'dead'),'death');
 assert.equal(selectWombatAnimation(p,'victory'),'victory');
});
