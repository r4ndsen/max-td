// utils.js
export const Utils = {
  clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
  dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  pointSegDistance(px,py,ax,ay,bx,by){
    const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
    let t=0; if(len2>0){ t=((px-ax)*dx+(py-ay)*dy)/len2; t=Math.max(0,Math.min(1,t)); }
    const cx=ax+t*dx, cy=ay+t*dy; return Math.hypot(px-cx,py-cy);
  },
  distanceToPath(p, CONFIG){
    let m=Infinity, pts=CONFIG.pathPoints;
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i], b=pts[i+1];
      m=Math.min(m, Utils.pointSegDistance(p.x,p.y,a.x,a.y,b.x,b.y));
    }
    return m;
  },
  drawStackDots(ctx, cx, cy, count, color){
    if(count<=0) return;
    const maxDots=8, r=2.5, pad=2;
    const dots=Math.min(maxDots,count);
    const totalW = dots*(r*2) + (dots-1)*pad;
    let x = cx - totalW/2 + r;
    ctx.save();
    for(let i=0;i<dots;i++){
      ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI*2); ctx.fill();
      x += r*2 + pad;
    }
    if(count>maxDots){ ctx.fillStyle=color; ctx.font='10px ui-monospace'; ctx.textAlign='left'; ctx.fillText('×'+count, x+2, cy+3); }
    ctx.restore();
  }
};
