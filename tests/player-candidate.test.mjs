import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {candidateRequested,preloadCandidate,candidateFrame,useCandidate} from '../src/player/CandidatePreview.mjs';
const root=new URL('../public/assets/sprites/wombat/candidates/',import.meta.url);
const data=JSON.parse(readFileSync(new URL('manifest.json',root)));
test('playable preview is default with explicit previous/procedural opt-outs',()=>{
 assert.equal(useCandidate(''),true);assert.equal(useCandidate('?wombatRender=candidate'),true);
 assert.equal(useCandidate('?wombatRender=rebuilt'),false);assert.equal(useCandidate('?wombatRender=legacy'),false);
});
test('server-side use never attempts to load browser images',async()=>{
 assert.equal(candidateRequested(),false);assert.equal(await preloadCandidate(),false);
 assert.equal(candidateFrame({action:'walk'}),null);assert.equal(data.status,'review-only');
});
test('review atlas has actual transparency, isolated tiles and fixed canvas/pivot',()=>{
 const png=PNG.sync.read(readFileSync(new URL(data.file,root)));
 assert.equal(png.width,data.width);assert.equal(png.height,data.height);
 for(const clip of Object.values(data.clips))for(const f of clip.frames){
  assert.deepEqual([f.width,f.height,...f.pivot],[128,128,64,112]);let count=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const alpha=png.data[((y+f.y)*png.width+x+f.x)*4+3];
   assert.ok(alpha===0||alpha===255,'body pixels have no semi-transparent background');
   if(x<2||y<2||x>=126||y>=126)assert.equal(alpha,0,'neighbor-free gutters');
   if(alpha)count++;
  }
  assert.ok(count>3000);assert.ok(count<12000);
 }
});
