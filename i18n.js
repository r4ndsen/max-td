// Simple i18n for vanilla JS app
import en from './locales/en.js';
import de from './locales/de.js';
const dictionaries = { en, de };

let currentLang = (localStorage.getItem('lang') || document.documentElement.lang || 'de').slice(0,2);
if(!dictionaries[currentLang]) currentLang = 'de';

const listeners = new Set();

export function t(key, vars){
  const dict = dictionaries[currentLang] || {};
  let s = dict[key] || key;
  if(vars){
    for(const [k,v] of Object.entries(vars)){
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function setLanguage(lang){
  if(!dictionaries[lang]) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
  listeners.forEach(fn=>fn(lang));
}

export function getLanguage(){ return currentLang; }

export function onLanguageChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

export function initI18n(){
  // Wire selector if present
  const sel = document.getElementById('langSelect');
  const label = document.getElementById('langLabel');
  if(label) label.textContent = t('lang.label');
  if(sel){
    sel.innerHTML = `
      <option value="de">Deutsch</option>
      <option value="en">English</option>
    `;
    sel.value = currentLang;
    sel.onchange = ()=> setLanguage(sel.value);
  }
  applyStaticTranslations();
}

export function applyStaticTranslations(){
  const hdrTitle = document.querySelector('header strong');
  if(hdrTitle) hdrTitle.textContent = t('header.title');
  const hdrSub = document.querySelector('header .sub');
  if(hdrSub) hdrSub.innerHTML = `${t('header.sub')}`;

  const lblControls = document.getElementById('lblControls');
  if(lblControls) lblControls.textContent = t('aside.controls');

  const btnStart = document.getElementById('btnStart');
  if(btnStart) btnStart.textContent = `▶️ ${t('btn.nextWave')}`;

  const btnBuild = document.getElementById('btnBuild');
  const costBuildEl = document.getElementById('costBuild');
  if(btnBuild){
    const cost = costBuildEl ? costBuildEl.textContent : '';
    btnBuild.innerHTML = `🏗️ ${t('btn.buildTower')} <span class=\"pill\" id=\"costBuild\">${cost}</span>`;
  }
  const btnCancel = document.getElementById('btnCancel');
  if(btnCancel) btnCancel.title = t('btn.cancel.title');

  const btnDebug = document.getElementById('btnDebug');
  if(btnDebug) btnDebug.textContent = `🐞 ${t('btn.debugFree')}`;

  const btnRepair = document.getElementById('btnRepair');
  const costRepairEl = document.getElementById('costRepair');
  if(btnRepair){
    const cost = costRepairEl ? costRepairEl.textContent : '';
    btnRepair.innerHTML = `🛠️ ${t('btn.repair')} <span class=\"pill\" id=\"costRepair\">${cost}</span>`;
  }
  const btnMaxHp = document.getElementById('btnMaxHp');
  const costMaxHpEl = document.getElementById('costMaxHp');
  if(btnMaxHp){
    const cost = costMaxHpEl ? costMaxHpEl.textContent : '';
    btnMaxHp.innerHTML = `🧱 ${t('btn.maxHp')} <span class=\"pill\" id=\"costMaxHp\">${cost}</span>`;
  }

  // Dev tools
  const devTitle = document.getElementById('devTitle');
  if(devTitle) devTitle.textContent = t('dev.title');
  const btnDevWave = document.getElementById('btnDevWave');
  if(btnDevWave) btnDevWave.textContent = `🧪 ${t('dev.testWave')}`;
  const btnDevSpawn = document.getElementById('btnDevSpawn');
  if(btnDevSpawn) btnDevSpawn.textContent = `👾 ${t('dev.spawnOne')}`;

  // Help box
  const helpEnter = document.getElementById('helpEnter');
  const helpBuild = document.getElementById('helpBuild');
  const helpUp = document.getElementById('helpUp');
  const helpPause = document.getElementById('helpPause');
  if(helpEnter) helpEnter.innerHTML = `<span class=\"kbd\">Enter</span> ${t('help.enter')}`;
  if(helpBuild) helpBuild.innerHTML = `<span class=\"kbd\">B</span> ${t('help.build')}`;
  if(helpUp) helpUp.innerHTML = `<span class=\"kbd\">U</span> ${t('help.upgrade')}`;
  if(helpPause) helpPause.innerHTML = `<span class=\"kbd\">P</span> ${t('help.pause')}`;

  // No tower notice placeholder (content is set from ui.js when no selection)
}

export const i18n = { t, setLanguage, getLanguage, initI18n, onLanguageChange };
