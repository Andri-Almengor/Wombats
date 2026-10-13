import {NAMED_ATLASES,NAMED_WOMBAT_ANIMATIONS,NAMED_SPRITE_CELL,NAMED_SPRITE_PIVOT} from './assets/meta/wombat-named-animations.mjs';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const sprites=Object.fromEntries(Object.keys(NAMED_ATLASES).map(key=>[key,{status:'unloaded',image:null}]));
const animationStates=new WeakMap();
const SPRITE_WIDTH=126; // Constant for EVERY animation, including spells and injuries.
const ROOT='assets/sprites/wombat/named/';
const SPELL_ACTIONS=Object.freeze({
 KeyQ:'cast_basic',KeyW:'cast_ice',KeyE:'cast_fire',
 KeyF:'cast_lightning',KeyX:'cast_nova',KeyR:'cast_heal',KeyC:'cast_shield'
});

export function legacyWombatRequested(){
 if(typeof window==='undefined')return false;
 try{return new URLSearchParams(window.location.search).get('wombatRender')==='legacy'
   ||window.localStorage?.getItem('wombat:render')==='legacy';}
 catch{return false;}
}
export function preloadWombatSprites(){
 if(typeof Image==='undefined'||legacyWombatRequested())return;
 const base=(import.meta.env?.BASE_URL||'/').replace(/\/?$/,'/');
 for(const [variant,config] of Object.entries(NAMED_ATLASES)){
  const source=sprites[variant];
  if(source.status!=='unloaded')continue;
  source.status='loading';
  const image=new Image();
  image.onload=()=>{
   if(image.naturalWidth!==config.width||image.naturalHeight!==config.height){
    source.status='error';source.image=null;return;
   }
   source.image=image;source.status='ready';
  };
  image.onerror=()=>{source.status='error';source.image=null;};
  image.src=base+ROOT+config.file;
 }
}
export const wombatSpriteStatus=()=>sprites.sano.status;
export const extraWombatSpriteStatus=()=>sprites.sano.status;

export function selectWombatAnimation(p,mode='playing'){
 if(mode==='dead')return 'death';
 if(mode==='victory')return 'victory';
 if((p.hit||0)>0)return 'hurt';
 if((p.dash||0)>0)return 'dash';
 if((p.cast||0)>0||(p.healFx||0)>0&&p.visualSpell==='KeyR')
  return SPELL_ACTIONS[p.visualSpell]||'cast_basic';
 if(!p.grounded){
  if(p.levitating)return 'jump_air'; // no levitation mechanic: never switch to levitate by velocity
  if(p.vy < -140)return (p.jumps||0)>=2?'double_jump':'jump_start';
  if(p.vy < 75)return 'jump_air';
  return 'fall';
 }
 const speed=Math.abs(p.vx||0);
 return speed>225?'run':speed>35?'walk':'idle';
}

export function resolveWombatVisualAction(p,t,mode,state){
 if(!state)return selectWombatAnimation(p,mode);
 const sequence=p.castSequence||0;
 if(sequence!==state.castSequence&&p.visualSpell&&SPELL_ACTIONS[p.visualSpell]){
  state.castSequence=sequence;
  state.spellAction=SPELL_ACTIONS[p.visualSpell];
  // Visual-only linger: the physics cooldown still ends at the original time.
  state.spellUntil=t+Math.min(.34,NAMED_WOMBAT_ANIMATIONS.sano[state.spellAction].frames.length
    *NAMED_WOMBAT_ANIMATIONS.sano[state.spellAction].frameDuration*.55);
 }
 if(!state.wasGrounded&&p.grounded&&mode==='playing')state.landUntil=t+.17;
 state.wasGrounded=Boolean(p.grounded);
 const base=selectWombatAnimation(p,mode);
 if(['death','victory','hurt','dash'].includes(base))return base;
 if(t<(state.spellUntil||0)&&state.spellAction)return state.spellAction;
 if(base.startsWith('cast_'))return base;
 if(base==='idle'&&t<(state.landUntil||0))return 'land';
 return base;
}

