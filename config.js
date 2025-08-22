// config.js
export const CONFIG = {
  pathPoints: [ {x:-40,y:100},{x:300,y:100},{x:300,y:500},{x:600,y:500},{x:600,y:100},{x:940,y:100} ],
  pathBuffer: 40,
  tower: {
    cost: 50, range: 120, damage: 20, fireCooldown: 0.7, projectileSpeed: 420,
    maxLevelPerTrack: 5,
    upgrades: {
      dmg:{ baseCost:40, scaling:1.35, addPerLevel:10 },
      rng:{ baseCost:35, scaling:1.30, addPerLevel:10 },
      spd:{ baseCost:45, scaling:1.32, multPerLevel:0.90 },

      // Krit: +5% Chance/Level, Mult startet 1.5x und +0.1/Level
      crit:{
        baseCost:55, scaling:1.28,
        addChancePerLevel:0.05, maxChance:0.5,
        multBase:1.5, multPerLevelAdd:0.1
      },

      // Eis bleibt „einmal kaufbar“
      ice:{ cost:80, slowMult:0.6, duration:2.5 },

      // DoTs (L1–L5), max 3 Stacks
      fire:{
        baseCost:90, scaling:1.35,
        baseDmg:5, duration:4.0, baseTick:1.0,
        dmgPerLevelMul:1.25, tickPerLevelMul:0.9,
        maxLevel:5, maxStacks:3,
        explosion:{ radius:140, dmgMult:0.6, durationMult:0.6 } // AoE (nur noch bei Tod)
      },
      poison:{
        baseCost:85, scaling:1.35,
        baseDmg:4, duration:5.0, baseTick:1.0,
        dmgPerLevelMul:1.20, tickPerLevelMul:0.9,
        maxLevel:5, maxStacks:3
      },
    }
  },
  enemy:{ baseHp:50, baseSpeed:70, baseReward:10, baseDamage:5, hpGrowth:1.28, rewardGrowth:1.18, damageGrowth:1.22, speedGrowth:1.03 },
  economy:{ repairChunk:10, repairCost:20, maxHpChunk:20, maxHpCost:60 },
};
