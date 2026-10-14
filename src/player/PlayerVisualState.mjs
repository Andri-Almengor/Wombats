import {manifest} from './SpriteAssetManager.mjs';
import {AnimationController} from './AnimationController.mjs';
export const SPELL_ACTIONS=Object.freeze({KeyQ:'cast_basic',KeyW:'cast_ice',KeyE:'cast_fire',KeyF:'cast_lightning',KeyX:'cast_nova',KeyR:'cast_heal',KeyC:'cast_shield'});
const CLIPS=manifest.variants.sano.clips;
export const healthVariant=p=>(p.hp??5)/Math.max(1,p.maxHp??5)<=.35?'critico':(p.hp??5)/Math.max(1,p.maxHp??5)<=.7?'herido':'sano';
export function locomotion(p,previous){
 if(!p.grounded)return p.vy>75?'fall':'jump_air';
 const speed=Math.abs(p.vx||0);
 if(speed<25)return 'idle';
 // Hysteresis prevents threshold chatter; same movement and controls as before.
 return speed>(previous==='run'?205:235)?'run':'walk';
}
export class PlayerVisualState{
 constructor(p){this.controller=new AnimationController();this.reset(p);}
 reset(p){this.epoch=p.visualEpoch||0;this.seen={};this.wasGrounded=Boolean(p.grounded);this.jumps=p.jumps||0;this.lastHit=0;this.lastDash=0;this.controller=new AnimationController();this.controller.play(locomotion(p),CLIPS[locomotion(p)]);}
 play(action,token=null,duration){if(this.controller.action===action&&this.controller.token===token)return;this.controller.play(action,CLIPS[action],{token,duration});}
 consume(p,key){const seq=p[key]||0,changed=seq!==(this.seen[key]||0);this.seen[key]=seq;return changed;}
 update(p,mode,dt){
  if(this.epoch!==(p.visualEpoch||0)){
   this.reset(p);
   for(const key of ['castSequence','hurtSequence','dashSequence','jumpSequence','landSequence','pickupSequence'])this.seen[key]=p[key]||0;
   this.lastHit=p.hit||0;this.lastDash=p.dash||0;
  }
  if(['paused','spell-menu','upgrade-menu'].includes(mode))return this.controller;
  const c=this.controller;
  c.advance(dt,['walk','run'].includes(c.action)?Math.max(.3,Math.min(1.5,Math.abs(p.vx||0)/(c.action==='run'?310:150))):1);
  // Consume even preempted events so a hurt/cast never reappears after death/dash.
  const cast=this.consume(p,'castSequence'),hurt=this.consume(p,'hurtSequence'),dash=this.consume(p,'dashSequence'),jump=this.consume(p,'jumpSequence'),land=this.consume(p,'landSequence'),pickup=this.consume(p,'pickupSequence');
  const tookHit=hurt||(p.hit||0)>this.lastHit,startedDash=dash||(p.dash||0)>this.lastDash;
  const jumped=jump||(!p.grounded&&(p.jumps||0)>this.jumps);
  const landed=land||(!this.wasGrounded&&p.grounded);
  this.lastHit=p.hit||0;this.lastDash=p.dash||0;this.jumps=p.jumps||0;this.wasGrounded=Boolean(p.grounded);
  if(mode==='dead'){this.play('death');return c;}
  if(mode==='victory'){this.play('victory');return c;}
  if(tookHit)this.play('hurt',p.hurtSequence||Symbol());
  if(c.action==='hurt'&&(!c.complete||p.hit>0))return c;
  if(startedDash)this.play('dash',p.dashSequence||Symbol(),.19);
  if(c.action==='dash'&&(!c.complete||p.dash>0))return c;
  if(jumped){this.play(p.jumps>=2?'double_jump':'jump_start',p.jumpSequence||Symbol());return c;}
  if(cast&&SPELL_ACTIONS[p.visualSpell]){this.play(SPELL_ACTIONS[p.visualSpell],p.castSequence);return c;}
  if(c.action.startsWith('cast_')&&!c.complete)return c;
  if(landed){this.play('land',p.landSequence||Symbol());return c;}
  if(['jump_start','double_jump'].includes(c.action)&&!c.complete&&!p.grounded)return c;
  if(c.action==='land'&&!c.complete&&p.grounded)return c;
  // The actual book pickup event is the only interaction represented by this art.
  if(pickup&&p.grounded){this.play('pickup',p.pickupSequence);return c;}
  if(c.action==='pickup'&&!c.complete&&p.grounded)return c;
  const next=locomotion(p,c.action),phase=['walk','run'].includes(c.action)&&['walk','run'].includes(next)?c.phase:0;
  if(c.action!==next)c.play(next,CLIPS[next],{phase});return c;
 }
}
