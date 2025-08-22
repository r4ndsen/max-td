// targeting.js  (Fix: „first“ = am weitesten Richtung Burg; „last“ = am Start)
import { CONFIG } from './config.js';

function pathProgress(e){
  const idx = Math.min(e.pathIndex, CONFIG.pathPoints.length-2);
  const A = CONFIG.pathPoints[idx];
  const B = CONFIG.pathPoints[idx+1] || A;
  const ABx=B.x-A.x, ABy=B.y-A.y;
  const APx=e.pos.x-A.x, APy=e.pos.y-A.y;
  const len2 = ABx*ABx + ABy*ABy;
  const t = len2>0 ? Math.max(0, Math.min(1, (APx*ABx+APy*ABy)/len2)) : 0;
  return idx + t; // 0 ... (N-1)
}

export function pickTarget(inRange, mode){
  if(inRange.length===0) return null;
  let pick = inRange[0];
  switch(mode){
    case 'strongest': for(const it of inRange) if(it.e.hp > pick.e.hp) pick=it; break;
    case 'lowest':    for(const it of inRange) if(it.e.hp < pick.e.hp) pick=it; break;
    case 'nearest':   for(const it of inRange) if(it.d    < pick.d)    pick=it; break;
    case 'furthest':  for(const it of inRange) if(it.d    > pick.d)    pick=it; break;

    // FIX: Begriffe getauscht
    case 'first':     { // „Erster Gegner“ = am weitesten Richtung Burg
      let pProg = pathProgress(pick.e);
      for(const it of inRange){ const pr=pathProgress(it.e); if(pr > pProg){ pProg=pr; pick=it; } }
      break;
    }
    case 'last':      { // „Letzter Gegner“ = am nächsten am Start
      let pProg = pathProgress(pick.e);
      for(const it of inRange){ const pr=pathProgress(it.e); if(pr < pProg){ pProg=pr; pick=it; } }
      break;
    }
  }
  return pick.e;
}
