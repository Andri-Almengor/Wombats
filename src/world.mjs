// Five structurally distinct, seeded 2D worlds. Geometry is shared by rendering and collision.
export const WIDTH=1280,HEIGHT=720,FLOOR=604;
export const BIOMES=[
 {id:'forest',name:'Bosque encantado',subtitle:'Explora las ramas y encuentra las runas',sky:['#102c36','#2e665e'],floor:'#304d42',edge:'#a2ce91',accent:'#bfeaa6',enemy:['mushroom','wolf','bat'],gravity:1570,wind:0},
 {id:'crystal',name:'Montañas de cristal',subtitle:'Asciende entre riscos y guardianes',sky:['#101b39','#393b68'],floor:'#343855',edge:'#95cce4',accent:'#b7e5fb',enemy:['golem','caster','bat'],gravity:1530,wind:0},
 {id:'cave',name:'Laberinto subterráneo',subtitle:'El último libro yace tras un guardián',sky:['#0d1628','#30344a'],floor:'#3b3548',edge:'#b1b4dc',accent:'#e3cbb4',enemy:['slime','bomber','caster'],gravity:1550,wind:0},
 {id:'sky',name:'Ruinas flotantes',subtitle:'Surca corrientes de viento e islas móviles',sky:['#28415f','#8aa3b8'],floor:'#5a607b',edge:'#e7e5d4',accent:'#eef7d9',enemy:['bat','wolf','caster'],gravity:1460,wind:130},
 {id:'eclipse',name:'Ciudadela del eclipse',subtitle:'Activa los sellos y derrota al monarca',sky:['#19162e','#624359'],floor:'#403448',edge:'#e4aabb',accent:'#ffdbaa',enemy:['golem','bomber','caster'],gravity:1640,wind:0}
];
export function randomFromSeed(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const between=(r,a,b)=>a+(b-a)*r(),pick=(r,a)=>a[Math.floor(r()*a.length)];
const dist=(a,b)=>Math.hypot(a.x+a.w/2-b.x-b.w/2,a.y-b.y);
export function createWorld(biomeIndex,runSeed){
 if(!Number.isInteger(biomeIndex)||biomeIndex<0||biomeIndex>=BIOMES.length)throw Error('Unknown world');
 const biome=BIOMES[biomeIndex],rng=randomFromSeed((runSeed^(0x9e3779b9*(biomeIndex+1)))>>>0);
 const platforms=[],enemies=[],items=[],hazards=[],decor=[],links=[],rooms=[],walls=[];
 let serial=0;const id=()=>++serial;
 function node(x,y,w=240,kind='ground',move=0,secret=false){
  const p={id:id(),x:Math.round(x),y:Math.round(y),w:Math.round(w),h:kind==='ground'?40:22,kind,baseY:Math.round(y),move,phase:rng()*Math.PI*2,secret};
  platforms.push(p);return p;
 }
 function connect(a,b){links.push([a.id,b.id]);}
 function collect(p,type,x=p.x+p.w/2-11){
  const item={id:id(),x:Math.round(x),y:p.y-46,w:22,h:24,type,active:true,phase:rng()*6,nodeId:p.id};items.push(item);return item;
 }
 function enemyOn(p,forced){
  const type=forced||pick(rng,biome.enemy),hp={mushroom:2,wolf:3,bat:2,golem:6,caster:3,slime:3,bomber:3,guardian:25,boss:52}[type]+(type==='boss'||type==='guardian'?0:Math.floor(biomeIndex/2));
  const w=type==='boss'?112:type==='guardian'?88:type==='golem'?61:43;
  const h=type==='boss'?145:type==='guardian'?95:type==='golem'?60:43;
  const x=p.x+p.w/2-w/2,y=p.y-h-(type==='bat'?75:0);
  enemies.push({id:id(),x,y,w,h,type,hp,maxHp:hp,dir:rng()>.5?1:-1,spawnX:x,spawnY:y,range:Math.min(95,p.w/3),phase:rng()*6,attackTimer:between(rng,.8,1.8),slow:0,hit:0,vx:0,vy:0,burn:0,freeze:0,stun:0,knock:0,burnTick:0,telegraph:0,nodeId:p.id});
 }
 let main=[],start,end,bookRequired=biomeIndex===2;
 if(biomeIndex===0){
  // Branching woodland: winding valleys, elevated side trails, secret alcoves.
  let x=45,y=FLOOR;
  for(let i=0;i<22;i++){
   y=Math.max(360,Math.min(620,y+between(rng,-78,78)));
   const p=node(x,y,between(rng,255,325),'ground');
   if(main.length)connect(main.at(-1),p);main.push(p);
   if(i>1&&i<19&&i%3===0){
    const upper=node(x+between(rng,42,95),y-between(rng,112,162),205,'branch',0,true);connect(p,upper);collect(upper,i%2?'crystal':'heart');
    const fork=node(x+between(rng,130,195),y-between(rng,16,66),220,'branch');connect(upper,fork);connect(p,fork);
    if(i===6||i===12||i===18)collect(fork,'rune');
   }
   decor.push({x:p.x+50,y:p.y,type:'tree',scale:between(rng,.8,1.4)});
   x+=between(rng,205,280);
  }
  for(const n of [main[8],main[16]])collect(n,'rune');
  // Exactly three required runes; the first side-fork contains the third.
  const extras=items.filter(i=>i.type==='rune');extras.slice(1,3).forEach(i=>i.type='crystal');
 }else if(biomeIndex===1){
  // Tight zig-zag climbing route; total ascent exceeds three screen heights.
  let x=220,y=FLOOR;
  for(let i=0;i<28;i++){
   const p=node(x,y,240,'crystal',i%6===3?18:0);if(main.length)connect(main.at(-1),p);main.push(p);
   if(i>0&&i%6===0){const ledge=node(x+85,y-85,170,'crystal',0,true);connect(p,ledge);collect(ledge,'mana');}
   if(i%9===4)decor.push({x:p.x+90,y:p.y,type:'crystals',scale:1});
   x=Math.max(85,Math.min(840,x+(i%5<2?between(rng,80,158):-between(rng,80,158))));
   y-=between(rng,95,132);
  }
  [8,17,24].forEach(i=>collect(main[i],'rune'));
 }else if(biomeIndex===2){
  // Grid maze generated as a randomized depth-first spanning tree: many authentic forks.
  const cols=5,rows=5,visited=new Set([0]),stack=[0],edges=[];
  while(stack.length){
   const at=stack.at(-1),c=at%cols,r=Math.floor(at/cols);
   const candidates=[[c+1,r],[c-1,r],[c,r+1],[c,r-1]].filter(([x,y])=>x>=0&&x<cols&&y>=0&&y<rows&&!visited.has(y*cols+x));
   if(!candidates.length){stack.pop();continue;}
   const [nx,ny]=pick(rng,candidates),next=ny*cols+nx;visited.add(next);edges.push([at,next]);stack.push(next);
  }
  const cells=Array.from({length:25},(_,i)=>node(90+(i%cols)*285,FLOOR-Math.floor(i/cols)*150,253,'stone'));
  edges.forEach(([a,b])=>connect(cells[a],cells[b]));
  const adjacency=Array.from({length:25},()=>[]);edges.forEach(([a,b])=>{adjacency[a].push(b);adjacency[b].push(a);});
  const distance=Array(25).fill(-1),queue=[0];distance[0]=0;
  for(let k=0;k<queue.length;k++)for(const n of adjacency[queue[k]])if(distance[n]<0){distance[n]=distance[queue[k]]+1;queue.push(n);}
  const far=[...cells.keys()].sort((a,b)=>distance[b]-distance[a]);end=cells[far[0]];main=queue.map(i=>cells[i]);
  [far[4],far[10],far[17]].forEach(i=>collect(cells[i],'rune'));
  cells.forEach((p,i)=>{p.secret=distance[i]>14;rooms.push({x:p.x,y:p.y,w:p.w,h:150,nodeId:p.id,secret:p.secret});if(i>0&&i%3===0)collect(p,'crystal');});
  // Dungeon passage bars only where the maze has no horizontal connector.
  for(let i=0;i<25;i++)if(i%5!==4&&!edges.some(([a,b])=>(a===i&&b===i+1)||(b===i&&a===i+1))){
   const p=cells[i];walls.push({id:id(),x:p.x+p.w+12,y:p.y-135,w:20,h:156,kind:'sealed-stone'});
  }
 }else if(biomeIndex===3){
  // Floating archipelago: air between every island, wind and moving bridges.
  let x=65,y=FLOOR;
  for(let i=0;i<25;i++){
   y=Math.max(260,Math.min(620,y+between(rng,-125,118)));
   const p=node(x,y,between(rng,205,260),i===0?'ground':'cloud',i>2&&i%3===0?24:0);
   if(main.length)connect(main.at(-1),p);main.push(p);
   if(i>2&&i%4===0){const high=node(x+65,y-145,195,'cloud',12,true);connect(p,high);collect(high,i%8?'crystal':'rune');}
   if(i%5===2)hazards.push({id:id(),x:x+35,y:y+70,w:70,h:14,type:'void',decorative:true});
   decor.push({x:p.x+50,y:p.y,type:'ruins',scale:1});
   x+=between(rng,194,246);
  }
  [9,16,22].forEach(i=>collect(main[i],'rune'));
  const runes=items.filter(i=>i.type==='rune');runes.slice(3).forEach(i=>i.type='crystal');
 }else{
  // Fortress: 5 arena chambers joined by stepped hallways and three rune seals.
  let x=60,y=FLOOR;
  for(let room=0;room<5;room++){
   for(let step=0;step<5;step++){
    y=Math.max(385,Math.min(610,y+between(rng,-80,80)));
    const p=node(x,y,step===4?310:245,step===4?'ground':'stone',step===2?10:0);
    if(main.length)connect(main.at(-1),p);main.push(p);
    if(step===4){rooms.push({x:p.x,y:p.y,w:p.w,h:220,nodeId:p.id});if(room<3)collect(p,'rune');}
    if(step===2&&room>0){const upper=node(x+40,y-132,195,'stone',0,true);connect(p,upper);collect(upper,'crystal');}
    x+=between(rng,175,226);
   }
  }
 }
 start=main[0];end=end||main.at(-1);
 if(biomeIndex===0&&items.filter(i=>i.type==='rune').length!==3)throw Error('Forest rune placement');
 for(const p of main){if(p===start||p===end)continue;
  if(rng()<.65)enemyOn(p);
  if(rng()<.38)collect(p,'crystal');
  if(rng()<.08)collect(p,'heart');
  if(biomeIndex===4&&rng()<.14)hazards.push({id:id(),x:p.x+35,y:p.y-12,w:48,h:12,type:'spikes'});
 }
 // The library guardian drops the ancient book; the final boss is a multi-phase encounter.
 if(biomeIndex===2)enemyOn(end,'guardian');
 if(biomeIndex===4)enemyOn(end,'boss');
 const portal={x:end.x+end.w-105,y:end.y-148,w:76,h:148};
 const spawn={x:start.x+38,y:start.y-68};
 const length=Math.max(...platforms.map(p=>p.x+p.w))+175;
 const minY=Math.min(...platforms.map(p=>p.y))-360,maxY=Math.max(HEIGHT+220,...platforms.map(p=>p.y+160));
 return {seed:runSeed,biomeIndex,biome,length,minY,maxY,platforms,enemies,items,hazards,decor,links,rooms,walls,spawn,portal,bookRequired,bookCollected:false,runes:0,requiredRunes:3};
}
export function validateWorld(w){
 if(!w||w.platforms.length<15||w.items.filter(i=>i.type==='rune').length!==3)return false;
 if(!w.platforms.every(p=>p.w>=150&&Number.isFinite(p.x)&&Number.isFinite(p.y)))return false;
 if(!w.walls.every(bar=>bar.w>0&&bar.h>0))return false;
 const map=new Map(w.platforms.map(p=>[p.id,p])),seen=new Set(),queue=[w.platforms[0].id];seen.add(queue[0]);
 for(let i=0;i<queue.length;i++)for(const [a,b] of w.links){
  if(a!==queue[i]&&b!==queue[i])continue;
  const current=map.get(queue[i]),other=map.get(a===queue[i]?b:a);
  if(!other)return false;
  // Conservative double-jump / walking reachability in either direction.
  if(Math.abs(current.x+current.w/2-other.x-other.w/2)>385||Math.abs(current.y-other.y)>205)return false;
  if(!seen.has(other.id)){seen.add(other.id);queue.push(other.id);}
 }
 if(w.items.some(i=>(i.type==='rune'||i.type==='book')&&!seen.has(i.nodeId)))return false;
 const platform=w.platforms.find(p=>w.portal.x>=p.x&&w.portal.x+w.portal.w<=p.x+p.w&&Math.abs(w.portal.y+w.portal.h-p.y)<1);
 return !!platform&&seen.has(platform.id)&&seen.size===w.platforms.length;
}
