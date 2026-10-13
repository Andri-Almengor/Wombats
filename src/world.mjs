// Procedural, seeded levels. Every run has its own seed; all important jumps have a guaranteed route.
export const WIDTH=1280,HEIGHT=720,FLOOR=604;
export const BIOMES=[
 {id:'forest',name:'Bosque de los espíritus',subtitle:'Raíces vivientes y hongos saltarines',sky:['#102c36','#2e665e'],floor:'#304d42',edge:'#a2ce91',accent:'#bfeaa6',enemy:['mushroom','wolf','bat'],gravity:1570,wind:0},
 {id:'crystal',name:'Minas de luz perdida',subtitle:'Elevadores de cristal en la oscuridad',sky:['#101b39','#393b68'],floor:'#343855',edge:'#95cce4',accent:'#b7e5fb',enemy:['golem','caster','bat'],gravity:1530,wind:0},
 {id:'swamp',name:'Islas del veneno',subtitle:'Niebla tóxica y guardianes del fango',sky:['#142e2d','#456456'],floor:'#33463b',edge:'#bfd28a',accent:'#d3e695',enemy:['slime','bomber','caster'],gravity:1550,wind:0},
 {id:'sky',name:'Ruinas entre las nubes',subtitle:'El viento mueve tus saltos',sky:['#28415f','#8aa3b8'],floor:'#5a607b',edge:'#e7e5d4',accent:'#eef7d9',enemy:['bat','wolf','caster'],gravity:1460,wind:130},
 {id:'eclipse',name:'Ciudadela del eclipse',subtitle:'La última batalla por las estrellas',sky:['#19162e','#624359'],floor:'#403448',edge:'#e4aabb',accent:'#ffdbaa',enemy:['golem','bomber','caster'],gravity:1640,wind:0}
];
export function randomFromSeed(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const pick=(rng,arr)=>arr[Math.floor(rng()*arr.length)];
const between=(rng,a,b)=>a+(b-a)*rng();
export function createWorld(biomeIndex,runSeed){
 if(!Number.isInteger(biomeIndex)||biomeIndex<0||biomeIndex>=BIOMES.length)throw Error('Unknown world');
 const biome=BIOMES[biomeIndex],rng=randomFromSeed((runSeed^(0x9e3779b9*(biomeIndex+1)))>>>0);
 const segments=9+biomeIndex*2, platforms=[],enemies=[],items=[],hazards=[],decor=[];
 let cursor=0; let nextId=0;
 const id=()=>++nextId;
 function platform(x,y,w,kind='ground',move=0){const p={id:id(),x,y,w,h:kind==='ground'?HEIGHT-y+80:21,kind,baseY:y,move,phase:rng()*Math.PI*2};platforms.push(p);return p;}
 function collect(x,y,type){items.push({id:id(),x,y,w:22,h:24,type,active:true,phase:rng()*6});}
 for(let s=0;s<segments;s++){
  const isFirst=s===0,isLast=s===segments-1;
  const width=isFirst?930:isLast?900:between(rng,570,850);
  const gap=isLast?0:between(rng,80,135); // A running jump clears these gaps.
  platform(cursor,FLOOR,width);
  const ceiling=between(rng,348,440);
  // Each biome generates a fundamentally different secondary route.
  if(biome.id==='forest'){
   platform(cursor+width*.38,466,144,'branch');platform(cursor+width*.65,ceiling,124,'branch');
   decor.push({x:cursor+width*.23,type:'tree',scale:between(rng,.7,1.4)});
  }else if(biome.id==='crystal'){
   platform(cursor+width*.28,448,145,'crystal',45+biomeIndex*3);
   platform(cursor+width*.61,330,125,'crystal',65);
   decor.push({x:cursor+width*.5,type:'crystals',scale:1});
  }else if(biome.id==='swamp'){
   platform(cursor+width*.33,477,132,'lily',s%2?26:0);
   platform(cursor+width*.69,389,118,'lily');
   decor.push({x:cursor+width*.7,type:'reeds',scale:1});
  }else if(biome.id==='sky'){
   platform(cursor+width*.24,460,150,'cloud',32);
   platform(cursor+width*.55,347,156,'cloud',50);
   decor.push({x:cursor+width*.46,type:'ruins',scale:1});
  }else{
   platform(cursor+width*.35,443,145,'stone',0);
   platform(cursor+width*.65,340,130,'stone',s%2?32:0);
   decor.push({x:cursor+width*.52,type:'banners',scale:1});
  }
  for(let j=0;j<4;j++)collect(cursor+140+j*29,FLOOR-83,'crystal');
  if(s%2===0)for(let j=0;j<3;j++)collect(cursor+width*.35+j*26,408,'crystal');
  if(s>0&&s%4===0)collect(cursor+width*.55,FLOOR-84,'heart');
  if(s>0&&s%3===1)collect(cursor+width*.56,ceiling-52,'mana');
  if(s>0&&!isLast){
   const count=1+(biomeIndex>=2&&rng()>.46?1:0);
   for(let j=0;j<count;j++){
    const type=pick(rng,biome.enemy),baseX=cursor+width*(j?.72:.56);
    const hp={mushroom:2,wolf:3,bat:2,golem:5,caster:3,slime:3,bomber:2}[type]+Math.floor(biomeIndex/2);
    enemies.push({id:id(),x:baseX,y:type==='bat'?FLOOR-170:FLOOR-48,w:type==='golem'?61:43,h:type==='golem'?60:43,type,hp,maxHp:hp,dir:rng()>.5?1:-1,spawnX:baseX,range:135+rng()*75,phase:rng()*6,attackTimer:between(rng,.6,1.8),slow:0,hit:0,vx:0,vy:0});
   }
   if(biomeIndex>=2&&s%3===2)hazards.push({id:id(),x:cursor+width*.77,y:FLOOR-13,w:48,h:13,type:biome.id==='swamp'?'toxic':'spikes'});
  }
  cursor+=width+gap;
 }
 const lastStart=platforms.filter(p=>p.kind==='ground').at(-1).x;
 // Three runes always sit directly over safe ground, before the final boss.
 const grounds=platforms.filter(p=>p.kind==='ground');
 for(const fraction of [.24,.51,.77]){const ground=grounds[Math.floor(fraction*(grounds.length-1))];collect(ground.x+Math.min(ground.w*.5,390),FLOOR-105,'rune');}
 const length=cursor+100, portal={x:lastStart+730,y:FLOOR-148,w:78,h:148};
 if(biomeIndex===4){
  const hp=46;enemies.push({id:id(),x:lastStart+400,y:FLOOR-148,w:112,h:145,type:'boss',hp,maxHp:hp,dir:-1,spawnX:lastStart+400,range:150,phase:0,attackTimer:1.2,slow:0,hit:0,vx:0,vy:0});
 }
 return {seed:runSeed,biomeIndex,biome,length,platforms,enemies,items,hazards,decor,portal,runes:0,requiredRunes:3};
}
export function validateWorld(w){
 const grounds=w.platforms.filter(p=>p.kind==='ground').sort((a,b)=>a.x-b.x);
 if(grounds.length<8||w.items.filter(i=>i.type==='rune').length!==3)return false;
 if(grounds[0].x!==0||grounds[0].w<600)return false;
 if(!grounds.every((p,i)=>i===0||p.x-(grounds[i-1].x+grounds[i-1].w)<=140))return false;
 if(!w.items.filter(i=>i.type==='rune').every(i=>grounds.some(p=>i.x>=p.x+30&&i.x+22<=p.x+p.w-30)))return false;
 return grounds.some(p=>w.portal.x>=p.x&&w.portal.x+w.portal.w<=p.x+p.w);
}
