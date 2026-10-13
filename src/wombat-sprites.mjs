import {WOMBAT_ANIMATIONS, SPRITE_CELL} from './assets/meta/wombat-animations.mjs';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
let atlas=null, status='unloaded';
const renderStates=new WeakMap();
const ATLAS_PATH='assets/sprites/wombat/atlases/wombat.png';

// Explicit debug fallback: add ?wombatRender=legacy (or set localStorage key wombat:render).
export function legacyWombatRequested(){
  if(typeof window==='undefined')return false;
  try { return new URLSearchParams(window.location.search).get('wombatRender')==='legacy'
    ||window.localStorage?.getItem('wombat:render')==='legacy'; }
  catch { return false; }
}
export function preloadWombatSprites(){
  if(status!=='unloaded' || typeof Image==='undefined' || legacyWombatRequested())return;
  status='loading';
  const image=new Image();
  image.onload=()=>{
    if(image.naturalWidth!==SPRITE_CELL*8||image.naturalHeight!==SPRITE_CELL*5){
      status='error';return;
    }
    atlas=image;status='ready';
  };
  image.onerror=()=>{status='error';atlas=null;};
  const base=import.meta.env?.BASE_URL||'/';
  image.src=base.replace(/\/?$/, '/')+ATLAS_PATH;
}
export function wombatSpriteStatus(){return status;}
export function selectWombatAnimation(p,mode='playing'){
  if(mode==='dead')return 'fall'; // temporary defeat pose; there is no death sheet yet
  if((p.dash||0)>0)return 'dash';
  if((p.hit||0)>0)return 'fall'; // temporary damage pose
  if((p.cast||0)>0||(p.healFx||0)>0)return 'cast';
  if(!p.grounded){
    if(p.vy < -310)return 'jump';
    if(p.vy < -130)return 'jump_air';
    if(p.vy < 115)return 'levitate';
    return 'fall';
  }
  return Math.abs(p.vx||0)>35?'walk':'idle';
}
export function chooseWombatFrame(animation,t,p={}){
  const clip=WOMBAT_ANIMATIONS[animation]||WOMBAT_ANIMATIONS.idle;
  if(animation==='dash')return Math.min(clip.frames.length-1,Math.floor(clamp((0.19-(p.dash||0))/0.19,0,0.999)*clip.frames.length));
  if(animation==='cast')return Math.min(clip.frames.length-1,Math.floor((t/clip.frameDuration)%clip.frames.length));
  if(animation==='jump')return clamp(Math.floor((-650-(p.vy||0))/150),0,clip.frames.length-1);
  const frame=Math.floor(Math.max(0,t)/clip.frameDuration);
  return clip.loop?frame%clip.frames.length:Math.min(clip.frames.length-1,frame);
}
export function drawWombatSprite(ctx,p,t,mode='playing',deathT=0){
  if(legacyWombatRequested())return false;
  preloadWombatSprites();
  if(status!=='ready'||!atlas)return false;
  let state=renderStates.get(p);
  if(!state){state={grounded:!!p.grounded,last: 'idle',landUntil:0};renderStates.set(p,state);}
  if(!state.grounded && p.grounded && mode==='playing')state.landUntil=t+0.11;
  let action=selectWombatAnimation(p,mode);
  if(action==='idle' && t<state.landUntil)action='cast'; // temporary landing recovery
  state.grounded=!!p.grounded;
  if(state.last!==action){state.actionStarted=t;state.last=action;}
  const localTime=Math.max(0,t-state.actionStarted);
  const clip=WOMBAT_ANIMATIONS[action], frame=clip.frames[chooseWombatFrame(action,localTime,p)];
  if(!clip||!frame)return false;
  ctx.save();
  ctx.translate(p.x+p.w/2,p.y+p.h);
  ctx.scale(p.dir===-1?-1:1,1);
  if(p.spawn>0){ctx.translate(0,-p.spawn*42);ctx.globalAlpha*=clamp(1-p.spawn/1.25,0.15,1);}
  if(mode==='dead'){ctx.rotate(-clamp(deathT,0,1)*0.7);ctx.translate(0,clamp(deathT,0,1)*9);}
  if(p.invuln>0)ctx.globalAlpha*=0.87;
  const smoothing=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=false;
  // Artwork is visually larger than the 45x68 physics collider; feet share an anchor.
  ctx.drawImage(atlas,frame.x,frame.y,frame.width,frame.height,-61,-116,122,122);
  ctx.imageSmoothingEnabled=smoothing;
  if(p.shield>0){
    ctx.strokeStyle='rgba(143,232,255,0.8)';ctx.lineWidth=3;ctx.beginPath();
    ctx.ellipse(0,-59,66,72,0,0,Math.PI*2);ctx.stroke();
  }
  if(p.healFx>0){ctx.fillStyle='rgba(126,255,168,0.20)';ctx.beginPath();ctx.ellipse(0,-55,64,65,0,0,Math.PI*2);ctx.fill();}
  if(p.upgrades?.resistance>0){
    ctx.strokeStyle='rgba(240,210,157,'+Math.min(.6,p.upgrades.resistance*.08)+')';
    ctx.lineWidth=1+p.upgrades.resistance*.4;
    ctx.beginPath();ctx.ellipse(0,-60,68,74,0,0,Math.PI*2);ctx.stroke();
  }
  if(p.hit>0){ctx.fillStyle='rgba(255,110,120,0.12)';ctx.fillRect(-59,-116,118,114);}
  ctx.restore();
  return true;
}
