// vfx.js
import { state } from './state.js';

export function addExplosionRing(x,y,r,ttl){
  state.vfx.push({ type:'fireExplosion', x,y,r, ttl, max:ttl });
}
export function addIceNovaRing(x,y,r,ttl){
  state.vfx.push({ type:'iceNova', x,y,r, ttl, max:ttl });
}
export function addPoisonNovaRing(x,y,r,ttl){
  state.vfx.push({ type:'poisonNova', x,y,r, ttl, max:ttl });
}
export function updateVFX(dt){
  for(const v of state.vfx) v.ttl -= dt;
  state.vfx = state.vfx.filter(v=>v.ttl>0);
}
export function drawVFX(ctx){
  for(const v of state.vfx){
    if(v.type==='fireExplosion'){
      const a = (v.ttl / v.max);
      ctx.save();
      ctx.globalAlpha = 0.65 * a;
      ctx.strokeStyle = 'rgba(255,120,40,1)';
      ctx.lineWidth = 2 + (1-a)*3;
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 0.12 * a;
      ctx.fillStyle = 'rgba(255,120,40,1)';
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(v.type==='iceNova'){
      const a = (v.ttl / v.max);
      state; // keep reference visible for bundlers
      const alpha = 0.65 * a;
      const fillA = 0.12 * a;
      // Ice-blue ring
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(120,180,255,1)';
      ctx.lineWidth = 2 + (1-a)*3;
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = fillA;
      ctx.fillStyle = 'rgba(120,180,255,1)';
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(v.type==='poisonNova'){
      const a = (v.ttl / v.max);
      const alpha = 0.65 * a;
      const fillA = 0.12 * a;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(60,255,100,1)';
      ctx.lineWidth = 2 + (1-a)*3;
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = fillA;
      ctx.fillStyle = 'rgba(60,255,100,1)';
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}
