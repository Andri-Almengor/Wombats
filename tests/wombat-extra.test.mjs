import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXTRA_SPRITE_CELL,EXTRA_SPRITE_COLS,EXTRA_SPRITE_ROWS,EXTRA_WOMBAT_FRAME_COUNT,EXTRA_WOMBAT_ANIMATIONS} from '../src/assets/meta/wombat-extra-animations.mjs';
import {selectWombatAnimation,chooseWombatFrame} from '../src/wombat-sprites.mjs';
const root=new URL('../public/assets/sprites/wombat/atlases/wombat-extra.png',import.meta.url);
test('the additional sprite atlas has 121 frames and correct PNG dimensions',()=>{
 const buf=readFileSync(root);
 assert.equal(buf.subarray(1,4).toString(),'PNG');
 assert.equal(buf.readUInt32BE(16),EXTRA_SPRITE_CELL*EXTRA_SPRITE_COLS);
 assert.equal(buf.readUInt32BE(20),EXTRA_SPRITE_CELL*EXTRA_SPRITE_ROWS);
 assert.equal(EXTRA_WOMBAT_FRAME_COUNT,121);
 let n=0;for(const a of Object.values(EXTRA_WOMBAT_ANIMATIONS))for(const frame of a.frames){assert.equal(frame.index,n++);assert.ok(frame.duration>0);}
 assert.equal(n,121);
});
test('JSON metadata matches the supplemental atlas positions and source sheets',()=>{
 const metadata=JSON.parse(readFileSync(new URL('../public/assets/sprites/wombat/atlas-extra.json',import.meta.url),'utf8'));
 let total=0;
 for(const [name,clip] of Object.entries(EXTRA_WOMBAT_ANIMATIONS)){
  const data=metadata.animations[name];assert.ok(data,name);
  assert.equal(data.frames.length,clip.frames.length,name);
  for(let i=0;i<clip.frames.length;i++){
   const expected=clip.frames[i],actual=data.frames[i];
   assert.equal(expected.index,actual.index);
   assert.deepEqual(actual.rect,[expected.x,expected.y,expected.width,expected.height]);
   assert.ok(actual.usefulRect[2]>actual.usefulRect[0]);
   assert.ok(actual.usefulRect[3]>actual.usefulRect[1]);
   total++;
  }
 }
 assert.equal(total,121);
 assert.equal(new Set(Object.values(metadata.animations).map(a=>a.sourceSheet)).size,9);
});
test('ordinary jumps do not incorrectly use levitation and aerial sprites',()=>{
 const p={grounded:false,vy:-570,jumps:1,vx:200,dash:0,cast:0,hit:0};
 assert.equal(selectWombatAnimation(p),'jump');
 p.vy=-200;p.jumps=2;assert.equal(selectWombatAnimation(p),'jump_staff');
 p.vy=0;assert.equal(selectWombatAnimation(p),'jump_air');
 p.vy=410;assert.equal(selectWombatAnimation(p),'fall');
 p.levitating=true;assert.equal(selectWombatAnimation(p),'levitate');
});
test('every actual spell has its own animation and does not alter player physics',()=>{
 const p={x:30,y:90,w:45,h:68,grounded:true,vy:0,vx:0,dash:0,cast:.4,hit:0,healFx:0};
 const initial={x:p.x,y:p.y,w:p.w,h:p.h};
 const options={KeyQ:'book_cast',KeyW:'ice_cast',KeyE:'fire_cast',KeyF:'lightning_cast',KeyR:'heal',KeyC:'shield_cast',KeyX:'nova_cast'};
 for(const [key,action] of Object.entries(options)){
  p.visualSpell=key;assert.equal(selectWombatAnimation(p),action);
  const count=EXTRA_WOMBAT_ANIMATIONS[action].frames.length;
  for(let t=0;t<1.5;t+=.09)assert.ok(chooseWombatFrame(action,t,p)<count);
 }
 assert.deepEqual({x:p.x,y:p.y,w:p.w,h:p.h},initial);
});
test('idle/running/hurt/defeat/victory selection and atlas bounds',()=>{
 const p={grounded:true,vx:0,cast:0,hit:0,dash:0,healFx:0};
 assert.equal(selectWombatAnimation(p),'idle');
 p.vx=130;assert.equal(selectWombatAnimation(p),'walk');
 p.vx=320;assert.equal(selectWombatAnimation(p),'run_fast');
 p.hit=.4;assert.equal(selectWombatAnimation(p),'hurt');
 assert.equal(selectWombatAnimation(p,'dead'),'defeat');
 assert.equal(selectWombatAnimation(p,'victory'),'victory');
 const frameCount=EXTRA_WOMBAT_FRAME_COUNT;
 for(const anim of Object.values(EXTRA_WOMBAT_ANIMATIONS))for(const frame of anim.frames){
  assert.ok(frame.x>=0&&frame.x+frame.width<=EXTRA_SPRITE_CELL*EXTRA_SPRITE_COLS);
  assert.ok(frame.y>=0&&frame.y+frame.height<=EXTRA_SPRITE_CELL*EXTRA_SPRITE_ROWS);
  assert.ok(frame.index<frameCount);
 }
});