// entities/ProjectileBomb.js  — PATCH (stabiler AoE-Hit ohne applyDamage-Import)
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { addExplosionRing } from '../vfx.js';

export class ProjectileBomb{
  constructor(from, target, blastRadius){
    this.pos = { x: from.x, y: from.y };
    this.target = target;
    this.speed = CONFIG.tower.upgrades.bomb.projectileSpeed || 360;
    this.damage = from.damage;
    this.critChance = from.critChance;
    this.critMult = from.critMult;
    this.radius = 4;
    this.alive = true;
    this.blastRadius = blastRadius;
  }

  update(dt){
    if(!this.alive) return;
    if(!this.target || this.target.hp<=0){ this.alive=false; return; }

    const dx=this.target.pos.x-this.pos.x, dy=this.target.pos.y-this.pos.y;
    const d=Math.hypot(dx,dy);

    // Treffer?
    if(d <= Math.max(0.0001, this.speed*dt)){
      const impact = { x:this.target.pos.x, y:this.target.pos.y };

      // Krit berechnen
      let dmg=this.damage;
      if(Math.random() < (this.critChance||0)) dmg = Math.round(dmg*(this.critMult||1.5));

      // WICHTIG: zuerst Projektil beenden, dann AoE verarbeiten (keine Re-Entrys)
      this.alive=false;

      // stabile Kopie der Gegnerliste (keine Mutation während Iteration)
      const enemies = state.enemies.slice();
      const R = this.blastRadius;

      for(const e of enemies){
        if(e.hp<=0) continue;
        const dist = Math.hypot(e.pos.x-impact.x, e.pos.y-impact.y);
        if(dist<=R){
          // Lokaler Schaden: x2, wenn alle drei Debuffs aktiv (wie applyDamage), ohne Effekte zu verändern
          const eff = e.effects||[];
          const hasIce    = eff.some(x=>x.type==='ice');
          const hasFire   = eff.some(x=>x.type==='fire');
          const hasPoison = eff.some(x=>x.type==='poison');
          const mult = (hasIce && hasFire && hasPoison) ? 2 : 1;
          e.hp -= dmg * mult;
        }
      }

      addExplosionRing(impact.x, impact.y, R, 0.35);
      return;
    }

    // Bewegung
    if(d>0){
      const nx=dx/d, ny=dy/d;
      this.pos.x += nx*this.speed*dt;
      this.pos.y += ny*this.speed*dt;
    }
  }

  draw(ctx){
    if(!this.alive) return;
    ctx.fillStyle='#f0c674';
    ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill();
  }
}
