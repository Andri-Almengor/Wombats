import {WIDTH,HEIGHT,FLOOR} from './world.mjs';
import {drawWombatSprite} from './wombat-sprites.mjs';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fill();}
function poly(c,p,color){c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function round(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function line(c,points,color,width=3){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function stars(c,t,camera){for(let i=0;i<80;i++){let x=((i*157.3-camera*.08)%WIDTH+WIDTH)%WIDTH,y=20+(i*91)%390;ellipse(c,x,y,1+Math.sin(i)*.5,1+Math.sin(i)*.5,`rgba(248,244,213,${.2+(1+Math.sin(i*4+t*.8))*.18})`);}}
function tree(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-18,0],[-11,-205],[11,-290],[21,-180],[30,0]],'#243c3a');line(c,[[0,-110],[-65,-210]],'#243c3a',16);line(c,[[9,-180],[69,-267]],'#243c3a',13);for(const [dx,dy,r] of [[-45,-245,68],[22,-286,74],[75,-238,61],[-90,-210,47]])ellipse(c,dx,dy,r,r*.72,color);c.restore();}
function background(c,w,t,camera){
 const b=w.biome,gradient=c.createLinearGradient(0,0,0,HEIGHT);gradient.addColorStop(0,b.sky[0]);gradient.addColorStop(1,b.sky[1]);c.fillStyle=gradient;c.fillRect(0,0,WIDTH,HEIGHT);
 stars(c,t,camera);
 if(b.id==='forest'){glow(c,990-camera*.025,156,230,'#d5f4b42f');ellipse(c,990-camera*.025,156,70,70,'#ebf1c8');for(let layer=0;layer<3;layer++)for(let i=-1;i<10;i++){const x=i*220-(camera*(.12+layer*.15))%220;tree(c,x,590+layer*18,.9+layer*.22,['#1a4542','#205046','#245749'][layer]);}for(let i=0;i<40;i++){let x=((i*71-camera*.28)%WIDTH+WIDTH)%WIDTH,y=220+(i*43)%340+Math.sin(t*1.6+i)*15;glow(c,x,y,13,'#d6f5a933');ellipse(c,x,y,2,2,'#dceba9');}}
 else if(b.id==='crystal'){for(let layer=0;layer<3;layer++)for(let i=-1;i<10;i++){let x=i*220-(camera*(.08+layer*.16))%220;poly(c,[[x-40,HEIGHT],[x+85,100+layer*95],[x+170,HEIGHT]],['#1b2848','#293657','#303e60'][layer]);poly(c,[[x+45,HEIGHT],[x+132,260+layer*75],[x+215,HEIGHT]],['#27345a','#354566','#405277'][layer]);}for(let i=0;i<20;i++){let x=((i*185-camera*.22)%WIDTH+WIDTH)%WIDTH;glow(c,x,480-(i*31)%280,45,'#94d7fa12');}}
 else if(b.id==='cave'){for(let layer=0;layer<3;layer++)for(let i=-1;i<11;i++){const x=i*170-(camera*(.06+layer*.13))%170;poly(c,[[x-100,-10],[x+35,170+layer*65+(i%3)*38],[x+88,-10]],['#1e263c','#262f46','#303751'][layer]);poly(c,[[x-70,HEIGHT+10],[x+60,HEIGHT-155-layer*42],[x+140,HEIGHT+10]],['#171f34','#273047','#323950'][layer]);}
 for(let i=0;i<18;i++){let x=((i*137-camera*.17)%WIDTH+WIDTH)%WIDTH,y=90+(i*97)%570;glow(c,x,y,38,'#929ec623');ellipse(c,x,y,2.2,2.2,'#9bc8d7');}}
 else if(b.id==='sky'){glow(c,940-camera*.02,120,290,'#fff3cd4b');ellipse(c,940-camera*.02,120,80,80,'#fff0c4');for(let layer=0;layer<4;layer++)for(let i=-1;i<8;i++){const x=i*270-camera*(.1+layer*.09)%270,y=330+layer*80;ellipse(c,x+90,y,150,52,['#d7e9e718','#dce6e732','#c7d7d952','#abbfd155'][layer]);ellipse(c,x,y-10,110,55,['#d7e9e718','#dce6e732','#c7d7d952','#abbfd155'][layer]);}for(let i=0;i<8;i++){let x=i*225-camera*.25%225;round(c,x,240+i%3*35,95,420,3,'#9ca2b428');}}
 else{glow(c,950,135,300,'#f1aabb25');ellipse(c,950-camera*.02,140,92,92,'#dc9caf');ellipse(c,985-camera*.02,132,86,86,'#28233e');for(let layer=0;layer<3;layer++)for(let i=-1;i<8;i++){const x=i*245-camera*(.09+layer*.13)%245;round(c,x,230+(i%3)*42,180,420,3,['#342b49','#3d304d','#48374d'][layer]);for(let j=0;j<6;j++)round(c,x+j*29,214+(i%3)*42,20,24,0,['#342b49','#3d304d','#48374d'][layer]);}}
}
function ground(c,p,b,t){
 const top=p.y,c1=b.floor,edge=b.edge;
 round(c,p.x,top,p.w,p.h,2,c1);round(c,p.x,top,p.w,8,2,edge);round(c,p.x,top+9,p.w,7,1,'#1017282d');
 if(p.kind==='ground'){
  for(let i=10;i<p.w-10;i+=49){round(c,p.x+i,top+22+i%25,22,5,2,'#ffffff0a');}
  if(b.id==='forest')for(let i=20;i<p.w;i+=95){line(c,[[p.x+i,top],[p.x+i+4,top-12],[p.x+i+8,top]],edge,2);ellipse(c,p.x+i+5,top-16,6,3,'#d5d59d');}
  else if(b.id==='swamp')for(let i=32;i<p.w;i+=96){line(c,[[p.x+i,top],[p.x+i-4,top-32]],'#819b69',3);ellipse(c,p.x+i-6,top-32,8,3,'#c6d399');}
  else if(b.id==='sky')round(c,p.x+22,top+12,p.w-40,4,3,'#fff9dc2b');
 }else{
  if(p.kind==='crystal'){poly(c,[[p.x+15,top+21],[p.x+35,top+46],[p.x+54,top+21]],'#88bee090');glow(c,p.x+p.w/2,top+4,38,'#a4eaf233');}
  if(p.kind==='lily')ellipse(c,p.x+p.w/2,top+11,p.w*.42,11,'#afd58a85');
  if(p.kind==='cloud'){ellipse(c,p.x+p.w/2,top+16,p.w*.52,17,'#eef6f278');ellipse(c,p.x+42,top+4,36,22,'#e7f2e988');}
  if(p.kind==='branch')for(let i=13;i<p.w;i+=45)ellipse(c,p.x+i,top,19,8,'#a1c587');
 }
}
function decorations(c,w,camera,t){for(const d of w.decor){if(d.x<camera-180||d.x>camera+WIDTH+180)continue;
 if(d.type==='tree')tree(c,d.x,d.y||FLOOR,d.scale,'#2e654d');
 else if(d.type==='crystals'){for(let i=0;i<5;i++){const x=d.x+i*20,y=d.y||FLOOR;poly(c,[[x,y],[x+10,y-55-i%3*15],[x+27,y]],'#8ebed1');line(c,[[x+10,y-55-i%3*15],[x+14,y]],'#e5edfa77',2);}}
 else if(d.type==='reeds')for(let i=0;i<8;i++){let x=d.x+i*18;line(c,[[x,FLOOR],[x+Math.sin(t+i)*5,FLOOR-65-i%3*8]],'#749570',3);}
 else if(d.type==='ruins'){round(c,d.x,(d.y||FLOOR)-105,38,105,2,'#adb5c1');round(c,d.x-25,(d.y||FLOOR)-115,89,16,2,'#dad9d0');}
 else if(d.type==='banners'){round(c,d.x,FLOOR-180,18,180,3,'#76617b');poly(c,[[d.x+18,FLOOR-172],[d.x+88,FLOOR-167],[d.x+63,FLOOR-122],[d.x+18,FLOOR-115]],'#ad738d');}
 }}
