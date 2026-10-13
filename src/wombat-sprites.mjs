import {WOMBAT_ANIMATIONS,SPRITE_CELL} from './assets/meta/wombat-animations.mjs';
import {EXTRA_WOMBAT_ANIMATIONS,EXTRA_SPRITE_CELL,EXTRA_SPRITE_ROWS} from './assets/meta/wombat-extra-animations.mjs';
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const ATLAS_ROOT='assets/sprites/wombat/atlases/';
const sources={core:{atlas:null,status:'unloaded'},extra:{atlas:null,status:'unloaded'}};
const renderStates=new WeakMap();

// Debug fallback: ?wombatRender=legacy or localStorage wombat:render=legacy.
export function legacyWombatRequested(){
 if(typeof window==='undefined')return false;
 try{return new URLSearchParams(window.location.search).get('wombatRender')==='legacy'
  ||window.localStorage?.getItem('wombat:render')==='legacy';}
 catch{return false;}
}
function startLoad(which,name,expectedWidth,expectedHeight){
 const source=sources[which];
 if(source.status!=='unloaded'||typeof Image==='undefined'||legacyWombatRequested())return;
 source.status='loading';
 const image=new Image();
 image.onload=()=>{
  if(image.naturalWidth!==expectedWidth||image.naturalHeight!==expectedHeight){source.status='error';return;}
  source.atlas=image;source.status='ready';
 };
 image.onerror=()=>{source.status='error';source.atlas=null;};
 const base=import.meta.env?.BASE_URL||'/';
 image.src=base.replace(/\/?$/,'/')+ATLAS_ROOT+name;
}
export function preloadWombatSprites(){
 startLoad('core','wombat.png',SPRITE_CELL*8,SPRITE_CELL*5);
 startLoad('extra','wombat-extra.png',EXTRA_SPRITE_CELL*8,EXTRA_SPRITE_CELL*EXTRA_SPRITE_ROWS);
}
export function wombatSpriteStatus(){return sources.core.status;}
export function extraWombatSpriteStatus(){return sources.extra.status;}

export function selectWombatAnimation(p,mode='playing'){
 if(mode==='dead')return 'defeat';
 if(mode==='victory')return 'victory';
 if((p.hit||0)>0)return 'hurt';
 if((p.healFx||0)>0&&p.visualSpell==='KeyR')return 'heal';
 if((p.cast||0)>0){
  return ({KeyQ:'book_cast',KeyW:'ice_cast',KeyE:'fire_cast',
   KeyF:'lightning_cast',KeyR:'heal',KeyC:'shield_cast',KeyX:'nova_cast'})[p.visualSpell]||'cast';
 }
 if((p.dash||0)>0)return 'dash';
 if(!p.grounded){
  if((p.levitating||false))return 'levitate';
  if(p.vy < -120)return p.jumps>=2?'jump_staff':'jump';
  if(p.vy < 45)return 'jump_air';
  return 'fall';
 }
 return Math.abs(p.vx||0)>225?'run_fast':Math.abs(p.vx||0)>35?'walk':'idle';
}
export function chooseWombatFrame(action,t,p={}){
 const clip=EXTRA_WOMBAT_ANIMATIONS[action]||WOMBAT_ANIMATIONS[action]||WOMBAT_ANIMATIONS.idle;
 if(action==='dash')return clamp(Math.floor(((0.19-(p.dash||0))/0.19)*clip.frames.length),0,clip.frames.length-1);
 const frame=Math.floor(Math.max(0,t)/clip.frameDuration);
 return clip.loop?frame%clip.frames.length:Math.min(clip.frames.length-1,frame);
}
function availableClip(action){
 if(EXTRA_WOMBAT_ANIMATIONS[action]&&sources.extra.status==='ready')return {source:sources.extra,clip:EXTRA_WOMBAT_ANIMATIONS[action],extra:true};
 const substitute={run_fast:'walk',ice_cast:'cast',fire_cast:'cast',lightning_cast:'cast',
 lightning_burst:'cast',shield_cast:'cast',nova_cast:'cast',hurt:'fall',defeat:'fall',
 victory:'idle',book:'idle',book_hold:'idle',jump_staff:'jump',heal:'cast',book_cast:'cast'};
 const coreName=WOMBAT_ANIMATIONS[action]?action:(substitute[action]||'idle');
 return {source:sources.core,clip:WOMBAT_ANIMATIONS[coreName],extra:false};
}
export function drawWombatSprite(ctx,p,t,mode='playing',deathT=0){
 if(legacyWombatRequested())return false;
 preloadWombatSprites();
 if(sources.core.status!=='ready')return false;
 const action=selectWombatAnimation(p,mode);
 const {source,clip,extra}=availableClip(action);
 if(source.status!=='ready'||!source.atlas||!clip)return false;
 let state=renderStates.get(p);
 if(!state){state={last:null,started:t,clipId:null,castSequence:null};renderStates.set(p,state);}
 const clipId=(extra?'extra:':'core:')+clip.name;
 if(state.last!==action||state.clipId!==clipId||(p.cast>0&&state.castSequence!==(p.castSequence||0))){
  state.last=action;state.clipId=clipId;state.started=t;state.castSequence=p.castSequence||0;
 }
 const elapsed=Math.max(0,t-state.started);
 // The clip actually loaded can be shorter than the requested supplement.
 const index=chooseWombatFrame(clip.name,elapsed,p);
 const frame=clip.frames[clamp(index,0,clip.frames.length-1)];
 if(!frame)return false;
 ctx.save();
 ctx.translate(p.x+p.w/2,p.y+p.h);
 ctx.scale(p.dir===-1?-1:1,1);
 if(p.spawn>0){ctx.translate(0,-p.spawn*42);ctx.globalAlpha*=clamp(1-p.spawn/1.25,.15,1);}
 if(mode==='dead'){ctx.rotate(-clamp(deathT,0,1)*.22);}
 if(p.invuln>0)ctx.globalAlpha*=.87;
 const smoothing=ctx.imageSmoothingEnabled;
 ctx.imageSmoothingEnabled=false;
 // Identical physical footprint throughout; only the visual picture changes.
 // The original and supplementary atlas have matched feet at the same ground plane.
 ctx.drawImage(source.atlas,frame.x,frame.y,frame.width,frame.height,
  extra?-81:-61,extra?-152:-116,extra?162:122,extra?162:122);
 ctx.imageSmoothingEnabled=smoothing;
 if(p.shield>0){ctx.strokeStyle='rgba(143,232,255,.72)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-61,67,73,0,0,Math.PI*2);ctx.stroke();}
 if(p.healFx>0){ctx.fillStyle='rgba(126,255,168,.16)';ctx.beginPath();ctx.ellipse(0,-59,65,68,0,0,Math.PI*2);ctx.fill();}
 if(p.upgrades?.resistance>0){ctx.strokeStyle='rgba(240,210,157,'+Math.min(.6,p.upgrades.resistance*.08)+')';ctx.lineWidth=1+p.upgrades.resistance*.4;ctx.beginPath();ctx.ellipse(0,-61,68,74,0,0,Math.PI*2);ctx.stroke();}
 if(p.hit>0){ctx.fillStyle='rgba(255,110,120,.11)';ctx.fillRect(-56,-116,112,114);}
 ctx.restore();
 return true;
}