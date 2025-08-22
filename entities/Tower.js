// entities/Tower.js
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { pickTarget } from '../targeting.js';
import { Projectile } from './Projectile.js';
import { ProjectileBomb } from './ProjectileBomb.js';

export class Tower{
  constructor(x,y){
    const t=CONFIG.tower;
    this.kind='arrow';
    this.x=x; this.y=y;
    this.base={ range:t.range, damage:t.damage, fireCooldown:t.fireCooldown, critChance:0.05 };
    this.levels={dmg:0,rng:0,spd:0,crit:0};

    // Spezialisierungen (exklusiv): ice (bool) | fire L | poison L | bomb L
    this.elements={ ice:false };
    this.dotLevels={ fire:0, poison:0 };
    this.bombLevel=0;

    this.size=16; this.cooldown=0;
    this.targetMode='first'; // Default
    this.recalc();
  }
  recalc(){
    const U=CONFIG.tower.upgrades;
    // clamp Altbestand
    this.dotLevels.fire   = Math.min(this.dotLevels.fire,   U.fire.maxLevel);
    this.dotLevels.poison = Math.min(this.dotLevels.poison, U.poison.maxLevel);
    this.bombLevel        = Math.min(this.bombLevel,        U.bomb.maxLevel);

    this.level=1+this.levels.dmg+this.levels.rng+this.levels.spd+this.levels.crit
                 + this.bombLevel; // Bombenlevel zählt in Gesamtstufe ein
    this.range=this.base.range + this.levels.rng*(U.rng.addPerLevel||10);
    this.damage=this.base.damage + this.levels.dmg*(U.dmg.addPerLevel||10);

    // Feuerrate inkl. Speed-Track + Bomben-Verlangsamung
    this.fireCooldown=this.base.fireCooldown*Math.pow(U.spd.multPerLevel||1,this.levels.spd);
    if(this.bombLevel>0) this.fireCooldown *= (U.bomb.cooldownMult||1.6);

    // Krit
    const C = U.crit;
    this.critChance = Math.min(C.maxChance, (this.base.critChance||0) + this.levels.crit*(C.addChancePerLevel||0));
    this.critMult   = (C.multBase||1.5) + (this.levels.crit*(C.multPerLevelAdd||0.1));

    // Mods (Präsenz)
    this.mods={
      ice:this.elements.ice,
      fire:this.dotLevels.fire>0,
      poison:this.dotLevels.poison>0,
      bomb:this.bombLevel>0
    };

    // Bomben-Parameter
    const fireRef = CONFIG.tower.upgrades.fire.explosion.radius;
    const B = U.bomb;
    this.bombProjectileSpeed = B.projectileSpeed || 360;
    this.blastRadiusBase = Math.round(fireRef * (B.radiusBaseFactor || (2/3)));
    this.blastRadius = this.blastRadiusBase + (this.bombLevel>0 ? (this.bombLevel-1)*(B.radiusPerLevel||12) : 0);
  }
  // Exklusivität: nicht kombinierbar
  _specBlocked(type){
    const anyOther = (this.elements.ice || this.dotLevels.fire>0 || this.dotLevels.poison>0 || this.bombLevel>0);
    if(type==='ice')    return (this.dotLevels.fire>0 || this.dotLevels.poison>0 || this.bombLevel>0);
    if(type==='fire')   return (this.elements.ice || this.dotLevels.poison>0 || this.bombLevel>0);
    if(type==='poison') return (this.elements.ice || this.dotLevels.fire>0   || this.bombLevel>0);
    if(type==='bomb')   return (this.elements.ice || this.dotLevels.fire>0   || this.dotLevels.poison>0);
    return false;
  }
  maxed(type){
    if(type==='fire')   return this.dotLevels.fire   >= CONFIG.tower.upgrades.fire.maxLevel;
    if(type==='poison') return this.dotLevels.poison >= CONFIG.tower.upgrades.poison.maxLevel;
    if(type==='ice')    return this.elements.ice;
    if(type==='bomb')   return this.bombLevel       >= CONFIG.tower.upgrades.bomb.maxLevel;
    return this.levels[type] >= CONFIG.tower.maxLevelPerTrack;
  }
  upgradeCost(state){
    return (type)=>{
      if(this._specBlocked(type)) return null;
      if(type==='fire'){
        const U=CONFIG.tower.upgrades.fire; if(this.dotLevels.fire>=U.maxLevel) return null;
        return state.debugFree?0:Math.round(U.baseCost*Math.pow(U.scaling,this.dotLevels.fire));
      }
      if(type==='poison'){
        const U=CONFIG.tower.upgrades.poison; if(this.dotLevels.poison>=U.maxLevel) return null;
        return state.debugFree?0:Math.round(U.baseCost*Math.pow(U.scaling,this.dotLevels.poison));
      }
      if(type==='ice'){
        return this.elements.ice ? null : (state.debugFree?0:CONFIG.tower.upgrades.ice.cost);
      }
      if(type==='bomb'){
        const U=CONFIG.tower.upgrades.bomb; if(this.bombLevel>=U.maxLevel) return null;
        return state.debugFree?0:Math.round(U.baseCost*Math.pow(U.scaling,this.bombLevel));
      }
      const u=CONFIG.tower.upgrades[type];
      if(this.levels[type] >= CONFIG.tower.maxLevelPerTrack) return null;
      return state.debugFree?0:Math.round(u.baseCost*Math.pow(u.scaling,this.levels[type]));
    };
  }
  canUpgrade(state,type){
    if(this._specBlocked(type)) return false;
    if(this.maxed(type)) return false;
    const c=this.upgradeCost(state)(type);
    return c!==null && state.gold>=c;
  }
  upgrade(state,type){
    if(!this.canUpgrade(state,type)) return false;
    const cost=this.upgradeCost(state)(type);
    if(cost===null || state.gold<cost) return false;
    state.gold-=cost;

    if(type==='ice'){ this.elements.ice=true; this.dotLevels.fire=0; this.dotLevels.poison=0; this.bombLevel=0; }
    else if(type==='fire'){ this.dotLevels.fire++; this.elements.ice=false; this.dotLevels.poison=0; this.bombLevel=0; }
    else if(type==='poison'){ this.dotLevels.poison++; this.elements.ice=false; this.dotLevels.fire=0; this.bombLevel=0; }
    else if(type==='bomb'){ this.bombLevel++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.poison=0; }
    else { this.levels[type]++; }

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
    const target = this.acquireTarget(state.enemies);
    if(target){
      if(this.bombLevel>0){
        state.projectiles.push(new ProjectileBomb({
          x:this.x,y:this.y,
          damage:this.damage,
          critChance:this.critChance, critMult:this.critMult,
        }, target, this.blastRadius));
      } else {
        state.projectiles.push(new Projectile({
          x:this.x,y:this.y,
          damage:this.damage,
          critChance:this.critChance, critMult:this.critMult,
          mods:this.mods, dotLevels:this.dotLevels
        },target));
      }
      this.cooldown=this.fireCooldown;
    }
  }
  draw(ctx, sel){
    // Reichweite
    ctx.save(); ctx.globalAlpha=.08; ctx.fillStyle= this.bombLevel>0 ? '#ffd27f' : '#9ad3ff';
    ctx.beginPath(); ctx.arc(this.x,this.y,this.range,0,Math.PI*2); ctx.fill(); ctx.restore();

    // Körper
    ctx.fillStyle=sel? (this.bombLevel>0?'#f6b26b':'#66d9ef') : (this.bombLevel>0?'#eec07a':'#cbd3ff');
    ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2a3050'; ctx.lineWidth=2; ctx.stroke();

    // Spezialisierungs-Markierungen
    let off=-12;
    if(this.elements.ice){ ctx.fillStyle='rgba(120,180,255,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4); off+=6; }
    if(this.dotLevels.fire>0){ ctx.fillStyle='rgba(255,120,40,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.dotLevels.fire); off+=6; }
    if(this.dotLevels.poison>0){ ctx.fillStyle='rgba(60,255,100,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.dotLevels.poison); off+=6; }
    if(this.bombLevel>0){ ctx.fillStyle='rgba(255,210,127,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.bombLevel); }

    // Level
    ctx.fillStyle='#2a3050'; ctx.font='12px ui-monospace'; ctx.textAlign='center'; ctx.fillText('L'+this.level,this.x,this.y+4);
  }
  contains(p){ return Utils.dist({x:this.x,y:this.y},p)<=20; }
}