function proceduralWombat(c,p,t,mode='playing',deathT=0){const hpFraction=p.hp/p.maxHp,hurt=hpFraction<.7,bad=hpFraction<.35;
 c.save();c.translate(p.x+p.w/2,p.y+p.h*.56);c.scale(p.dir,1);
 if(p.spawn>0){c.translate(0,-p.spawn*42);c.globalAlpha*=clamp(1-p.spawn/1.25,.15,1);glow(c,0,0,90,'#e8f3c366');}
 if(mode==='dead'){c.rotate(clamp(deathT,0,1)*-.95);c.translate(0,clamp(deathT,0,1)*18);}
 if(p.invuln>0&&Math.floor(t*13)%3===0)c.globalAlpha=.55;
 const run=p.grounded?Math.sin(p.step*1.8)*clamp(Math.abs(p.vx)/250,0,1):0;
 const dodge=p.dash>0,fall=!p.grounded;
 if(dodge){c.rotate(-.27);c.scale(1.22,.78);}
 else if(fall)c.rotate(clamp(p.vy/2300,-.15,.18));
 else c.translate(0,Math.sin(p.step*2)*Math.min(2,Math.abs(p.vx)/130));
 ellipse(c,0,35,28,5,'#0a172555');
 // Reactive cloak, frayed and battle-worn at low health.
 const capeLift=run*5+Math.sin(t*7)*3+(fall?12:0);
 poly(c,[[-18,-6],[-34,22+capeLift],[-22,25+capeLift],[-11,24+capeLift],[6,29],[23,18],[19,-8]],bad?'#6a5668':'#587b8b');
 poly(c,[[-22,0],[-33,21+capeLift],[-21,18+capeLift],[-12,13]],bad?'#8b657a':'#3a6476');
 if(hurt){line(c,[[-26,13],[-11,7]],'#d9a19b',2);line(c,[[8,13],[18,21]],'#a8b2bf',2);}
 if(bad){poly(c,[[-30,19],[-23,11],[-16,21],[-12,17],[-15,27]],'#413a4e');}
 // Feet animate independently.
 ellipse(c,-13,27+run*7,13,9,'#75665a');ellipse(c,13,27-run*7,13,9,'#75665a');
 ellipse(c,-16,-18,9,12,'#b59c88');ellipse(c,16,-18,9,12,'#b59c88');
 ellipse(c,-16,-19,4,7,'#806b68');ellipse(c,16,-19,4,7,'#806b68');
 ellipse(c,0,-1,25,24,'#baa28e');ellipse(c,3,9,22,17,'#c3b09c');
 ellipse(c,16,5,14,11,'#d3bda4');round(c,15,-3,11,8,3,'#4b4444');
 if(p.hit>0){line(c,[[-5,-10],[-1,-7],[2,-11]],'#2a292a',2);line(c,[[7,-8],[10,-5],[13,-9]],'#2a292a',2);}
 else{ellipse(c,-4,-10,3.6,4.1,'#293138');ellipse(c,8,-10,3.2,3.8,'#293138');ellipse(c,-3,-11,1,1,'#ffffff');ellipse(c,9,-11,1,1,'#ffffff');}
 ellipse(c,-13,6,5,2,'#c38a86');ellipse(c,18,13,5,2,'#c38a86');
 if(hurt){line(c,[[-22,8],[-13,5]],'#a35f5b',2);ellipse(c,-20,9,2.5,1.6,'#d8847e');}
 if(bad){line(c,[[0,14],[4,16],[2,21]],'#a86d66',2);}
 // Magician hat with brim, folds and gold embroidery.
 poly(c,[[-27,-21],[28,-21],[8,-74],[-3,-63],[-11,-68]],bad?'#576075':'#567d94');
 poly(c,[[-15,-25],[-8,-58],[-2,-63],[-5,-28]],'#3d617e');
 ellipse(c,0,-23,32,6,'#90aeb1');
 round(c,-12,-32,26,5,2,'#d8bd83');
 poly(c,[[-3,-54],[2,-47],[10,-48],[4,-42],[6,-33],[-3,-38],[-10,-33],[-8,-42],[-16,-47],[-7,-48]],'#f8d995');
 // Arms and staff: the casting motion is visible.
 ellipse(c,21,11-(p.cast>0?8:0),10,8,'#bb9d85');
 const swing=p.cast>0?-12:Math.sin(t*3)*2;
 line(c,[[35,31],[32+swing,-41]],'#7b5c4a',5);
 glow(c,32+swing,-47,33,p.cast>0?'#ffebaf99':'#bdedd655');
 poly(c,[[32+swing,-61],[43+swing,-47],[32+swing,-32],[22+swing,-47]],p.cast>0?'#ffdfa2':'#b7e9d6');
 ellipse(c,30+swing,-49,3,4,'#fffffa');
 if(p.shield>0){c.strokeStyle=`rgba(163,234,255,${.35+.3*Math.sin(t*8)**2})`;c.lineWidth=3;c.beginPath();c.ellipse(0,-9,46,66,0,0,TAU);c.stroke();for(let i=0;i<7;i++){const a=i*TAU/7+t;ellipse(c,Math.cos(a)*45,Math.sin(a)*56-9,3,3,'#b5f3ff');}}
 if(p.healFx>0){glow(c,0,0,65,'#a6ffb455');}
  if(p.upgrades?.resistance>0){c.strokeStyle='rgba(240,210,157,'+Math.min(.6,p.upgrades.resistance*.08)+')';c.lineWidth=1+p.upgrades.resistance*.4;c.beginPath();c.ellipse(0,0,34,48,0,0,TAU);c.stroke();}
  if(p.upgrades?.power>0)glow(c,32+swing,-47,24+p.upgrades.power*9,'#ffdca444');
 if(p.healFx<0){c.strokeStyle='#d9c6ff';c.lineWidth=6;c.beginPath();c.arc(0,0,(.6+p.healFx)*290,0,TAU);c.stroke();}
 c.restore();
}
function wombat(c,p,t,mode='playing',deathT=0){
 if(drawWombatSprite(c,p,t,mode,deathT))return;
 proceduralWombat(c,p,t,mode,deathT);
}
function enemy(c,e,t){if(e.hp<=0)return;c.save();c.translate(e.x+e.w/2,e.y+e.h/2);if(e.hit>0)c.globalAlpha=.58;
 const a=Math.sin(t*5+e.phase),dir=e.dir||1;
 if(e.type==='mushroom'){ellipse(c,0,12,23,17,'#c6b696');poly(c,[[-27,-2],[0,-33],[29,-3]],'#dd938b');ellipse(c,0,-5,29,10,'#cc827c');ellipse(c,-7,-16,5,3,'#f8d6b2');ellipse(c,9,-21,4,4,'#f8d6b2');ellipse(c,-8,9,3,4,'#302e34');ellipse(c,8,9,3,4,'#302e34');}
 else if(e.type==='bat'){poly(c,[[-8,2],[-44,-17+a*14],[-28,17],[-9,13]],'#9790b7');poly(c,[[8,2],[44,-17+a*14],[28,17],[9,13]],'#9790b7');ellipse(c,0,4,14,16,'#69617e');poly(c,[[-9,-9],[-12,-24],[0,-9]],'#69617e');poly(c,[[9,-9],[12,-24],[0,-9]],'#69617e');ellipse(c,-5,1,3,3,'#f4c99c');ellipse(c,6,1,3,3,'#f4c99c');}
 else if(e.type==='caster'){poly(c,[[-26,23],[-18,-23],[0,-35],[21,-23],[28,23]],'#8b7498');ellipse(c,0,-8,16,15,'#293347');ellipse(c,-6,-9,3,3,'#ecc7a9');ellipse(c,6,-9,3,3,'#ecc7a9');glow(c,25,0,25,'#e8bbab77');ellipse(c,25,0,7,7,'#f5bb9e');}
 else if(e.type==='wolf'){ellipse(c,0,8,23,19,'#827c84');poly(c,[[-23,-3],[-27,-24],[-4,-12]],'#8e8690');poly(c,[[23,-3],[27,-24],[4,-12]],'#8e8690');ellipse(c,dir*11,0,4,3,'#f4bd88');ellipse(c,-dir*8,0,3,3,'#f4bd88');round(c,-23,22,15,7,4,'#605a67');round(c,7,22,15,7,4,'#605a67');}
 else if(e.type==='slime'){ellipse(c,0,8+a*2,24,21,'#7d9f72');ellipse(c,-9,-1,5,5,'#d5f2b2');ellipse(c,9,-1,5,5,'#d5f2b2');ellipse(c,0,14,11,3,'#47634a');glow(c,0,5,32,'#a0dd8855');}
 else if(e.type==='golem'){round(c,-31,-23,62,54,10,'#8394b0');round(c,-23,-17,46,41,7,'#5a6d91');poly(c,[[-31,-13],[-12,-43],[6,-25]],'#b3c8dd');poly(c,[[5,-26],[27,-47],[28,0]],'#9cafc7');ellipse(c,-11,-5,4,4,'#d7efff');ellipse(c,12,-5,4,4,'#d7efff');round(c,-19,25,15,10,4,'#6a748f');round(c,9,25,15,10,4,'#6a748f');}
 else if(e.type==='bomber'){ellipse(c,0,4+a*3,24,21,'#bb7d93');poly(c,[[-23,-6],[0,-36],[24,-8]],'#7e5374');ellipse(c,-8,1,4,4,'#ffeb9d');ellipse(c,8,1,4,4,'#ffeb9d');glow(c,0,22,25,'#ef9aa688');}
 else if(e.type==='guardian'){round(c,-35,-45,70,86,9,'#423d61');ellipse(c,0,-19,25,24,'#ac9aba');poly(c,[[-37,-36],[-24,-73],[0,-52],[22,-75],[37,-36]],'#817caa');ellipse(c,-11,-18,5,7,'#ffe0ad');ellipse(c,12,-18,5,7,'#ffe0ad');glow(c,0,21,31,'#bea7ff66');}
  else if(e.type==='boss'){ellipse(c,0,59,68,12,'#16132c99');poly(c,[[-54,59],[-41,-31],[0,-63],[44,-31],[59,59]],'#856579');poly(c,[[-31,51],[-29,-26],[0,-43],[31,-26],[34,51]],'#37324c');ellipse(c,0,-25,34,33,'#c1a4b2');poly(c,[[-36,-40],[-38,-77],[-16,-64],[0,-92],[17,-64],[37,-79],[35,-40]],'#e7c48c');ellipse(c,-12,-26,6,8,'#fddba2');ellipse(c,13,-26,6,8,'#fddba2');glow(c,0,18,52,'#ed9edb66');ellipse(c,0,18,14,18,'#f6bde0');}
 if(e.telegraph>0){c.strokeStyle='#ffabbd';c.lineWidth=4+Math.sin(t*30)*2;c.beginPath();c.arc(0,0,Math.max(e.w,e.h)*.72+e.telegraph*28,0,TAU);c.stroke();glow(c,0,0,e.w,'#ff69794c');}
 if(e.burn>0){for(let j=0;j<4;j++){const fx=Math.sin(t*8+j*2)*e.w*.3,fy=-e.h*.5-10-j*7;glow(c,fx,fy,11,'#ff9c4c99');ellipse(c,fx,fy,4,9,'#ffc678aa');}}
 if(e.slow>0||e.freeze>0){c.strokeStyle=e.freeze>0?'#d7f9ff':'#8dd7ff';c.lineWidth=e.freeze>0?5:2;c.strokeRect(-e.w*.55,-e.h*.55,e.w*1.1,e.h*1.1);}
 if(e.stun>0){for(let j=0;j<3;j++){const a=j*TAU/3+t*9;ellipse(c,Math.cos(a)*27,Math.sin(a)*22-e.h*.65,5,5,'#fcf5b0');}}
 c.restore();
 if(e.hp<e.maxHp&&e.type!=='boss'){round(c,e.x-2,e.y-17,e.w+4,5,3,'#1b2230');round(c,e.x-2,e.y-17,(e.w+4)*e.hp/e.maxHp,5,3,'#f2acaa');}
}
function item(c,i,t){if(!i.active)return;const y=i.y+Math.sin(t*2.4+i.phase)*5,x=i.x;
 if(i.type==='book'){glow(c,x+11,y+12,44,'#edc99b88');round(c,x-3,y-4,29,32,3,'#e5c7a1');round(c,x+5,y,3,26,1,'#675477');c.fillStyle='#634b78';c.font='bold 18px Georgia';c.fillText('✦',x+9,y+21);}
  else if(i.type==='crystal'){poly(c,[[x+11,y],[x+22,y+12],[x+11,y+24],[x,y+12]],'#b1ead8');poly(c,[[x+11,y],[x+11,y+24],[x+4,y+12]],'#eff8dc');}
 else if(i.type==='rune'){glow(c,x+11,y+13,52,'#ffdf9966');c.save();c.translate(x+11,y+13);c.rotate(Math.sin(t)*.12);round(c,-19,-23,38,46,8,'#627d88');c.strokeStyle='#ffe0a2';c.lineWidth=3;c.strokeRect(-14,-18,28,36);poly(c,[[0,-12],[10,0],[0,12],[-10,0]],'#f7df9e');c.restore();}
 else{glow(c,x+11,y+12,36,i.type==='heart'?'#ff9ea866':'#b0dafa66');c.font='bold 26px Georgia';c.fillStyle=i.type==='heart'?'#ffa8ac':'#c4e5ff';c.fillText(i.type==='heart'?'♥':'✦',x-2,y+24);}
}
function portal(c,w,t){const p=w.portal,open=w.runes>=w.requiredRunes&&(!w.bookRequired||w.bookCollected)&&!w.enemies.some(e=>(e.type==='boss'||e.type==='guardian')&&e.hp>0);
 glow(c,p.x+39,p.y+73,135,open?'#cff4cd44':'#a1bedb27');c.strokeStyle=open?'#b2f4c6':'#8a93b7';c.lineWidth=15;c.beginPath();c.ellipse(p.x+39,p.y+75,43,71,0,0,TAU);c.stroke();ellipse(c,p.x+39,p.y+75,32,61,open?'#b9ebce7b':'#263349cc');for(let j=0;j<3;j++)ellipse(c,p.x+12+j*27,p.y-10-(j===1?7:0),6,6,j<w.runes?'#ffe49f':'#526679');if(open)for(let j=0;j<10;j++){let y=p.y+20+((j*19+t*70)%110),x=p.x+39+Math.sin(t*1.3+j)*23;ellipse(c,x,y,2.5,2.5,'#ffffe3');}}
