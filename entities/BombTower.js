// entities/BombTower.js  (NEW)
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { pickTarget } from '../targeting.js';
import { ProjectileBomb } from './ProjectileBomb.js';

export class BombTower{
  constructor(x,y){
    this.kind='bomb';
    const t=CONFIG.towerBomb;
    this.x=x; this.y=y;
    this.base={ range:t.range, damage:t.damage, fireCooldown:t.fireCooldown, critChance:0.05 };
    this.levels={ dmg:0, rng:0, spd:0, crit:0, blast:0 };
    this.size=16; this.cooldown=0;
    this.targetMode='first'; // Default wie gefordert
    this.recalc();
  }
  recalc(){
    const U=CONFIG.tower.upgrades;
    const B=CONFIG.towerBomb;

    this.level=1+this.levels.dmg+this.levels.rng+this.levels.spd+this.levels.crit+this.levels.blast;
    this.range=this.base.range + this.levels.rng*(U.rng.addPerLevel||10);
    this.damage=this.base.damage + this.levels.dmg*(U.dmg.addPerLevel||10);
    this.fireCooldown=this.base.fireCooldown*Math.pow(U.spd.multPerLevel||1,this.levels.spd);

    // Krit-Skalierung aus config.crit
    const C = U.crit;
    this.critChance = Math.min(C.maxChance, (this.base.critChance||0) + this.levels.crit*(C.addChancePerLevel||0));
    this.critMult   = (C.multBase||1.5) + (this.levels.crit*(C.multPerLevelAdd||0.1));

    // Blast-Radius: 2/3 des Feuer-Explosionsradius + Blast-Upgrades
    const fireRef = CONFIG.tower.upgrades.fire.explosion.radius;
    const baseBlast = Math.round(fireRef * (CONFIG.towerBomb.blast.baseFactorOfFireExplosion || (2/3)));
    this.blastRadius = baseBlast + this.levels.blast*(B.blast.addPerLevel||10);
  }
  maxed(type){
    if(type==='blast') return this.levels.blast >= (CONFIG.towerBomb.blast.maxLevel||5);
    return this.levels[type] >= CONFIG.tower.maxLevelPerTrack;
  }
  upgradeCost(state){
    return (type)=>{
      if(this.maxed(type)) return null;
      if(state.debugFree) return 0;
      if(type==='blast'){
        const b=CONFIG.towerBomb.blast;
        return Math.round(b.baseCost * Math.pow(b.scaling, this.levels.blast));
      }
      const u=CONFIG.tower.upgrades[type];
      return Math.round(u.baseCost*Math.pow(u.scaling,this.levels[type]));
    };
  }
  canUpgrade(state,type){
    const c=this.upgradeCost(state)(type);
    return c!==null && state.gold>=c;
  }
  upgrade(state,type){
    const cost=this.upgradeCost(state)(type);
    if(cost===null || state.gold<cost) return false;
    state.gold-=cost;
    this.levels[type]++;
    this.recalc();
    return true;
  }
  acquireTarget(enemies){
    const inRange=[];
    for(const e of enemies){ if(e.hp<=0) continue; const d=Utils.dist({x:this.x,y:this.y},e.pos); if(d<=this.range) inRange.push({e,d}); }
    return pickTarget(inRange, this.targetMode);
  }
  update(dt, state){
    this.cooldown-=dt; if(this.cooldown>0) return;
    const target=this.acquireTarget(state.enemies);
    if(target){
      state.projectiles.push(new ProjectileBomb({
        x:this.x,y:this.y,
        damage:this.damage,
        critChance:this.critChance, critMult:this.critMult,
      }, target, this.blastRadius));
      this.cooldown=this.fireCooldown;
    }
  }
  draw(ctx, sel){
    // Reichweitenkreis
    ctx.save(); ctx.globalAlpha=.08; ctx.fillStyle='#ffd27f'; 
    ctx.beginPath(); ctx.arc(this.x,this.y,this.range,0,Math.PI*2); ctx.fill(); ctx.restore();
    // Turm
    ctx.fillStyle=sel?'#f6b26b':'#eec07a';
    ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#4d3b1f'; ctx.lineWidth=2; ctx.stroke();
    // kleine Blast-Level-Markierung
    ctx.fillStyle='#4d3b1f'; ctx.font='12px ui-monospace'; ctx.textAlign='center';
    ctx.fillText('B'+this.levels.blast, this.x, this.y+4);
  }
  contains(p){ return Math.hypot(this.x-p.x, this.y-p.y) <= 20; }
}
