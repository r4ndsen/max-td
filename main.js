// main.js  (Speed-Multiplier, Hitbox-/Overlay-Draw & "1 Gegner"-Button)
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { state } from './state.js';
import { buildCost } from './cost.js';
import { Enemy } from './entities/Enemy.js';
import { Tower } from './entities/Tower.js';
import { updateVFX, drawVFX } from './vfx.js';
import { initUI, markUiDirty, refreshStaticCosts } from './ui.js';
import { triggerFireDeathExplosion } from './effects.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let mouse={x:0,y:0};
function getMouse(e){
  const r=canvas.getBoundingClientRect();
  return { x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height) };
}

function strokePath(width, color, alpha=1){
  const pts=CONFIG.pathPoints;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.lineWidth=width;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.miterLimit=2;
  ctx.strokeStyle=color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(){
  // Reset-Clear
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // Boden
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#10162a');
  g.addColorStop(1,'#0d1120');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Pfad
  strokePath(40, '#0a0d16', 0.85);
  strokePath(34, '#6f613e', 1.00);
  strokePath(8,  'rgba(255,235,170,0.35)', 1);

  // Burg
  ctx.fillStyle='#c7b26a';
  ctx.fillRect(state.castle.x-18,state.castle.y-22,36,36);
  ctx.fillStyle='#a8904a';
  ctx.fillRect(state.castle.x-22,state.castle.y-22,44,10);
  ctx.strokeStyle='#2a1f12'; ctx.lineWidth=2;
  ctx.strokeRect(state.castle.x-18,state.castle.y-22,36,36);

  // Build-Hilfe
  if(state.buildMode){
    const ok=Utils.distanceToPath(mouse, CONFIG)>=CONFIG.pathBuffer && state.gold>=buildCost(state);
    ctx.globalAlpha=.25; ctx.fillStyle=ok?'#7CFC00':'#ff6b6b';
    ctx.beginPath(); ctx.arc(mouse.x,mouse.y,16,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=.08; ctx.fillStyle='#9ad3ff';
    ctx.beginPath(); ctx.arc(mouse.x,mouse.y,CONFIG.tower.range,0,Math.PI*2); ctx.fill();
  }

  // DEV: Hitbox/Path-Puffer
  if(state.dev.showHit){
    // Path-Buffer
    const pts=CONFIG.pathPoints;
    ctx.save();
    ctx.globalAlpha=0.15;
    ctx.strokeStyle='#00e5ff';
    ctx.lineWidth=CONFIG.pathBuffer*2;
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke();
    ctx.restore();

    // Gegner-Hitboxen
    ctx.save();
    ctx.globalAlpha=0.5; ctx.strokeStyle='#ff3e3e'; ctx.lineWidth=1;
    for(const e of state.enemies){ ctx.beginPath(); ctx.arc(e.pos.x,e.pos.y,e.radius,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
  }

  ctx.restore();
}

function drawDevOverlay(){
  if(!state.dev.showOverlay) return;
  ctx.save();
  ctx.font='11px ui-monospace';
  ctx.textAlign='center';
  for(const e of state.enemies){
    const fires = e.effects.filter(x=>x.type==='fire');
    const pois  = e.effects.filter(x=>x.type==='poison');
    const ice   = e.effects.some(x=>x.type==='ice');
    const y = e.pos.y - e.radius - 24;

    // Stack-Zeile
    const stackTxt = `F${fires.length} P${pois.length}${ice?' I':''}`;
    ctx.fillStyle='rgba(255,255,255,0.85)';
    ctx.fillText(stackTxt, e.pos.x, y);

    // Tick-Zeile (minimale Info): nächsten Tick der stärksten Stacks
    const fTop = fires.sort((a,b)=>b.dmg-a.dmg)[0];
    const pTop = pois.sort((a,b)=>b.dmg-a.dmg)[0];
    let tTxt = '';
    if(fTop) tTxt += `f:${fTop.t.toFixed(2)} `;
    if(pTop) tTxt += `p:${pTop.t.toFixed(2)}`;
    if(tTxt){
      ctx.fillStyle='rgba(180,220,255,0.9)';
      ctx.fillText(tTxt.trim(), e.pos.x, y-12);
    }
  }
  ctx.restore();
}

// ---------- Build/Select ----------
function tryPlaceTower(p){
  const c=buildCost(state); if(state.gold<c) return;
  if(Utils.distanceToPath(p, CONFIG)<CONFIG.pathBuffer) return;
  for(const t of state.towers){ if(Utils.dist(p,{x:t.x,y:t.y})<40) return; }
  state.towers.push(new Tower(p.x,p.y));
  state.gold-=c; state.buildMode=false; markUiDirty();
}

// ---------- Waves & Spawns ----------
function startWave(){
  state.wave++;
  const count = 6 + Math.floor(state.wave*1.5);
  state.spawnLeft += count;
  state.spawning = true;
  state.timers.spawn = 0;
  markUiDirty();
}
function spawnOne(){
  // wave=1 wenn noch keine gestartet wurde
  const w = Math.max(1, state.wave || 1);
  state.enemies.push(new Enemy(w));
}

// ---------- Events ----------
canvas.addEventListener('mousemove', e=>{ mouse=getMouse(e); });
canvas.addEventListener('click', e=>{
  const p=getMouse(e);
  for(const t of state.towers){
    if(t.contains(p)){ state.selectedTower=t; state.buildMode=false; markUiDirty(); return; }
  }
  if(state.buildMode){ tryPlaceTower(p); }
  else { state.selectedTower=null; markUiDirty(); }
});

// ---------- Game Loop ----------
let last=performance.now();
function loop(now){
  // Speed-Multiplikator
  const dtRaw=Math.min(0.033,(now-last)/1000); last=now;
  const dt = dtRaw * (state.dev.speed||1);

  if(!state.paused){
    // Spawns
    state.timers.spawn -= dt;
    while(state.spawning && state.spawnLeft>0 && state.timers.spawn<=0){
      state.enemies.push(new Enemy(state.wave));
      state.spawnLeft--;
      state.timers.spawn += Math.max(0.25, state.spawnInterval * Math.pow(0.98, state.wave));
    }
    if(state.spawnLeft<=0) state.spawning=false;

    // Updates
    for(const e of state.enemies) e.update(dt);
    for(const t of state.towers) t.update(dt, state);
    for(const p of state.projectiles) p.update(dt);
    state.projectiles = state.projectiles.filter(p=>p.alive);
    updateVFX(dt);

    // Kills / Burgschaden / Gold
    const survivors=[];
    for(const e of state.enemies){
      if(e.hp<=0){
        // AoE nur beim Tod (wenn brennend) – Funktion prüft selbst, ob Feuer aktiv war
        triggerFireDeathExplosion(e);
        state.gold += e.reward; 
        markUiDirty();
        continue;
      }
      if(e.reachedEnd){
        state.castle.hp = Math.max(0, state.castle.hp - e.damage);
        markUiDirty();
        continue;
      }
      survivors.push(e);
    }
    state.enemies = survivors;
    if(state.castle.hp<=0) state.paused=true;
  }

  // Render
  drawBackground();
  for(const t of state.towers) t.draw(ctx, state.selectedTower===t);
  for(const e of state.enemies) e.draw(ctx);
  for(const p of state.projectiles) p.draw(ctx);
  drawVFX(ctx);
  drawDevOverlay();

  requestAnimationFrame(loop);
}

// ---------- UI init ----------
initUI({
  startWave,
  tryPlaceTower,
  spawnOne,
  selectNone: ()=>{ state.selectedTower=null; markUiDirty(); }
});
refreshStaticCosts();
markUiDirty();
requestAnimationFrame(loop);

// ---------- Public API ----------
window.TD = {
  startWave,
  spawnOne,
  toggleDebug(){ state.debugFree=!state.debugFree; refreshStaticCosts(); markUiDirty(); return state.debugFree; },
  setDebug(on){ state.debugFree=!!on; refreshStaticCosts(); markUiDirty(); },
  setSpeed(x){ state.dev.speed=x; },
  getState(){ return { gold: state.gold, wave: state.wave, enemies: state.enemies.length, towers: state.towers.length, debug: state.debugFree, speed: state.dev.speed, castle: { ...state.castle } }; },
  selectTower(i){ if(i>=0 && i<state.towers.length){ state.selectedTower=state.towers[i]; markUiDirty(); return true; } return false; },
  upgradeSelected(type){ if(!state.selectedTower) return false; const ok=state.selectedTower.upgrade(state,type); if(ok) markUiDirty(); return ok; },
  buildAt(x,y){ const p={x,y}; tryPlaceTower(p); },
};
