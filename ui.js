// ui.js  (NEU: Dev-Buttons verdrahten + Labels aktualisieren)
import { CONFIG } from './config.js';
import { state } from './state.js';
import { buildCost, repairCost, maxHpCost } from './cost.js';

const hud = document.getElementById('hud');
const towerPanel = document.getElementById('towerPanel');
const btnStart = document.getElementById('btnStart');
const btnBuild = document.getElementById('btnBuild');
const btnCancel = document.getElementById('btnCancel');
const btnRepair = document.getElementById('btnRepair');
const btnMaxHp = document.getElementById('btnMaxHp');
const btnDebug = document.getElementById('btnDebug');
const costBuildEl = document.getElementById('costBuild');
const costRepairEl = document.getElementById('costRepair');
const costMaxHpEl = document.getElementById('costMaxHp');

// NEU: Dev-Buttons
const btnDevWave    = document.getElementById('btnDevWave');
const btnDevSpawn   = document.getElementById('btnDevSpawn');
const btnDevSpeed   = document.getElementById('btnDevSpeed');
const btnDevHit     = document.getElementById('btnDevHit');
const btnDevOverlay = document.getElementById('btnDevOverlay');

let uiDirty=true, uiScheduled=false;

export function refreshStaticCosts(){
  if(costBuildEl) costBuildEl.textContent = buildCost(state);
  if(costRepairEl) costRepairEl.textContent = repairCost(state);
  if(costMaxHpEl)  costMaxHpEl.textContent = maxHpCost(state);
  btnDebug.classList.toggle('toggle-on', state.debugFree);
  refreshDevLabels();
}
function refreshDevLabels(){
  if(!btnDevSpeed) return;
  btnDevSpeed.textContent = `⏩ Speed ×${state.dev.speed}`;
  btnDevHit.textContent   = `🎯 Hitboxen/Path: ${state.dev.showHit?'AN':'AUS'}`;
  btnDevOverlay.textContent = `🧬 DoT-Overlay: ${state.dev.showOverlay?'AN':'AUS'}`;
  btnDevHit.classList.toggle('toggle-on', state.dev.showHit);
  btnDevOverlay.classList.toggle('toggle-on', state.dev.showOverlay);
}
export function markUiDirty(){
  uiDirty=true;
  if(!uiScheduled){
    uiScheduled=true;
    requestAnimationFrame(()=>{ if(uiDirty) renderHUD(); uiScheduled=false; uiDirty=false; });
  }
}
export function initUI({startWave, tryPlaceTower, selectNone, spawnOne}){
  btnStart.onclick = startWave;
  btnBuild.onclick = ()=>{ state.buildMode=true; state.selectedTower=null; markUiDirty(); };
  btnCancel.onclick = ()=>{ state.buildMode=false; markUiDirty(); };
  btnRepair.onclick = ()=>{ const c=repairCost(state); if(state.gold>=c && state.castle.hp<state.castle.maxHp){ state.gold-=c; state.castle.hp=Math.min(state.castle.maxHp, state.castle.hp+CONFIG.economy.repairChunk); markUiDirty(); } };
  btnMaxHp.onclick = ()=>{ const c=maxHpCost(state); if(state.gold>=c){ state.gold-=c; state.castle.maxHp+=CONFIG.economy.maxHpChunk; state.castle.hp=Math.min(state.castle.maxHp, state.castle.hp+Math.floor(CONFIG.economy.maxHpChunk/2)); markUiDirty(); } };
  btnDebug.onclick = ()=>{ state.debugFree=!state.debugFree; refreshStaticCosts(); markUiDirty(); };

  // Dev-Tools
  if(btnDevWave)  btnDevWave.onclick  = startWave;
  if(btnDevSpawn) btnDevSpawn.onclick = ()=> spawnOne();
  if(btnDevSpeed) btnDevSpeed.onclick = ()=>{
    state.dev.speed = (state.dev.speed===1?2: state.dev.speed===2?4:1);
    refreshDevLabels();
  };
  if(btnDevHit) btnDevHit.onclick = ()=>{ state.dev.showHit=!state.dev.showHit; refreshDevLabels(); };
  if(btnDevOverlay) btnDevOverlay.onclick = ()=>{ state.dev.showOverlay=!state.dev.showOverlay; refreshDevLabels(); };

  towerPanel.addEventListener('click', (e)=>{
    const upg=e.target.closest('button[data-upg]');
    if(upg){ const t=state.selectedTower; if(!t) return; t.upgrade(state, upg.dataset.upg); markUiDirty(); return; }
    const modeBtn=e.target.closest('button[data-mode]');
    if(modeBtn){ const t=state.selectedTower; if(!t) return; t.targetMode = modeBtn.dataset.mode; markUiDirty(); }
  });

  window.addEventListener('keydown', e=>{
    if(e.key==='p'||e.key==='P') state.paused=!state.paused;
    if(e.key==='b'||e.key==='B') { state.buildMode=true; markUiDirty(); }
    if(e.key==='Escape'){ state.buildMode=false; state.selectedTower=null; markUiDirty(); }
    if(e.key==='Enter') startWave();
    if(e.key==='u'||e.key==='U'){ if(state.selectedTower) { state.selectedTower.upgrade(state,'dmg'); markUiDirty(); } }
    if(e.key==='c'||e.key==='C'){ selectNone(); }
    // kleine Dev-Kürzel
    if(e.key==='1') startWave();
    if(e.key==='2') spawnOne();
    if(e.key==='3'){ state.dev.speed = (state.dev.speed===1?2: state.dev.speed===2?4:1); refreshDevLabels(); }
  });
}

