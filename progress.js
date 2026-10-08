// EDT Giro Easy · v18
// Progressi salvati SOLO su questo dispositivo (localStorage): record, missioni,
// esperienza, livree sbloccate e "Classifica del bar". Nessun server.

const KEY = 'edt-giro-easy-v15';

// Percorsi: ognuno ha la sua sequenza di tratti (t: 0 sottobosco, 1 pozzanghere, 2 salitone, 3 mulattiera;
// climb = in salita, down = in discesa). "unlock" = livello pilota che lo sblocca. "random" = tracciato generato.
export const MODES = [
  { id: 0, short: 'EASY', name: 'Giro easy', desc: 'Per prendere confidenza. Forse.', difficulty: 0, sky: 0, limit: 58, unlock: 1,
    layout: [{ t: 0, len: 7.5 }, { t: 0, len: 4.5, down: 1 }, { t: 1, len: 7.5 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 1.5 }, { t: 2, len: 17 }, { t: 3, len: 17 }] },
  { id: 1, short: 'MIGLIORA', name: 'Dopo migliora!', desc: 'Due salitoni, due mulattiere. Più fango.', difficulty: 1, sky: 1, limit: 55, unlock: 1,
    layout: [{ t: 0, len: 6 }, { t: 1, len: 4, down: 1 }, { t: 1, len: 6 }, { t: 2, len: 10 }, { t: 3, len: 8 }, { t: 2, len: 8 }, { t: 3, len: 10 }, { t: 0, len: 4, down: 1 }, { t: 0, len: 4 }] },
  { id: 2, short: 'ANGELO', name: 'Il taglio di Angelo', desc: 'La scorciatoia era una mulattiera in salita.', difficulty: 2, sky: 2, limit: 58, unlock: 1,
    layout: [{ t: 0, len: 4 }, { t: 3, len: 10 }, { t: 2, len: 8 }, { t: 3, len: 10, climb: 1 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 5 }, { t: 3, len: 10 }, { t: 2, len: 8 }] },
  { id: 3, short: 'SFIDA', name: 'Sfida del giorno', desc: 'Tracciato nuovo ogni giorno, uguale per tutti.', difficulty: 1, sky: 3, limit: 58, unlock: 1, random: 'daily' },
  { id: 4, short: 'ASSIETTA', name: 'Il muro dell’Assietta', desc: 'Tre salitoni uno dopo l’altro. Gas!', difficulty: 1, sky: 0, limit: 56, unlock: 2,
    layout: [{ t: 0, len: 5 }, { t: 2, len: 12 }, { t: 3, len: 6 }, { t: 2, len: 14 }, { t: 0, len: 5, down: 1 }, { t: 2, len: 12 }, { t: 3, len: 6 }] },
  { id: 5, short: 'PANTANO', name: 'Il pantano', desc: 'Discese, pozze e fango fino al casco.', difficulty: 1, sky: 3, limit: 54, unlock: 2,
    layout: [{ t: 0, len: 4 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 10 }, { t: 0, len: 5 }, { t: 1, len: 6, down: 1 }, { t: 1, len: 10 }, { t: 2, len: 8 }, { t: 1, len: 6, down: 1 }, { t: 1, len: 6 }] },
  { id: 6, short: 'MULATTIERA', name: 'Mulattiera infinita', desc: 'Sassi, capre e frane dall’inizio alla fine.', difficulty: 2, sky: 1, limit: 61, unlock: 3,
    layout: [{ t: 0, len: 4 }, { t: 3, len: 12 }, { t: 3, len: 12, climb: 1 }, { t: 3, len: 6, down: 1 }, { t: 3, len: 12 }, { t: 3, len: 14, climb: 1 }] },
  { id: 7, short: 'A CASO', name: 'Giro a caso', desc: 'Ogni giro un tracciato diverso.', difficulty: 1, sky: 0, limit: 58, unlock: 3, random: 'run' },
  { id: 8, short: 'MORTE', name: 'Il giro della morte (easy)', desc: 'Tutto, tutto in salita, tutto insieme.', difficulty: 2, sky: 2, limit: 55, unlock: 4,
    layout: [{ t: 0, len: 4, down: 1 }, { t: 1, len: 6 }, { t: 2, len: 10 }, { t: 3, len: 10, climb: 1 }, { t: 1, len: 5, down: 1 }, { t: 2, len: 10 }, { t: 3, len: 8, climb: 1 }, { t: 3, len: 7 }] },
  // v46 · Ice Scrofy: pista di ghiaccio, gomme chiodate. Vince chi derapa di più e meglio (la classifica è a punti derapata).
  { id: 9, short: 'ICE', name: 'Ice Scrofy', desc: 'Pista di ghiaccio, gomme chiodate. Vince chi derapa di più e meglio.', difficulty: 0, sky: 4, limit: 74, unlock: 1, ice: true,
    layout: [{ t: 0, len: 6, name: 'RETTILINEO GHIACCIATO' }, { t: 0, len: 10, name: 'CURVONI DI SCROPHY' }, { t: 0, len: 6, down: 1, name: 'DISCESA SUL VETRO' }, { t: 0, len: 10, name: 'ESSE DEL LAGO' }, { t: 2, len: 6, climb: .35, name: 'SALITA CHIODATA' }, { t: 0, len: 10, name: 'CURVONI DI SCROPHY' }, { t: 0, len: 6, down: 1, name: 'PICCHIATA FINALE' }] },
  // v46 · tre percorsi nuovi che si sbloccano più avanti
  { id: 10, short: 'FOGNA', name: 'MotoFogna', desc: 'Bagnatissimo e pieno di pezzi hard e rocce. Solo per manici veri.', difficulty: 2, sky: 5, limit: 52, unlock: 4, rainy: true, dense: .25,
    obs: { 0: ['rock', 'rock', 'root', 'log', 'stump'], 1: ['puddle', 'rock', 'puddle', 'step', 'rock'], 2: ['step', 'rock', 'rock', 'step'], 3: ['rock', 'step', 'rock', 'root'] },
    layout: [{ t: 1, len: 5, name: 'IMBOCCO DELLA FOGNA' }, { t: 3, len: 9, wet: 1, name: 'PIETRAIA BAGNATA' }, { t: 1, len: 6, down: 1, name: 'IL CANALE' }, { t: 2, len: 9, wet: 1, name: 'GRADONI VISCIDI' }, { t: 3, len: 10, wet: 1, climb: 1, name: 'IL SIFONE' }, { t: 1, len: 6, name: 'LIQUAME' }, { t: 3, len: 9, wet: 1, name: 'ROCCE HARD' }] },
  { id: 11, short: 'ARGENTERA', name: 'Valle Argentera', desc: 'Guadi da saltare e animali selvatici che attraversano: stambecchi, camosci, marmotte.', difficulty: 1, sky: 0, limit: 57, unlock: 5, wild: true,
    obs: { 0: ['log', 'rock', 'stump', 'marmot'], 1: ['puddle', 'rock', 'marmot'], 2: ['rock', 'cairn', 'marmot', 'step'], 3: ['rock', 'goat', 'step', 'marmot'] },
    layout: [{ t: 0, len: 6, name: 'FONDOVALLE' }, { t: 1, len: 8, name: 'GUADI DELLA STURA' }, { t: 2, len: 10, name: 'PASCOLI DEGLI STAMBECCHI' }, { t: 1, len: 6, down: 1, name: 'IL GUADO GRANDE' }, { t: 3, len: 10, climb: 1, name: 'VERSO IL COLLE' }, { t: 2, len: 6, down: 1, name: 'DISCESA DEI CAMOSCI' }] },
  { id: 12, short: 'MONTAFIGA', name: 'MontaFiga', desc: 'Uno slalom continuo tra gli alberi. Sterza, sterza, sterza.', difficulty: 1, sky: 1, limit: 55, unlock: 5, slalom: true,
    layout: [{ t: 0, len: 6, name: 'BOSCO FITTO' }, { t: 0, len: 10, name: 'SLALOM DEI FAGGI' }, { t: 0, len: 6, down: 1, name: 'PICCHIATA TRA GLI ABETI' }, { t: 0, len: 10, name: 'LA SELVA' }, { t: 2, len: 6, climb: .6, name: 'STRAPPO NEL BOSCO' }, { t: 0, len: 10, down: 1, name: 'SLALOM FINALE' }] },
];
export const isUnlocked = (m, level = levelInfo().level) => level >= (m.unlock || 1);