export function chooseWombatFrame(action,elapsed,p={},variant='sano'){
 const clip=NAMED_WOMBAT_ANIMATIONS[variant]?.[action]
  ||NAMED_WOMBAT_ANIMATIONS.sano[action]||NAMED_WOMBAT_ANIMATIONS.sano.idle;
 if(action==='dash'&&(p.dash||0)>0){
  const progress=clamp((.19-p.dash)/.19,0,.999);
  return Math.min(clip.frames.length-1,Math.floor(progress*clip.frames.length));
 }
 const tick=Math.floor(Math.max(0,elapsed)/clip.frameDuration);
 return clip.loop?tick%clip.frames.length:Math.min(clip.frames.length-1,tick);
}
export function wombatHealthVariant(p,action){
 const ratio=(p.hp??5)/Math.max(1,p.maxHp??5);
 const variant=ratio<=.35?'critico':ratio<=.7?'herido':'sano';
 // The supplied injury atlases ONLY contain idle and walk. No invented clips.
 if(!NAMED_WOMBAT_ANIMATIONS[variant]?.[action]||sprites[variant].status!=='ready')return 'sano';
 return variant;
}
export function wombatDrawRect(p){
 const x=p.x+p.w/2,y=p.y+p.h;
 const size=SPRITE_WIDTH;
 return {x:-size*NAMED_SPRITE_PIVOT.x/NAMED_SPRITE_CELL,
  y:-size*NAMED_SPRITE_PIVOT.y/NAMED_SPRITE_CELL,
  width:size,height:size,worldCenterX:x,worldFeetY:y};
}

export function drawWombatSprite(ctx,p,t,mode='playing',deathT=0){
 if(legacyWombatRequested())return false;
 preloadWombatSprites();
 if(sprites.sano.status!=='ready'||!sprites.sano.image)return false;
 let state=animationStates.get(p);
 if(!state){
  state={lastAction:null,started:t,wasGrounded:Boolean(p.grounded),
   landUntil:0,castSequence:p.castSequence||0,spellAction:null,spellUntil:0};
  animationStates.set(p,state);
 }
 const action=resolveWombatVisualAction(p,t,mode,state);
 const variant=wombatHealthVariant(p,action);
 const source=sprites[variant];
 const clip=NAMED_WOMBAT_ANIMATIONS[variant]?.[action]||NAMED_WOMBAT_ANIMATIONS.sano[action];
 if(!source.image||!clip)return false;
 if(state.lastAction!==action){state.started=t;state.lastAction=action;}
 const index=chooseWombatFrame(action,Math.max(0,t-state.started),p,variant);
 const frame=clip.frames[index];
 if(!frame)return false;
 const rect=wombatDrawRect(p);
 ctx.save();
 try{
  ctx.translate(rect.worldCenterX,rect.worldFeetY);
  ctx.scale(p.dir===-1?-1:1,1);
  if(p.spawn>0){ctx.translate(0,-p.spawn*42);ctx.globalAlpha*=clamp(1-p.spawn/1.25,.15,1);}
  if(p.invuln>0)ctx.globalAlpha*=.87;
  const smoothing=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=false;
  // Single fixed destination geometry for all 156 supplied PNG frames.
  ctx.drawImage(source.image,frame.x,frame.y,frame.width,frame.height,
   rect.x,rect.y,rect.width,rect.height);
  ctx.imageSmoothingEnabled=smoothing;
  if(p.shield>0){
   ctx.strokeStyle='rgba(143,232,255,.68)';ctx.lineWidth=2.5;ctx.beginPath();
   ctx.ellipse(0,-54,51,62,0,0,Math.PI*2);ctx.stroke();
  }
  if(p.healFx>0){
   ctx.fillStyle='rgba(126,255,168,.13)';ctx.beginPath();ctx.ellipse(0,-54,48,60,0,0,Math.PI*2);ctx.fill();
  }
  if((p.upgrades?.resistance||0)>0){
   ctx.strokeStyle='rgba(240,210,157,'+Math.min(.6,p.upgrades.resistance*.08)+')';
   ctx.lineWidth=1+p.upgrades.resistance*.4;
   ctx.beginPath();ctx.ellipse(0,-54,50,62,0,0,Math.PI*2);ctx.stroke();
  }
 }finally{ctx.restore();}
 return true;
}
