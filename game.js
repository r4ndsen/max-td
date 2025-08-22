// game.js
(function(){
  const CONFIG = window.CONFIG;
  const { Utils } = window;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const towerPanel = document.getElementById('towerPanel');

  // UI-Refs
  const btnStart = document.getElementById('btnStart');
  const btnBuild = document.getElementById('btnBuild');
  const btnCancel = document.getElementById('btnCancel');
  const btnRepair = document.getElementById('btnRepair');
  const btnMaxHp = document.getElementById('btnMaxHp');
  const btnDebug = document.getElementById('btnDebug');
  const costBuild = document.getElementById('costBuild');
  const costRepair = document.getElementById('costRepair');
  const costMaxHp = document.getElementById('costMaxHp');

  // ---------- Extras/Feature-Config ----------
  const FIRE_EXPLOSION = { radius: 70, dpsMult: 0.6, durationMult: 0.6, vfxTime: 0.6 }; // AoE + Sichtbarkeit

  // ---------- State ----------
  const state = {
    gold: 200,
    wave: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    vfx: [], // [{type:'fireExplosion', x,y,r,ttl,max}]
    buildMode: false,
    paused: false,
    selectedTower: null,
    castle: { x: 860, y: 100, hp: 100, maxHp: 100 },
    timers: { spawn: 0 },
    spawning: false, spawnLeft: 0, spawnInterval: 0.7,
    debugFree: false,
  };

  // ---------- Entities ----------
  class Enemy{
    constructor(wave){ const e=CONFIG.enemy; this.maxHp=Math.round(e.baseHp*Math.pow(e.hpGrowth,wave-1)); this.hp=this.maxHp; this.baseSpeed=e.baseSpeed*Math.pow(e.speedGrowth,wave-1); this.reward=Math.round(e.baseReward*Math.pow(e.rewardGrowth,wave-1)); this.damage=Math.round(e.baseDamage*Math.pow(e.damageGrowth,wave-1)); this.pathIndex=0; this.pos={...CONFIG.pathPoints[0]}; this.reachedEnd=false; this.radius=12; this.effects=[]; }
    get speed(){
      // mehrere ICE-Effekte: nimm den stärksten Slow (kleinste slowMult)
      let slowMult = 1;
      for(const ef of this.effects) if(ef.type==='ice') slowMult = Math.min(slowMult, ef.slowMult||1);
      return this.baseSpeed * slowMult;
    }
    update(dt){
      // DoTs und Ablauf (Feuer & Gift stacken -> summierte DPS)
      let fireDps = 0, poisonDps = 0;
      for(const ef of this.effects){
        if(ef.type==='fire') fireDps += (ef.dps||0);
        if(ef.type==='poison') poisonDps += (ef.dps||0);
        ef.time -= dt;
        // Feuer-Explosion wenn ein Stack endet (einmalig je Stack) + VFX
        if(ef.type==='fire' && ef.time<=0 && !ef.exploded){
          ef.exploded = true;
          triggerFireExplosion(this);
          // VFX-Ring sichtbar machen
          state.vfx.push({ type:'fireExplosion', x:this.pos.x, y:this.pos.y, r:FIRE_EXPLOSION.radius, ttl:FIRE_EXPLOSION.vfxTime, max:FIRE_EXPLOSION.vfxTime });
        }
      }
      const totalDps = fireDps + poisonDps;
      if(totalDps>0) this.hp -= totalDps * dt;

      // Abgelaufene Effekte entfernen
      this.effects = this.effects.filter(e=>e.time>0);

      // Pfad folgen
      const pts=CONFIG.pathPoints;
      while(this.pathIndex<pts.length-1 && dt>0){
        const a=this.pos, b=pts[this.pathIndex+1];
        const dx=b.x-a.x, dy=b.y-a.y;
        const segLen=Math.hypot(dx,dy);
        if(segLen<1e-4){ this.pathIndex++; continue; }
        const dirx=dx/segLen, diry=dy/segLen;
        const maxMove=this.speed*dt;
        const distToB=Math.hypot(b.x-a.x,b.y-a.y);
        if(maxMove<distToB){
          this.pos.x+=dirx*maxMove; this.pos.y+=diry*maxMove; dt=0;
        } else {
          this.pos.x=b.x; this.pos.y=b.y; this.pathIndex++; dt-=distToB/this.speed;
        }
      }
      if(this.pathIndex>=CONFIG.pathPoints.length-1) this.reachedEnd=true;
    }
    draw(){
      // Körper
      ctx.fillStyle='#2b314f';
      ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#4d85ff'; ctx.lineWidth=2; ctx.stroke();

      // Status-Glows
      if(this.effects.some(e=>e.type==='ice')){
        ctx.fillStyle='rgba(120,180,255,0.35)';
        ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius+4,0,Math.PI*2); ctx.fill();
      }
      if(this.effects.some(e=>e.type==='fire')){
        ctx.strokeStyle='rgba(255,120,40,0.8)';
        ctx.lineWidth=2; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius+6,0,Math.PI*2); ctx.stroke();
      }
      if(this.effects.some(e=>e.type==='poison')){
        ctx.fillStyle='rgba(60,255,100,0.25)';
        ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius+8,0,Math.PI*2); ctx.fill();
      }

      // HP-Bar
      const w=28,h=5,x=this.pos.x-w/2,y=this.pos.y-this.radius-10;
      ctx.fillStyle='#3a3f63'; ctx.fillRect(x,y,w,h);
      const p=Utils.clamp(this.hp/this.maxHp,0,1);
      ctx.fillStyle=p>0.5?'#7CFC00':(p>0.25?'#ffcc00':'#ff6b6b');
      ctx.fillRect(x,y,w*p,h);

      // Stack-Punkte über dem Gegner
      const fireStacks = this.effects.filter(e=>e.type==='fire').length;
      const poisonStacks = this.effects.filter(e=>e.type==='poison').length;
      drawStackDots(this.pos.x, y-8, fireStacks, 'rgba(255,120,40,0.95)');     // Feuer: Reihe 1
      drawStackDots(this.pos.x, y-18, poisonStacks, 'rgba(60,255,100,0.95)');  // Gift:  Reihe 2
    }
  }

  function drawStackDots(cx, cy, count, color){
    if(count<=0) return;
    const maxDots = 8;
    const r = 2.5, pad = 2;
    const dots = Math.min(maxDots, count);
    const totalW = dots*(r*2) + (dots-1)*pad;
    let x = cx - totalW/2 + r;
    ctx.save();
    for(let i=0;i<dots;i++){
      ctx.fillStyle=color;
      ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI*2); ctx.fill();
      x += r*2 + pad;
    }
    if(count>maxDots){
      ctx.fillStyle=color;
      ctx.font='10px ui-monospace';
      ctx.textAlign='left';
      ctx.fillText('×'+count, x+2, cy+3);
    }
    ctx.restore();
  }

  function triggerFireExplosion(sourceEnemy){
    const base = CONFIG.tower.upgrades.fire;
    const radius = FIRE_EXPLOSION.radius;
    const dps = base.dps * FIRE_EXPLOSION.dpsMult;
    const duration = base.duration * FIRE_EXPLOSION.durationMult;
    for(const other of state.enemies){
      if(other===sourceEnemy || other.hp<=0) continue;
      if(Utils.dist(sourceEnemy.pos, other.pos) <= radius){
        other.effects.push({ type:'fire', time: duration, dps, exploded:false });
      }
    }
    // (VFX wird bereits in Enemy.update hinzugefügt, damit Position genau passt)
  }

  class Projectile{
    constructor(from,target){
      this.pos={x:from.x,y:from.y};
      this.target=target;
      this.speed=CONFIG.tower.projectileSpeed;
      this.damage=from.damage;
      this.critChance=from.critChance;
      this.critMult=from.critMult;
      this.mods={...from.mods};
      this.alive=true;
      this.radius=3;
    }
    update(dt){
      if(!this.target||this.target.hp<=0){ this.alive=false; return; }
      const dx=this.target.pos.x-this.pos.x, dy=this.target.pos.y-this.pos.y;
      const d=Math.hypot(dx,dy);
      if(d<this.speed*dt){
        // Treffer
        let dmg=this.damage;
        if(Math.random()<this.critChance) dmg=Math.round(dmg*this.critMult);
        this.target.hp-=dmg;

        // Effekte anwenden (Feuer & Gift: STACKEN; Eis: refresht/übernimmt stärkeren Slow)
        if(this.mods.fire){
          const U=CONFIG.tower.upgrades.fire;
          this.target.effects.push({ type:'fire', time: U.duration, dps: U.dps, exploded:false });
        }
        if(this.mods.poison){
          const U=CONFIG.tower.upgrades.poison;
          this.target.effects.push({ type:'poison', time: U.duration, dps: U.dps });
        }
        if(this.mods.ice){
          const U=CONFIG.tower.upgrades.ice;
          let ice = this.target.effects.find(e=>e.type==='ice');
          if(!ice){
            this.target.effects.push({ type:'ice', time: U.duration, slowMult: U.slowMult });
          } else {
            ice.time = Math.max(ice.time, U.duration);
            ice.slowMult = Math.min(ice.slowMult||1, U.slowMult);
          }
        }

        this.alive=false; return;
      }
      const nx=dx/d, ny=dy/d;
      this.pos.x+=nx*this.speed*dt; this.pos.y+=ny*this.speed*dt;
    }
    draw(){ ctx.fillStyle='#eae7b1'; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill(); }
  }

  class Tower{
    constructor(x,y){
      const t=CONFIG.tower;
      this.x=x; this.y=y;
      this.base={ range:t.range, damage:t.damage, fireCooldown:t.fireCooldown, critChance:0.05, critMult:t.upgrades.crit.critMult };
      this.levels={dmg:0,rng:0,spd:0,crit:0};
      this.elements={ice:false,fire:false,poison:false};
      this.size=16;
      this.cooldown=0;
      this.targetMode='strongest'; // 'strongest' | 'lowest' | 'nearest' | 'furthest'
      this.recalc();
    }
    recalc(){
      const U=CONFIG.tower.upgrades;
      this.level=1+this.levels.dmg+this.levels.rng+this.levels.spd+this.levels.crit;
      this.range=this.base.range + this.levels.rng*(U.rng.addPerLevel||10);
      this.damage=this.base.damage + this.levels.dmg*(U.dmg.addPerLevel||10);
      this.fireCooldown=this.base.fireCooldown*Math.pow(U.spd.multPerLevel||1,this.levels.spd);
      this.critChance=Math.min(U.crit.maxChance, this.base.critChance + this.levels.crit*(U.crit.addPerLevel||0.05));
      this.critMult=U.crit.critMult;
      this.mods={ ice:this.elements.ice, fire:this.elements.fire, poison:this.elements.poison };
    }
    maxed(type){ return this.levels[type] >= CONFIG.tower.maxLevelPerTrack; }
    upgradeCost(type){
      if(state.debugFree) return 0;
      if(type==='ice'||type==='fire'||type==='poison'){
        const u=CONFIG.tower.upgrades[type];
        return this.elements[type]? null : u.cost;
      }
      const u=CONFIG.tower.upgrades[type];
      return Math.round(u.baseCost*Math.pow(u.scaling,this.levels[type]));
    }
    canUpgrade(type){
      if(type==='ice'||type==='fire'||type==='poison'){
        if(this.elements[type]) return false;
        const c=this.upgradeCost(type); return c!==null && state.gold>=c;
      }
      if(this.maxed(type)) return false;
      const c=this.upgradeCost(type); return state.gold>=c;
    }
    upgrade(type){
      const cost=this.upgradeCost(type);
      if(cost===null) return false;
      if(state.gold<cost) return false;
      state.gold-=cost;
      if(type==='ice'||type==='fire'||type==='poison'){ this.elements[type]=true; }
      else { this.levels[type]++; }
      this.recalc(); markUiDirty(); return true;
    }
    acquireTarget(){
      const inRange = [];
      for(const e of state.enemies){
        if(e.hp<=0) continue;
        const d=Utils.dist({x:this.x,y:this.y},e.pos);
        if(d<=this.range) inRange.push({e,d});
      }
      if(inRange.length===0) return null;

      let pick = inRange[0];
      switch(this.targetMode){
        case 'strongest':
          for(const it of inRange) if(it.e.hp > pick.e.hp) pick = it; break;
        case 'lowest':
          for(const it of inRange) if(it.e.hp < pick.e.hp) pick = it; break;
        case 'nearest':
          for(const it of inRange) if(it.d < pick.d) pick = it; break;
        case 'furthest':
          for(const it of inRange) if(it.d > pick.d) pick = it; break;
      }
      return pick.e;
    }
    update(dt){
      this.cooldown-=dt; if(this.cooldown>0) return;
      const target = this.acquireTarget();
      if(target){
        state.projectiles.push(new Projectile({x:this.x,y:this.y,damage:this.damage,critChance:this.critChance,critMult:this.critMult,mods:this.mods},target));
        this.cooldown=this.fireCooldown;
      }
    }
    draw(sel){
      // Range
      ctx.save(); ctx.globalAlpha=.08; ctx.fillStyle='#9ad3ff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.range,0,Math.PI*2); ctx.fill(); ctx.restore();
      // Body
      ctx.fillStyle=sel?'#66d9ef':'#cbd3ff';
      ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#2a3050'; ctx.lineWidth=2; ctx.stroke();
      // Elementpunkte
      let off=-10;
      if(this.elements.ice){ ctx.fillStyle='rgba(120,180,255,0.9)'; ctx.fillRect(this.x-2+off,this.y-22,4,4); off+=6; }
      if(this.elements.fire){ ctx.fillStyle='rgba(255,120,40,0.9)'; ctx.fillRect(this.x-2+off,this.y-22,4,4); off+=6; }
      if(this.elements.poison){ ctx.fillStyle='rgba(60,255,100,0.9)'; ctx.fillRect(this.x-2+off,this.y-22,4,4); }
      // Level
      ctx.fillStyle='#2a3050'; ctx.font='12px ui-monospace'; ctx.textAlign='center';
      ctx.fillText('L'+this.level,this.x,this.y+4);
    }
    contains(p){ return Utils.dist({x:this.x,y:this.y},p)<=20; }
  }

  // ---------- Waves ----------
  // Button kann IMMER gedrückt werden: stackt sofort nächste Welle
  function startWave(){
    state.wave++;
    const count=6+Math.floor(state.wave*1.5);
    state.spawnLeft += count;          // additiv, falls schon spawnt
    state.spawning = true;
    state.timers.spawn = 0;            // sofort nächster Spawn-Tick
    markUiDirty();
  }
  function spawnEnemy(){ state.enemies.push(new Enemy(state.wave)); }

  // ---------- Costs & UI helpers ----------
  function buildCost(){ return state.debugFree?0:CONFIG.tower.cost; }
  function repairCost(){ return state.debugFree?0:CONFIG.economy.repairCost; }
  function maxHpCost(){ return state.debugFree?0:CONFIG.economy.maxHpCost; }
  function refreshStaticCosts(){ if(costBuild) costBuild.textContent=buildCost(); if(costRepair) costRepair.textContent=repairCost(); if(costMaxHp) costMaxHp.textContent=maxHpCost(); btnDebug.classList.toggle('toggle-on', state.debugFree); }

  // ---------- Input ----------
  btnStart.onclick = startWave;
  btnBuild.onclick = ()=>{ state.buildMode=true; state.selectedTower=null; markUiDirty(); };
  btnCancel.onclick = ()=>{ state.buildMode=false; markUiDirty(); };
  btnRepair.onclick = ()=>{ const c=repairCost(); if(state.gold>=c && state.castle.hp<state.castle.maxHp){ state.gold-=c; state.castle.hp=Math.min(state.castle.maxHp, state.castle.hp+CONFIG.economy.repairChunk); markUiDirty(); } };
  btnMaxHp.onclick = ()=>{ const c=maxHpCost(); if(state.gold>=c){ state.gold-=c; state.castle.maxHp+=CONFIG.economy.maxHpChunk; state.castle.hp=Math.min(state.castle.maxHp, state.castle.hp+Math.floor(CONFIG.economy.maxHpChunk/2)); markUiDirty(); } };
  btnDebug.onclick = ()=>{ state.debugFree=!state.debugFree; refreshStaticCosts(); markUiDirty(); };

  canvas.addEventListener('mousemove', e=>{ mouse=getMouse(e); });
  canvas.addEventListener('click', e=>{ const p=getMouse(e); for(const t of state.towers){ if(t.contains(p)){ state.selectedTower=t; state.buildMode=false; markUiDirty(); return; } } if(state.buildMode){ tryPlaceTower(p); } else { state.selectedTower=null; markUiDirty(); } });
  window.addEventListener('keydown', e=>{ if(e.key==='p'||e.key==='P') state.paused=!state.paused; if(e.key==='b'||e.key==='B') {state.buildMode=true; markUiDirty();} if(e.key==='Escape'){ state.buildMode=false; state.selectedTower=null; markUiDirty(); } if(e.key==='Enter') startWave(); if(e.key==='u'||e.key==='U'){ if(state.selectedTower) { state.selectedTower.upgrade('dmg'); } } });

  function tryPlaceTower(p){ const c=buildCost(); if(state.gold<c) return; if(Utils.distanceToPath(p, CONFIG)<CONFIG.pathBuffer) return; for(const t of state.towers){ if(Utils.dist(p,{x:t.x,y:t.y})<40) return; } state.towers.push(new Tower(p.x,p.y)); state.gold-=c; state.buildMode=false; markUiDirty(); }
  function getMouse(e){ const r=canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height) }; }
  let mouse={x:0,y:0};

  // ---------- TowerPanel Click (delegiert) ----------
  towerPanel.addEventListener('click', (e)=>{
    const upg=e.target.closest('button[data-upg]');
    if(upg){ const t=state.selectedTower; if(!t) return; t.upgrade(upg.dataset.upg); return; }
    const modeBtn=e.target.closest('button[data-mode]');
    if(modeBtn){ const t=state.selectedTower; if(!t) return; t.targetMode = modeBtn.dataset.mode; markUiDirty(); }
  });

  // ---------- HUD (dirty render) ----------
  let uiDirty=true, uiScheduled=false;
  function markUiDirty(){ uiDirty=true; if(!uiScheduled){ uiScheduled=true; requestAnimationFrame(()=>{ if(uiDirty) renderHUD(); uiScheduled=false; uiDirty=false; }); } }

  function renderHUD(){
    hud.innerHTML = '';
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
      const t = state.selectedTower;
      const can = (type)=> t.canUpgrade(type)? '' : 'disabled';
      const cost = (type)=>{ const c = t.upgradeCost(type); return (c===null)? 'Aktiv' : c; };
      const L = (k)=> `${t.levels[k]}/${CONFIG.tower.maxLevelPerTrack}`;
      const E = (k)=> t.elements[k] ? 'Aktiv' : '–';
      const modeBtn = (key,label,icon)=>`<button data-mode="${key}" class="${t.targetMode===key?'toggle-on':''}">${icon} ${label}</button>`;
      towerPanel.innerHTML = `
        <div><strong>🎯 Ausgewählter Turm</strong></div>
        <div class="stat"><span>Gesamt-Level</span><span>${t.level}</span></div>
        <div class="stat"><span>Schaden</span><span>${t.damage}</span></div>
        <div class="stat"><span>Reichweite</span><span>${Math.round(t.range)}</span></div>
        <div class="stat"><span>Feuerrate</span><span>${(1/t.fireCooldown).toFixed(2)}/s</span></div>
        <div class="stat"><span>Krit-Chance</span><span>${Math.round(t.critChance*100)}% ×${t.critMult}</span></div>

        <div class="row" style="margin:6px 0 2px"><span class="small">Zielmodus:</span></div>
        <div class="row" style="margin-top:2px">
          ${modeBtn('strongest','Stärkste','💪')}
          ${modeBtn('lowest','Niedrigste HP','🩸')}
          ${modeBtn('nearest','Nächste','📍')}
          ${modeBtn('furthest','Weiteste','📡')}
        </div>

        <div class="row" style="margin-top:8px">
          <button ${can('dmg')} data-upg="dmg">⬆️ Schaden <span class="pill">${cost('dmg')}</span></button>
          <button ${can('rng')} data-upg="rng">🎯 Reichweite <span class="pill">${cost('rng')}</span></button>
          <button ${can('spd')} data-upg="spd">⚡ Tempo <span class="pill">${cost('spd')}</span></button>
          <button ${can('crit')} data-upg="crit">💥 Krits <span class="pill">${cost('crit')}</span></button>
        </div>
        <div class="row">
          <button ${can('ice')} data-upg="ice">❄️ Eis <span class="pill">${cost('ice')}</span> <span class="small">${E('ice')}</span></button>
          <button ${can('fire')} data-upg="fire">🔥 Feuer <span class="pill">${cost('fire')}</span> <span class="small">${E('fire')}</span></button>
          <button ${can('poison')} data-upg="poison">☠️ Gift <span class="pill">${cost('poison')}</span> <span class="small">${E('poison')}</span></button>
        </div>
        <div class="small" style="opacity:.8;margin-top:6px">Levels: DMG ${L('dmg')}, RNG ${L('rng')}, SPD ${L('spd')}, CRIT ${L('crit')}</div>
        <div class="small" style="opacity:.8">Elemente: ❄️ ${E('ice')} · 🔥 ${E('fire')} · ☠️ ${E('poison')}</div>
      `;
    } else {
      towerPanel.textContent = 'Kein Turm ausgewählt. Klicke einen Turm an, um ihn zu upgraden.';
    }
  }

  // ---------- Draw & Loop ----------
  function strokePath(width, color, alpha=1){
    const pts = CONFIG.pathPoints;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground(){
    // Boden
    const g=ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#10162a'); g.addColorStop(1,'#0d1120');
    ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Sichtbarer Pfad (Kontrast-Layers)
    strokePath(36, '#0a0d16', 0.75);              // Shadow
    strokePath(30, '#7f6e49', 1.00);              // Main dirt
    strokePath(6,  'rgba(255,235,170,0.25)', 1);  // Highlight crest

    // Burg
    ctx.fillStyle='#c7b26a';
    ctx.fillRect(state.castle.x-18,state.castle.y-22,36,36);
    ctx.fillStyle='#a8904a';
    ctx.fillRect(state.castle.x-22,state.castle.y-22,44,10);
    ctx.strokeStyle='#2a1f12'; ctx.lineWidth=2;
    ctx.strokeRect(state.castle.x-18,state.castle.y-22,36,36);

    // Bauhilfen
    if(state.buildMode){
      const ok=Utils.distanceToPath(mouse, CONFIG)>=CONFIG.pathBuffer && state.gold>=buildCost();
      ctx.globalAlpha=.25; ctx.fillStyle=ok?'#7CFC00':'#ff6b6b';
      ctx.beginPath(); ctx.arc(mouse.x,mouse.y,16,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=.08; ctx.fillStyle='#9ad3ff';
      ctx.beginPath(); ctx.arc(mouse.x,mouse.y,CONFIG.tower.range,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
  }

  function drawVFX(){
    for(const v of state.vfx){
      if(v.type==='fireExplosion'){
        const a = (v.ttl / v.max); // 1..0
        ctx.save();
        ctx.globalAlpha = 0.65 * a;
        // Ring
        ctx.strokeStyle = 'rgba(255,120,40,1)';
        ctx.lineWidth = 2 + (1-a)*3;
        ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.stroke();
        // leichtes Füll-Glühen
        ctx.globalAlpha = 0.12 * a;
        ctx.fillStyle = 'rgba(255,120,40,1)';
        ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
  }

  let last=performance.now();
  function loop(now){ const dt=Math.min(0.033,(now-last)/1000); last=now; if(!state.paused){ update(dt);} render(); requestAnimationFrame(loop); }
  function update(dt){
    if(state.spawning){
      state.timers.spawn-=dt;
      while(state.timers.spawn<=0 && state.spawnLeft>0){
        spawnEnemy(); state.spawnLeft--;
        state.timers.spawn += Math.max(0.25, state.spawnInterval*(0.98**state.wave));
      }
      if(state.spawnLeft<=0) state.spawning=false;
    }
    for(const e of state.enemies){ e.update(dt); }
    for(const t of state.towers){ t.update(dt); }
    for(const p of state.projectiles){ p.update(dt); }
    state.projectiles=state.projectiles.filter(p=>p.alive);

    // VFX abbauen
    for(const v of state.vfx){ v.ttl -= dt; }
    state.vfx = state.vfx.filter(v=>v.ttl>0);

    const survivors=[];
    for(const e of state.enemies){
      if(e.hp<=0){ state.gold+=e.reward; markUiDirty(); continue; }
      if(e.reachedEnd){ state.castle.hp=Math.max(0,state.castle.hp-e.damage); markUiDirty(); continue; }
      survivors.push(e);
    }
    state.enemies=survivors;
    if(state.castle.hp<=0) state.paused=true;
  }
  function render(){
    drawBackground();
    for(const t of state.towers){ t.draw(state.selectedTower===t); }
    for(const e of state.enemies){ e.draw(); }
    for(const p of state.projectiles){ p.draw(); }
    drawVFX(); // Explosion-Radien sichtbar machen
    if(uiDirty){ renderHUD(); uiDirty=false; }
  }

  // Init
  refreshStaticCosts();
  markUiDirty();
  requestAnimationFrame(loop);

  // Öffentliche API
  window.TD = {
    startWave,
    toggleDebug(){ state.debugFree=!state.debugFree; refreshStaticCosts(); markUiDirty(); return state.debugFree; },
    setDebug(on){ state.debugFree=!!on; refreshStaticCosts(); markUiDirty(); },
    getState(){ return { gold: state.gold, wave: state.wave, enemies: state.enemies.length, towers: state.towers.length, debug: state.debugFree, castle: { ...state.castle } }; },
    selectTower(i){ if(i>=0 && i<state.towers.length){ state.selectedTower=state.towers[i]; markUiDirty(); return true; } return false; },
    upgradeSelected(type){ if(!state.selectedTower) return false; return state.selectedTower.upgrade(type); },
    buildAt(x,y){ const p={x,y}; const c=buildCost(); if(state.gold<c) return false; if(Utils.distanceToPath(p, CONFIG)<CONFIG.pathBuffer) return false; for(const t of state.towers){ if(Utils.dist(p,{x:t.x,y:t.y})<40) return false; } state.towers.push(new Tower(x,y)); state.gold-=c; markUiDirty(); return true; },
  };
})();
