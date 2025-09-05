// entities/Projectile.js
import { CONFIG } from '../config.js';
import { addFireStack, addPoisonStack, addOrRefreshIce, addOrRefreshCurse, applyDamage, triggerIceNova, triggerPoisonNova } from '../effects.js';

export class Projectile{
  constructor(from,target){
    this.pos={x:from.x,y:from.y};
    this.target=target;
    this.speed=from.projectileSpeed || CONFIG.tower.projectileSpeed;
    this.damage=from.damage;
    this.critChance=from.critChance;
    this.critMult=from.critMult;
    this.mods={...from.mods};            // { ice:bool, fire:bool, poison:bool }
    this.dotLevels={...from.dotLevels};  // { fire:int, poison:int }
    this.alive=true;
    this.radius=3;
    // Kind hint used for rendering colors (arrow|ice|fire|poison|sniper|gatling)
    this.kind = from.projectileKind || (this.mods.fire ? 'fire' : this.mods.poison ? 'poison' : this.mods.ice ? 'ice' : 'arrow');
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
      if(this.mods.poison && this.dotLevels.poison>0){
        const hadPoison = this.target.effects?.some?.(e=>e.type==='poison');
        addPoisonStack(this.target, this.dotLevels.poison);
        if(hadPoison) triggerPoisonNova(this.target, this.dotLevels.poison);
      }
      if(this.mods.ice){
        const hadIce = this.target.effects?.some?.(e=>e.type==='ice');
        addOrRefreshIce(this.target);
        if(hadIce) triggerIceNova(this.target);
      }
      if(this.kind==='curse' && (this.dotLevels.curse||0)>0){
        addOrRefreshCurse(this.target, this.dotLevels.curse||1);
      }

      this.alive=false; return;
    }
    const nx=dx/d, ny=dy/d; this.pos.x+=nx*this.speed*dt; this.pos.y+=ny*this.speed*dt;
  }
  draw(ctx){
    let color = '#eae7b1';
    if(this.kind==='fire') color = '#ffab6b';
    else if(this.kind==='poison') color = '#7cf79a';
    else if(this.kind==='ice') color = '#66d9ef';
    else if(this.kind==='sniper') color = '#a7ffe6';
    else if(this.kind==='gatling') color = '#f7f79a';
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill();
  }
}
