import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {manifest,validateManifest,SpriteAssetManager} from '../src/player/SpriteAssetManager.mjs';
import {AnimationController} from '../src/player/AnimationController.mjs';
import {PlayerVisualState,healthVariant,SPELL_ACTIONS} from '../src/player/PlayerVisualState.mjs';
import {PlayerSpriteRenderer} from '../src/player/PlayerSpriteRenderer.mjs';
import {GameEngine,freshPlayer} from '../src/engine.mjs';
const clips=manifest.variants.sano.clips;
const hash=b=>createHash('sha256').update(b).digest('hex');
const player=()=>({...freshPlayer(),grounded:true,spawn:0});
function ctxMock(){const calls=[];return {calls,globalAlpha:1,imageSmoothingEnabled:true,save(){calls.push(['save'])},restore(){calls.push(['restore'])},translate(...v){calls.push(['translate',...v])},scale(...v){calls.push(['scale',...v])},drawImage(...v){calls.push(['draw',...v])},beginPath(){},ellipse(){},stroke(){},fill(){},arc(){}};}

test('all 156 rebuilt frames decode, have transparent gutters, exact pixels and disjoint rectangles',()=>{
 assert.equal(validateManifest(manifest),true);let total=0;
 for(const [variant,atlas] of Object.entries(manifest.variants)){
  const bytes=readFileSync(new URL('../public/assets/sprites/wombat/rebuilt/'+atlas.file,import.meta.url));
  assert.equal(hash(bytes),atlas.sha256);const png=PNG.sync.read(bytes);assert.equal(png.width,atlas.width);assert.equal(png.height,atlas.height);
  const rects=[];
  for(const clip of Object.values(atlas.clips))for(const f of clip.frames){
   for(const r of rects)assert.ok(f.x+f.width<=r.x||r.x+r.width<=f.x||f.y+f.height<=r.y||r.y+r.height<=f.y,'frames must not overlap');rects.push(f);
   const rgba=Buffer.alloc(f.width*f.height*4);let opaque=0,transparent=0;
   for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){
    const at=((f.y+y)*png.width+f.x+x)*4,target=(y*f.width+x)*4;png.data.copy(rgba,target,at,at+4);
    const a=rgba[target+3];if(a===0)transparent++;else opaque++;
    if(x<2||y<2||x>=f.width-2||y>=f.height-2)assert.equal(a,0,'2px gutter prevents neighbor bleed');
   }
   assert.ok(opaque>100&&transparent>100);assert.equal(hash(rgba),f.rgbaSha256,`${variant}/${clip.name}: changed crop/content`);
   assert.ok(f.scale>0);assert.ok(f.sourceOrigin.length===2);total++;
  }
  assert.equal(rects.length,variant==='sano'?140:8);
 }
 assert.equal(total,156);assert.equal(Object.keys(clips).length,21);
});

test('asset manager preloads once, decodes and validates dimensions before drawing',async()=>{
 let loads=0,decodes=0;const manager=new SpriteAssetManager({base:'/Wombats/',imageFactory:()=>({set src(url){loads++;const v=Object.values(manifest.variants).find(v=>url.endsWith(v.file));assert.ok(url.startsWith('/Wombats/'));this.naturalWidth=v.width;this.naturalHeight=v.height;queueMicrotask(()=>this.onload());},async decode(){decodes++;}})});
 assert.equal(manager.resolve('sano','idle'),null);await Promise.all([manager.preload(),manager.preload()]);assert.equal(loads,3);assert.equal(decodes,3);assert.ok(manager.resolve('sano','idle'));
 assert.equal(manager.resolve('herido','cast_fire').variant,'sano');
});
for(const failure of ['network','dimensions','decode','factory','timeout'])test(`asset ${failure} failure resolves to procedural fallback without retry storm`,async()=>{
 let attempts=0;const manager=new SpriteAssetManager({timeout:5,imageFactory:()=>{attempts++;if(failure==='factory')throw Error('factory');return {set src(url){this.naturalWidth=failure==='dimensions'?1:manifest.variants.sano.width;this.naturalHeight=manifest.variants.sano.height;queueMicrotask(()=>{if(failure==='network')this.onerror();else if(failure!=='timeout')this.onload();});},async decode(){if(failure==='decode')throw Error('decode');}};}});
 assert.equal(await manager.load('sano'),false);assert.equal(manager.resolve('sano','idle'),null);await manager.load('sano');assert.equal(attempts,1);
});
test('bad metadata is rejected before loading',()=>{const data=structuredClone(manifest);data.variants.sano.clips.idle.frames[0].x=-1;assert.throws(()=>validateManifest(data));});

