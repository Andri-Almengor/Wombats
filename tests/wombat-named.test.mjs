import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NAMED_ATLASES,NAMED_WOMBAT_ANIMATIONS,NAMED_WOMBAT_FRAME_COUNT,NAMED_SPRITE_CELL,NAMED_SPRITE_PIVOT} from '../src/assets/meta/wombat-named-animations.mjs';
import {wombatDrawRect,preloadWombatSprites,drawWombatSprite,wombatSpriteStatus,resolveWombatVisualAction,chooseWombatFrame} from '../src/wombat-sprites.mjs';

test('the 3 supplied atlases are real transparent PNGs with validated frame grids',()=>{
 assert.equal(NAMED_WOMBAT_FRAME_COUNT,156);
 assert.deepEqual(NAMED_SPRITE_PIVOT,{x:48,y:88});
 for(const [variant,cfg] of Object.entries(NAMED_ATLASES)){
  const bytes=readFileSync(new URL('../public/assets/sprites/wombat/named/'+cfg.file,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString(),'PNG',variant);
  assert.equal(bytes.readUInt32BE(16),cfg.width,variant+' width');
  assert.equal(bytes.readUInt32BE(20),cfg.height,variant+' height');
  assert.ok(bytes.includes(Buffer.from('tRNS')),variant+' must keep PNG transparency');
  let total=0;
  for(const clip of Object.values(NAMED_WOMBAT_ANIMATIONS[variant])){
   assert.ok(clip.frames.length>0);
   assert.ok(clip.frameDuration>0);
   for(const frame of clip.frames){
    assert.equal(frame.width,NAMED_SPRITE_CELL);
    assert.equal(frame.height,NAMED_SPRITE_CELL);
    assert.ok(frame.x>=0&&frame.x+frame.width<=cfg.width);
    assert.ok(frame.y>=0&&frame.y+frame.height<=cfg.height);
    total++;
   }
  }
  assert.equal(total,variant==='sano'?140:8);
 }
});
test('sprite footprint is invariant over actions and with mirrored orientation',()=>{
 const p={x:120,y:300,w:45,h:68,dir:1,hp:5,maxHp:5};
 const rect=wombatDrawRect(p);
 assert.equal(rect.width,126);
 assert.equal(rect.height,126);
 assert.equal(rect.worldCenterX,142.5);
 assert.equal(rect.worldFeetY,368);
 assert.equal(rect.y+(NAMED_SPRITE_PIVOT.y/NAMED_SPRITE_CELL)*rect.height,0);
 p.dir=-1;assert.deepEqual(wombatDrawRect(p),rect);
});
test('landing and repeated casts have deterministic visual-only transitions',()=>{
 const state={castSequence:0,wasGrounded:false,landUntil:0,spellAction:null,spellUntil:0};
 const p={grounded:true,vx:0,dash:0,cast:0,hit:0,vy:0,jumps:1,castSequence:0};
 assert.equal(resolveWombatVisualAction(p,1,'playing',state),'land');
 assert.equal(resolveWombatVisualAction(p,1.3,'playing',state),'idle');
 p.visualSpell='KeyW';p.castSequence=1;p.cast=.1;
 assert.equal(resolveWombatVisualAction(p,2,'playing',state),'cast_ice');
 p.cast=0;
 assert.equal(resolveWombatVisualAction(p,2.09,'playing',state),'cast_ice','brief cooldown cannot chop first frames');
 assert.equal(resolveWombatVisualAction(p,2.65,'playing',state),'idle');
 p.visualSpell='KeyE';p.castSequence=2;
 assert.equal(resolveWombatVisualAction(p,3,'playing',state),'cast_fire','next cast starts new sequence');
});
test('mock Canvas draws identical destination geometry on healthy/injured/spell and moves via flip',()=>{
 const loaded=[];
 const Original=globalThis.Image;
 globalThis.Image=class{
  constructor(){this.naturalWidth=0;this.naturalHeight=0;}
  set src(path){
   this.path=path;const state=path.includes('wombat-critico')?'critico':path.includes('wombat-herido')?'herido':'sano';
   this.naturalWidth=NAMED_ATLASES[state].width;
   this.naturalHeight=NAMED_ATLASES[state].height;
   loaded.push(state);this.onload?.();
  }
 };
 try{
  preloadWombatSprites();
  assert.equal(wombatSpriteStatus(),'ready');
  assert.deepEqual(loaded.sort(),['critico','herido','sano']);
  const calls=[];
  const ctx={globalAlpha:1,imageSmoothingEnabled:true,save(){},restore(){},translate(){},scale(){},
   drawImage(...args){calls.push(args)},beginPath(){},ellipse(){},stroke(){},fill(){}};
  const p={x:50,y:80,w:45,h:68,dir:1,hp:5,maxHp:5,grounded:true,vx:0,vy:0,cast:0,dash:0,hit:0,spawn:0,invuln:0,healFx:0};
  assert.equal(drawWombatSprite(ctx,p,1),true);
  p.hp=2;p.x+=10;assert.equal(drawWombatSprite(ctx,p,1.2),true);
  p.hp=1;p.vx=120;p.dir=-1;assert.equal(drawWombatSprite(ctx,p,1.5),true);
  p.visualSpell='KeyE';p.castSequence=1;p.cast=.36;
  assert.equal(drawWombatSprite(ctx,p,1.6),true);
  assert.equal(calls.length,4);
  for(const args of calls){assert.deepEqual(args.slice(5),calls[0].slice(5),'no change in visual pixel size or pivot');}
  assert.equal(calls[0][0].path.includes('wombat-sano'),true);
  assert.equal(calls[1][0].path.includes('wombat-herido'),true);
  assert.equal(calls[2][0].path.includes('wombat-critico'),true);
  assert.equal(calls[3][0].path.includes('wombat-sano'),true,'combat sprite has only healthy variant');
 }finally{globalThis.Image=Original;}
});
test('no loop overflow even after many respawn/animation iterations',()=>{
 for(const [variant,actions] of Object.entries(NAMED_WOMBAT_ANIMATIONS)){
  for(const [name,clip] of Object.entries(actions)){
   for(let t=0;t<75;t+=.49){
    const index=chooseWombatFrame(name,t,{dash:0},variant);
    assert.ok(index>=0&&index<clip.frames.length,variant+':'+name);
   }
  }
 }
});
