import React,{useEffect,useRef,useState} from 'react';
import {GameEngine,SPELLS,SELECTABLE_SPELLS,UPGRADES} from './engine.mjs';
import {WIDTH,HEIGHT} from './world.mjs';
import {drawGame} from './render.mjs';
import {GAMEPLAY_KEYS} from './controls.mjs';
const bestSaved=()=>{try{return Number(localStorage.getItem('wombat-best-v2'))||0;}catch{return 0;}};
function Bar({current,max,type}){return <div className={'bar '+type}><i style={{width:Math.max(0,Math.min(100,current/max*100))+'%'}}/></div>;}
function HUD({s}){return <div className="hud"><div className="hud-vitals"><div className="heart-row">{Array.from({length:s.maxHp},(_,i)=><span key={i} className={i>=s.hp?'dim':''}>♥</span>)}</div><label>VIDA <b>{s.hp}/{s.maxHp}</b></label><Bar current={s.hp} max={s.maxHp} type="health"/><label>ENERGÍA ARCANA <b>{s.mana}/{s.maxMana}</b></label><Bar current={s.mana} max={s.maxMana} type="mana"/></div><div className="hud-world"><small>MUNDO {String(s.biomeIndex+1).padStart(2,'0')} / 05</small><strong>{s.biome}</strong><Bar current={s.progress} max={100} type="progress"/></div><div className="hud-score"><b>✧ {s.runes}/3 <small>RUNAS</small></b>{s.bookRequired&&<b>▣ {s.bookCollected?'✓':'?'} <small>LIBRO</small></b>}<b>◆ {s.coins} <small>ESENCIAS</small></b><b>{s.score} <small>PUNTOS</small></b></div></div>;}