test('loop and one-shot timing is independent of render rate and holds the final pose',()=>{
 for(const clip of Object.values(clips)){
  const a=new AnimationController(),b=new AnimationController();a.play(clip.name,clip);b.play(clip.name,clip);
  for(let i=0;i<120;i++)a.advance(1/60);for(const dt of [.01,.24,.75,1])b.advance(dt);
  assert.equal(a.frameIndex(),b.frameIndex(),clip.name);assert.equal(a.complete,!clip.loop);
  if(!clip.loop)assert.equal(a.frameIndex(),clip.frames.length-1);
 }
});
test('same action persists; new token restarts same spell at frame zero',()=>{
 const p=player(),v=new PlayerVisualState(p);p.visualSpell='KeyE';p.castSequence=1;v.update(p,'playing',0);v.update(p,'playing',.3);assert.ok(v.controller.frameIndex()>0);
 p.castSequence++;v.update(p,'playing',.01);assert.equal(v.controller.action,'cast_fire');assert.equal(v.controller.frameIndex(),0);
 v.update(p,'playing',.15);assert.ok(v.controller.frameIndex()>0);
});
for(const [key,action] of Object.entries(SPELL_ACTIONS))test(`${key}: real accepted cast plays complete ${action} after cooldown ends`,()=>{
 const e=new GameEngine();e.newRun();e.player.hp=2;const v=new PlayerVisualState(e.player);e.cast(key);v.update(e.player,'playing',0);assert.equal(v.controller.action,action);
 e.player.cast=0;const seen=new Set([0]);const duration=clips[action].frames.length/clips[action].fps;
 for(let t=0;t<duration-.02;t+=.01){v.update(e.player,'playing',.01);if(v.controller.action===action)seen.add(v.controller.frameIndex());}
 assert.equal(seen.size,clips[action].frames.length);v.update(e.player,'playing',.1);assert.equal(v.controller.action,'idle');
});
test('walk/run hysteresis and phase; airborne ascent, fall, double jump and moving landing',()=>{
 const p=player(),v=new PlayerVisualState(p);p.vx=150;v.update(p,'playing',.1);assert.equal(v.controller.action,'walk');v.update(p,'playing',.2);const phase=v.controller.phase;
 p.vx=310;v.update(p,'playing',0);assert.equal(v.controller.action,'run');assert.ok(Math.abs(v.controller.phase-phase)<1e-8);
 p.vx=220;v.update(p,'playing',0);assert.equal(v.controller.action,'run');p.vx=180;v.update(p,'playing',0);assert.equal(v.controller.action,'walk');
 p.grounded=false;p.vy=-650;p.jumps=1;p.jumpSequence=1;v.update(p,'playing',.016);assert.equal(v.controller.action,'jump_start');v.update(p,'playing',.26);assert.equal(v.controller.action,'jump_air');
 p.vy=-600;p.jumps=2;p.jumpSequence++;v.update(p,'playing',.016);assert.equal(v.controller.action,'double_jump');
 v.update(p,'playing',.4);p.vy=200;v.update(p,'playing',.01);assert.equal(v.controller.action,'fall');
 p.grounded=true;p.landSequence=1;p.vx=310;v.update(p,'playing',.016);assert.equal(v.controller.action,'land');v.update(p,'playing',.3);assert.equal(v.controller.action,'run');
});
test('death > hurt > dash; interrupted events do not replay later',()=>{
 const p=player(),v=new PlayerVisualState(p);p.dash=.19;p.dashSequence=1;v.update(p,'playing',0);assert.equal(v.controller.action,'dash');
 p.dash=0;v.update(p,'playing',.1);assert.equal(v.controller.action,'dash');assert.ok(v.controller.frameIndex()>0);
 p.hit=.5;p.hurtSequence=1;p.castSequence=1;p.visualSpell='KeyQ';v.update(p,'playing',.01);assert.equal(v.controller.action,'hurt');
 v.update(p,'dead',.01);assert.equal(v.controller.action,'death');v.update(p,'dead',3);assert.equal(v.controller.frameIndex(),9);
 p.hit=0;p.visualEpoch=1;v.update(p,'playing',0);assert.equal(v.controller.action,'idle');
});
test('health variants preserve canonical clip phase; missing injury actions use healthy clip',async()=>{
 const p=player(),v=new PlayerVisualState(p);v.update(p,'playing',.42);const elapsed=v.controller.elapsed;
 for(const [hp,name] of [[5,'sano'],[3,'herido'],[1,'critico']]){p.hp=hp;assert.equal(healthVariant(p),name);v.update(p,'playing',0);assert.equal(v.controller.elapsed,elapsed);const clip=manifest.variants[name].clips.idle;assert.equal(v.controller.frameIndex(clip),Math.floor(v.controller.phase*clip.frames.length));}
});
test('pause freezes, victory animates using render delta, epoch and fresh run clear old actions',()=>{
 const p=player(),v=new PlayerVisualState(p);v.update(p,'playing',.2);const elapsed=v.controller.elapsed;v.update(p,'paused',2);assert.equal(v.controller.elapsed,elapsed);
 v.update(p,'victory',0);v.update(p,'victory',.4);assert.ok(v.controller.frameIndex()>0);
 p.visualEpoch=1;v.update(p,'playing',0);assert.equal(v.controller.action,'idle');assert.equal(v.controller.elapsed,0);
 const fresh=new PlayerVisualState(player());assert.equal(fresh.controller.action,'idle');
});
test('book pickup plays only on actual event; climb is prepared but never fabricated',()=>{
 const p=player(),v=new PlayerVisualState(p);p.pickupSequence=1;v.update(p,'playing',0);assert.equal(v.controller.action,'pickup');v.update(p,'playing',1);assert.equal(v.controller.action,'idle');assert.ok(clips.climb);
 p.climbing=true;v.update(p,'playing',0);assert.notEqual(v.controller.action,'climb');
});
test('renderer maps every calibrated pivot to hitbox feet, mirrors sockets, preserves physics',()=>{
 const p=player(),before=structuredClone(p),renderer=new PlayerSpriteRenderer();
 for(const atlas of Object.values(manifest.variants))for(const clip of Object.values(atlas.clips))for(const f of clip.frames){
  const c=ctxMock();renderer.draw(c,p,{},f);const d=c.calls.find(c=>c[0]==='draw');assert.equal(d[6]+f.pivot[0],0);assert.equal(d[7]+f.pivot[1],0);assert.equal(d[8],f.width);assert.equal(d[9],f.height);
  assert.deepEqual(c.calls.find(c=>c[0]==='translate'),['translate',p.x+p.w/2,p.y+p.h]);
 }
 assert.deepEqual(p,before);const frame=clips.cast_fire.frames[3],right=renderer.socket(p,frame,{});p.dir=-1;const left=renderer.socket(p,frame,{});assert.equal(right.y,left.y);assert.equal(right.x+left.x,2*(p.x+p.w/2));
 const c=ctxMock();renderer.draw(c,p,{},frame);assert.deepEqual(c.calls.find(c=>c[0]==='scale'),['scale',-1,1]);
});
test('draw errors always restore Canvas state for procedural fallback',()=>{const c=ctxMock();c.drawImage=()=>{throw Error('broken image')};assert.throws(()=>new PlayerSpriteRenderer().draw(c,player(),{},clips.idle.frames[0]));assert.deepEqual(c.calls.at(-1),['restore']);});
test('new biome communicates a reset without changing hitbox, controls, upgrades or health',()=>{
 const e=new GameEngine();e.newRun();const p=e.player,epoch=p.visualEpoch;const before={w:p.w,h:p.h,hp:p.hp,upgrades:{...p.upgrades}};e.loadBiome(1);assert.equal(p.visualEpoch,epoch+1);assert.deepEqual({w:p.w,h:p.h,hp:p.hp,upgrades:{...p.upgrades}},before);
});

