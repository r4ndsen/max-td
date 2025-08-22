// cost.js
import { CONFIG } from './config.js';
export const buildCost  = (state)=> state.debugFree?0:CONFIG.tower.cost;
export const repairCost = (state)=> state.debugFree?0:CONFIG.economy.repairCost;
export const maxHpCost  = (state)=> state.debugFree?0:CONFIG.economy.maxHpCost;
