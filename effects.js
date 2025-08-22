// effects.js
import { CONFIG } from './config.js';
import { state } from './state.js';
import { Utils } from './utils.js';
import { addExplosionRing } from './vfx.js';

export const MAX_FIRE_STACKS   = CONFIG.tower.upgrades.fire.maxStacks;
export const MAX_POISON_STACKS = CONFIG.tower.upgrades.poison.maxStacks;

const MIN_TICK = 0.05;
const MAX_TICKS_PER_UPDATE = 8;

export function applyDamage(enemy, amount){
  const hasIce    = enemy.effects.some(e=>e.type==='ice');
  const hasFire   = enemy.effects.some(e=>e.type==='fire');
  const hasPoison = enemy.effects.some(e=>e.type==='poison');
  const mult = (hasIce && hasFire && hasPoison) ? 2 : 1;
  enemy.hp -= amount * mult;
}

// kleine Zufalls-Offsets, um Stack-Abläufe zu entkoppeln
function jitter(base, frac){ const s=base*frac; return base + (Math.random()*2-1)*s; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

// Stacks erzeugen (mit Jitter)
function makeFireStackFromLevel(level){
  const U = CONFIG.tower.upgrades.fire;
  const pow  = Math.max(0, level-1);
  const dmg  = U.baseDmg * Math.pow(U.dmgPerLevelMul,   pow);
  const tick = Math.max(MIN_TICK, U.baseTick * Math.pow(U.tickPerLevelMul, pow));
  const dur  = U.duration;
  const t0    = clamp(jitter(tick*0.7, 0.35), MIN_TICK*0.5, tick);
  const time0 = clamp(jitter(dur, Math.min(0.25, (tick/dur)*0.5)), 0.2, dur*1.15);
  return { type:'fire', time:time0, duration:dur, dmg, tick, t:t0 };
}
function makePoisonStackFromLevel(level){
  const U = CONFIG.tower.upgrades.poison;
  const pow  = Math.max(0, level-1);
  const dmg  = U.baseDmg * Math.pow(U.dmgPerLevelMul,   pow);
  const tick = Math.max(MIN_TICK, U.baseTick * Math.pow(U.tickPerLevelMul, pow));
  const dur  = U.duration;
  const t0    = clamp(jitter(tick*0.7, 0.35), MIN_TICK*0.5, tick);
  const time0 = clamp(jitter(dur, Math.min(0.25, (tick/dur)*0.5)), 0.2, dur*1.15);
  return { type:'poison', time:time0, duration:dur, dmg, tick, t:t0 };
}

// ältesten Stack 1:1 ersetzen (0..max Stacks)
function insertOrReplaceOldest(enemy, newStack, type, max){
  const idxs=[]; for(let i=0;i<enemy.effects.length;i++) if(enemy.effects[i].type===type) idxs.push(i);
  if(idxs.length<max){ enemy.effects.push(newStack); return; }
  let repl=idxs[0], minT=enemy.effects[idxs[0]].time;
  for(const i of idxs){ const t=enemy.effects[i].time; if(t<minT){ minT=t; repl=i; } }
  enemy.effects[repl]=newStack;
}

// Public: Stacks hinzufügen
export function addFireStack(enemy, level){ insertOrReplaceOldest(enemy, makeFireStackFromLevel(level), 'fire', MAX_FIRE_STACKS); }
export function addPoisonStack(enemy, level){ insertOrReplaceOldest(enemy, makePoisonStackFromLevel(level), 'poison', MAX_POISON_STACKS); }
export function addOrRefreshIce(enemy){
  const U = CONFIG.tower.upgrades.ice;
  let ice = enemy.effects.find(e=>e.type==='ice');
  if(!ice) enemy.effects.push({ type:'ice', time:U.duration, slowMult:U.slowMult });
  else { ice.time = Math.max(ice.time, U.duration); ice.slowMult = Math.min(ice.slowMult||1, U.slowMult); }
}

// *** NEU: Feuer-AoE nur beim Tod eines brennenden Gegners ***
export function triggerFireDeathExplosion(deadEnemy){
  const U = CONFIG.tower.upgrades.fire;
  const EX = U.explosion;

  // nur wenn er brannte
  const fireStacks = deadEnemy.effects.filter(e=>e.type==='fire');
  if(fireStacks.length===0) return;

  // Referenz-Stack: nimm den mit dem höchsten DoT-Schaden
  let ref = fireStacks[0];
  for(const s of fireStacks) if(s.dmg>ref.dmg) ref=s;

  const radius = EX.radius;
  const aoeDmg  = ref.dmg;
  const aoeTick = Math.max(MIN_TICK, ref.tick);
  const aoeDur  = Math.max(0.2, ref.duration*EX.durationMult);

  for(const other of state.enemies){
    if(other===deadEnemy || other.hp<=0) continue;
    if(Utils.dist(deadEnemy.pos, other.pos) <= radius){
      const t0    = clamp(jitter(aoeTick*0.7, 0.35), MIN_TICK*0.5, aoeTick);
      const time0 = clamp(jitter(aoeDur, Math.min(0.25, (aoeTick/aoeDur)*0.5)), 0.2, aoeDur*1.15);
      const stack = { type:'fire', time:time0, duration:aoeDur, dmg:aoeDmg*EX.dmgMult, tick:aoeTick, t:t0 };
      insertOrReplaceOldest(other, stack, 'fire', MAX_FIRE_STACKS);
    }
  }
  addExplosionRing(deadEnemy.pos.x, deadEnemy.pos.y, radius, 0.6);
}

// Effekte updaten (ohne Explosion bei Ablauf!)
export function updateEffects(enemy, dt){
  let i=0;
  while(i<enemy.effects.length){
    const ef = enemy.effects[i];

    if(ef.type==='fire' || ef.type==='poison'){
      ef.t -= dt;
      let ticks=0;
      while(ef.t<=0 && ticks<MAX_TICKS_PER_UPDATE){
        applyDamage(enemy, ef.dmg);
        ef.t += ef.tick;
        ticks++;
        if(enemy.hp<=0) break;
      }
      if(ticks===MAX_TICKS_PER_UPDATE && ef.t<=0){ ef.t = Math.min(ef.tick*0.5, ef.tick); }
    }

    ef.time -= dt;
    if(ef.time<=0){ enemy.effects.splice(i,1); continue; }
    i++;
  }
}