// v52 · livree goliardiche: colori + fantasia (pattern) su plastiche e maglia. icon = simbolo nella scheda del garage.
export const LIVERIES = [
  { id: 'edt', name: 'EDT Classica', icon: '🏁', level: 1, plastic: '#e93825', accent: '#fcd326', jersey: '#fcd326', pants: '#243138', helmet: '#eee8d8' },
  { id: 'birra', name: 'Bionda alla Spina', icon: '🍺', level: 1, plastic: '#f2b31b', accent: '#ffffff', jersey: '#f7c234', pants: '#5a3a12', helmet: '#fff8e6', pattern: 'bolle', ink: '#fff6d0' },
  { id: 'mucca', name: 'Mucca Pezzata', icon: '🐄', level: 2, plastic: '#f6f4ee', accent: '#ff8fb3', jersey: '#f6f4ee', pants: '#1a1a1a', helmet: '#f6f4ee', pattern: 'mucca', ink: '#141414', jerseyPattern: true },
  { id: 'vino', name: 'Vino della Casa', icon: '🍷', level: 3, plastic: '#7a1030', accent: '#e8c76a', jersey: '#8c1838', pants: '#2b0a14', helmet: '#e8c76a', pattern: 'righe', ink: '#a8203f' },
  { id: 'leopardo', name: 'Leopardo da Balera', icon: '🐆', level: 4, plastic: '#e8a838', accent: '#ff3fa4', jersey: '#ff3fa4', pants: '#121212', helmet: '#e8a838', pattern: 'leopardo', ink: '#2a1a0a', jerseyPattern: false },
  { id: 'camo', name: 'Mimetica da Bracconiere', icon: '🌲', level: 5, plastic: '#5d6b3a', accent: '#ff7a00', jersey: '#4f5d33', pants: '#3a3a28', helmet: '#ff7a00', pattern: 'camo', ink: '#2f3820', jerseyPattern: true },
  { id: 'nonna', name: 'Pantofola della Nonna', icon: '👵', level: 6, plastic: '#f3b6c8', accent: '#8a5a3a', jersey: '#f7d6df', pants: '#8a5a3a', helmet: '#f3b6c8', pattern: 'fiori', ink: '#ffffff', jerseyPattern: true },
  { id: 'fango', name: 'Fango d’Annata', icon: '💩', level: 7, plastic: '#7b5a39', accent: '#c9a26a', jersey: '#8a6a45', pants: '#4b3420', helmet: '#a07a4c', pattern: 'schizzi', ink: '#4a3220', jerseyPattern: true },
  { id: 'scacchi', name: 'Bandiera a Scacchi', icon: '🏴', level: 8, plastic: '#f4f4f0', accent: '#e93825', jersey: '#141414', pants: '#141414', helmet: '#f4f4f0', pattern: 'scacchi', ink: '#141414' },
  { id: 'oro', name: 'Oro Leggenda', icon: '🏆', level: 9, plastic: '#d9a826', accent: '#111111', jersey: '#141414', pants: '#141414', helmet: '#e7b934', pattern: 'righe', ink: '#f6d46a' },
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

// ---------- v44 · Moto nuove e accessori (officina) ----------
// stats: speed = velocità, jump = salto, steer = sterzo, turbo = carica del turbo, wheelie = secondi di impennata in più, climb = salite
export const BIKES = [
  { id: 'edt250', name: 'EDT 250 4T', price: 0, level: 1, icon: '🏍', desc: 'La moto di tutti i giorni. Equilibrata.', stats: {}, look: { scale: 1 } },
  { id: 'gp125', name: 'Due tempi 125', price: 140, level: 2, icon: '🐝', desc: 'Leggerissima: sterza al volo e salta di più. Un filo meno veloce.', stats: { speed: -.02, jump: .06, steer: .18 }, look: { scale: .93, twoStroke: true } },
  { id: 'trial', name: 'La Trial di Giacu', price: 260, level: 3, icon: '🦘', desc: 'Senza sella, nata per saltare: salti lunghi e impennate infinite. Più lenta.', stats: { speed: -.05, jump: .16, wheelie: 1.5, steer: .08 }, look: { scale: .96, trial: true } },
  { id: 'ts300', name: '300 Due tempi', price: 380, level: 4, icon: '🔥', desc: 'Cattiva: più spunto e il turbo si carica prima.', stats: { speed: .04, turbo: .25 }, look: { scale: 1.01, twoStroke: true } },
  { id: 'mulo450', name: '450 Mulo', price: 520, level: 5, icon: '🐂', desc: 'Tanta coppia: vola in salita e sul veloce, ma è pesante da sterzare.', stats: { speed: .06, climb: .5, steer: -.1 }, look: { scale: 1.05, big: true } },
  { id: 'vintage', name: 'Vecchia gloria ’89', price: 700, level: 6, icon: '🏆', desc: 'Doppio ammortizzatore e faro tondo. Un po’ di tutto, con stile.', stats: { speed: .03, jump: .05, steer: .05, turbo: .1 }, look: { scale: 1, vintage: true } },
  // v46 · BO-anal Special Parts: le più care e le più forti di tutte.
  { id: 'boanal', name: 'T7 BO-anal Special', price: 1200, level: 6, icon: '💎', boanal: true, desc: 'BO-anal Special Parts: la più cara e la più forte. Veloce, salta, sterza e carica il turbo meglio di tutte.', stats: { speed: .09, jump: .1, steer: .14, turbo: .3, climb: .3, wheelie: 1 }, look: { scale: 1.02, twoStroke: true, boanal: true } },
];
export const PARTS = [
  { slot: 'rims', name: 'Cerchi', items: [
    { id: 'silver', name: 'Argento', price: 0, color: '#a3b7bb' }, { id: 'black', name: 'Neri', price: 40, color: '#1d2226', stats: { steer: .03 } },
    { id: 'gold', name: 'Oro', price: 60, color: '#d6a531', stats: { steer: .05 } }, { id: 'blue', name: 'Blu', price: 50, color: '#2a6bd8', stats: { steer: .04 } }, { id: 'red', name: 'Rossi', price: 50, color: '#d7261e', stats: { steer: .04 } },
    { id: 'boanal', name: 'BO-anal Special', price: 160, color: '#f2c230', boanal: true, stats: { steer: .1, speed: .02 } } ] },
  { slot: 'pipe', name: 'Scarico', items: [
    { id: 'steel', name: 'Acciaio', price: 0, color: '#a3b7bb' }, { id: 'carbon', name: 'Carbonio', price: 60, color: '#222428', stats: { speed: .02 } },
    { id: 'titan', name: 'Titanio blu', price: 80, color: '#5b6fc9', stats: { speed: .03, turbo: .05 } }, { id: 'chrome', name: 'Cromo', price: 50, color: '#e8eef0', stats: { speed: .015 } },
    { id: 'boanal', name: 'BO-anal Special', price: 190, color: '#2a2320', boanal: true, stats: { speed: .05, turbo: .1 } } ] },
  { slot: 'guards', name: 'Paramani', items: [
    { id: 'none', name: 'Nessuno', price: 0, color: null }, { id: 'black', name: 'Neri', price: 35, color: '#1b1b1b', stats: { protect: .3 } },
    { id: 'white', name: 'Bianchi', price: 35, color: '#f2f2ee', stats: { protect: .3 } }, { id: 'orange', name: 'Arancio', price: 45, color: '#ff6a13', stats: { protect: .4 } }, { id: 'yellow', name: 'Gialli EDT', price: 45, color: '#fcd326', stats: { protect: .4 } },
    { id: 'boanal', name: 'BO-anal Special', price: 130, color: '#f2c230', boanal: true, stats: { protect: .8 } } ] },
  { slot: 'seat', name: 'Sella', items: [
    { id: 'black', name: 'Nera', price: 0, color: '#243138' }, { id: 'red', name: 'Rossa', price: 30, color: '#b3221b', stats: { combo: .5 } },
    { id: 'blue', name: 'Blu', price: 30, color: '#1f3f8f', stats: { combo: .5 } }, { id: 'brown', name: 'Cuoio', price: 40, color: '#7a4a24', stats: { combo: .8 } },
    { id: 'boanal', name: 'BO-anal Special', price: 120, color: '#141414', boanal: true, stats: { combo: 1.5 } } ] },
  { slot: 'decal', name: 'Grafiche', items: [
    { id: 'none', name: 'Tinta unita', price: 0 }, { id: 'stripes', name: 'Strisce da gara', price: 50, stats: { points: .05 } },
    { id: 'flames', name: 'Fiamme', price: 70, stats: { points: .06, turbo: .06 } }, { id: 'edt', name: 'Logo EDT gigante', price: 60, stats: { points: .1 } },
    { id: 'boanal', name: 'BO-anal Special', price: 170, color: '#f2c230', boanal: true, stats: { points: .18, turbo: .05 } } ] },
  { slot: 'light', name: 'Fanale', items: [
    { id: 'none', name: 'Senza', price: 0 }, { id: 'led', name: 'Faro LED', price: 70, stats: { sight: 1, points: .03 } },
    { id: 'boanal', name: 'BO-anal Special', price: 150, color: '#ffe9a6', boanal: true, stats: { sight: 1, points: .08 } } ] },
  // v46 · Chiodi per Ice Scrofy: grip = tieni la linea sul ghiaccio, drift = punti derapata.
  { slot: 'studs', name: 'Chiodi', ice: true, items: [
    { id: 'none', name: 'Gomme di serie', price: 0, desc: 'Sul ghiaccio sono saponette.' },
    { id: 'aliexpress', name: 'Chiodi AliExpress', price: 40, color: '#8d8f93', desc: 'Arrivati dopo 40 giorni. Metà sono storti.', stats: { grip: .15, drift: .05 } },
    { id: 'puntine', name: 'Puntine da disegno', price: 90, color: '#e8452c', desc: 'Prese dalla bacheca del bar. Colorate e cattive.', stats: { grip: .28, drift: .12 } },
    { id: 'gusta', name: 'Gusta Grip', price: 170, color: '#e2b13c', desc: 'Mordono il ghiaccio come Gusta morde il panino.', stats: { grip: .42, drift: .22 } },
    { id: 'icefury', name: 'Ice Fury', price: 280, color: '#5fd4ff', desc: 'Il top: traversi infiniti senza perdere la linea.', stats: { grip: .58, drift: .35 } },
    { id: 'boanal', name: 'BO-anal Special', price: 420, color: '#f2c230', boanal: true, desc: 'BO-anal Special Parts: chiodi d’oro. Grip totale e punti derapata a pioggia.', stats: { grip: .72, drift: .5 } } ] },
];
data.bike ||= 'edt250'; data.owned ||= {}; data.parts ||= {};
export const ownsBike = id => id === 'edt250' || !!data.owned['bike:' + id];
export const ownsPart = (slot, id) => PARTS.find(p => p.slot === slot)?.items[0].id === id || !!data.owned[slot + ':' + id];
export function currentBike() { const b = BIKES.find(x => x.id === data.bike); return b && ownsBike(b.id) ? b : BIKES[0]; }
export function currentParts() { const o = {}; for (const p of PARTS) { const id = data.parts[p.slot]; o[p.slot] = (ownsPart(p.slot, id) && p.items.find(i => i.id === id)) || p.items[0]; } return o; }
// Tutte le caratteristiche in gara: moto + accessori (si sommano).
export const STAT_TEXT = { speed: 'velocità', jump: 'salto', steer: 'sterzo', turbo: 'turbo', protect: 's protezione dopo un urto', combo: 's di combo', points: 'punti', sight: 'vedi meglio nella nebbia e al buio', climb: 'in salita', wheelie: 's impennata', grip: 'grip sul ghiaccio', drift: 'punti derapata' };
export function statLabel(st = {}) {
  return Object.entries(st).map(([k, v]) => k === 'sight' ? STAT_TEXT.sight : ['protect', 'combo', 'wheelie'].includes(k) ? '+' + String(v).replace('.', ',') + ' ' + STAT_TEXT[k] : (v > 0 ? '+' : '') + Math.round(v * 100) + '% ' + STAT_TEXT[k]).join(' · ');
}
export function currentStats() {
  const out = { ...(currentBike().stats || {}) };
  for (const it of Object.values(currentParts())) for (const [k, v] of Object.entries(it.stats || {})) out[k] = (out[k] || 0) + v;
  return out;
}
export function buyBike(id) {
  const b = BIKES.find(x => x.id === id); if (!b) return false;
  if (!ownsBike(id)) { if (data.beers < b.price || levelInfo().level < b.level) return false; data.beers -= b.price; data.owned['bike:' + id] = true; }
  data.bike = id; save(); return true;
}
export function buyPart(slot, id) {
  const it = PARTS.find(p => p.slot === slot)?.items.find(i => i.id === id); if (!it) return false;
  if (!ownsPart(slot, id)) { if (data.beers < it.price) return false; data.beers -= it.price; data.owned[slot + ':' + id] = true; }
  data.parts[slot] = id; save(); return true;
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
