// Source sprites are extracted from the eight PNG sheets supplied for Stage 02.
// One common, transparent atlas with 96 x 96 tiles. Each animation has a stable foot pivot.
export const SPRITE_CELL = 96;
export const SPRITE_COLS = 8;
const catalog = [
  ['idle',0,8,0.135,true],
  ['walk',8,8,0.095,true],
  ['jump',16,3,0.125,false],
  ['jump_air',19,2,0.13,true],
  ['levitate',21,5,0.095,true],
  ['fall',26,2,0.14,true],
  ['cast',28,3,0.10,false],
  ['dash',31,6,0.032,false]
];
export const WOMBAT_ANIMATIONS = Object.freeze(Object.fromEntries(catalog.map(([name,start,count,duration,loop]) => [
  name,Object.freeze({
    name, loop, frameDuration:duration,
    pivot:Object.freeze({x:0.5,y:0.957}),
    frames:Object.freeze(Array.from({length:count},(_,i)=>{
      const index=start+i;
      return Object.freeze({
        index,file:name+'_'+String(i+1).padStart(2,'0')+'.png',
        x:(index%SPRITE_COLS)*SPRITE_CELL,
        y:Math.floor(index/SPRITE_COLS)*SPRITE_CELL,
        width:SPRITE_CELL,height:SPRITE_CELL,
        usefulWidth:SPRITE_CELL,usefulHeight:SPRITE_CELL,
        offsetX:0,offsetY:0,duration
      });
    }))
  })
])));
export const WOMBAT_FRAME_COUNT = catalog.reduce((total,[, ,count])=>total+count,0);
