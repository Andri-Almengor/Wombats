import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const out=new URL('../../test-results/',import.meta.url);await mkdir(out,{recursive:true});
const server=await createServer({base:'/Wombats/',server:{host:'127.0.0.1',port:0}});await server.listen();
const port=server.httpServer.address().port,base=`http://127.0.0.1:${port}/Wombats/`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']}:{})});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);
 await page.evaluate(async()=>{const api=await import('/Wombats/src/wombat-sprites.mjs');await api.preloadWombatSprites();if(api.wombatSpriteStatus()!=='ready')throw Error('Atlas not ready');});
 await page.getByRole('button',{name:/Comenzar aventura/}).click();
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
 await page.keyboard.press('Space');await page.waitForTimeout(140);await page.keyboard.press('ArrowUp');
 await page.keyboard.press('Shift');await page.keyboard.press('w');await page.keyboard.press('s');
 await page.getByRole('dialog',{name:'Elegir hechizo para W'}).waitFor();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
 await page.keyboard.press('u');await page.getByRole('dialog',{name:'Mejoras del personaje'}).waitFor();await page.keyboard.press('Escape');
 await page.screenshot({path:new URL('game-controls.png',out).pathname});
 // Real browser Image decoding and Canvas, all authored frames, both directions.
 const atlasResult=await page.evaluate(async()=>{
  const {SpriteAssetManager,manifest}=await import('/Wombats/src/player/SpriteAssetManager.mjs');
  const {PlayerSpriteRenderer}=await import('/Wombats/src/player/PlayerSpriteRenderer.mjs');
  const {freshPlayer}=await import('/Wombats/src/engine.mjs');
  const manager=new SpriteAssetManager({base:'/Wombats/'});await manager.preload();
  const canvas=document.createElement('canvas');canvas.id='sprite-review';canvas.width=1700;canvas.height=25*180;document.body.replaceChildren(canvas);const c=canvas.getContext('2d');c.fillStyle='#282c35';c.fillRect(0,0,canvas.width,canvas.height);
  const renderer=new PlayerSpriteRenderer();let frames=0,row=0;
  for(const [variant,atlas] of Object.entries(manifest.variants)){
   if(manager.entries[variant].status!=='ready')throw Error(variant+' not decoded');
   for(const [action,clip] of Object.entries(atlas.clips)){
    c.fillStyle='white';c.font='13px sans-serif';c.fillText(variant+'/'+action,5,row*180+22);
    for(const [i,f] of clip.frames.entries()){
     const p={...freshPlayer(),x:160+i*150,y:row*180+82,w:45,h:68,grounded:true};renderer.draw(c,p,manager.entries[variant].image,f);
     const scratch=document.createElement('canvas');scratch.width=400;scratch.height=250;const sc=scratch.getContext('2d');p.x=180;p.y=100;
     renderer.draw(sc,p,manager.entries[variant].image,f);p.dir=-1;renderer.draw(sc,p,manager.entries[variant].image,f);
     if(!sc.getImageData(0,0,400,250).data.some((x,j)=>j%4===3&&x>0))throw Error('Blank '+variant+'/'+action);
     frames++;
    }row++;
   }
  }
  return {frames,clips:row};
 });
 assert.deepEqual(atlasResult,{frames:156,clips:25});
 await page.locator('#sprite-review').screenshot({path:new URL('all-frames.png',out).pathname});
 const result=await page.evaluate(async()=>{
  const {GameEngine}=await import('/Wombats/src/engine.mjs');const {drawGame}=await import('/Wombats/src/render.mjs');
  const {updateWombatVisual,preloadWombatSprites}=await import('/Wombats/src/wombat-sprites.mjs');await preloadWombatSprites();
  const canvas=document.createElement('canvas');canvas.id='engine-review';canvas.width=1280;canvas.height=720;document.body.replaceChildren(canvas);const c=canvas.getContext('2d');
  // Stable test floor keeps procedural gaps from interrupting spell scenarios.
  const e=new GameEngine();e.makeSeed=()=>123456;e.newRun();e.world.enemies=[];e.world.hazards=[];e.world.platforms=[{x:0,y:600,w:10000,h:100}];e.player.x=100;e.player.y=600-e.player.h;const seen=new Set();
  function step(n=1){for(let i=0;i<n;i++){e.update(1/60);drawGame(c,e,e.status==='victory'?1/60:undefined);seen.add(updateWombatVisual(e.player,e.time,e.status,0).visual.controller.action);}}
  step(80);e.setHeld('ArrowRight',true);step(25);e.setHeld('ArrowRight',false);step(25);
  e.tap('Space');step(10);e.tap('ArrowUp');step(75);
  e.tap('ShiftLeft');step(16);
  for(const key of ['KeyQ','KeyW','KeyE','KeyF','KeyX','KeyR','KeyC']){e.player.cast=0;e.player.mana=100;e.player.hp=2;e.cast(key);step(65);}
  e.player.shield=0;e.player.invuln=0;e.damagePlayer(1);step(40);
  e.player.pickupSequence=(e.player.pickupSequence||0)+1;e.player.grounded=true;step(1);
  e.player.shield=0;e.player.invuln=0;e.damagePlayer(100);step(90);
  const deathFrame=updateWombatVisual(e.player,e.time,e.status,0).visual.controller.frameIndex();
  e.newRun();step(2);const restart=updateWombatVisual(e.player,e.time,e.status,0).visual.controller.action;
  e.status='victory';step(30);const victoryFrame=updateWombatVisual(e.player,e.time,e.status,0).visual.controller.frameIndex();
  return {seen:[...seen],deathFrame,restart,victoryFrame};
 });
 for(const action of ['idle','walk','run','jump_start','jump_air','double_jump','fall','land','dash','cast_basic','cast_ice','cast_fire','cast_lightning','cast_nova','cast_heal','cast_shield','hurt','pickup','death','victory'])assert.ok(result.seen.includes(action),'Engine integration missing '+action);
 assert.equal(result.deathFrame,9);assert.equal(result.restart,'idle');assert.ok(result.victoryFrame>0);
 await page.locator('#engine-review').screenshot({path:new URL('victory.png',out).pathname});
 // Network failures use the procedural renderer, never an incomplete image.
 const failed=await browser.newPage();await failed.route('**/assets/sprites/wombat/rebuilt/*.png',r=>r.abort());await failed.goto(base);
 const fallback=await failed.evaluate(async()=>{const api=await import('/Wombats/src/wombat-sprites.mjs');await api.preloadWombatSprites();const {freshPlayer}=await import('/Wombats/src/engine.mjs');const c=document.createElement('canvas').getContext('2d');return {status:api.wombatSpriteStatus(),drawn:api.drawWombatSprite(c,freshPlayer(),0)};});assert.deepEqual(fallback,{status:'error',drawn:false});await failed.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({browser:browser.version(),...atlasResult,...result,fallback,errors},null,2));
}finally{await browser.close();await server.close();}
