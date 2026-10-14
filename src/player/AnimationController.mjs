// A clip owns time. Gameplay cooldowns never select frames or silently truncate it.
export class AnimationController{
 constructor(){this.action=null;this.clip=null;this.elapsed=0;this.speed=1;this.token=null;}
 play(action,clip,{token=null,duration,phase}={}){
  if(this.action===action&&this.token===token)return false;
  this.action=action;this.clip=clip;this.token=token;
  this.speed=duration?clip.frames.length/clip.fps/duration:1;
  this.elapsed=(phase??0)*this.duration;return true;
 }
 get duration(){return this.clip?this.clip.frames.length/this.clip.fps:0;}
 get complete(){return Boolean(this.clip&&!this.clip.loop&&this.elapsed+1e-9>=this.duration);}
 get phase(){return this.duration?(this.clip.loop?(this.elapsed+1e-9)%this.duration:Math.min(this.elapsed,this.duration))/this.duration:0;}
 advance(dt,speed=1){if(Number.isFinite(dt)&&dt>0)this.elapsed+=dt*this.speed*speed;}
 frameIndex(clip=this.clip){if(!clip)return 0;return Math.min(clip.frames.length-1,Math.floor((this.phase+1e-10)*clip.frames.length));}
}
