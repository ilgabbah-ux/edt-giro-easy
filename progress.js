// EDT Giro Easy · v18
// Progressi salvati SOLO su questo dispositivo (localStorage): record, missioni,
// esperienza, livree sbloccate e "Classifica del bar". Nessun server.

const KEY = 'edt-giro-easy-v15';

// Percorsi: ognuno ha la sua sequenza di tratti (t: 0 sottobosco, 1 pozzanghere, 2 salitone, 3 mulattiera;
// climb = in salita, down = in discesa). "unlock" = livello pilota che lo sblocca. "random" = tracciato generato.
export const MODES = [
  { id: 0, short: 'EASY', name: 'Giro easy', desc: 'Per prendere confidenza. Forse.', difficulty: 0, sky: 0, limit: 70, unlock: 1,
    layout: [{ t: 0, len: 7.5 }, { t: 0, len: 4.5, down: 1 }, { t: 1, len: 7.5 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 1.5 }, { t: 2, len: 17 }, { t: 3, len: 17 }] },
  { id: 1, short: 'MIGLIORA', name: 'Dopo migliora!', desc: 'Due salitoni, due mulattiere. Più fango.', difficulty: 1, sky: 1, limit: 66, unlock: 1,
    layout: [{ t: 0, len: 6 }, { t: 1, len: 4, down: 1 }, { t: 1, len: 6 }, { t: 2, len: 10 }, { t: 3, len: 8 }, { t: 2, len: 8 }, { t: 3, len: 10 }, { t: 0, len: 4, down: 1 }, { t: 0, len: 4 }] },
  { id: 2, short: 'ANGELO', name: 'Il taglio di Angelo', desc: 'La scorciatoia era una mulattiera in salita.', difficulty: 2, sky: 2, limit: 63, unlock: 1,
    layout: [{ t: 0, len: 4 }, { t: 3, len: 10 }, { t: 2, len: 8 }, { t: 3, len: 10, climb: 1 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 5 }, { t: 3, len: 10 }, { t: 2, len: 8 }] },
  { id: 3, short: 'SFIDA', name: 'Sfida del giorno', desc: 'Tracciato nuovo ogni giorno, uguale per tutti.', difficulty: 1, sky: 3, limit: 66, unlock: 1, random: 'daily' },
  { id: 4, short: 'ASSIETTA', name: 'Il muro dell’Assietta', desc: 'Tre salitoni uno dopo l’altro. Gas!', difficulty: 1, sky: 0, limit: 68, unlock: 2,
    layout: [{ t: 0, len: 5 }, { t: 2, len: 12 }, { t: 3, len: 6 }, { t: 2, len: 14 }, { t: 0, len: 5, down: 1 }, { t: 2, len: 12 }, { t: 3, len: 6 }] },
  { id: 5, short: 'PANTANO', name: 'Il pantano', desc: 'Discese, pozze e fango fino al casco.', difficulty: 1, sky: 3, limit: 66, unlock: 3,
    layout: [{ t: 0, len: 4 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 10 }, { t: 0, len: 5 }, { t: 1, len: 6, down: 1 }, { t: 1, len: 10 }, { t: 2, len: 8 }, { t: 1, len: 6, down: 1 }, { t: 1, len: 6 }] },
  { id: 6, short: 'MULATTIERA', name: 'Mulattiera infinita', desc: 'Sassi, capre e frane dall’inizio alla fine.', difficulty: 2, sky: 1, limit: 64, unlock: 4,
    layout: [{ t: 0, len: 4 }, { t: 3, len: 12 }, { t: 3, len: 12, climb: 1 }, { t: 3, len: 6, down: 1 }, { t: 3, len: 12 }, { t: 3, len: 14, climb: 1 }] },
  { id: 7, short: 'A CASO', name: 'Giro a caso', desc: 'Ogni giro un tracciato diverso.', difficulty: 1, sky: 0, limit: 66, unlock: 5, random: 'run' },
  { id: 8, short: 'MORTE', name: 'Il giro della morte (easy)', desc: 'Tutto, tutto in salita, tutto insieme.', difficulty: 2, sky: 2, limit: 62, unlock: 6,
    layout: [{ t: 0, len: 4, down: 1 }, { t: 1, len: 6 }, { t: 2, len: 10 }, { t: 3, len: 10, climb: 1 }, { t: 1, len: 5, down: 1 }, { t: 2, len: 10 }, { t: 3, len: 8, climb: 1 }, { t: 3, len: 7 }] },
];
export const isUnlocked = (m, level = levelInfo().level) => level >= (m.unlock || 1);

