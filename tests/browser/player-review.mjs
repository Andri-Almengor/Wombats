import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const out=new URL('../../test-results/player-review/',import.meta.url);await mkdir(out,{recursive:true});
const server=await createServer({base:'/Wombats/',server:{host:'127.0.0.1',port:0}});await server.listen();
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']}:{})});
 const page=await browser.newPage({viewport:{width:1150,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.httpServer.address().port}/Wombats/`;
 await page.goto(base+'player-review.html');await page.waitForFunction(()=>window.playerReview?.ready);
 for(const action of ['idle','walk','run']){
  for(let i=0;i<8;i++){
   await page.evaluate(({action,i})=>window.playerReview.set(action,i/8),{action,i});
   await page.locator('canvas').screenshot({path:new URL(`${action}-${i}.png`,out).pathname});
  }
 }
 await page.getByRole('button',{name:'Mirar a la izquierda'}).click();
 await page.locator('canvas').screenshot({path:new URL('mirrored.png',out).pathname});
 // Exercise the same real Canvas adapter used by the game, not a mocked renderer.
 await page.goto(base+'?wombatRender=candidate');
 const used=await page.evaluate(async()=>{
  const {preloadCandidate}=await import('/Wombats/src/player/CandidatePreview.mjs');
  const {preloadWombatSprites,updateWombatVisual}=await import('/Wombats/src/wombat-sprites.mjs');
  const {freshPlayer}=await import('/Wombats/src/engine.mjs');
  await Promise.all([preloadCandidate(),preloadWombatSprites()]);
  const p={...freshPlayer(),grounded:true};const s=updateWombatVisual(p,0);
  return {image:s.image.src,pivot:s.frame.pivot};
 });assert.ok(used.image.endsWith('/candidate-atlas.png'));assert.deepEqual(used.pivot,[64,112]);
 await page.getByRole('button',{name:/Comenzar aventura/}).click();
 await page.waitForTimeout(1500);await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
 await page.screenshot({path:new URL('candidate-in-game.png',out).pathname});
 await page.route('**/candidates/*',route=>route.abort());await page.reload();
 const fallback=await page.evaluate(async()=>{
  const {preloadCandidate}=await import('/Wombats/src/player/CandidatePreview.mjs');
  const {preloadWombatSprites,updateWombatVisual}=await import('/Wombats/src/wombat-sprites.mjs');
  const {freshPlayer}=await import('/Wombats/src/engine.mjs');
  await Promise.all([preloadCandidate(),preloadWombatSprites()]);return updateWombatVisual({...freshPlayer(),grounded:true},0).image.src;
 });assert.ok(fallback.endsWith('/rebuilt/sano.png'));
 assert.deepEqual(errors,[]);console.log('Candidate review: playback, mirroring, actual game adapter and failed-asset fallback pass. Artistic acceptance remains BLOCKED.');
}finally{await browser?.close();await server.close();}
