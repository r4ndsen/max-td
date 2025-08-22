// entities/Projectile.js
import { CONFIG } from '../config.js';
import { addFireStack, addPoisonStack, addOrRefreshIce, applyDamage } from '../effects.js';

export class Projectile{
  constructor(from,target){
    this.pos={x:from.x,y:from.y};
    this.target=target;
    this.speed=CONFIG.tower.projectileSpeed;
    this.damage=from.damage;
    this.critChance=from.critChance;
    this.critMult=from.critMult;
    this.mods={...from.mods};            // { ice:bool, fire:bool, poison:bool }
    this.dotLevels={...from.dotLevels};  // { fire:int, poison:int }
    this.alive=true;
    this.radius=3;
  }
  update(dt){
    if(!this.target||this.target.hp<=0){ this.alive=false; return; }
    const dx=this.target.pos.x-this.pos.x, dy=this.target.pos.y-this.pos.y;
    const d=Math.hypot(dx,dy);
    if(d<this.speed*dt){
      // Direkttreffer (mit Krit) –> evtl. verdoppelt bei 3 Debuffs
      let dmg=this.damage; if(Math.random()<this.critChance) dmg=Math.round(dmg*this.critMult);
      applyDamage(this.target, dmg);

      // DoTs anwenden (mit Level)
      if(this.mods.fire && this.dotLevels.fire>0)     addFireStack(this.target,   this.dotLevels.fire);
      if(this.mods.poison && this.dotLevels.poison>0) addPoisonStack(this.target, this.dotLevels.poison);
      if(this.mods.ice)                                addOrRefreshIce(this.target);

      this.alive=false; return;
    }
    const nx=dx/d, ny=dy/d; this.pos.x+=nx*this.speed*dt; this.pos.y+=ny*this.speed*dt;
  }
  draw(ctx){ ctx.fillStyle='#eae7b1'; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill(); }
}
