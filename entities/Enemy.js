// entities/Enemy.js
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { updateEffects } from '../effects.js';

export class Enemy{
  constructor(wave){
    const e=CONFIG.enemy;
    this.maxHp=Math.round(e.baseHp*Math.pow(e.hpGrowth,wave-1));
    this.hp=this.maxHp;
    this.baseSpeed=e.baseSpeed*Math.pow(e.speedGrowth,wave-1);
    this.reward=Math.round(e.baseReward*Math.pow(e.rewardGrowth,wave-1));
    this.damage=Math.round(e.baseDamage*Math.pow(e.damageGrowth,wave-1));
    this.pathIndex=0;
    this.pos={...CONFIG.pathPoints[0]};
    this.reachedEnd=false;
    this.radius=12;
    this.effects=[];
  }
  get speed(){
    let slow=1;
    for(const ef of this.effects) if(ef.type==='ice') slow=Math.min(slow, ef.slowMult||1);
    return this.baseSpeed*slow;
  }
  update(dt){
    updateEffects(this, dt);
    const pts=CONFIG.pathPoints;
    while(this.pathIndex<pts.length-1 && dt>0){
      const a=this.pos, b=pts[this.pathIndex+1];
      const dx=b.x-a.x, dy=b.y-a.y;
      const segLen=Math.hypot(dx,dy);
      if(segLen<1e-4){ this.pathIndex++; continue; }
      const dirx=dx/segLen, diry=dy/segLen;
      const maxMove=this.speed*dt;
      const distToB=Math.hypot(b.x-a.x,b.y-a.y);
      if(maxMove<distToB){ this.pos.x+=dirx*maxMove; this.pos.y+=diry*maxMove; dt=0; }
      else { this.pos.x=b.x; this.pos.y=b.y; this.pathIndex++; dt-=distToB/this.speed; }
    }
    if(this.pathIndex>=CONFIG.pathPoints.length-1) this.reachedEnd=true;
  }
  draw(ctx){
    ctx.fillStyle='#2b314f';
    ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#4d85ff'; ctx.lineWidth=2; ctx.stroke();
    if(this.effects.some(e=>e.type==='ice')){ ctx.fillStyle='rgba(120,180,255,0.35)'; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius+4,0,Math.PI*2); ctx.fill(); }
    if(this.effects.some(e=>e.type==='fire')){ ctx.strokeStyle='rgba(255,120,40,0.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius+6,0,Math.PI*2); ctx.stroke(); }
    if(this.effects.some(e=>e.type==='poison')){ ctx.fillStyle='rgba(60,255,100,0.25)'; ctx.beginPath(); ctx.arc(this.pos.x,this.pos.y,this.radius+8,0,Math.PI*2); ctx.fill(); }

    const w=28,h=5,x=this.pos.x-w/2,y=this.pos.y-this.radius-10;
    ctx.fillStyle='#3a3f63'; ctx.fillRect(x,y,w,h);
    const p=Utils.clamp(this.hp/this.maxHp,0,1);
    ctx.fillStyle=p>0.5?'#7CFC00':(p>0.25?'#ffcc00':'#ff6b6b');
    ctx.fillRect(x,y,w*p,h);

    const fireStacks = this.effects.filter(e=>e.type==='fire').length;
    const poisonStacks = this.effects.filter(e=>e.type==='poison').length;
    // helper nutzt utils (identisch wie vorher)
    Utils.drawStackDots(ctx, this.pos.x, y-8,  fireStacks, 'rgba(255,120,40,0.95)');
    Utils.drawStackDots(ctx, this.pos.x, y-18, poisonStacks, 'rgba(60,255,100,0.95)');
  }
}
