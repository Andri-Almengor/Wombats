// Supplementary sprites: nine new user-supplied animation sheets, 121 real frames.
// Cells share a foot anchor; the player physics rectangle is not involved.
export const EXTRA_SPRITE_CELL = 144;
export const EXTRA_SPRITE_COLS = 8;
export const EXTRA_SPRITE_ROWS = 16;
const catalog = [
  ['run_fast',0,10,0.085,true],
  ['ice_cast',10,8,0.066,false],
  ['fire_cast',18,8,0.066,false],
  ['lightning_cast',26,8,0.075,false],
  ['lightning_burst',34,8,0.075,false],
  ['heal',42,8,0.105,false],
  ['shield_cast',50,8,0.073,false],
  ['nova_cast',58,11,0.070,false],
  ['hurt',69,9,0.100,false],
  ['defeat',78,5,0.180,false],
  ['victory',83,8,0.140,false],
  ['book',91,6,0.140,true],
  ['jump_staff',97,8,0.110,false],
  ['book_cast',105,8,0.140,false],
  ['book_hold',113,8,0.140,true]
];
export const EXTRA_WOMBAT_ANIMATIONS = Object.freeze(Object.fromEntries(catalog.map(([name,start,count,duration,loop]) => [name,Object.freeze({
 name,loop,frameDuration:duration,
 pivot:Object.freeze({x:0.5,y:135/144}),
 frames:Object.freeze(Array.from({length:count},(_,n)=>{
  const index=start+n;
  return Object.freeze({index,x:(index%EXTRA_SPRITE_COLS)*EXTRA_SPRITE_CELL,
   y:Math.floor(index/EXTRA_SPRITE_COLS)*EXTRA_SPRITE_CELL,
   width:EXTRA_SPRITE_CELL,height:EXTRA_SPRITE_CELL,duration});
 }))
})])));
export const EXTRA_WOMBAT_FRAME_COUNT=catalog.reduce((n,[, ,count])=>n+count,0);