export const LIVERIES = [
  { id: 'edt', name: 'EDT Classica', level: 1, plastic: '#e93825', accent: '#fcd326', jersey: '#fcd326', pants: '#243138', helmet: '#eee8d8' },
  { id: 'arancio', name: 'Arancio Mattone', level: 2, plastic: '#ff6a13', accent: '#1d2b52', jersey: '#ff7a1f', pants: '#1d2b52', helmet: '#ff7a1f' },
  { id: 'svezia', name: 'Bianco Svezia', level: 3, plastic: '#f2f2ee', accent: '#1d5fd1', jersey: '#1d5fd1', pants: '#f2f2ee', helmet: '#f2f2ee' },
  { id: 'italia', name: 'Rosso Italia', level: 4, plastic: '#d01f2a', accent: '#f4f4f0', jersey: '#f4f4f0', pants: '#d01f2a', helmet: '#d01f2a' },
  { id: 'notte', name: 'Blu Notte', level: 5, plastic: '#1c2f86', accent: '#36d2ff', jersey: '#14204f', pants: '#0d132c', helmet: '#36d2ff' },
  { id: 'bosco', name: 'Verde Bosco', level: 6, plastic: '#2f9e44', accent: '#efe9d4', jersey: '#2f9e44', pants: '#202a20', helmet: '#efe9d4' },
  { id: 'fango', name: 'Fango Totale', level: 7, plastic: '#6f4e2f', accent: '#a07a4c', jersey: '#7b5a39', pants: '#4b3420', helmet: '#8a6a45' },
  { id: 'oro', name: 'Oro Leggenda', level: 9, plastic: '#d9a826', accent: '#111111', jersey: '#141414', pants: '#141414', helmet: '#e7b934' },
];

export const GRADES = ['Ruote pulite', 'Turista del sentiero', 'Sterratore', 'Fangoso', 'Manico', 'Capo-gita', 'Re della mulattiera', 'Domatore di salitoni', 'Leggenda EDT'];