export function drawGame(c,engine){const {world:w,player:p,status,t}= {world:engine.world,player:engine.player,status:engine.status,t:engine.time};
 c.clearRect(0,0,WIDTH,HEIGHT);
 if(!w){const tmp={biome:{id:'forest',sky:['#102c36','#2e665e']},decor:[]};background(c,tmp,t,0);round(c,0,FLOOR,WIDTH,HEIGHT-FLOOR,0,'#365d47');wombat(c,{...p,x:865,y:440,dir:1,grounded:true,step:t*2,invuln:0,hit:0,cast:0,shield:0,healFx:0},t);return;}
 const camera=engine.camera,cameraY=engine.cameraY||0;c.save();
 if(engine.shake>0)c.translate((Math.random()-.5)*engine.shake,(Math.random()-.5)*engine.shake);
 background(c,w,t,camera);c.save();c.translate(-camera,-cameraY);
 for(const pl of w.platforms){if(pl.x+pl.w>camera-100&&pl.x<camera+WIDTH+100&&pl.y+pl.h>cameraY-100&&pl.y<cameraY+HEIGHT+100)ground(c,pl,w.biome,t);}
 decorations(c,w,camera,t);
 // Node connections reveal branching routes without replacing the player's exploration.
 if(w.biome.id==='cave'){c.save();c.strokeStyle='#a6a3d030';c.lineWidth=38;c.lineCap='round';
   const byId=new Map(w.platforms.map(p=>[p.id,p]));for(const [a,b] of w.links){const n=byId.get(a),m=byId.get(b);if(n&&m){c.beginPath();c.moveTo(n.x+n.w/2,n.y-45);c.lineTo(m.x+m.w/2,m.y-45);c.stroke();}}c.restore();}
 if(w.biome.id==='sky'){for(const pl of w.platforms){if(pl.y>cameraY-180&&pl.y<cameraY+HEIGHT+160)glow(c,pl.x+pl.w/2,pl.y+65,70,'#d8edfe19');}}
 for(const wall of w.walls||[]){round(c,wall.x,wall.y,wall.w,wall.h,4,'#596080');round(c,wall.x+3,wall.y+6,4,wall.h-12,2,'#9dadd4');for(let y=wall.y+24;y<wall.y+wall.h;y+=36)line(c,[[wall.x,y],[wall.x+wall.w,y-8]],'#bcc4dd55',2);}
 for(const h of w.hazards){for(let x=h.x;x<h.x+h.w;x+=15)poly(c,[[x,h.y+h.h],[x+7,h.y],[x+15,h.y+h.h]],h.type==='toxic'?'#c0e37b':'#f0a6a9');}
 for(const i of w.items)if(i.x>camera-60&&i.x<camera+WIDTH+60&&i.y>cameraY-80&&i.y<cameraY+HEIGHT+80)item(c,i,t);
 portal(c,w,t);
 for(const e of w.enemies)if(e.x>camera-120&&e.x<camera+WIDTH+120&&e.y>cameraY-180&&e.y<cameraY+HEIGHT+180)enemy(c,e,t);
 for(const s of engine.projectiles){const col={spark:'#caf6bf',ice:'#c6edff',fire:'#ffc077'}[s.kind];glow(c,s.x,s.y,32,col+'66');ellipse(c,s.x,s.y,s.w*.65,s.h*.5,col);ellipse(c,s.x-s.vx*.015,s.y,s.w*.4,s.h*.3,col+'77');}
 for(const s of engine.hostile){glow(c,s.x,s.y,26,s.kind==='toxic'?'#b0e97a88':'#f39ac777');ellipse(c,s.x,s.y,s.w/2,s.h/2,s.kind==='toxic'?'#c4eb94':'#e4a1cb');}
 wombat(c,p,t,status,2.5-engine.deadTimer);
 for(const v of engine.particles){c.globalAlpha=clamp(v.life*2,0,1);if(v.bolt){glow(c,v.x,v.y,30,'#c2eeff88');line(c,[[v.x-18,v.y-25],[v.x+5,v.y-5],[v.x-7,v.y+3],[v.x+15,v.y+24]],'#e0f5ff',4);}else ellipse(c,v.x,v.y,v.size,v.size,v.color);}c.globalAlpha=1;
 c.restore();
 const vignette=c.createRadialGradient(WIDTH/2,HEIGHT/2,250,WIDTH/2,HEIGHT/2,850);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#0a15216b');c.fillStyle=vignette;c.fillRect(0,0,WIDTH,HEIGHT);c.restore();
}
