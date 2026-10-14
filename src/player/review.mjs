import {SpriteAssetManager,manifest} from './SpriteAssetManager.mjs';
import {PlayerSpriteRenderer} from './PlayerSpriteRenderer.mjs';
const base=import.meta.env.BASE_URL,manager=new SpriteAssetManager({base});
await manager.preload();
const root=base+'assets/sprites/wombat/candidates/';
const metadata=await (await fetch(root+'manifest.json')).json();
const candidate=new Image();candidate.src=root+metadata.file;await candidate.decode();
const canvas=document.querySelector('#review'),ctx=canvas.getContext('2d'),renderer=new PlayerSpriteRenderer();
const state={action:'idle',time:0,paused:false,dir:1,guides:true};
function draw(){
 ctx.clearRect(0,0,1000,480);ctx.fillStyle='#b8c4c7';ctx.fillRect(0,0,1000,480);
 for(let y=0;y<480;y+=20)for(let x=0;x<1000;x+=20)if((x+y)%40===0){ctx.fillStyle='#a9b7ba';ctx.fillRect(x,y,20,20);}
 const original=manager.resolve('sano',state.action),clips=[original.clip,metadata.clips[state.action]],images=[original.image,candidate];
 clips.forEach((clip,i)=>{
  const index=Math.floor((state.time+1e-8)*clip.fps)%clip.frames.length;
  ctx.save();ctx.translate(i*500+250,350);ctx.scale(2,2);
  const p={x:-22,y:-68,w:44,h:68,dir:state.dir};renderer.draw(ctx,p,images[i],clip.frames[index]);
  if(state.guides){ctx.strokeStyle='#b42f63';ctx.lineWidth=.5;ctx.strokeRect(-22,-68,44,68);ctx.beginPath();ctx.moveTo(-110,0);ctx.lineTo(110,0);ctx.stroke();}
  ctx.restore();ctx.fillStyle='#13202a';ctx.font='20px system-ui';ctx.fillText(i?'Candidato generado · NO aprobado':'Producción · PR #8',i*500+25,40);
  ctx.font='16px system-ui';ctx.fillText(`${state.action} · fotograma ${index+1}/${clip.frames.length}`,i*500+25,440);
 });
 document.querySelector('#status').textContent=`${state.action} · ${state.time.toFixed(2)} s · escala de dibujo ×2 · eje rosa = suelo real`;
}
document.querySelector('#action').onchange=e=>{state.action=e.target.value;state.time=0;draw();};
document.querySelector('#pause').onclick=e=>{state.paused=!state.paused;e.target.textContent=state.paused?'Reproducir':'Pausar';};
document.querySelector('#next').onclick=()=>{state.paused=true;state.time+=1/metadata.clips[state.action].fps;document.querySelector('#pause').textContent='Reproducir';draw();};
document.querySelector('#mirror').onclick=e=>{state.dir*=-1;e.target.textContent=state.dir===1?'Mirar a la izquierda':'Mirar a la derecha';draw();};
document.querySelector('#guides').onchange=e=>{state.guides=e.target.checked;draw();};
// Deterministic capture API, confined to the diagnostic page.
window.playerReview={set(action,time,dir=1){Object.assign(state,{action,time,dir,paused:true});draw();},ready:true};
let last=performance.now();function tick(now){if(!state.paused)state.time+=Math.min(.1,(now-last)/1000);last=now;draw();requestAnimationFrame(tick);}requestAnimationFrame(tick);