// Missioni: "run" = in un solo giro, "total" = cumulative tra i giri.
const TEMPLATES = [
  { id: 'caps', kind: 'run', stat: 'caps', tiers: [40, 70, 100], xp: 120, text: n => `Raccogli ${n} birre in un giro` },
  { id: 'jumps', kind: 'run', stat: 'jumps', tiers: [6, 10, 14], xp: 140, text: n => `Supera ${n} ostacoli saltando` },
  { id: 'perfect', kind: 'run', stat: 'perfect', tiers: [2, 4, 6], xp: 160, text: n => `Fai ${n} salti perfetti` },
  { id: 'scrub', kind: 'run', stat: 'scrubs', tiers: [2, 4, 7], xp: 140, text: n => `Fai ${n} scrub (sterza mentre sei in volo)` },
  { id: 'near', kind: 'run', stat: 'near', tiers: [3, 5, 8], xp: 130, text: n => `Passa "per un pelo" ${n} volte` },
  { id: 'combo', kind: 'run', stat: 'maxMult', tiers: [3, 4, 4], xp: 150, text: n => `Arriva alla combo ×${n}` },
  { id: 'clean', kind: 'run', stat: 'clean', tiers: [1, 1, 1], xp: 200, text: () => 'Arriva al rifugio senza perdere moto' },
  { id: 'dry', kind: 'run', stat: 'dry', tiers: [1, 1, 1], xp: 150, text: () => 'Arriva al rifugio senza finire in pozzanghera' },
  { id: 'turbo', kind: 'run', stat: 'turbos', tiers: [1, 2, 3], xp: 120, text: n => n === 1 ? 'Usa il turbo' : `Usa il turbo ${n} volte in un giro` },
  { id: 'score', kind: 'run', stat: 'score', tiers: [8000, 15000, 25000], xp: 180, text: n => `Fai ${n.toLocaleString('it-IT')} punti in un giro` },
  { id: 'air', kind: 'run', stat: 'airCaps', tiers: [3, 6, 9], xp: 150, text: n => `Prendi ${n} birre al volo` },
  { id: 'angelo', kind: 'run', stat: 'angeloFinish', tiers: [1, 1, 1], xp: 250, text: () => 'Arriva al rifugio sul Taglio di Angelo' },
  { id: 'daily', kind: 'run', stat: 'dailyFinish', tiers: [1, 1, 1], xp: 220, text: () => 'Completa la Sfida del giorno' },
  { id: 'margin', kind: 'run', stat: 'timeLeft', tiers: [4, 7, 10], xp: 170, text: n => `Arriva al rifugio con ${n} secondi di margine` },
  { id: 'wheelie', kind: 'run', stat: 'wheelieMax', tiers: [1.5, 2.5, 3], xp: 150, text: n => `Fai un'impennata di ${String(n).replace('.', ',')} secondi` },
  { id: 'grappa', kind: 'run', stat: 'grappas', tiers: [1, 1, 2], xp: 130, text: n => n === 1 ? 'Prendi una grappa' : `Prendi ${n} grappe in un giro` },
  { id: 'ramps', kind: 'run', stat: 'ramps', tiers: [1, 3, 5], xp: 140, text: n => n === 1 ? 'Vola da una rampa' : `Vola da ${n} rampe in un giro` },
  { id: 'sectors', kind: 'run', stat: 'cleanSectors', tiers: [2, 4, 6], xp: 160, text: n => `Chiudi ${n} settori puliti (senza errori) in un giro` },
  { id: 'capsTotal', kind: 'total', stat: 'caps', tiers: [150, 350, 700], xp: 200, text: n => `Raccogli ${n} birre in totale` },
  { id: 'runsTotal', kind: 'total', stat: 'runs', tiers: [5, 12, 25], xp: 180, text: n => `Fai ${n} giri in totale` },
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const data = Object.assign({
  xp: 0,
  livery: 'edt',
  rider: 'Il Gabbah',
  mode: 0,
  best: {},          // record per percorso: { '0': 4200, 'd20261007': 3900 }
  board: {},         // classifiche: { '0': [{name,score,date}] }
  missions: [],      // [{id, target, progress}]
  missionsDone: 0,
  totals: { runs: 0, caps: 0, jumps: 0 },
  sound: true,
  beers: 0,          // birre in cassa, da spendere in officina
  upgrades: {},      // livello di ogni potenziamento
  boosts: {},        // premi del rifugio da usare nel prossimo giro
}, load() || {});
data.upgrades ||= {}; data.boosts ||= {}; data.beers ||= 0;

// ---------- Officina: potenziamenti permanenti di moto e pilota ----------
export const UPGRADES = [
  { id: 'engine', group: 'MOTO', icon: '⚙️', name: 'Motore', desc: 'Più velocità: arrivi prima al rifugio.', per: '+2,5% velocità' },
  { id: 'susp', group: 'MOTO', icon: '🪝', name: 'Sospensioni', desc: 'Salti più alti e più lunghi.', per: '+5% salto' },
  { id: 'tank', group: 'MOTO', icon: '⛽', name: 'Serbatoio turbo', desc: 'Il turbo dura di più e si carica prima.', per: '+0,4 s turbo' },
  { id: 'tyres', group: 'MOTO', icon: '🛞', name: 'Gomme tassellate', desc: 'Sterzo più rapido, meno impantanamenti.', per: '+8% sterzo' },
  { id: 'helmet', group: 'PILOTA', icon: '⛑', name: 'Casco rinforzato', desc: 'Moto extra al livello 2 e 4, più tempo invincibile dopo un urto.', per: '+0,25 s protezione' },
  { id: 'nose', group: 'PILOTA', icon: '👃', name: 'Fiuto per la birra', desc: 'Prendi birre più lontane, il vino dura di più.', per: '+1 s vino' },
  { id: 'balance', group: 'PILOTA', icon: '🤠', name: 'Equilibrio', desc: 'Impennate più lunghe e più pagate.', per: '+0,5 s impennata' },
  { id: 'grit', group: 'PILOTA', icon: '🔥', name: 'Grinta', desc: 'La combo resiste più a lungo.', per: '+0,5 s combo' },
];
export const MAX_UPGRADE = 5;
const COSTS = [30, 60, 100, 160, 240];
export function upgradeLevel(id) { return Math.min(MAX_UPGRADE, data.upgrades[id] || 0); }
export function upgradeCost(id) { const l = upgradeLevel(id); return l >= MAX_UPGRADE ? null : COSTS[l]; }
export function buyUpgrade(id) {
  const cost = upgradeCost(id);
  if (cost == null || data.beers < cost) return false;
  data.beers -= cost; data.upgrades[id] = upgradeLevel(id) + 1; save(); return true;
}

// ---------- Premi del rifugio (validi per il giro successivo) ----------
export const PRIZES = [
  { id: 'beers', icon: '🍺', name: 'Cassa di birre', desc: 'birre extra in cassa per l’officina' },
  { id: 'turbo', icon: '⚡', name: 'Pieno di turbo', desc: 'parti con il turbo già carico' },
  { id: 'helmet', icon: '⛑', name: 'Casco di scorta', desc: 'parti con una moto in più' },
  { id: 'grappa', icon: '🔥', name: 'Grappa del rifugista', desc: 'parti con 6 secondi di grappa' },
  { id: 'wine', icon: '🍷', name: 'Bottiglia di rosso', desc: 'parti con 7 secondi di vino' },
];
export function takeBoosts() { const b = data.boosts; data.boosts = {}; save(); return b; }
export function pendingBoosts() { return Object.keys(data.boosts).filter(k => data.boosts[k]); }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export const profile = data;

// ---------- Livelli ----------
export function levelInfo(xp = data.xp) {
  let level = 1, need = 300, floor = 0;
  while (xp >= floor + need) { floor += need; level++; need = 300 * level; }
  const grade = GRADES[Math.min(GRADES.length - 1, level - 1)] + (level > GRADES.length ? ' +' + (level - GRADES.length) : '');
  return { level, grade, into: xp - floor, need, pct: (xp - floor) / need };
}

export function unlockedLiveries(level = levelInfo().level) {
  return LIVERIES.filter(l => l.level <= level);
}
export function currentLivery() {
  const lv = LIVERIES.find(l => l.id === data.livery);
  return lv && lv.level <= levelInfo().level ? lv : LIVERIES[0];
}

// ---------- Sfida del giorno ----------
export function todayKey(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
export function todayLabel(d = new Date()) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}
export function boardKey(mode) {
  return mode === 3 ? 'd' + todayKey() : String(mode);
}

// ---------- Record e classifica ----------
export function bestFor(mode) {
  return data.best[boardKey(mode)] || 0;
}
export function boardFor(mode) {
  return data.board[boardKey(mode)] || [];
}

// ---------- Missioni ----------
function tierIndex() {
  return Math.min(2, Math.floor((levelInfo().level - 1) / 3));
}
function newMission(exclude) {
  const pool = TEMPLATES.filter(t => !exclude.includes(t.id));
  const t = pool[Math.floor(Math.random() * pool.length)];
  const target = t.tiers[tierIndex()];
  const base = t.kind === 'total' ? (data.totals[t.stat] || 0) : 0;
  return { id: t.id, target, base };
}
export function ensureMissions() {
  data.missions = (data.missions || []).filter(m => TEMPLATES.some(t => t.id === m.id));
  while (data.missions.length < 3) data.missions.push(newMission(data.missions.map(m => m.id)));
  save();
  return data.missions;
}
export function missionText(m) {
  const t = TEMPLATES.find(x => x.id === m.id);
  return t ? t.text(m.target) : '';
}
function missionValue(m, run) {
  const t = TEMPLATES.find(x => x.id === m.id);
  if (!t) return 0;
  if (t.kind === 'total') return (data.totals[t.stat] || 0) - (m.base || 0);
  return run ? (run[t.stat] || 0) : 0;
}
export function missionProgress(m, run = null) {
  return Math.min(m.target, missionValue(m, run));
}
export function missionXp(m) {
  return TEMPLATES.find(x => x.id === m.id)?.xp || 100;
}

// Chiude un giro: aggiorna totali, missioni, record, classifica ed esperienza.
export function recordRun(run) {
  const before = levelInfo();
  data.totals.runs = (data.totals.runs || 0) + 1;
  data.totals.caps = (data.totals.caps || 0) + run.caps;
  data.totals.jumps = (data.totals.jumps || 0) + run.jumps;

  const completed = [];
  for (const m of data.missions) {
    if (missionValue(m, run) >= m.target) completed.push({ text: missionText(m), xp: missionXp(m), id: m.id });
  }
  data.missions = data.missions.filter(m => !completed.some(c => c.id === m.id));
  data.missionsDone += completed.length;

  const key = boardKey(run.mode);
  const previousBest = data.best[key] || 0;
  const isRecord = run.score > previousBest;
  if (isRecord) data.best[key] = run.score;

  // Le classifiche delle sfide dei giorni passati non servono più.
  for (const k of Object.keys(data.board)) if (k.startsWith('d') && k !== 'd' + todayKey()) delete data.board[k];
  for (const k of Object.keys(data.best)) if (k.startsWith('d') && k !== 'd' + todayKey()) delete data.best[k];
  const board = data.board[key] || [];
  const entry = { name: run.rider, score: run.score, date: todayLabel(), t: Date.now() };
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  data.board[key] = board.slice(0, 10);
  const position = data.board[key].indexOf(entry) + 1;

  // Birre portate al rifugio: quelle raccolte + bonus arrivo + bonus missioni.
  const finished = run.score > 0 && (run.angeloFinish || run.dailyFinish || run.finishTime > 0);
  const beersEarned = run.caps + (finished ? 20 : 0) + completed.length * 10;
  data.beers += beersEarned;
  // Premio del rifugio: solo a chi arriva.
  let prize = null;
  if (finished) {
    const p = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    prize = { ...p };
    if (p.id === 'beers') { prize.amount = 25 + Math.floor(Math.random() * 6) * 5; data.beers += prize.amount; }
    else data.boosts[p.id] = true;
  }
  const scoreXp = Math.min(250, Math.floor(run.score / 150));
  const missionsXp = completed.reduce((s, c) => s + c.xp, 0);
  data.xp += scoreXp + missionsXp;
  const after = levelInfo();
  const unlocked = LIVERIES.filter(l => l.level > before.level && l.level <= after.level);

  ensureMissions();
  save();
  return { completed, isRecord, previousBest, scoreXp, missionsXp, before, after, unlocked, position, beersEarned, prize, wallet: data.beers };
}
