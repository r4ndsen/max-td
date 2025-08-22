// state.js
export const state = {
  gold: 200,
  wave: 0,
  enemies: [],
  towers: [],
  projectiles: [],
  vfx: [],
  buildMode: false,
  paused: false,
  selectedTower: null,
  castle: { x: 860, y: 100, hp: 100, maxHp: 100 },
  timers: { spawn: 0 },
  spawning: false, spawnLeft: 0, spawnInterval: 0.7,
  debugFree: false,

  // NEU: Dev-Flags
  dev: {
    speed: 1,           // 1, 2, 4
    showHit: false,     // Hitboxen & Pfad-Puffer
    showOverlay: false, // DoT/Tick-Overlay
  },
};
