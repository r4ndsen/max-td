// cost.js
import { CONFIG } from './config.js';
import { state } from './state.js';

export function buildCost(s=state){
  return s.debugFree ? 0 : CONFIG.tower.cost;
}
export function repairCost(s=state){
  return s.debugFree? 0 : CONFIG.economy.repairCost;
}
export function maxHpCost(s=state){
  return s.debugFree? 0 : CONFIG.economy.maxHpCost;
}