test('blue spells and death contain no detached red cape/boot fragments from neighboring poses',()=>{
 const atlas=manifest.variants.sano,png=PNG.sync.read(readFileSync(new URL('../public/assets/sprites/wombat/rebuilt/'+atlas.file,import.meta.url)));
 // Content regression: unlike fire particles, these blue/yellow clips have no red FX.
 for(const name of ['cast_basic','cast_ice','cast_lightning','death','victory','pickup'])for(const f of atlas.clips[name].frames){
  const visited=new Uint8Array(f.width*f.height),components=[];
  const pixel=i=>((f.y+Math.floor(i/f.width))*png.width+f.x+i%f.width)*4;
  for(let i=0;i<visited.length;i++){
   if(visited[i]||png.data[pixel(i)+3]<=25)continue;
   const stack=[i];visited[i]=1;let area=0,red=0;
   while(stack.length){const u=stack.pop(),at=pixel(u),x=u%f.width,y=Math.floor(u/f.width);area++;
    if(png.data[at+3]>100&&png.data[at]>90&&png.data[at]>png.data[at+1]*1.8&&png.data[at]>png.data[at+2]*1.3)red++;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*f.width+xx;if(xx<0||yy<0||xx>=f.width||yy>=f.height||visited[n]||png.data[pixel(n)+3]<=25)continue;visited[n]=1;stack.push(n);}
   }components.push({area,red});
  }
  components.sort((a,b)=>b.area-a.area);for(const extra of components.slice(1))assert.ok(extra.red<=4,`${name}/${f.sourceIndex}: foreign clothing fragment`);
 }
});
