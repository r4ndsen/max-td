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
export function addLightningArc(x1,y1,x2,y2,ttl=0.12){
  // Precompute a jagged polyline between points
  const points = [];
  const segs = 8;
  for(let i=0;i<=segs;i++){
    const t = i/segs;
    const x = x1 + (x2-x1)*t;
    const y = y1 + (y2-y1)*t;
    const amp = 6 * (1 - Math.abs(t-0.5)*2); // stronger mid jitter
    const jx = (Math.random()*2-1) * amp;
    const jy = (Math.random()*2-1) * amp;
    points.push({ x:x + jx, y:y + jy });
  }
  state.vfx.push({ type:'lightning', pts:points, ttl, max:ttl });
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
    if(v.type==='lightning'){
      const a = Math.max(0, Math.min(1, v.ttl / v.max));
      ctx.save();
      ctx.globalAlpha = 0.85 * a;
      ctx.strokeStyle = '#bde3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = v.pts[0];
      ctx.moveTo(first.x, first.y);
      for(let i=1;i<v.pts.length;i++) ctx.lineTo(v.pts[i].x, v.pts[i].y);
      ctx.stroke();
      // glow
      ctx.globalAlpha = 0.25 * a;
      ctx.strokeStyle = '#66d9ef';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }
}
