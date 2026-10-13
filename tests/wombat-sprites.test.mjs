import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {WOMBAT_ANIMATIONS,SPRITE_CELL,SPRITE_COLS,WOMBAT_FRAME_COUNT} from '../src/assets/meta/wombat-animations.mjs';
import {selectWombatAnimation,chooseWombatFrame} from '../src/wombat-sprites.mjs';
const root=fileURLToPath(new URL('../public/assets/sprites/wombat/',import.meta.url));
test('atlas exists, is a valid PNG and has the expected dimensions',()=>{
 const file=root+'atlases/wombat.png';
 assert.ok(existsSync(file),'must commit the real sprite PNG, not just the renderer');
 const bytes=readFileSync(file);
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),SPRITE_CELL*SPRITE_COLS);
 assert.equal(bytes.readUInt32BE(20),SPRITE_CELL*5);
});
test('all eight source actions have sorted usable frames, durations and pivots',()=>{
 assert.equal(WOMBAT_FRAME_COUNT,37);
 const all=[];
 for(const [name,anim] of Object.entries(WOMBAT_ANIMATIONS)){
  assert.ok(anim.frames.length>=2,name);
  assert.ok(anim.frameDuration>0);
  assert.equal(anim.pivot.x,0.5);
  assert.ok(anim.pivot.y>0.9);
  for(const frame of anim.frames){
   assert.ok(frame.duration>0 && frame.file.endsWith('.png'));
   assert.equal(frame.width,SPRITE_CELL);
   all.push(frame.index);
  }
 }
 assert.deepEqual(all,Array.from({length:37},(_,i)=>i));
});
test('idle, walk, jump and dash transition without touching physics',()=>{
 const p={x:0,y:0,w:45,h:68,dir:1,grounded:true,vx:0,vy:0,dash:0,cast:0,hit:0,healFx:0};
 const untouched={x:p.x,y:p.y,w:p.w,h:p.h};
 assert.equal(selectWombatAnimation(p),'idle');
 p.vx=180;assert.equal(selectWombatAnimation(p),'walk');
 p.grounded=false;p.vy=-500;assert.equal(selectWombatAnimation(p),'jump');
 p.vy=60;assert.equal(selectWombatAnimation(p),'levitate');
 p.vy=300;assert.equal(selectWombatAnimation(p),'fall');
 p.dash=0.16;assert.equal(selectWombatAnimation(p),'dash');
 p.dash=0;p.cast=0.25;assert.equal(selectWombatAnimation(p),'cast');
 assert.deepEqual({x:p.x,y:p.y,w:p.w,h:p.h},untouched);
 assert.ok(chooseWombatFrame('walk',0,p)<WOMBAT_ANIMATIONS.walk.frames.length);
 assert.equal(chooseWombatFrame('dash',0,p),5);
});
test('temporary death fallback exists; all frame indices remain safe after restarts',()=>{
 for(let i=0;i<200;i++){
  const p={grounded:i%3===0,vx:i%2?300:0,vy:i%2?-510:220,dash:0,cast:0,hit:0};
  const a=selectWombatAnimation(p,i%17===0?'dead':'playing');
  const ix=chooseWombatFrame(a,i*0.037,p);
  assert.ok(WOMBAT_ANIMATIONS[a].frames[ix],a+' '+ix);
 }
});