export function renderHUD(){
  if(!uiDirty) return;
  hud.innerHTML='';
  const make=(l,v,c)=>{ const b=document.createElement('div'); b.className='badge'; if(c) b.style.borderColor=c; b.textContent=l+': '+v; hud.appendChild(b); };
  make('Gold', state.gold);
  make('Welle', state.wave + (state.spawning?' (aktiv)':' – bereit'));
  make('Burg', state.castle.hp+'/'+state.castle.maxHp, state.castle.hp/state.castle.maxHp<0.34? 'var(--bad)':undefined);
  make('Türme', state.towers.length);
  make('Gegner', state.enemies.length);
  if(state.debugFree) make('Debug','Kosten 0','var(--good)');
  if(state.paused) make('Pause','AN','var(--warn)');
  if(state.buildMode) make('Bauen','Klick zum Platzieren','var(--accent)');
  if(state.selectedTower){
    const t=state.selectedTower;
    const can =(type)=> t.canUpgrade(state,type)? '' : 'disabled';
    const cost=(type)=>{ const c=t.upgradeCost(state)(type); return (c===null)? '–':c; };
    const L  =(k)=> `${t.levels[k]}/${CONFIG.tower.maxLevelPerTrack}`;

    // Zielmodi inkl. „Erster/Letzter“
    const modeBtn=(key,label,icon)=>`<button data-mode="${key}" class="${t.targetMode===key?'toggle-on':''}">${icon} ${label}</button>`;

    // DoT-Exklusivität: nur der gewählte Track wird angezeigt
    const showFireOnly   = t.dotLevels.fire>0;
    const showPoisonOnly = t.dotLevels.poison>0;
    const showIceOnly    = t.elements.ice;
    const showAllDots    = !showFireOnly && !showPoisonOnly && !showIceOnly;

    let dotRow = '';
    if(showAllDots || showFireOnly)   dotRow += `<button ${can('fire')} data-upg="fire">🔥 Feuer <span class="pill">${cost('fire')}</span> <span class="small">L${t.dotLevels.fire}/${CONFIG.tower.upgrades.fire.maxLevel}</span></button>`;
    if(showAllDots || showPoisonOnly) dotRow += `<button ${can('poison')} data-upg="poison">☠️ Gift <span class="pill">${cost('poison')}</span> <span class="small">L${t.dotLevels.poison}/${CONFIG.tower.upgrades.poison.maxLevel}</span></button>`;
    if(showAllDots || showIceOnly)    dotRow += `<button ${can('ice')} data-upg="ice">❄️ Eis <span class="pill">${cost('ice')}</span> <span class="small">${t.elements.ice?'Aktiv':'–'}</span></button>`;

    towerPanel.innerHTML = `
      <div><strong>🎯 Ausgewählter Turm</strong></div>
      <div class="stat"><span>Gesamt-Level</span><span>${t.level}</span></div>
      <div class="stat"><span>Schaden</span><span>${t.damage}</span></div>
      <div class="stat"><span>Reichweite</span><span>${Math.round(t.range)}</span></div>
      <div class="stat"><span>Krit</span><span>${Math.round(t.critChance*100)}% ×${t.critMult.toFixed(2)}</span></div>

      <div class="row" style="margin:6px 0 2px"><span class="small">Zielmodus:</span></div>
      <div class="row" style="margin-top:2px">
        ${modeBtn('strongest','Stärkste','💪')}
        ${modeBtn('lowest','Niedrigste HP','🩸')}
        ${modeBtn('nearest','Nächste','📍')}
        ${modeBtn('furthest','Weiteste','📡')}
        ${modeBtn('first','Erster Gegner','⏮️')}
        ${modeBtn('last','Letzter Gegner','⏭️')}
      </div>

      <div class="row" style="margin-top:8px">
        <button ${can('dmg')} data-upg="dmg">⬆️ Schaden <span class="pill">${cost('dmg')}</span></button>
        <button ${can('rng')} data-upg="rng">🎯 Reichweite <span class="pill">${cost('rng')}</span></button>
        <button ${can('spd')} data-upg="spd">⚡ Tempo <span class="pill">${cost('spd')}</span></button>
        <button ${can('crit')} data-upg="crit">💥 Krits <span class="pill">${cost('crit')}</span></button>
      </div>

      <div class="row">${dotRow}</div>
      <div class="small" style="opacity:.8;margin-top:6px">Levels: DMG ${L('dmg')}, RNG ${L('rng')}, SPD ${L('spd')}, CRIT ${L('crit')}</div>
    `;
  } else {
    towerPanel.textContent = 'Kein Turm ausgewählt. Klicke einen Turm an, um ihn zu upgraden.';
  }
}
