// ui.js  (NEU: Dev-Buttons verdrahten + Labels aktualisieren)
import { CONFIG } from './config.js';
import { state } from './state.js';
import { buildCost, repairCost, maxHpCost } from './cost.js';
import { t } from './i18n.js';

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
  btnDevSpeed.textContent = `⏩ ${t('dev.speed',{x: state.dev.speed})}`;
  btnDevHit.textContent   = `🎯 ${t('dev.hitToggle',{state: state.dev.showHit? t('common.on'): t('common.off')})}`;
  btnDevOverlay.textContent = `🧬 ${t('dev.overlayToggle',{state: state.dev.showOverlay? t('common.on'): t('common.off')})}`;
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
    if(upg){ const tw=state.selectedTower; if(!tw) return; tw.upgrade(state, upg.dataset.upg); markUiDirty(); return; }
    const modeBtn=e.target.closest('button[data-mode]');
    if(modeBtn){ const tw=state.selectedTower; if(!tw) return; tw.targetMode = modeBtn.dataset.mode; markUiDirty(); }
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
  make(t('hud.gold'), state.gold);
  make(t('hud.wave'), state.wave + (state.spawning? t('hud.wave.active'): t('hud.wave.ready')));
  make(t('hud.castle'), state.castle.hp+'/'+state.castle.maxHp, state.castle.hp/state.castle.maxHp<0.34? 'var(--bad)':undefined);
  make(t('hud.towers'), state.towers.length);
  make(t('hud.enemies'), state.enemies.length);
  if(state.debugFree) make(t('hud.debug'), t('btn.debugFree'),'var(--good)');
  if(state.paused) make(t('hud.pause'), t('hud.pause.on'),'var(--warn)');
  if(state.buildMode) make(t('hud.build'), t('hud.build.hint'),'var(--accent)');
  if(state.selectedTower){
    const tw=state.selectedTower;
    // ui.js (Ausschnitt: renderHUD() – Tower-Panel)
    // … im Block if(state.selectedTower) { const t=state.selectedTower; … }

    const can =(type)=> tw.canUpgrade(state,type)? '' : 'disabled';
    const cost=(type)=>{ const c=tw.upgradeCost(state)(type); return (c===null)? '–':c; };
    const L  =(k)=> `${tw.levels[k]}/${CONFIG.tower.maxLevelPerTrack}`;
    const modeBtn=(key,label,icon)=>`<button data-mode="${key}" class="${tw.targetMode===key?'toggle-on':''}">${icon} ${label}</button>`;

    // Exklusivität: nur gewählten Track zeigen
    const showFireOnly   = tw.dotLevels?.fire>0;
    const showPoisonOnly = tw.dotLevels?.poison>0;
    const showIceOnly    = tw.elements?.ice;
    const showBombOnly   = tw.bombLevel>0;
    const showSniperOnly = tw.sniperLevel>0;
    const showAllSpecs   = !showFireOnly && !showPoisonOnly && !showIceOnly && !showBombOnly && !showSniperOnly;

    let specRow = '';
    if(showAllSpecs || showFireOnly)   specRow += `<button ${can('fire')} data-upg="fire">🔥 ${t('tower.track.fire')} <span class="pill">${cost('fire')}</span> <span class="small">L${tw.dotLevels.fire}/${CONFIG.tower.upgrades.fire.maxLevel}</span></button>`;
    if(showAllSpecs || showPoisonOnly) specRow += `<button ${can('poison')} data-upg="poison">☠️ ${t('tower.track.poison')} <span class="pill">${cost('poison')}</span> <span class="small">L${tw.dotLevels.poison}/${CONFIG.tower.upgrades.poison.maxLevel}</span></button>`;
    if(showAllSpecs || showIceOnly)    specRow += `<button ${can('ice')} data-upg="ice">❄️ ${t('tower.track.ice')} <span class="pill">${cost('ice')}</span> <span class="small">${tw.elements.ice? t('tower.active') :'–'}</span></button>`;
    if(showAllSpecs || showBombOnly)   specRow += `<button ${can('bomb')} data-upg="bomb">💣 ${t('tower.track.bomb')} <span class="pill">${cost('bomb')}</span> <span class="small">L${tw.bombLevel}/${CONFIG.tower.upgrades.bomb.maxLevel}</span></button>`;
    if(showAllSpecs || (tw.sniperLevel>0)) specRow += `<button ${can('sniper')} data-upg="sniper">🎯 ${t('tower.track.sniper')} <span class="pill">${cost('sniper')}</span> <span class="small">L${tw.sniperLevel||0}/${CONFIG.tower.upgrades.sniper.maxLevel}</span></button>`;

    towerPanel.innerHTML = `
      <div><strong>${tw.sniperLevel>0?t('tower.title.sniper'): (tw.bombLevel>0?t('tower.title.bomb'):t('tower.title.archer'))}</strong></div>
      <div class="stat"><span>${t('tower.stat.damage')}</span><span>${tw.damage}</span></div>
      <div class="stat"><span>${t('tower.stat.range')}</span><span>${Math.round(tw.range)}</span></div>
      <div class="stat"><span>${tw.sniperLevel>0?t('tower.stat.firerate.sniper'): (tw.bombLevel>0?t('tower.stat.firerate.bomb'):t('tower.stat.firerate'))}</span><span>${(1/tw.fireCooldown).toFixed(2)}/s</span></div>
      ${tw.bombLevel>0 ? `<div class=\"stat\"><span>${t('tower.stat.blastradius')}</span><span>${Math.round(tw.blastRadius)}</span></div>` : ''}
      <div class="stat"><span>${t('tower.stat.crit')}</span><span>${Math.round(tw.critChance*100)}% ×${tw.critMult.toFixed(2)}</span></div>

      <div class="row" style="margin:6px 0 2px"><span class="small">${t('tower.target.mode')}</span></div>
      <div class="row" style="margin-top:2px">
        ${modeBtn('strongest',t('tower.target.strongest'),'💪')}
        ${modeBtn('lowest',t('tower.target.lowest'),'🩸')}
        ${modeBtn('nearest',t('tower.target.nearest'),'📍')}
        ${modeBtn('furthest',t('tower.target.furthest'),'📡')}
        ${modeBtn('first',t('tower.target.first'),'⏮️')}
        ${modeBtn('last',t('tower.target.last'),'⏭️')}
        ${tw.dotLevels.fire>0 ? modeBtn('burning',t('tower.target.burning'),'🔥') : ''}
      </div>

      <div class="row" style="margin-top:8px">
        <button ${can('dmg')} data-upg="dmg">⬆️ ${t('tower.upg.damage')} <span class="pill">${cost('dmg')}</span></button>
        <button ${can('rng')} data-upg="rng">🎯 ${t('tower.upg.range')} <span class="pill">${cost('rng')}</span></button>
        <button ${can('spd')} data-upg="spd">⚡ ${t('tower.upg.speed')} <span class="pill">${cost('spd')}</span></button>
        <button ${can('crit')} data-upg="crit">💥 ${t('tower.upg.crit')} <span class="pill">${cost('crit')}</span></button>
      </div>

      <div class="row">${specRow}</div>
      <div class="small" style="opacity:.8;margin-top:6px">${t('tower.levels')
        .replace('{dmg}', L('dmg'))
        .replace('{rng}', L('rng'))
        .replace('{spd}', L('spd'))
        .replace('{crit}', L('crit'))}
      </div>
    `;

  } else {
    towerPanel.textContent = t('notice.noTower');
  }
}
