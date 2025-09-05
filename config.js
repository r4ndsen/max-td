// config.js
export const CONFIG = {
  pathPoints: [ {x:-40,y:100},{x:300,y:100},{x:300,y:500},{x:600,y:500},{x:600,y:100},{x:940,y:100} ],
  pathBuffer: 60,
  tower: {
    cost: 50, range: 120, damage: 20, fireCooldown: 0.7, projectileSpeed: 420,
    maxLevelPerTrack: 5,
    upgrades: {
      dmg:{ baseCost:40, scaling:1.35, addPerLevel:10 },
      rng:{ baseCost:35, scaling:1.30, addPerLevel:10 },
      spd:{ baseCost:45, scaling:1.32, multPerLevel:0.90 },

      // Krit: +5% Chance/Level; Mult startet 1.5 und +0.1/Level (Chance capped)
      crit:{ baseCost:55, scaling:1.28, addChancePerLevel:0.05, maxChance:0.5, multBase:1.5, multPerLevelAdd:0.1 },

      // Elemente / Spezialisierungen (exklusiv pro Turm)
      ice:{ cost:80, slowMult:0.6, duration:2.5, nova:{ radius:120, durationMult:0.6, ttl:0.6 } },

      fire:{
        baseCost:90, scaling:1.35,
        baseDmg:5, duration:4.0, baseTick:1.0,
        dmgPerLevelMul:1.25, tickPerLevelMul:0.9,
        maxLevel:5, maxStacks:3,
        explosion:{ radius:140, dmgMult:0.6, durationMult:0.6 } // AoE nur beim Tod
      },
      poison:{
        baseCost:85, scaling:1.35,
        baseDmg:6, duration:5.0, baseTick:0.75,
        dmgPerLevelMul:1.30, tickPerLevelMul:0.9,
        maxLevel:5, maxStacks:3,
        nova:{ radius:120, durationMult:0.6, ttl:0.6 }
      },
      // 📿 Curse-Upgrade (Fluch): verstärkt erlittenen Schaden anderer Türme
      curse:{
        baseCost:95, scaling:1.5, maxLevel:5,
        duration:10.0,
        ampBase:0.20,           // +20% bei L1
        ampPerLevel:0.1         // +10% je weiterem Level
      },

      // 💣 Bomben-Upgrade (AoE statt Pfeil, langsameres Feuern, Radius skaliert mit Level)
      bomb:{
        baseCost:100, scaling:1.34, maxLevel:5,
        cooldownMult:1.6,           // langsamer als Standard
        projectileSpeed:360,
        radiusBaseFactor: 2/3,      // Basisradius = 2/3 von fire.explosion.radius
        radiusPerLevel: 12          // +12 pro Bomben-Level
      },
      // 🎯 Sniper-Upgrade (starker Einzelschuss, langsamere Feuerrate, mehr Reichweite)
      sniper:{
        baseCost:120, scaling:1.36, maxLevel:3,
        cooldownMult:1.9,               // deutlich langsamer
        damageMultBase:2.5, damageMultPerLevel:0.25,
        rangeAddBase:120, rangePerLevel:20,
        projectileSpeed:1200
      },
      // ⚡ Lightning-Upgrade: Kettenblitz auf mehrere Ziele
      lightning:{
        baseCost:110, scaling:1.36, maxLevel:5,
        chainBase:3,          // Start: bis zu 3 Ziele
        chainPerLevel:1,      // +1 Ziel pro Level
        chainRadius:180       // max Distanz vom letzten getroffenen Ziel
      },
      // 🔸 Gatling-Upgrade: sehr schnelle Feuerrate, geringerer Einzelschaden
      gatling:{
        baseCost:105, scaling:1.34, maxLevel:5,
        cooldownBase:0.6,          // Basis: 40% schnellere Feuerrate
        cooldownPerLevel:0.9,      // +10% schneller pro Level
        damageMultBase:0.75,       // pro Schuss geringerer Schaden
        damageMultPerLevel:0.05    // +5% Schaden pro Level
      },
    }
  },
  enemy:{ baseHp:50, baseSpeed:70, baseReward:10, baseDamage:5, hpGrowth:1.28, rewardGrowth:1.18, damageGrowth:1.22, speedGrowth:1.03 },
  economy:{ repairChunk:10, repairCost:20, maxHpChunk:20, maxHpCost:60 },
};