function UpgradePanel({s,engine}){
 return <div className="overlay upgrade-overlay" role="dialog" aria-modal="true" aria-label="Mejoras del personaje">
  <div className="upgrade-panel">
   <div className="upgrade-head"><div><span className="eyebrow">◆ ÁRBOL DE PROGRESIÓN · JUEGO CONGELADO</span><h2>Mejorar al Wombat</h2><p>◆ {s.coins} esencias disponibles · todas las mejoras duran esta aventura.</p></div>
    <button className="secondary" onClick={()=>engine.closeUpgradeMenu()}>Cerrar · U / Esc ✕</button></div>
   <div className="upgrade-grid">{UPGRADES.map(u=>{const d=s.upgradeDetails[u.id],cost=s.upgradeCosts[u.id],max=s.upgrades[u.id]>=u.max;
    return <button type="button" key={u.id} className="upgrade-choice" disabled={max||s.coins<cost} onClick={()=>engine.upgrade(u.id)} title={u.description}>
     <span className="upgrade-icon">{u.icon}</span><span className="upgrade-data"><strong>{u.label}</strong><small>{u.description}</small>
      <em>Nivel {s.upgrades[u.id]}/{u.max} · {String(d.current)} → {String(d.next)}</em></span><b>{max?'MAX':'◆ '+cost}</b>
    </button>;})}</div>
   <small className="upgrade-foot">Las compras se conservan entre los cinco mundos. Una aventura nueva restablece las mejoras.</small>
  </div>
 </div>;
}
function Minimap({s}){
 const map=s.map;if(!map||s.biomeIndex===0)return null;
 const height=Math.max(1,map.maxY-map.minY),width=Math.max(1,map.width),xx=v=>5+v/width*90,yy=v=>5+(v-map.minY)/height*90;
 const nodeById=new Map(map.nodes.map(n=>[n.id,n]));
 return <div className="minimap" aria-label="Mapa de exploración"><small>✧ ORIENTACIÓN</small><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Tu posición, conexiones, objetivos y portal">
  {map.links.map(([a,b],i)=>{const n=nodeById.get(a),m=nodeById.get(b);return n&&m?<line key={i} x1={xx(n.x)} y1={yy(n.y)} x2={xx(m.x)} y2={yy(m.y)} stroke="#8bb3c3" strokeWidth="1.2" opacity=".5"/>:null;})}
  {map.nodes.map(n=><circle key={n.id} cx={xx(n.x)} cy={yy(n.y)} r="1.4" fill="#8dadb5"/>)}
  {map.items.map((it,i)=><circle key={i} cx={xx(it.x)} cy={yy(it.y)} r="2.2" fill={it.type==='book'?'#f7a9da':'#e8d18f'}/>)}
  <circle cx={xx(map.portal.x)} cy={yy(map.portal.y)} r="3" fill="#bbf0c3"/>
  <circle cx={xx(map.player.x)} cy={yy(map.player.y)} r="3.2" fill="#ffffff" stroke="#83a8ff" strokeWidth="1.3"/>
 </svg></div>;
}
function Overlay({s,engine,best}){
 if(s.status==='playing')return null;
 if(s.status==='upgrade-menu')return <UpgradePanel s={s} engine={engine}/>;
 if(s.status==='spell-menu')return <div className="overlay quick-menu-overlay" role="dialog" aria-modal="true" aria-label="Elegir hechizo para W">
  <div className="quick-menu">
   <span className="eyebrow">✦ GRIMORIO RÁPIDO · JUEGO CONGELADO</span>
   <h2>Elige tu hechizo</h2>
   <p>Usa las flechas para elegir qué lanzar con <kbd>W</kbd> y presiona <kbd>ENTER</kbd> para equiparlo.</p>
   <div className="quick-spell-list">{SELECTABLE_SPELLS.map((spell,i)=><button type="button" key={spell.key} className={'quick-spell-option '+(s.menuIndex===i?'highlighted ':'')+(s.equippedSpell===spell.key?'equipped':'')} onMouseEnter={()=>engine.setMenuIndex(i)} onClick={()=>engine.selectSpell(spell.key)} aria-current={s.menuIndex===i?'true':undefined}>
    <span className="quick-spell-icon">{spell.icon}</span><span className="quick-spell-info"><strong>{spell.name}</strong><small>{spell.description}</small></span><span className="quick-spell-cost">{spell.cost?spell.cost+' MP':'GRATIS'}</span>{s.equippedSpell===spell.key&&<span className="quick-equipped">EQUIPADO</span>}
   </button>)}</div>
   <div className="quick-menu-actions"><button className="primary" onClick={()=>engine.confirmSpellMenu()}>Equipar en W ↵</button><button className="secondary" onClick={()=>engine.closeSpellMenu()}>Cancelar · S / Esc</button></div>
   <div className="quick-menu-hint">↑ ↓ ← → ELEGIR · ENTER CONFIRMAR · S / ESC VOLVER</div>
  </div></div>;
 return <div className="overlay"><div className="panel"><span className="eyebrow">✦ PEQUEÑO HÉROE. GRAN MAGIA.</span>{s.status==='menu'?<><h1>WOMBAT</h1><div className="subtitle">EL ÚLTIMO HECHICERO</div><p>Un pequeño mago. Cinco mundos que nunca son iguales. Siete hechizos para devolver la luz.</p><button className="primary" onClick={()=>engine.newRun()}>Comenzar aventura ↗</button><p className="mini">✧ 5 biomas &nbsp; ◈ 7 hechizos &nbsp; ∞ mundos nuevos</p><p className="note">Recoge 3 runas para abrir cada portal. Al morir, todo comienza en un mundo distinto.</p></>:s.status==='paused'?<><h2>Aventura en pausa</h2><p>Recupera tus fuerzas antes de continuar.</p><button className="primary" onClick={()=>engine.togglePause()}>Continuar ▶</button><button className="secondary" onClick={()=>engine.newRun()}>Nuevo mundo ↻</button></>:s.status==='dead'?<><h2>La magia renace</h2><p>Has caído en batalla. Se está creando una nueva aventura.</p><div className="spinner">✦</div></>:<><h2>¡Vuelven las estrellas!</h2><p>Derrotaste al Rey del Eclipse y liberaste cinco mundos.</p><div className="big-score">{s.score.toLocaleString('es-CR')}</div><p className="mini">{s.kills} enemigos · {Math.floor(s.elapsed/60)}m {Math.floor(s.elapsed%60)}s · récord {Math.max(s.score,best)}</p><button className="primary" onClick={()=>engine.newRun()}>Jugar en mundos nuevos ↗</button></>}</div></div>;}
