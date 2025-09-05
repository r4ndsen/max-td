// entities/Tower.js
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { pickTarget } from '../targeting.js';
import { Projectile } from './Projectile.js';
import { ProjectileBomb } from './ProjectileBomb.js';
import { applyDamage } from '../effects.js';
import { addLightningArc } from '../vfx.js';

export class Tower{
  constructor(x,y){
    const t=CONFIG.tower;
    this.kind='arrow';
    this.x=x; this.y=y;
    this.base={ range:t.range, damage:t.damage, fireCooldown:t.fireCooldown, critChance:0.05 };
    this.levels={dmg:0,rng:0,spd:0,crit:0};

    // Spezialisierungen (exklusiv): ice (bool) | fire L | poison L | bomb L
    this.elements={ ice:false };
    this.dotLevels={ fire:0, poison:0, curse:0, lightning:0, gatling:0 };
    this.bombLevel=0;
    this.sniperLevel=0;

    this.size=16; this.cooldown=0;
    this.targetMode='first'; // Default
    this.recalc();
  }
  recalc(){
    const U=CONFIG.tower.upgrades;
    // clamp Altbestand
    this.dotLevels.fire   = Math.min(this.dotLevels.fire,   U.fire.maxLevel);
    this.dotLevels.poison = Math.min(this.dotLevels.poison, U.poison.maxLevel);
    this.dotLevels.curse  = Math.min(this.dotLevels.curse||0,  (U.curse?.maxLevel)||5);
    this.dotLevels.lightning = Math.min(this.dotLevels.lightning||0, (U.lightning?.maxLevel)||5);
    this.dotLevels.gatling   = Math.min(this.dotLevels.gatling||0,   (U.gatling?.maxLevel)||5);
    this.bombLevel        = Math.min(this.bombLevel,        U.bomb.maxLevel);
    this.sniperLevel      = Math.min(this.sniperLevel,      U.sniper.maxLevel);

    this.level=1+this.levels.dmg+this.levels.rng+this.levels.spd+this.levels.crit
                 + this.bombLevel; // Bombenlevel zählt in Gesamtstufe ein
    this.range=this.base.range + this.levels.rng*(U.rng.addPerLevel||10);
    this.damage=this.base.damage + this.levels.dmg*(U.dmg.addPerLevel||10);

    // Feuerrate inkl. Speed-Track + Spezialisierungen
    this.fireCooldown=this.base.fireCooldown*Math.pow(U.spd.multPerLevel||1,this.levels.spd);
    if(this.bombLevel>0) this.fireCooldown *= (U.bomb.cooldownMult||1.6);
    if(this.sniperLevel>0) this.fireCooldown *= (U.sniper.cooldownMult||1.9);
    if((this.dotLevels.gatling||0)>0){
      const G = U.gatling;
      const L = this.dotLevels.gatling;
      this.fireCooldown *= (G.cooldownBase||0.6) * Math.pow((G.cooldownPerLevel||0.9), Math.max(0,L-1));
    }

    // Krit
    const C = U.crit;
    this.critChance = Math.min(C.maxChance, (this.base.critChance||0) + this.levels.crit*(C.addChancePerLevel||0));
    this.critMult   = (C.multBase||1.5) + (this.levels.crit*(C.multPerLevelAdd||0.1));

    // Sniper-Mods: starker Einzelschuss – Damage & Range Anpassungen
    if(this.sniperLevel>0){
      const S=U.sniper;
      const dmgMult = (S.damageMultBase||1.8) + (this.sniperLevel-1)*(S.damageMultPerLevel||0);
      this.damage = Math.round(this.damage * dmgMult);
      this.range += (S.rangeAddBase||0) + (this.sniperLevel-1)*(S.rangePerLevel||0);
    }
    if((this.dotLevels.gatling||0)>0){
      const G=U.gatling; const L=this.dotLevels.gatling;
      const gMult = (G.damageMultBase||0.75) + Math.max(0,L-1)*(G.damageMultPerLevel||0.05);
      this.damage = Math.max(1, Math.round(this.damage * gMult));
    }

    // Mods (Präsenz)
    this.mods={
      ice:this.elements.ice,
      fire:this.dotLevels.fire>0,
      poison:this.dotLevels.poison>0,
      bomb:this.bombLevel>0,
      curse:this.dotLevels.curse>0,
      lightning:this.dotLevels.lightning>0,
      gatling:this.dotLevels.gatling>0
    };

    // Safety: if not a fire tower, don't keep 'burning' mode
    if(this.dotLevels.fire<=0 && this.targetMode==='burning'){
      this.targetMode='nearest';
    }

    // Bomben-Parameter
    const fireRef = CONFIG.tower.upgrades.fire.explosion.radius;
    const B = U.bomb;
    this.bombProjectileSpeed = B.projectileSpeed || 360;
    this.blastRadiusBase = Math.round(fireRef * (B.radiusBaseFactor || (2/3)));
    this.blastRadius = this.blastRadiusBase + (this.bombLevel>0 ? (this.bombLevel-1)*(B.radiusPerLevel||12) : 0);
  }
  // Exklusivität: nicht kombinierbar
  _specBlocked(type){
    const anyOther = (this.elements.ice || this.dotLevels.fire>0 || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='ice')    return (this.dotLevels.fire>0 || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='fire')   return (this.elements.ice || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='poison') return (this.elements.ice || this.dotLevels.fire>0   || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='curse')  return (this.elements.ice || this.dotLevels.fire>0   || this.dotLevels.poison>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='lightning') return (this.elements.ice || this.dotLevels.fire>0 || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.gatling>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='gatling') return (this.elements.ice || this.dotLevels.fire>0 || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.bombLevel>0 || this.sniperLevel>0);
    if(type==='bomb')   return (this.elements.ice || this.dotLevels.fire>0   || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.sniperLevel>0);
    if(type==='sniper') return (this.elements.ice || this.dotLevels.fire>0   || this.dotLevels.poison>0 || this.dotLevels.curse>0 || this.dotLevels.lightning>0 || this.dotLevels.gatling>0 || this.bombLevel>0);
    return false;
  }
  maxed(type){
    if(type==='fire')   return this.dotLevels.fire   >= CONFIG.tower.upgrades.fire.maxLevel;
    if(type==='poison') return this.dotLevels.poison >= CONFIG.tower.upgrades.poison.maxLevel;
    if(type==='ice')    return this.elements.ice;
    if(type==='curse')  return this.dotLevels.curse  >= (CONFIG.tower.upgrades.curse.maxLevel||5);
    if(type==='lightning') return this.dotLevels.lightning >= (CONFIG.tower.upgrades.lightning.maxLevel||5);
    if(type==='gatling') return this.dotLevels.gatling >= (CONFIG.tower.upgrades.gatling.maxLevel||5);
    if(type==='bomb')   return this.bombLevel       >= CONFIG.tower.upgrades.bomb.maxLevel;
    if(type==='sniper') return this.sniperLevel     >= CONFIG.tower.upgrades.sniper.maxLevel;
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
      if(type==='curse'){
        const U=CONFIG.tower.upgrades.curse; if(this.dotLevels.curse>=(U.maxLevel||5)) return null;
        return state.debugFree?0:Math.round((U.baseCost||95)*Math.pow((U.scaling||1.34),this.dotLevels.curse||0));
      }
      if(type==='lightning'){
        const U=CONFIG.tower.upgrades.lightning; if(this.dotLevels.lightning>=(U.maxLevel||5)) return null;
        return state.debugFree?0:Math.round((U.baseCost||110)*Math.pow((U.scaling||1.36),this.dotLevels.lightning||0));
      }
      if(type==='gatling'){
        const U=CONFIG.tower.upgrades.gatling; if(this.dotLevels.gatling>=(U.maxLevel||5)) return null;
        return state.debugFree?0:Math.round((U.baseCost||105)*Math.pow((U.scaling||1.34),this.dotLevels.gatling||0));
      }
      if(type==='ice'){
        return this.elements.ice ? null : (state.debugFree?0:CONFIG.tower.upgrades.ice.cost);
      }
      if(type==='bomb'){
        const U=CONFIG.tower.upgrades.bomb; if(this.bombLevel>=U.maxLevel) return null;
        return state.debugFree?0:Math.round(U.baseCost*Math.pow(U.scaling,this.bombLevel));
      }
      if(type==='sniper'){
        const U=CONFIG.tower.upgrades.sniper; if(this.sniperLevel>=U.maxLevel) return null;
        return state.debugFree?0:Math.round(U.baseCost*Math.pow(U.scaling,this.sniperLevel));
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

    if(type==='ice'){ this.elements.ice=true; this.dotLevels.fire=0; this.dotLevels.poison=0; this.bombLevel=0; this.sniperLevel=0; }
    else if(type==='fire'){ this.dotLevels.fire++; this.elements.ice=false; this.dotLevels.poison=0; this.bombLevel=0; this.sniperLevel=0; }
    else if(type==='poison'){ this.dotLevels.poison++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.curse=0; this.dotLevels.lightning=0; this.dotLevels.gatling=0; this.bombLevel=0; this.sniperLevel=0; }
    else if(type==='curse'){ this.dotLevels.curse++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.poison=0; this.dotLevels.lightning=0; this.dotLevels.gatling=0; this.bombLevel=0; this.sniperLevel=0; }
    else if(type==='lightning'){ this.dotLevels.lightning++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.poison=0; this.dotLevels.curse=0; this.dotLevels.gatling=0; this.bombLevel=0; this.sniperLevel=0; }
    else if(type==='gatling'){ this.dotLevels.gatling++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.poison=0; this.dotLevels.curse=0; this.dotLevels.lightning=0; this.bombLevel=0; this.sniperLevel=0; }
    else if(type==='bomb'){ this.bombLevel++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.poison=0; this.dotLevels.curse=0; this.dotLevels.lightning=0; this.dotLevels.gatling=0; this.sniperLevel=0; }
    else if(type==='sniper'){ this.sniperLevel++; this.elements.ice=false; this.dotLevels.fire=0; this.dotLevels.poison=0; this.dotLevels.curse=0; this.dotLevels.lightning=0; this.dotLevels.gatling=0; this.bombLevel=0; }
    else { this.levels[type]++; }

    this.recalc(); 
    return true;
  }
  acquireTarget(enemies){
    const inRange=[];
    for(const e of enemies){ if(e.hp<=0) continue; const d=Utils.dist({x:this.x,y:this.y},e.pos); if(d<=this.range) inRange.push({e,d}); }
    if(inRange.length===0) return null;
    // Curse towers prefer non-cursed targets
    if((this.dotLevels?.curse||0)>0){
      const nonCursed = inRange.filter(it=> !(it.e.effects||[]).some(ef=>ef.type==='curse'));
      if(nonCursed.length>0) return pickTarget(nonCursed, this.targetMode);
    }
    return pickTarget(inRange, this.targetMode);
  }
  update(dt, state){
    this.cooldown-=dt; if(this.cooldown>0) return;
    const target = this.acquireTarget(state.enemies);
    if(target){
      // Lightning chain attack
      if((this.dotLevels?.lightning||0)>0){
        const U = CONFIG.tower.upgrades.lightning;
        const maxHits = (U.chainBase||3) + Math.max(0,(this.dotLevels.lightning-1))*(U.chainPerLevel||1);
        const chainR = U.chainRadius||180;
        const hits = [];
        let cur = target;
        while(cur && hits.length<maxHits){
          hits.push(cur);
          // find next nearest not-yet-hit within chainR from current
          let best=null, bestD=Infinity;
          for(const e of state.enemies){
            if(e.hp<=0) continue;
            if(hits.includes(e)) continue;
            const d = Utils.dist(cur.pos, e.pos);
            if(d<bestD && d<=chainR) { best=e; bestD=d; }
          }
          cur = best;
        }
        // Apply damage and add VFX arcs
        let lastPoint = { x:this.x, y:this.y };
        for(const e of hits){
          // Visual arc
          addLightningArc(lastPoint.x,lastPoint.y,e.pos.x,e.pos.y,0.12);
          // Crit check per target
          let dmg=this.damage; if(Math.random()<this.critChance) dmg=Math.round(dmg*this.critMult);
          applyDamage(e, dmg);
          lastPoint = e.pos;
        }
        this.cooldown=this.fireCooldown;
        return;
      }
      if(this.bombLevel>0){
        state.projectiles.push(new ProjectileBomb({
          x:this.x,y:this.y,
          damage:this.damage,
          critChance:this.critChance, critMult:this.critMult,
        }, target, this.blastRadius));
      } else {
        // Determine projectile kind for coloring
        let projectileKind = 'arrow';
        if(this.sniperLevel>0) projectileKind = 'sniper';
        else if(this.elements.ice) projectileKind = 'ice';
        else if(this.dotLevels.fire>0) projectileKind = 'fire';
        else if(this.dotLevels.poison>0) projectileKind = 'poison';
        else if(this.dotLevels.gatling>0) projectileKind = 'gatling';
        else if(this.dotLevels.curse>0) projectileKind = 'curse';

        const proj = {
          x:this.x,y:this.y,
          damage: (projectileKind==='curse' ? 0 : this.damage),
          critChance:this.critChance, critMult:this.critMult,
          mods:this.mods, dotLevels:this.dotLevels,
          projectileKind
        };
        if(this.sniperLevel>0){ proj.projectileSpeed = CONFIG.tower.upgrades.sniper.projectileSpeed || 700; }
        state.projectiles.push(new Projectile(proj,target));
      }
      this.cooldown=this.fireCooldown;
    }
  }
  draw(ctx, sel, hovered){
    // Reichweite
    ctx.save(); ctx.globalAlpha=.08; ctx.fillStyle= this.bombLevel>0 ? '#ffd27f' : '#9ad3ff';
    ctx.beginPath(); ctx.arc(this.x,this.y,this.range,0,Math.PI*2); ctx.fill(); ctx.restore();

    // Körper mit besser erkennbarer Hintergrundfarbe je Spezialisierung
    let bodyNormal = '#cbd3ff', bodySel = '#66d9ef';
    if(this.sniperLevel>0){ bodyNormal = '#a7ffe6'; bodySel = '#65f3c4'; }
    else if(this.bombLevel>0){ bodyNormal = '#eec07a'; bodySel = '#f6b26b'; }
    else if(this.elements.ice){ bodyNormal = '#cbe8ff'; bodySel = '#66d9ef'; }
    else if(this.dotLevels.fire>0){ bodyNormal = '#ffd1a6'; bodySel = '#ffab6b'; }
    else if(this.dotLevels.poison>0){ bodyNormal = '#c4ffcf'; bodySel = '#7cf79a'; }
    else if(this.dotLevels.curse>0){ bodyNormal = '#e7d7ff'; bodySel = '#d9c4ff'; }
    else if(this.dotLevels.lightning>0){ bodyNormal = '#bde3ff'; bodySel = '#66d9ef'; }
    ctx.fillStyle = sel ? bodySel : bodyNormal;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2a3050'; ctx.lineWidth=2; ctx.stroke();

    // Hover-Highlight (dickerer Akzent-Ring)
    if(hovered){
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#66d9ef';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x,this.y,this.size+4,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // Spezialisierungs-Markierungen
    let off=-12;
    if(this.elements.ice){ ctx.fillStyle='rgba(120,180,255,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4); off+=6; }
    if(this.dotLevels.fire>0){ ctx.fillStyle='rgba(255,120,40,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.dotLevels.fire); off+=6; }
    if(this.dotLevels.poison>0){ ctx.fillStyle='rgba(60,255,100,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.dotLevels.poison); off+=6; }
    if(this.bombLevel>0){ ctx.fillStyle='rgba(255,210,127,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.bombLevel); off+=6; }
    if(this.dotLevels.curse>0){ ctx.fillStyle='rgba(217,196,255,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.dotLevels.curse); off+=6; }
    if(this.dotLevels.lightning>0){ ctx.fillStyle='rgba(189,227,255,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.dotLevels.lightning); off+=6; }
    if(this.sniperLevel>0){ ctx.fillStyle='rgba(167,255,230,0.9)'; ctx.fillRect(this.x-2+off,this.y-24,4,4+this.sniperLevel); }

    // Label: show specialization icon if specialized; otherwise show level
    let label = 'L'+this.level;
    if(this.sniperLevel>0)      label = '🎯';
    else if(this.bombLevel>0)   label = '💣';
    else if(this.elements.ice)  label = '❄️';
    else if(this.dotLevels.fire>0)   label = '🔥';
    else if(this.dotLevels.poison>0) label = '☠️';
    else if(this.dotLevels.curse>0)  label = '🧿';
    else if(this.dotLevels.gatling>0) label = '⚙️';
    else if(this.dotLevels.lightning>0) label = '⚡';
    ctx.fillStyle='#2a3050';
    ctx.font = '14px system-ui';
    ctx.textAlign='center';
    // leichter Kontrast-Schatten für bessere Lesbarkeit
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.75)';
    ctx.shadowBlur = 2;
    ctx.fillText(label,this.x,this.y+5);
    ctx.restore();
  }
  contains(p){ return Utils.dist({x:this.x,y:this.y},p)<=20; }
}
