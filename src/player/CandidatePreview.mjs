// Playable preview enabled by request; artistic review is still pending.
let image=null, data=null, pending=null;
export function useCandidate(search=''){
 const mode=new URLSearchParams(search).get('wombatRender');
 return mode!=='rebuilt'&&mode!=='legacy';
}
const enabled=typeof window!=='undefined'&&useCandidate(window.location.search);
export function candidateRequested(){
 return enabled;
}
export function preloadCandidate(){
 if(!candidateRequested())return Promise.resolve(false);
 if(pending)return pending;
 pending=(async()=>{
  try{
   const base=(import.meta.env?.BASE_URL||'/')+'assets/sprites/wombat/candidates/';
   const response=await fetch(base+'manifest.json');if(!response.ok)throw Error('Candidate metadata');
   const metadata=await response.json(),loaded=new Image();loaded.src=base+metadata.file;await loaded.decode();
   if(loaded.naturalWidth!==metadata.width||loaded.naturalHeight!==metadata.height)throw Error('Candidate dimensions');
   data=metadata;image=loaded;return true;
  }catch{return false;}
 })();return pending;
}
export function candidateFrame(controller){
 const clip=data?.clips[controller.action];
 return image&&clip?{image,frame:clip.frames[controller.frameIndex(clip)]}:null;
}
