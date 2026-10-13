import test from 'node:test';
import assert from 'node:assert/strict';
import {BIOMES,createWorld,validateWorld} from '../src/world.mjs';
test('five genuinely different biome identities and layouts',()=>{
 assert.equal(BIOMES.length,5);assert.equal(new Set(BIOMES.map(b=>b.id)).size,5);
 for(let i=0;i<5;i++){const world=createWorld(i,123456);assert.equal(world.biomeIndex,i);assert.ok(validateWorld(world));assert.ok(world.enemies.length>0);}
});
test('every generated world has a traversable floor route, rune placements and portal',()=>{
 for(let seed=1;seed<=200;seed++)for(let biome=0;biome<5;biome++){
  const world=createWorld(biome,(seed*101889)>>>0);
  assert.ok(validateWorld(world),`biome ${biome} seed ${seed}`);
  assert.equal(world.items.filter(i=>i.type==='rune').length,3);
  assert.ok(world.platforms.every(p=>p.w>0&&Number.isFinite(p.x)));
 }
});
test('same seed repeats, different seed reshapes the map',()=>{
 const a=createWorld(0,100),b=createWorld(0,100),c=createWorld(0,101);
 assert.deepEqual(a,b);assert.notDeepEqual(a.platforms,c.platforms);
});
test('boss exists only in final world',()=>{
 for(let i=0;i<5;i++)assert.equal(createWorld(i,55).enemies.filter(e=>e.type==='boss').length,i===4?1:0);
});
