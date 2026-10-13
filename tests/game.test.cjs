const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const elements = new Map();
  function element(id) { if (!elements.has(id)) elements.set(id, {textContent:'',style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},querySelector(){return null;},getContext(){return {};}}); return elements.get(id); }
  const sandbox = {document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame(){},console,Math};
  let source = fs.readFileSync(require.resolve('../game.js'),'utf8');
  source=source.replace(/\}\)\(\);\s*$/,`window.test={newGame,loadLevel,update,hurt,shoot,nova,pause,makeWorld,get:()=>({state,level,world,player,shots,score,kills}),press:(key)=>{pressed.add(key);keys.add(key)},release:()=>{keys.clear();pressed.clear()}};})();`);
  vm.runInNewContext(source,sandbox);return sandbox.window.test;
}
function step(g,n){for(let i=0;i<n;i++)g.update(1/60);}
test('Five long levels have exactly three reachable runes and a continuous final arena',()=>{
 const g=setup();for(let i=0;i<5;i++){const w=g.makeWorld(i);assert.ok(w.length>=8500);assert.equal(w.items.filter(x=>x.type==='rune').length,3);for(const r of w.items.filter(x=>x.type==='rune'))assert.ok(w.platforms.some(p=>r.x>=p.x&&r.x+r.w<=p.x+p.w&&p.y-r.y<100));assert.ok(w.platforms.some(p=>p.x<=w.portal.x&&p.x+p.w>=w.portal.x+w.portal.w&&p.baseY===592));assert.equal(!!w.boss,i===4);}
});
test('Fixed-step movement lands on ground and supports exactly two jumps',()=>{
 const g=setup();g.newGame();step(g,50);let p=g.get().player;assert.equal(p.y,534);assert.equal(p.grounded,true);g.press('Space');step(g,1);g.release();assert.equal(p.jumps,1);step(g,10);g.press('Space');step(g,1);g.release();assert.equal(p.jumps,2);step(g,10);const vy=p.vy;g.press('Space');step(g,1);g.release();assert.ok(p.vy>vy);assert.equal(p.jumps,2);
});
test('Damage respects invulnerability and the fifth hit restarts at level one',()=>{
 const g=setup();g.newGame();g.loadLevel(3);g.hurt();assert.equal(g.get().player.hp,4);g.hurt();assert.equal(g.get().player.hp,4);for(let i=0;i<4;i++){g.get().player.invuln=0;g.hurt();}assert.equal(g.get().state,'loading');step(g,180);assert.equal(g.get().level,0);assert.equal(g.get().player.hp,5);assert.equal(g.get().score,0);assert.equal(g.get().state,'playing');
});
test('Projectiles reduce enemy HP and kill after required hits',()=>{
 const g=setup();g.newGame();const {world,player}=g.get();const e=world.enemies[0];player.x=e.x-100;player.y=534;player.facing=1;player.invuln=99;g.shoot();step(g,10);assert.equal(e.hp,e.max-1);player.attack=0;g.shoot();step(g,12);assert.equal(e.hp,0);assert.equal(g.get().kills,1);
});
test('Nova costs mana, damages nearby enemies, and dash prevents contact damage',()=>{
 const g=setup();g.newGame();const {world,player}=g.get();player.x=world.enemies[0].x;player.y=world.enemies[0].y;g.nova();assert.equal(player.mana,67);assert.equal(world.enemies[0].hp<=0,true);g.nova();assert.equal(player.mana,67);player.dash=.2;g.hurt();assert.equal(player.hp,5);
});
test('Missing runes block portal; complete runes transition while preserving campaign',()=>{
 const g=setup();g.newGame();let s=g.get();s.player.x=s.world.portal.x;s.player.y=500;s.player.invuln=99;step(g,1);assert.equal(g.get().state,'playing');s.world.runes=3;step(g,1);assert.equal(g.get().state,'loading');step(g,180);assert.equal(g.get().level,1);assert.equal(g.get().world.runes,0);assert.ok(g.get().score>=250);
});
test('Boss blocks final portal until defeated; completion shows victory',()=>{
 const g=setup();g.newGame();g.loadLevel(4);const s=g.get();s.world.runes=3;s.player.x=s.world.portal.x;s.player.y=500;s.player.invuln=99;step(g,1);assert.equal(g.get().state,'playing');s.world.boss.hp=0;step(g,1);assert.equal(g.get().state,'victory');
});
test('A pit costs one heart and returns the player to safe ground',()=>{
 const g=setup();g.newGame();step(g,40);const p=g.get().player;p.x=950;p.y=850;step(g,1);assert.equal(p.hp,4);assert.equal(p.x,p.safeX);assert.ok(p.y<592);
});
test('Pause freezes movement, damage timers and the campaign clock',()=>{
 const g=setup();g.newGame();g.pause();const p=g.get().player;const x=p.x,y=p.y;g.press('KeyD');step(g,100);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(g.get().state,'paused');g.pause();assert.equal(g.get().state,'playing');
});
