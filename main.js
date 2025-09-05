// main.js  — SPAWN-FIX
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { state } from './state.js';
import { buildCost } from './cost.js';
import { Enemy } from './entities/Enemy.js';
import { Tower } from './entities/Tower.js';
import { Projectile } from './entities/Projectile.js'; // falls benötigt in draw/update
import { updateVFX, drawVFX } from './vfx.js';
import { initUI, markUiDirty, refreshStaticCosts } from './ui.js';
import { initI18n, onLanguageChange } from './i18n.js';
import { triggerFireDeathExplosion } from './effects.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const gameEl = document.getElementById('game');
const overlay = document.getElementById('overlay');
const octx = overlay ? overlay.getContext('2d') : null;
let three = null;
if(state.dev?.threeD){
  const root3d = document.getElementById('three-root');
  import('./render3d.js')
    .then(m=>{ three = m.initThreeRenderer(root3d, state, CONFIG, canvas); })
    .catch(e=>{ console.warn('3D init failed, falling back to 2D', e); three=null; try{ canvas.style.display=''; }catch(_){} });
}

let mouse={x:0,y:0};
function getMouse(e){
  // In 3D: map screen -> world XZ via raycast; fallback to 2D canvas mapping
  if(three?.worldFromClient){
    const p = three.worldFromClient(e.clientX, e.clientY);
    if(p) return p;
  }
  const r=(three?.canvas||canvas).getBoundingClientRect();
  const baseW = canvas.width, baseH = canvas.height;
  return { x:(e.clientX-r.left)*(baseW/r.width), y:(e.clientY-r.top)*(baseH/r.height) };
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
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1;

  // Boden
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#10162a'); g.addColorStop(1,'#0d1120');
  ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);

  // Pfad – breiter und erdiger (Dirt Road)
  strokePath(80, '#0a0d16', 0.9);                 // dunkle Kante
  strokePath(72, '#7a5b33', 1.0);                  // Hauptboden (braun)
  strokePath(10, 'rgba(255,210,120,0.25)', 1);     // leichte Staub-Lichtkante

  // Burg
  ctx.fillStyle='#c7b26a';
  ctx.fillRect(state.castle.x-18,state.castle.y-22,36,36);
  ctx.fillStyle='#a8904a';
  ctx.fillRect(state.castle.x-22,state.castle.y-22,44,10);
  ctx.strokeStyle='#2a1f12'; ctx.lineWidth=2;
  ctx.strokeRect(state.castle.x-18,state.castle.y-22,36,36);

  // Build-Vorschau
  if(state.buildMode){
    const ok=Utils.distanceToPath(mouse, CONFIG)>=CONFIG.pathBuffer && state.gold>=buildCost(state);
    ctx.globalAlpha=.25; ctx.fillStyle=ok?'#7CFC00':'#ff6b6b';
    ctx.beginPath(); ctx.arc(mouse.x,mouse.y,16,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=.08; ctx.fillStyle='#9ad3ff';
    ctx.beginPath(); ctx.arc(mouse.x,mouse.y,CONFIG.tower.range,0,Math.PI*2); ctx.fill();
  }

  // DEV-Hitboxen/Pfadpuffer
  if(state.dev?.showHit){
    const pts=CONFIG.pathPoints;
    ctx.save(); ctx.globalAlpha=0.15; ctx.strokeStyle='#00e5ff'; ctx.lineWidth=CONFIG.pathBuffer*2;
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha=0.5; ctx.strokeStyle='#ff3e3e'; ctx.lineWidth=1;
    for(const e of state.enemies){ ctx.beginPath(); ctx.arc(e.pos.x,e.pos.y,e.radius,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
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

// ---------- Waves & Spawns (robust) ----------
function startWave(){
  // Welle hochzählen und Spawn-Queue auffüllen
  state.wave = (state.wave|0) + 1;
  const count = 6 + Math.floor(state.wave*1.5);
  state.spawnLeft = (state.spawnLeft|0) + count;
  state.spawning = true;

  // Timer defensiv initialisieren
  if(!state.timers) state.timers = { spawn: 0 };
  state.timers.spawn = 0; // sorgt für sofortiges Spawnen im nächsten Tick

  markUiDirty();
}

function spawnTick(dt){
  if(!state.spawning) return;
  // Fallbacks, falls State „leer“ ankommt
  const baseInterval = (typeof state.spawnInterval==='number' && state.spawnInterval>0) ? state.spawnInterval : 0.7;

  state.timers.spawn -= dt;
  // mehrere Spawns pro Frame zulassen, bis Timer positiv ist
  while(state.spawnLeft>0 && state.timers.spawn<=0){
    const waveIndex = Math.max(1, state.wave || 1);
    state.enemies.push(new Enemy(waveIndex));
    state.spawnLeft--;
    // Folge-Spawn-Delay (leichte Beschleunigung pro Welle), min. 0.25s
    const nextDelay = Math.max(0.25, baseInterval * Math.pow(0.98, waveIndex));
    state.timers.spawn += nextDelay;
  }
  if(state.spawnLeft<=0) state.spawning=false;
}

function spawnOne(){
  const w = Math.max(1, state.wave || 1);
  state.enemies.push(new Enemy(w));
}

// ---------- Events ----------
// Use game container for input so it works with 3D canvas
function updateHoveredFromMouse(e){
  const p=getMouse(e);
  let hovered=null;
  for(const t of state.towers){ if(t.contains(p)){ hovered=t; break; } }
  state.hoveredTower = hovered;
  gameEl.style.cursor = hovered ? 'pointer' : 'default';
  if(three?.setHoveredTower){ three.setHoveredTower(hovered); }
}

gameEl.addEventListener('mousemove', e=>{ 
  mouse=getMouse(e);
  updateHoveredFromMouse(e);
  if(three?.setMouseTilt){
    const r=(three?.canvas||canvas).getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    three.setMouseTilt(nx, ny);
  }
});
gameEl.addEventListener('mouseleave', ()=>{
  if(three?.setMouseTilt){ three.setMouseTilt(0,0); }
  state.hoveredTower = null;
  gameEl.style.cursor = 'default';
  if(three?.setHoveredTower){ three.setHoveredTower(null); }
});
gameEl.addEventListener('click', e=>{
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
  const dtRaw=Math.min(0.033,(now-last)/1000); last=now;
  const dt = dtRaw * (state.dev?.speed||1);

  if(!state.paused){
    // SPAWN-FIX: ticke Spawns separat & zuverlässig
    spawnTick(dt);

    // Updates
    for(const e of state.enemies) e.update(dt);
    for(const t of state.towers) t.update(dt, state);
    for(const p of state.projectiles) p.update?.(dt);
    state.projectiles = state.projectiles.filter(p=>p.alive!==false);
    updateVFX(dt);

    // Kills / Burgschaden / Gold
    const survivors=[];
    for(const e of state.enemies){
      if(e.hp<=0){
        triggerFireDeathExplosion(e);   // AoE nur bei Tod, falls brennend
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
  if(three){
    three.update();
    // Draw health bars on overlay in 3D mode
    drawOverlay();
  } else {
    drawBackground();
  for(const t of state.towers) t.draw(ctx, state.selectedTower===t, state.hoveredTower===t);
    for(const e of state.enemies) e.draw(ctx);
    for(const p of state.projectiles) p.draw?.(ctx);
    drawVFX(ctx);
  }

  requestAnimationFrame(loop);
}

// ---------- UI init ----------
initI18n();
onLanguageChange(()=>{ refreshStaticCosts(); markUiDirty(); });
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
  startWave, spawnOne,
  getState(){ return { wave:state.wave, spawnLeft:state.spawnLeft, spawning:state.spawning, enemies:state.enemies.length, gold:state.gold }; }
};

// ---------- Overlay (3D health bars) ----------
function drawOverlay(){
  if(!three || !overlay || !octx) return;
  // Ensure overlay matches base canvas size
  if(overlay.width !== canvas.width || overlay.height !== canvas.height){
    overlay.width = canvas.width; overlay.height = canvas.height;
  }
  octx.clearRect(0,0,overlay.width, overlay.height);

  // Build preview highlight at placement position
  if(state.buildMode){
    const center = three.screenFromWorld?.(mouse.x, mouse.y, 0);
    if(center && center.visible){
      // validity: path buffer, gold, spacing from other towers
      let ok = Utils.distanceToPath(mouse, CONFIG) >= CONFIG.pathBuffer && state.gold >= buildCost(state);
      for(const t of state.towers){ if(Utils.dist(mouse,{x:t.x,y:t.y})<40) { ok=false; break; } }

      // pixel radius based on world units (fallback to 12px)
      const r16p = three.screenFromWorld?.(mouse.x+16, mouse.y, 0);
      const rpx = (r16p && r16p.visible) ? Math.hypot(r16p.x-center.x, r16p.y-center.y) : 12;

      // dot
      octx.save();
      octx.globalAlpha = 0.25;
      octx.fillStyle = ok ? '#7CFC00' : '#ff6b6b';
      octx.beginPath(); octx.arc(center.x, center.y, rpx, 0, Math.PI*2); octx.fill();

      // range ring (projected)
      const rWorld = CONFIG.tower.range;
      const rW = three.screenFromWorld?.(mouse.x + rWorld, mouse.y, 0);
      const rPix = (rW && rW.visible) ? Math.hypot(rW.x-center.x, rW.y-center.y) : rWorld * (rpx/16);
      octx.globalAlpha = 0.12; octx.fillStyle = '#9ad3ff';
      octx.beginPath(); octx.arc(center.x, center.y, rPix, 0, Math.PI*2); octx.fill();
      octx.restore();
    }
  }

  // Lightning VFX (projected polylines)
  for(const v of state.vfx){
    if(v.type!=='lightning') continue;
    const pts = v.pts; if(!pts||pts.length<2) continue;
    const proj = pts.map(pt=> three.screenFromWorld?.(pt.x, pt.y, 12)).filter(p=>p && p.visible);
    if(proj.length<2) continue;
    const a = Math.max(0, Math.min(1, v.ttl / v.max));
    octx.save();
    octx.globalAlpha = 0.85 * a;
    octx.strokeStyle = '#bde3ff';
    octx.lineWidth = 2;
    octx.beginPath(); octx.moveTo(proj[0].x, proj[0].y);
    for(let i=1;i<proj.length;i++) octx.lineTo(proj[i].x, proj[i].y);
    octx.stroke();
    octx.globalAlpha = 0.25 * a;
    octx.strokeStyle = '#66d9ef';
    octx.lineWidth = 4; octx.stroke();
    octx.restore();
  }

  for(const e of state.enemies){
    if(e.hp<=0) continue;
    const p = three.screenFromWorld?.(e.pos.x, e.pos.y, 12);
    if(!p || !p.visible) continue;
    const w=28, h=5;
    const x = p.x - w/2;
    const y = p.y - 28; // above sphere
    const ratio = Math.max(0, Math.min(1, e.hp/e.maxHp));
    // background
    octx.fillStyle='rgba(58,63,99,0.9)'; octx.fillRect(x,y,w,h);
    // foreground
    octx.fillStyle = ratio>0.5? '#7CFC00' : (ratio>0.25? '#ffcc00' : '#ff6b6b');
    octx.fillRect(x,y,w*ratio,h);

    // Effects overlay similar to 2D
    const effects = e.effects||[];
    const fireStacks = effects.filter(s=>s.type==='fire').length;
    const poisonStacks = effects.filter(s=>s.type==='poison').length;
    const hasIce = effects.some(s=>s.type==='ice');
    const hasCurse = effects.some(s=>s.type==='curse');

    // Halo radius from world to pixels
    const rWorld = (e.radius||12) + 6;
    const rW = three.screenFromWorld?.(e.pos.x + rWorld, e.pos.y, 12);
    const rPix = (rW && rW.visible) ? Math.hypot(rW.x-p.x, rW.y-p.y) : 18;

    // Ice halo fill
    if(hasIce){ octx.fillStyle='rgba(120,180,255,0.25)'; octx.beginPath(); octx.arc(p.x, p.y, rPix, 0, Math.PI*2); octx.fill(); }
    // Fire stroke ring
    if(fireStacks>0){ octx.strokeStyle='rgba(255,120,40,0.85)'; octx.lineWidth=2; octx.beginPath(); octx.arc(p.x, p.y, rPix+2, 0, Math.PI*2); octx.stroke(); }
    // Poison soft halo
    if(poisonStacks>0){ octx.fillStyle='rgba(60,255,100,0.18)'; octx.beginPath(); octx.arc(p.x, p.y, rPix+4, 0, Math.PI*2); octx.fill(); }
    // Curse glow around health bar
    if(hasCurse){ octx.strokeStyle='rgba(217,196,255,0.85)'; octx.lineWidth=2; octx.strokeRect(x-1, y-1, w+2, h+2); }

    // Stack dots rows
    Utils.drawStackDots(octx, p.x, y-6,  fireStacks,   'rgba(255,120,40,0.95)');
    Utils.drawStackDots(octx, p.x, y-16, poisonStacks, 'rgba(60,255,100,0.95)');
  }
}
