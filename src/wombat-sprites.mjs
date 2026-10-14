// Public adapter: the old procedural renderer remains the debug/error fallback.
import {SpriteAssetManager,manifest} from './player/SpriteAssetManager.mjs';
import {PlayerVisualState,SPELL_ACTIONS,healthVariant,locomotion} from './player/PlayerVisualState.mjs';
import {PlayerSpriteRenderer} from './player/PlayerSpriteRenderer.mjs';
const assets=new SpriteAssetManager({base:import.meta.env?.BASE_URL||'/'});
const states=new WeakMap(),renderer=new PlayerSpriteRenderer();
let loading=false;
export function legacyWombatRequested(){
 if(typeof window==='undefined')return false;
 try{return new URLSearchParams(window.location.search).get('wombatRender')==='legacy'||window.localStorage?.getItem('wombat:render')==='legacy';}catch{return false;}
}
export function preloadWombatSprites(){if(typeof Image==='undefined'||legacyWombatRequested())return;if(!loading){loading=true;return assets.preload();}return assets.preload();}
export const wombatSpriteStatus=()=>assets.entries.sano.status;
export const extraWombatSpriteStatus=wombatSpriteStatus;
export function selectWombatAnimation(p,mode='playing'){
 if(mode==='dead')return 'death';if(mode==='victory')return 'victory';if(p.hit>0)return 'hurt';if(p.dash>0)return 'dash';if(p.cast>0)return SPELL_ACTIONS[p.visualSpell]||'cast_basic';
 if(!p.grounded&&p.vy< -140&&!p.levitating)return p.jumps>=2?'double_jump':'jump_start';
 return p.levitating?'jump_air':locomotion(p);
}
export function chooseWombatFrame(action,elapsed,p={},variant='sano'){
 const clip=manifest.variants[variant]?.clips[action]||manifest.variants.sano.clips[action]||manifest.variants.sano.clips.idle;
 const tick=Math.floor(Math.max(0,elapsed)*clip.fps);return clip.loop?tick%clip.frames.length:Math.min(clip.frames.length-1,tick);
}
export function updateWombatVisual(p,t,mode='playing',visualDt){
 let state=states.get(p);
 if(!state){state={visual:new PlayerVisualState(p),last:t,frame:null,image:null,socket:{x:0,y:0}};states.set(p,state);}
 const dt=visualDt??Math.max(0,t-state.last);state.last=t;
 const controller=state.visual.update(p,mode,dt);
 const source=assets.resolve(healthVariant(p),controller.action);
 if(source){state.frame=source.clip.frames[controller.frameIndex(source.clip)];state.image=source.image;renderer.socket(p,state.frame,state.socket);}else{state.frame=null;state.image=null;}
 return state;
}
export function getWombatSocket(p){return states.get(p)?.frame?states.get(p).socket:null;}
export function drawWombatSprite(ctx,p,t,mode='playing',deathT=0,visualDt){
 if(legacyWombatRequested())return false;
 if(!loading)preloadWombatSprites();
 const state=updateWombatVisual(p,t,mode,visualDt);
 if(!state.frame||!state.image)return false;
 try{renderer.draw(ctx,p,state.image,state.frame);return true;}catch{return false;}
}
