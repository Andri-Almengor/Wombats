export class PlayerSpriteRenderer{
 draw(ctx,p,image,frame){
  ctx.save();
  try{
   ctx.translate(p.x+p.w/2,p.y+p.h);ctx.scale(p.dir===-1?-1:1,1);
   ctx.imageSmoothingEnabled=false;
   if(p.spawn>0)ctx.globalAlpha*=Math.max(.15,1-p.spawn/1.25);
   if(p.invuln>0)ctx.globalAlpha*=.87;
   // Trim changes only transparent margins. One source pixel = one world pixel.
   ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,-frame.pivot[0],-frame.pivot[1],frame.width,frame.height);
   if(p.shield>0){ctx.strokeStyle='rgba(143,232,255,.68)';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,-49,51,62,0,0,Math.PI*2);ctx.stroke();}
   if(p.healFx>0){ctx.fillStyle='rgba(126,255,168,.13)';ctx.beginPath();ctx.ellipse(0,-49,48,60,0,0,Math.PI*2);ctx.fill();}
   if(p.healFx<0){ctx.strokeStyle='#d9c6ff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,-38,(.6+p.healFx)*290,0,Math.PI*2);ctx.stroke();}
   if((p.upgrades?.resistance||0)>0){ctx.strokeStyle='rgba(240,210,157,'+Math.min(.6,p.upgrades.resistance*.08)+')';ctx.lineWidth=1+p.upgrades.resistance*.4;ctx.beginPath();ctx.ellipse(0,-49,50,62,0,0,Math.PI*2);ctx.stroke();}
  }finally{ctx.restore();}
 }
 socket(p,frame,out){out.x=p.x+p.w/2+(p.dir===-1?-1:1)*(frame.socket[0]-frame.pivot[0]);out.y=p.y+p.h+frame.socket[1]-frame.pivot[1];return out;}
}