function SpellBar({s,engine}){
 const selected=SPELLS.find(spell=>spell.key===s.equippedSpell)||SELECTABLE_SPELLS[0];
 const actions=[{code:'KeyW',spell:selected},{code:'KeyA',spell:SPELLS.find(x=>x.key==='KeyX')},{code:'KeyD',spell:SPELLS.find(x=>x.key==='KeyR')},{code:'KeyR',spell:SPELLS.find(x=>x.key==='KeyC')}];
 return <div className="spells action-spells">{actions.map(({code,spell})=><button key={code} type="button" disabled={s.status!=='playing'} title={spell.name+' — '+spell.description+' ('+spell.cost+' magia)'} className={s.mana<spell.cost?'insufficient':''} onPointerDown={e=>{e.preventDefault();engine.tap(code);}}>
 <span className="spell-key">{code.slice(-1)}</span><span className="spell-icon">{spell.icon}</span><strong>{spell.name}</strong><small>{engine.spellCost(spell.key)?engine.spellCost(spell.key)+' MP':'GRATIS'} · Nv.{s.upgrades[spell.key==='KeyE'?'fire':spell.key==='KeyW'?'ice':spell.key==='KeyF'?'lightning':spell.key==='KeyX'?'nova':spell.key==='KeyC'?'shield':spell.key==='KeyR'?'heal':'spark']}</small></button>)}
 <button type="button" disabled={s.status!=='playing'} onClick={()=>engine.openSpellMenu()} title="Abrir menú de hechizos (S)"><span className="spell-key">S</span><span className="spell-icon">☷</span><strong>Cambiar W</strong><small>PAUSA</small></button>
 <button type="button" disabled={s.status!=='playing'} onClick={()=>engine.openUpgradeMenu()} title="Mejoras (U)"><span className="spell-key">U</span><span className="spell-icon">◆</span><strong>Mejoras</strong><small>ÁRBOL</small></button>
 </div>;
}
function Shop({s,engine}){return <section className="shop shop-teaser"><div className="shop-intro"><strong>◆ PROGRESIÓN DEL HECHICERO</strong><small>Consigue esencias derrotando enemigos y explorando rutas secretas. Mejora cada hechizo y atributo desde U.</small></div><button type="button" className="primary" disabled={s.status!=='playing'} onClick={()=>engine.openUpgradeMenu()}>◆ Mejorar personaje · U</button><span>{s.coins} esencias</span></section>;}
function Touch({engine}){const buttons=[['ArrowLeft','◀','Izquierda'],['ArrowRight','▶','Derecha'],['ShiftLeft','➜','Esquivar'],['Space','⬆','Saltar']];return <div className="touch"><div>{buttons.slice(0,2).map(([code,icon,label])=><button key={code} aria-label={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);engine.setHeld(code,true);}} onPointerUp={()=>engine.setHeld(code,false)} onPointerCancel={()=>engine.setHeld(code,false)} onLostPointerCapture={()=>engine.setHeld(code,false)}>{icon}</button>)}</div><div>{buttons.slice(2).map(([code,icon,label])=><button key={code} aria-label={label} onPointerDown={e=>{e.preventDefault();engine.tap(code);}}>{icon}<small>{label}</small></button>)}</div></div>;}
export default function App(){
 const ref=useRef(null),engineRef=useRef(null),raf=useRef(0),last=useRef(0),acc=useRef(0),soundRef=useRef(false),audio=useRef(null);
 if(!engineRef.current)engineRef.current=new GameEngine();const engine=engineRef.current;
 const [s,setS]=useState(()=>engine.snapshot()),[best,setBest]=useState(bestSaved),[sound,setSound]=useState(false);soundRef.current=sound;
 useEffect(()=>{engine.notify=setS;engine.emit();
 const down=e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.isComposing)return;
  const code=e.code;
  if(engine.status==='upgrade-menu'){
   if(['KeyU','Escape'].includes(code)){e.preventDefault();if(!e.repeat)engine.closeUpgradeMenu();}
   return;
  }
  if(engine.status==='spell-menu'){
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','NumpadEnter','Escape','KeyS'].includes(code)){
    e.preventDefault();if(e.repeat)return;
    if(code==='ArrowUp'||code==='ArrowLeft')engine.navigateSpellMenu(-1);
    else if(code==='ArrowDown'||code==='ArrowRight')engine.navigateSpellMenu(1);
    else if(code==='Enter'||code==='NumpadEnter')engine.confirmSpellMenu();
    else engine.closeSpellMenu();
   }
   return;
  }
  if(code==='KeyU'&&engine.status==='playing'){e.preventDefault();if(!e.repeat)engine.openUpgradeMenu();return;}
  if(code==='KeyS'&&engine.status==='playing'){e.preventDefault();if(!e.repeat)engine.openSpellMenu();return;}
  if(GAMEPLAY_KEYS.has(code)&&engine.status==='playing'){e.preventDefault();if(!e.repeat)engine.setHeld(code,true);}
  else if(code==='Escape'&&!e.repeat){e.preventDefault();engine.togglePause();}
  
 };
 const up=e=>engine.setHeld(e.code,false);
 const blur=()=>{engine.held.clear();engine.edge.clear();if(engine.status==='playing')engine.togglePause();};
 const visibility=()=>{if(document.hidden)blur();};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
 const ctx=ref.current?.getContext('2d',{alpha:false});const frame=stamp=>{const dt=last.current?Math.min(.075,(stamp-last.current)/1000):0;last.current=stamp;acc.current+=dt;let n=0;while(acc.current>=1/60&&n++<5){engine.update(1/60);acc.current-=1/60;}if(n>5)acc.current=0;if(ctx)drawGame(ctx,engine);raf.current=requestAnimationFrame(frame);};raf.current=requestAnimationFrame(frame);
 return()=>{cancelAnimationFrame(raf.current);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);engine.held.clear();engine.edge.clear();last.current=0;};},[engine]);
 useEffect(()=>{if(s.status==='victory'&&s.score>best){setBest(s.score);try{localStorage.setItem('wombat-best-v2',String(s.score));}catch{}}},[s.status,s.score,best]);
 useEffect(()=>{engine.sfx=type=>{if(!soundRef.current)return;try{const Context=window.AudioContext||window.webkitAudioContext;audio.current ||=new Context();const ctx=audio.current;void ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain(),at=ctx.currentTime,f=({hurt:120,kill:650,jump:380,dash:250,pickup:820,portal:920,upgrade:710,victory:1000,enemy:160,KeyR:535,KeyX:240})[type]||570;o.type=type==='hurt'?'sawtooth':'triangle';o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(f*.72,at+.14);g.gain.setValueAtTime(.025,at);g.gain.exponentialRampToValueAtTime(.001,at+.16);o.connect(g);g.connect(ctx.destination);o.start();o.stop(at+.16);}catch{}};return()=>{engine.sfx=()=>{};};},[engine]);
 // A quiet, disposable WebAudio atmosphere: one harmonic identity per biome.
 useEffect(()=>{
  if(!sound||s.status!=='playing')return;
  let oscillators=[],gain,lfo;
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return;
   audio.current ||=new Context();const ctx=audio.current;void ctx.resume();
   const notes=[130.81,164.81,98,196,73.42],base=notes[s.biomeIndex]||130.81;
   gain=ctx.createGain();gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.linearRampToValueAtTime(.009,ctx.currentTime+.45);gain.connect(ctx.destination);
   for(const [ratio,type,volume] of [[1,'sine',.7],[1.5,'triangle',.24],[2.02,'sine',.1]]){
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type=type;osc.frequency.value=base*ratio;g.gain.value=volume;osc.connect(g);g.connect(gain);osc.start();oscillators.push({osc,g});
   }
   lfo=ctx.createOscillator();const depth=ctx.createGain();lfo.frequency.value=.17+s.biomeIndex*.035;depth.gain.value=.003;lfo.connect(depth);depth.connect(gain.gain);lfo.start();oscillators.push({osc:lfo,g:depth});
  }catch{return;}
  return()=>{try{const now=audio.current?.currentTime||0;gain?.gain.cancelScheduledValues(now);gain?.gain.setTargetAtTime(.0001,now,.08);for(const {osc,g} of oscillators){osc.stop(now+.3);setTimeout(()=>{try{osc.disconnect();g.disconnect();}catch{}},450);}setTimeout(()=>{try{gain?.disconnect();}catch{}},450);}catch{}};
 },[sound,s.status,s.biomeIndex]);
 return <div className="app"><header><a className="brand" href="./"><span>✦</span> WOMBAT <small>EL ÚLTIMO HECHICERO</small></a><nav><span>AVENTURA PROCEDURAL</span><button onClick={()=>setSound(v=>!v)} title="Sonido">♫ <small>{sound?'ON':'OFF'}</small></button><button onClick={()=>engine.togglePause()} disabled={s.status!=='playing'&&s.status!=='paused'} title="Pausa (Esc)">Ⅱ</button><button onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('stage').requestFullscreen();}catch{}}} title="Pantalla completa">⛶</button></nav></header><main>
 <div className="overline"><span>✦ LAS ESTRELLAS TE ESPERAN</span><span>RÉCORD ◆ {best.toLocaleString('es-CR')}</span></div>
 <section id="stage"><canvas ref={ref} width={WIDTH} height={HEIGHT} aria-label="Videojuego de plataformas Wombat"/>
 {s.status!=='menu'&&<HUD s={s}/>}
 {s.status==='playing'&&<Minimap s={s}/>} 
 {s.status==='playing'&&s.banner&&<div className="toast">{s.banner}</div>}
 {s.boss>0&&<div className="boss"><span>☽ REY DEL ECLIPSE</span><div><i style={{width:(100*s.boss/s.bossMax)+'%'}}/></div></div>}
 {s.status==='playing'&&<Touch engine={engine}/>}<Overlay s={s} engine={engine} best={best}/></section>
 <div className="grimoire"><div><b>GRIMORIO</b><small>S cambia el hechizo W</small></div><SpellBar s={s} engine={engine}/></div><Shop s={s} engine={engine}/>
 <div className="instructions"><span><kbd>←</kbd><kbd>→</kbd> Mover</span><span><kbd>ESPACIO</kbd> Salto doble</span><span><kbd>SHIFT</kbd> Esquiva</span><span><kbd>W</kbd> Hechizo elegido</span><span><kbd>A</kbd> Nova</span><span><kbd>D</kbd> Sanar</span><span><kbd>R</kbd> Escudo</span><span><kbd>S</kbd> Cambiar hechizo</span><span><kbd>U</kbd> Mejoras</span><span><kbd>ESC</kbd> Pausa</span></div>
 <footer><span>CADA DERROTA ABRE UN MUNDO DIFERENTE.</span><span>React + Canvas · 5 biomas · 7 hechizos</span></footer></main></div>;
}
