// Atlas layout is taken from WOMBAT_Sprites_Protagonista_Nombrados.zip (production lot 01).
// Every exported image is a 96x96 pixel-art cell with the same [48,88] foot anchor.
export const NAMED_SPRITE_CELL=96;
export const NAMED_SPRITE_PIVOT=Object.freeze({x:48,y:88});
export const NAMED_ATLASES=Object.freeze({
 sano:Object.freeze({file:'wombat-sano.png',width:960,height:2016}),
 herido:Object.freeze({file:'wombat-herido.png',width:384,height:192}),
 critico:Object.freeze({file:'wombat-critico.png',width:384,height:192})
});
// Ordered rows in each provided atlas; fps/loop are copied from supplied metadata.
const source=Object.freeze({
 sano:[
  ['idle',8,8,true],['walk',8,12,true],['run',10,15,true],
  ['jump_start',3,12,false],['jump_air',2,7,true],
  ['double_jump',5,14,false],['fall',2,7,true],['land',3,12,false],
  ['dash',6,16,false],['cast_basic',8,12,false],['cast_fire',8,12,false],
  ['cast_ice',8,12,false],['cast_lightning',8,14,false],
  ['cast_nova',9,14,false],['cast_heal',8,10,false],
  ['cast_shield',8,10,false],['hurt',4,14,false],['death',10,10,false],
  ['victory',8,9,false],['pickup',6,12,false],['climb',8,12,true]
 ],
 herido:[['idle',4,8,true],['walk',4,12,true]],
 critico:[['idle',4,8,true],['walk',4,12,true]]
});
export const NAMED_WOMBAT_ANIMATIONS=Object.freeze(Object.fromEntries(
 Object.entries(source).map(([variant,rows])=>[variant,Object.freeze(Object.fromEntries(
  rows.map(([name,count,fps,loop],row)=>[name,Object.freeze({
   name,variant,loop,frameDuration:1/fps,
   pivot:NAMED_SPRITE_PIVOT,
   frames:Object.freeze(Array.from({length:count},(_,i)=>Object.freeze({
    index:i,x:i*NAMED_SPRITE_CELL,y:row*NAMED_SPRITE_CELL,
    width:NAMED_SPRITE_CELL,height:NAMED_SPRITE_CELL,duration:1/fps
   })))
  })])
 ))])
));
export const NAMED_WOMBAT_FRAME_COUNT=Object.values(NAMED_WOMBAT_ANIMATIONS)
 .reduce((n,clips)=>n+Object.values(clips).reduce((sum,clip)=>sum+clip.frames.length,0),0);
