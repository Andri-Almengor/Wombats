import manifest from './assets-manifest.json' with {type:'json'};
export {manifest};
export function validateManifest(data){
 if(data.schemaVersion!==1)throw Error('Unsupported sprite schema');
 for(const [variant,atlas] of Object.entries(data.variants)){
  if(!(atlas.width>0&&atlas.height>0))throw Error(`Invalid atlas ${variant}`);
  for(const [action,clip] of Object.entries(atlas.clips)){
   if(!clip.frames.length||!(clip.fps>0))throw Error(`Invalid clip ${action}`);
   for(const f of clip.frames){
    if(![f.x,f.y,f.width,f.height,...f.pivot,...f.socket].every(Number.isFinite)||f.width<=0||f.height<=0||f.x<0||f.y<0||f.x+f.width>atlas.width||f.y+f.height>atlas.height)throw Error(`Invalid frame ${variant}/${action}`);
   }
  }
 }
 return true;
}
export class SpriteAssetManager{
 constructor({data=manifest,imageFactory=()=>new Image(),base='/',timeout=15000}={}){
  this.data=data;this.imageFactory=imageFactory;this.base=base.replace(/\/?$/,'/');this.timeout=timeout;
  this.entries=Object.fromEntries(Object.keys(data.variants).map(v=>[v,{status:'unloaded',image:null,promise:null,clips:null}]));
  try{validateManifest(data);this.valid=true;}catch(error){this.valid=false;this.error=error;}
 }
 preload(){return Promise.all(Object.keys(this.entries).map(v=>this.load(v)));}
 load(variant){
  const entry=this.entries[variant];if(entry.promise)return entry.promise;
  if(!this.valid){entry.status='error';return Promise.resolve(false);}
  entry.status='loading';
  entry.promise=new Promise(resolve=>{
   let image,timer,settled=false;
   const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(image){image.onload=null;image.onerror=null;}entry.image=ok?image:null;entry.status=ok?'ready':'error';entry.clips=ok?Object.fromEntries(Object.entries(this.data.variants[variant].clips).map(([action,clip])=>[action,{image,clip,variant}])):null;resolve(ok);};
   try{
    image=this.imageFactory();const cfg=this.data.variants[variant];
    timer=setTimeout(()=>finish(false),this.timeout);
    image.onerror=()=>finish(false);
    image.onload=async()=>{try{if(image.decode)await image.decode();finish(image.naturalWidth===cfg.width&&image.naturalHeight===cfg.height);}catch{finish(false);}};
    image.src=this.base+'assets/sprites/wombat/rebuilt/'+cfg.file;
   }catch{finish(false);}
  });return entry.promise;
 }
 resolve(variant,action){
  const v=this.entries[variant]?.status==='ready'&&this.data.variants[variant].clips[action]?variant:'sano';
  if(this.entries[v]?.status!=='ready')return null;
  return this.entries[v].clips[action]||this.entries[v].clips.idle;
 }
}
