// EDT Giro Easy · v18
// Progressi salvati SOLO su questo dispositivo (localStorage): record, missioni,
// esperienza, livree sbloccate e "Classifica del bar". Nessun server.

const KEY = 'edt-giro-easy-v15';

// Percorsi: ognuno ha la sua sequenza di tratti (t: 0 sottobosco, 1 pozzanghere, 2 salitone, 3 mulattiera;
// climb = in salita, down = in discesa). "unlock" = livello pilota che lo sblocca. "random" = tracciato generato.
export const MODES = [
  { id: 0, short: 'EASY', name: 'Giro easy', desc: 'Su e giù tra le vigne per prendere confidenza. A metà giro c’è il bar: passaci sotto per una bionda (e poi tieni dritta la moto).', vigne: true, difficulty: 0, sky: 0, limit: 58, unlock: 1,
    layout: [{ t: 0, len: 7.5 }, { t: 0, len: 4.5, down: 1 }, { t: 1, len: 7.5 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 1.5 }, { t: 2, len: 17 }, { t: 3, len: 17 }] },
  { id: 1, short: 'MIGLIORA', name: 'Dopo migliora!', desc: 'Due salitoni da fare col gas dosato: troppo e la ruota pattina, poco e ti pianti (e spingi). Più fango.', traction: true, difficulty: 1, sky: 1, limit: 58, unlock: 1,
    layout: [{ t: 0, len: 6 }, { t: 1, len: 4, down: 1 }, { t: 1, len: 6 }, { t: 2, len: 10 }, { t: 3, len: 8 }, { t: 2, len: 8 }, { t: 3, len: 10 }, { t: 0, len: 4, down: 1 }, { t: 0, len: 4 }] },
  // v59 · Il taglio di Angelo: rincorsa giù dalla montagna, stacco dal trampolino e salto nel vuoto. Vince il salto più lungo atterrato in piedi.
  // v62 · Il taglio di Angelo: discesa dalla montagna senza ostacoli (frecce di spinta), stacco nel vuoto dal bordo e atterraggio tra i pietroni.
  { id: 2, short: 'POTTER', name: 'Angelo Potter', desc: 'La vera storia del taglio di Angelo: giù dalla montagna prendendo le scope volanti (ognuna ti dà velocità), poi il burrone. Più veloce arrivi, più lontano voli. In volo muso nel verde e atterra sul bersaglio, lontano dai pietroni.', difficulty: 1, sky: 2, limit: 60, unlock: 1, leap: true,
    layout: [{ t: 2, len: 3, climb: 0, down: 1, name: 'PARTENZA' }, { t: 2, len: 11, climb: 0, down: 1, name: 'LA DISCESA' }, { t: 2, len: 46, climb: 0, name: 'IL BURRONE' }] },
  { id: 3, short: 'SFIDA', name: 'Sfida del giorno', desc: 'Tracciato nuovo ogni giorno, uguale per tutti.', difficulty: 1, sky: 3, limit: 58, unlock: 1, random: 'daily' },
  { id: 4, hidden: true, short: 'ASSIETTA', name: 'Il muro dell’Assietta', desc: 'Tre salitoni uno dopo l’altro. Gas!', difficulty: 1, sky: 0, limit: 56, unlock: 2,
    layout: [{ t: 0, len: 5 }, { t: 2, len: 12 }, { t: 3, len: 6 }, { t: 2, len: 14 }, { t: 0, len: 5, down: 1 }, { t: 2, len: 12 }, { t: 3, len: 6 }] },
  { id: 5, hidden: true, short: 'PANTANO', name: 'Il pantano', desc: 'Discese, pozze e fango fino al casco.', difficulty: 1, sky: 3, limit: 54, unlock: 2,
    layout: [{ t: 0, len: 4 }, { t: 1, len: 5, down: 1 }, { t: 1, len: 10 }, { t: 0, len: 5 }, { t: 1, len: 6, down: 1 }, { t: 1, len: 10 }, { t: 2, len: 8 }, { t: 1, len: 6, down: 1 }, { t: 1, len: 6 }] },
  { id: 6, hidden: true, short: 'MULATTIERA', name: 'Mulattiera infinita', desc: 'Sassi, capre e frane dall’inizio alla fine.', difficulty: 2, sky: 1, limit: 61, unlock: 3,
    layout: [{ t: 0, len: 4 }, { t: 3, len: 12 }, { t: 3, len: 12, climb: 1 }, { t: 3, len: 6, down: 1 }, { t: 3, len: 12 }, { t: 3, len: 14, climb: 1 }] },
  { id: 7, hidden: true, short: 'A CASO', name: 'Giro a caso', desc: 'Ogni giro un tracciato diverso.', difficulty: 1, sky: 0, limit: 58, unlock: 3, random: 'run' },
  { id: 8, hidden: true, short: 'MORTE', name: 'Il giro della morte (easy)', desc: 'Tutto, tutto in salita, tutto insieme.', difficulty: 2, sky: 2, limit: 55, unlock: 4,
    layout: [{ t: 0, len: 4, down: 1 }, { t: 1, len: 6 }, { t: 2, len: 10 }, { t: 3, len: 10, climb: 1 }, { t: 1, len: 5, down: 1 }, { t: 2, len: 10 }, { t: 3, len: 8, climb: 1 }, { t: 3, len: 7 }] },
  // v46 · Ice Scrofy: pista di ghiaccio, gomme chiodate. Vince chi derapa di più e meglio (la classifica è a punti derapata).
  { id: 9, short: 'ICE', name: 'Ice Scrofy', desc: 'Pista di ghiaccio, gomme chiodate, niente ostacoli: solo curvoni, esse e tornanti a U. Vince chi derapa di più e meglio.', difficulty: 0, sky: 4, limit: 74, unlock: 1, ice: true,
    layout: [{ t: 0, len: 6, name: 'RETTILINEO GHIACCIATO' }, { t: 0, len: 10, name: 'CURVONI DI SCROPHY' }, { t: 0, len: 6, down: 1, name: 'DISCESA SUL VETRO' }, { t: 0, len: 10, name: 'ESSE DEL LAGO' }, { t: 2, len: 6, climb: .35, name: 'SALITA CHIODATA' }, { t: 0, len: 10, name: 'CURVONI DI SCROPHY' }, { t: 0, len: 6, down: 1, name: 'PICCHIATA FINALE' }] },
  // v46 · tre percorsi nuovi che si sbloccano più avanti
  { id: 10, short: 'FOGNA', name: 'MotoFogna', desc: 'Di notte sotto il diluvio: si vede col faro, gli ostacoli brillano come catarifrangenti e un lampo illumina ogni fila nuova. Solo per manici veri.', night: true, difficulty: 2, sky: 5, limit: 55, unlock: 3, rainy: true, dense: .05,
    obs: { 0: ['rock', 'rock', 'root', 'log', 'stump'], 1: ['puddle', 'rock', 'puddle', 'step', 'rock'], 2: ['step', 'rock', 'rock', 'step'], 3: ['rock', 'step', 'rock', 'root'] },
    layout: [{ t: 1, len: 5, name: 'IMBOCCO DELLA FOGNA' }, { t: 3, len: 9, wet: 1, name: 'PIETRAIA BAGNATA' }, { t: 1, len: 6, down: 1, name: 'IL CANALE' }, { t: 2, len: 9, wet: 1, name: 'GRADONI VISCIDI' }, { t: 3, len: 10, wet: 1, climb: 1, name: 'IL SIFONE' }, { t: 1, len: 6, name: 'LIQUAME' }, { t: 3, len: 9, wet: 1, name: 'ROCCE HARD' }] },
  { id: 11, short: 'ARGENTERA', name: 'Valle Argentera', desc: 'Guadi da saltare e animali selvatici che attraversano: stambecchi, camosci, marmotte.', difficulty: 1, sky: 0, limit: 59, unlock: 4, wild: true,
    obs: { 0: ['log', 'rock', 'stump', 'marmot'], 1: ['puddle', 'rock', 'marmot'], 2: ['rock', 'cairn', 'marmot', 'step'], 3: ['rock', 'goat', 'step', 'marmot'] },
    layout: [{ t: 0, len: 6, name: 'FONDOVALLE' }, { t: 1, len: 8, name: 'GUADI DELLA STURA' }, { t: 2, len: 10, name: 'PASCOLI DEGLI STAMBECCHI' }, { t: 1, len: 6, down: 1, name: 'IL GUADO GRANDE' }, { t: 3, len: 10, climb: 1, name: 'VERSO IL COLLE' }, { t: 2, len: 6, down: 1, name: 'DISCESA DEI CAMOSCI' }] },
  { id: 12, short: 'MONTAFIGA', name: 'MontaFiga', desc: 'Uno slalom continuo tra gli alberi. Sterza, sterza, sterza.', difficulty: 1, sky: 1, limit: 55, unlock: 4, slalom: true,
    layout: [{ t: 0, len: 6, name: 'BOSCO FITTO' }, { t: 0, len: 10, name: 'SLALOM DEI FAGGI' }, { t: 0, len: 6, down: 1, name: 'PICCHIATA TRA GLI ABETI' }, { t: 0, len: 10, name: 'LA SELVA' }, { t: 2, len: 6, climb: .6, name: 'STRAPPO NEL BOSCO' }, { t: 0, len: 10, down: 1, name: 'SLALOM FINALE' }] },
  // v57 · ANTI-GEV: scappa dalle Guardie Ecologiche Volontarie. Dalla jeep ti lanciano ostacoli in pista; finiti i tentativi arriva la multa.
  { id: 13, short: 'ANTI-GEV', name: 'Anti-GEV', desc: 'Scappa dalle GEV: dalla jeep ti lanciano di tutto in pista. Finisci i tentativi e arriva la multa.', difficulty: 1, sky: 2, limit: 57, unlock: 2, gev: true, dense: -.15,
    obs: { 0: ['log', 'rock', 'stump', 'root'], 1: ['puddle', 'rock', 'puddle'], 2: ['step', 'rock', 'step'], 3: ['rock', 'step', 'root'] },
    layout: [{ t: 0, len: 5, name: 'FUGA DAL BAR' }, { t: 0, len: 8, name: 'LA FORESTALE' }, { t: 1, len: 7, down: 1, name: 'IL GRETO DEL FIUME' }, { t: 2, len: 8, name: 'LA SBARRA' }, { t: 0, len: 7, name: 'IL BOSCO DEGLI OPOSSUM' }, { t: 3, len: 9, climb: 1, name: 'LA CRESTA DEL CONIGLIO MANNARO' }, { t: 0, len: 6, down: 1, name: 'SEMINATE! VERSO IL RIFUGIO' }] },
  // v59 · Gusta Ranch: si parte dalla cascina sulle colline. Solo fango, pozzanghere e alberi da schivare.
  { id: 14, short: 'GUSTA', name: 'Gusta Ranch', desc: 'Il giro vero del Gusta sulle colline dell’Astigiano: giù dalla cascina, i tornanti nel bosco, galline in fuga, il porcile, rotoballe e il carro del fieno. Si finisce al falò. Mud, beer & glory.', difficulty: 1, sky: 1, limit: 56, unlock: 1, ranch: true,
    obs: { 0: ['hay', 'tree', 'puddle', 'stump'], 1: ['puddle', 'puddle', 'hay', 'puddle'], 2: ['tree', 'puddle', 'hay', 'stump'], 3: ['hay', 'puddle', 'tree'] },   // v81 · meno alberi (quelli sono di MontaFiga), più fieno e ceppi
    layout: [{ t: 0, len: 6, name: 'LA CASCINA' }, { t: 1, len: 8, wet: 1, name: 'IL CAMPO DEL LAGHETTO' }, { t: 0, len: 8, wet: 1, name: 'I TORNANTI DEL GUSTA' }, { t: 1, len: 7, down: 1, wet: 1, name: 'DISCESA NELLA MOTA' }, { t: 0, len: 8, wet: 1, name: 'GLI ALBERI DEL GUSTA' }, { t: 1, len: 8, wet: 1, name: 'IGNORANZA PURA' }, { t: 0, len: 5, down: 1, name: 'RITORNO AL FALÒ' }] },
  // v97 · Notturna con le frontali: buio pesto, niente lampi. Vedi solo dove guarda il casco, i compagni sono lucine nel bosco.
  { id: 15, short: 'FRONTALI', name: 'Notturna con le frontali', desc: 'Buio pesto nel bosco, niente lampi: vedi solo dove punta la frontale del casco, che segue la curva. I compagni li riconosci dalle lucine.', night: true, frontali: true, difficulty: 2, sky: 1, limit: 58, unlock: 5, dense: .02,
    obs: { 0: ['root', 'rock', 'log', 'stump'], 1: ['puddle', 'root', 'rock'], 2: ['step', 'rock', 'root', 'log'], 3: ['rock', 'step', 'stump', 'root'] },
    layout: [{ t: 0, len: 5, name: 'PARTENZA AL BUIO' }, { t: 0, len: 9, name: 'IL BOSCO NERO' }, { t: 1, len: 6, down: 1, name: 'DISCESA DEI GUFI' }, { t: 3, len: 9, name: 'LA PIETRAIA' }, { t: 2, len: 9, climb: .6, name: 'SALITA DELLE LUCCIOLE' }, { t: 0, len: 8, name: 'IL SENTIERO DEI CINGHIALI' }, { t: 1, len: 6, down: 1, name: 'RIENTRO AL RIFUGIO' }] },
];
// v59 · percorsi tolti dal menu (restano nell'elenco per non mescolare record e classifiche già salvati)
export const SHOWN = () => MODES.filter(m => !m.hidden);
export const isUnlocked = (m, level = levelInfo().level) => level >= (m.unlock || 1);
// v106.5 · percorso della settimana: cambia ogni lunedì e porta il doppio delle birre al rifugio
export function weeklyTrack(d = new Date()) {
  const ids = SHOWN().filter(m => m.id !== 3 && !m.random).map(m => m.id);
  const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  return ids[Math.round(x.getTime() / 6048e5) % ids.length];
}

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
  // v96 · officina speciale: per chi ha già finito tutto (prezzi più alti)
  { id: 'clutch', group: 'SPECIALI', pro: true, icon: '🚀', name: 'Frizione racing', desc: 'Partenza a razzo: finestra più larga e più spinta.', per: '+0,1 s finestra · +0,3 s turbo' },
  { id: 'ecu', group: 'SPECIALI', pro: true, icon: '🧠', name: 'Mappa centralina', desc: 'Dopo migliora: zona verde della trazione più larga, ti pianti più tardi.', per: '+3% zona verde' },
  { id: 'damper', group: 'SPECIALI', pro: true, icon: '🎯', name: 'Ammortizzatore di sterzo', desc: 'Ghiaccio: meno testacoda e rimbalzi; dopo la birra al bar la moto balla meno.', per: '+5% stabilità' },
  { id: 'skid', group: 'SPECIALI', pro: true, icon: '🛡', name: 'Paramotore', desc: 'La prima botta di ogni gara non ti toglie la moto (al livello 5 le prime due).', per: 'livello 5: 2 botte' },
  { id: 'wings', group: 'SPECIALI', pro: true, icon: '🪽', name: 'Ali di Angelo', desc: 'Angelo Potter: bersaglio d’atterraggio più largo e la moto si raddrizza da sola in volo.', per: '+10% bersaglio' },
  { id: 'camel', group: 'SPECIALI', pro: true, icon: '🎒', name: 'Sacca d’acqua', desc: 'La bottiglia d’acqua ti rallenta meno; dal livello 3 non perdi la combo.', per: '−15% malus acqua' },
  { id: 'eyes', group: 'SPECIALI', pro: true, icon: '🦉', name: 'Occhio da notturna', desc: 'Di notte e nella nebbia vedi più lontano; i lampi durano di più.', per: '+6% vista' },
];
export const MAX_UPGRADE = 5;
const COSTS = [30, 60, 100, 160, 240], PRO_COSTS = [150, 250, 350, 450, 500];   // v96 · speciali: ~1.700 birre l'uno
export function upgradeLevel(id) { return Math.min(MAX_UPGRADE, data.upgrades[id] || 0); }
export function upgradeCost(id) { const l = upgradeLevel(id); return l >= MAX_UPGRADE ? null : (UPGRADES.find(u => u.id === id)?.pro ? PRO_COSTS : COSTS)[l]; }
export function buyUpgrade(id) {
  const cost = upgradeCost(id);
  if (cost == null || data.beers < cost) return false;
  data.beers -= cost; data.upgrades[id] = upgradeLevel(id) + 1; save(); return true;
}

// ---------- v44 · Moto nuove e accessori (officina) ----------
// stats: speed = velocità, jump = salto, steer = sterzo, turbo = carica del turbo, wheelie = secondi di impennata in più, climb = salite
export const BIKES = [
  { id: 'edt250', name: 'EDT 250 4T', price: 0, level: 1, icon: '🏍', desc: 'La moto di tutti i giorni. Equilibrata.', stats: {}, look: { paint: { plastic: '#d42a1e', accent: '#ffc61a', side: '#d42a1e', frame: '#9ea4a8', seat: '#1b1d1f', pattern: 'fiamme', ink: '#ffb000' }, scale: 1 } },
  { id: 'gp125', name: 'Due tempi 125', price: 140, level: 2, icon: '🐝', desc: 'Leggerissima: sterza al volo e salta di più. Un filo meno veloce.', stats: { speed: -.02, jump: .06, steer: .18 }, look: { paint: { plastic: '#f3f3ef', accent: '#ffd21a', side: '#f3f3ef', frame: '#b9bec1', seat: '#1b1d1f', pattern: 'mx', ink: '#2a86d6' }, scale: .93, twoStroke: true } },
  { id: 'trial', name: 'La Trial di Giacu', price: 260, level: 3, icon: '🦘', desc: 'Senza sella, nata per saltare: salti lunghi e impennate infinite. Più lenta.', stats: { speed: -.05, jump: .16, wheelie: 1.5, steer: .08 }, look: { paint: { plastic: '#f2f2f0', accent: '#e02a2a', side: '#d92525', frame: '#c4c8ca', seat: '#1b1d1f', pattern: 'mx', ink: '#d92525' }, scale: .96, trial: true } },
  { id: 'ts300', name: '300 Due tempi', price: 380, level: 4, icon: '🔥', desc: 'Cattiva: più spunto e il turbo si carica prima.', stats: { speed: .04, turbo: .25 }, look: { paint: { plastic: '#ff6b00', accent: '#1a1a1a', side: '#ff6b00', frame: '#ff6b00', seat: '#1b1d1f', pattern: 'tigre', ink: '#141414' }, scale: 1.01, twoStroke: true } },
  { id: 'mulo450', name: '450 Mulo', price: 520, level: 5, icon: '🐂', desc: 'Tanta coppia: vola in salita e sul veloce, ma è pesante da sterzare.', stats: { speed: .06, climb: .5, steer: -.1 }, look: { paint: { plastic: '#1f4fd1', accent: '#ffffff', side: '#f2f2f2', frame: '#b5bbbf', seat: '#1a2b6b', pattern: 'mx', ink: '#ffffff' }, scale: 1.05, big: true } },
  { id: 'vintage', name: 'Vecchia gloria ’89', price: 700, level: 6, icon: '🏆', desc: 'Doppio ammortizzatore e faro tondo. Un po’ di tutto, con stile.', stats: { speed: .03, jump: .05, steer: .05, turbo: .1 }, look: { paint: { plastic: '#f4efe4', accent: '#d23a2a', side: '#f2c230', frame: '#202020', seat: '#141414', pattern: 'righina', ink: '#d23a2a' }, scale: 1, vintage: true } },
  // v46 · BO-anal Special Parts: le più care e le più forti di tutte.
  { id: 'boanal', name: 'T7 BO-anal Special', price: 1200, level: 6, icon: '💎', boanal: true, desc: 'BO-anal Special Parts: la più cara e la più forte. Veloce, salta, sterza e carica il turbo meglio di tutte.', stats: { speed: .09, jump: .1, steer: .14, turbo: .3, climb: .3, wheelie: 1 }, look: { paint: { plastic: '#1f3fbf', accent: '#ffffff', side: '#f2f4f8', frame: '#e8ecf0', seat: '#1f3fbf', rims: '#2448c8', pattern: 'mx', ink: '#f2f4f8' }, scale: 1.02, twoStroke: true, boanal: true } },
  // v97 · tre moto per chi ha già tutto (dal livello 7)
  { id: 'electric', name: 'La Silenziosa', price: 1500, level: 7, icon: '⚡', top: true, desc: 'Elettrica: coppia subito, turbo che si carica in un attimo e salite senza fatica. Non fa rumore: fischia.', stats: { speed: .07, turbo: .45, climb: .4, steer: .1 }, look: { paint: { plastic: '#e9eef2', accent: '#19c37d', side: '#1b1f24', frame: '#2a2f35', seat: '#1b1d1f', pattern: 'mx', ink: '#19c37d' }, scale: .98, electric: true } },
  { id: 'dakar', name: 'Rally da Dakar 450', price: 1800, level: 7, icon: '🐪', top: true, desc: 'Cupolino, faro e serbatoio grande: la più veloce sul dritto e forte in salita, ma pesante da girare.', stats: { speed: .12, climb: .3, jump: .06, steer: -.05 }, look: { paint: { plastic: '#f2f2ee', accent: '#d42a1e', side: '#1f3fbf', frame: '#c4c8ca', seat: '#1b1d1f', pattern: 'righina', ink: '#1f3fbf' }, scale: 1.06, big: true, rally: true } },
  { id: 'factory', name: 'Factory Ufficiale EDT', price: 2500, level: 7, icon: '🏁', top: true, desc: 'La moto ufficiale della squadra, nera e oro: un gradino sopra la BO-anal in tutto.', stats: { speed: .11, jump: .12, steer: .16, turbo: .35, climb: .35, wheelie: 1.2 }, look: { paint: { plastic: '#151515', accent: '#f2c230', side: '#151515', frame: '#f2c230', seat: '#151515', pattern: 'fiamme', ink: '#f2c230', rims: '#f2c230' }, scale: 1.02, twoStroke: true } },
];
export const PARTS = [
  { slot: 'rims', name: 'Cerchi', items: [
    { id: 'silver', name: 'Argento', price: 0, color: '#a3b7bb' }, { id: 'black', name: 'Neri', price: 40, color: '#1d2226', stats: { steer: .03 } },
    { id: 'gold', name: 'Oro', price: 60, color: '#d6a531', stats: { steer: .05 } }, { id: 'blue', name: 'Blu', price: 50, color: '#2a6bd8', stats: { steer: .04 } }, { id: 'red', name: 'Rossi', price: 50, color: '#d7261e', stats: { steer: .04 } },
    { id: 'boanal', name: 'BO-anal Special', price: 160, color: '#f2c230', boanal: true, stats: { steer: .1, speed: .02 } },
    { id: 'factory', name: 'EDT Factory', price: 280, color: '#c9a227', factory: true, stats: { steer: .13, speed: .03 } } ] },
  { slot: 'pipe', name: 'Scarico', items: [
    { id: 'steel', name: 'Acciaio', price: 0, color: '#a3b7bb' }, { id: 'carbon', name: 'Carbonio', price: 60, color: '#222428', stats: { speed: .02 } },
    { id: 'titan', name: 'Titanio blu', price: 80, color: '#5b6fc9', stats: { speed: .03, turbo: .05 } }, { id: 'chrome', name: 'Cromo', price: 50, color: '#e8eef0', stats: { speed: .015 } },
    { id: 'boanal', name: 'BO-anal Special', price: 190, color: '#2a2320', boanal: true, stats: { speed: .05, turbo: .1 } },
    { id: 'factory', name: 'EDT Factory', price: 350, color: '#8a6fc8', factory: true, stats: { speed: .07, turbo: .13 } } ] },
  { slot: 'guards', name: 'Paramani', items: [
    { id: 'none', name: 'Nessuno', price: 0, color: null }, { id: 'black', name: 'Neri', price: 35, color: '#1b1b1b', stats: { protect: .3 } },
    { id: 'white', name: 'Bianchi', price: 35, color: '#f2f2ee', stats: { protect: .3 } }, { id: 'orange', name: 'Arancio', price: 45, color: '#ff6a13', stats: { protect: .4 } }, { id: 'yellow', name: 'Gialli EDT', price: 45, color: '#fcd326', stats: { protect: .4 } },
    { id: 'boanal', name: 'BO-anal Special', price: 130, color: '#f2c230', boanal: true, stats: { protect: .8 } },
    { id: 'factory', name: 'EDT Factory', price: 250, color: '#151515', factory: true, stats: { protect: 1.1 } } ] },
  { slot: 'seat', name: 'Sella', items: [
    { id: 'black', name: 'Nera', price: 0, color: '#243138' }, { id: 'red', name: 'Rossa', price: 30, color: '#b3221b', stats: { combo: .5 } },
    { id: 'blue', name: 'Blu', price: 30, color: '#1f3f8f', stats: { combo: .5 } }, { id: 'brown', name: 'Cuoio', price: 40, color: '#7a4a24', stats: { combo: .8 } },
    { id: 'boanal', name: 'BO-anal Special', price: 120, color: '#141414', boanal: true, stats: { combo: 1.5 } },
    { id: 'factory', name: 'EDT Factory', price: 250, color: '#2b2416', factory: true, stats: { combo: 2 } } ] },
  { slot: 'decal', name: 'Grafiche', items: [
    { id: 'none', name: 'Tinta unita', price: 0 }, { id: 'stripes', name: 'Strisce da gara', price: 50, stats: { points: .05 } },
    { id: 'flames', name: 'Fiamme', price: 70, stats: { points: .06, turbo: .06 } }, { id: 'edt', name: 'Logo EDT gigante', price: 60, stats: { points: .1 } },
    { id: 'boanal', name: 'BO-anal Special', price: 170, color: '#f2c230', boanal: true, stats: { points: .18, turbo: .05 } },
    { id: 'factory', name: 'EDT Factory', price: 500, color: '#151515', factory: true, stats: { points: .24, turbo: .07 } } ] },
  { slot: 'light', name: 'Fanale', items: [
    { id: 'none', name: 'Senza', price: 0 }, { id: 'led', name: 'Faro LED', price: 70, stats: { sight: 1, points: .03 } },
    { id: 'boanal', name: 'BO-anal Special', price: 150, color: '#ffe9a6', boanal: true, stats: { sight: 1, points: .08 } },
    { id: 'factory', name: 'EDT Factory', price: 300, color: '#fff6d8', factory: true, stats: { sight: 1, points: .12 } } ] },
  // v97 · telecamera sul casco e gomme
  { slot: 'cam', name: 'Action cam', items: [
    { id: 'none', name: 'Nessuna', price: 0 }, { id: 'cinese', name: 'Cinese', price: 80, color: '#3a3a3a', desc: 'Entry level: si vede poco, ma si vede.', stats: { points: .04 } },
    { id: 'gopro', name: 'GoPro', price: 180, color: '#111111', desc: 'Quella di tutti: video nitidi, punti in più.', stats: { points: .08 } },
    { id: 'action360', name: 'Action360 EDT', price: 300, color: '#f2c230', factory: true, desc: 'Il top: riprende tutto intorno, come Miti.', stats: { points: .12 } } ] },
  { slot: 'tires', name: 'Gomme', items: [
    { id: 'serie', name: 'Tassellate di serie', price: 0 }, { id: 'mousse', name: 'Mousse antiforatura', price: 120, color: '#2b2b2b', stats: { protect: .5 } },
    { id: 'fango', name: 'Gomme da fango', price: 160, color: '#5a3d22', stats: { climb: .2 } },
    { id: 'gara', name: 'Gomme da gara', price: 250, color: '#c0392b', factory: true, stats: { speed: .03, steer: .05 } } ] },
  // v46 · Chiodi per Ice Scrofy: grip = tieni la linea sul ghiaccio, drift = punti derapata.
  { slot: 'studs', name: 'Chiodi', ice: true, items: [
    { id: 'none', name: 'Gomme di serie', price: 0, desc: 'Sul ghiaccio sono saponette.' },
    { id: 'aliexpress', name: 'Chiodi AliExpress', price: 40, color: '#8d8f93', desc: 'Arrivati dopo 40 giorni. Metà sono storti.', stats: { grip: .15, drift: .05 } },
    { id: 'puntine', name: 'Puntine da disegno', price: 90, color: '#e8452c', desc: 'Prese dalla bacheca del bar. Colorate e cattive.', stats: { grip: .28, drift: .12 } },
    { id: 'gusta', name: 'Gusta Grip', price: 170, color: '#e2b13c', desc: 'Mordono il ghiaccio come Gusta morde il panino.', stats: { grip: .42, drift: .22 } },
    { id: 'icefury', name: 'Ice Fury', price: 280, color: '#5fd4ff', desc: 'Il top: traversi infiniti senza perdere la linea.', stats: { grip: .58, drift: .35 } },
    { id: 'boanal', name: 'BO-anal Special', price: 420, color: '#f2c230', boanal: true, desc: 'BO-anal Special Parts: chiodi d’oro. Grip totale e punti derapata a pioggia.', stats: { grip: .72, drift: .5 } },
    { id: 'factory', name: 'Factory EDT', price: 650, color: '#f2c230', factory: true, desc: 'I chiodi ufficiali della squadra, neri e oro: il massimo del grip e derapate da applausi. Un gradino sopra i BO-anal.', stats: { grip: .8, drift: .62 } } ] },
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
  return mode === 3 ? 'd' + todayKey() : mode === 2 ? 'j2' : String(mode);   // v59 · il Taglio di Angelo ora è una gara di salto: record nuovi
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
// v96 · MISSIONI DELLA SETTIMANA: 3 sfide uguali per tutti, cambiano il lunedì, pagano tante birre
const WEEKLY_POOL = [
  { id: 'drift500', text: 'Ice Scrofy: almeno 500 m di derapata in un giro', beers: 220, ok: r => r.mode === 9 && (r.driftM || 0) >= 500 },
  { id: 'leap150', text: 'Angelo Potter: atterra in piedi oltre 150 m', beers: 250, ok: r => r.mode === 2 && (r.leap || 0) >= 150 },
  { id: 'fogna0', text: 'MotoFogna: arriva al rifugio senza botte', beers: 300, ok: r => r.mode === 10 && r.finishTime > 0 && !r.hits },
  { id: 'slalom15', text: 'MontaFiga: slalom ×15 di fila', beers: 220, ok: r => r.mode === 12 && (r.slaloms || 0) >= 15 },
  { id: 'bar1', text: 'Giro easy: passa dal bar e vinci la gara', beers: 200, ok: r => r.mode === 0 && (r.bars || 0) > 0 && r.position === 1 },
  { id: 'hole', text: 'Partenza a razzo e primo all’arrivo (qualsiasi percorso)', beers: 200, ok: r => r.holeshot && r.position === 1 },
  { id: 'gev0', text: 'Anti-GEV: arriva al rifugio senza perdere moto', beers: 250, ok: r => r.mode === 13 && r.finishTime > 0 && !r.hits },
  { id: 'mud1', text: 'Dopo migliora: arriva primo', beers: 220, ok: r => r.mode === 1 && r.position === 1 },
  { id: 'arg55', text: 'Valle Argentera: al rifugio in meno di 55 s', beers: 250, ok: r => r.mode === 11 && r.finishTime > 0 && r.finishTime < 55 },
  { id: 'ranch1', text: 'Gusta Ranch: vinci la gara', beers: 200, ok: r => r.mode === 14 && r.position === 1 },
];
export function weekKey(d = new Date()) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate(); }
export function weeklyMissions() {
  const wk = weekKey(); if (!data.weekly || data.weekly.wk !== wk) data.weekly = { wk, done: {} };
  let seed = wk; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pool = WEEKLY_POOL.slice(), out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.map(m => ({ id: m.id, text: m.text, beers: m.beers, done: !!data.weekly.done[m.id], ok: m.ok }));
}
// v104 · boccali d'oro: 3 nascosti in ogni percorso, cambiano posto ogni lunedì
export function goldFound(mode) { const wk = weekKey(); if (!data.gold || data.gold.wk !== wk) data.gold = { wk, f: {} }; return data.gold.f[mode] || [0, 0, 0]; }
export function findGold(mode, i) { const g = goldFound(mode).slice(); if (g[i]) return g.filter(Boolean).length; g[i] = 1; data.gold.f[mode] = g; data.goldTotal = (data.goldTotal || 0) + 1; save(); return g.filter(Boolean).length; }
export function goldWeekTotal() { goldFound(0); return Object.values(data.gold.f).reduce((a, g) => a + g.filter(Boolean).length, 0); }
// v104 · bacheca trofei: si sbloccano una volta e restano
export const TROPHIES = [
  { id: 'first', icon: '🏁', name: 'Primo giro', desc: 'Finisci la tua prima gara', ok: (st) => st.runs >= 1 },
  { id: 'rifugio10', icon: '🛖', name: 'Habitué del rifugio', desc: 'Arriva al rifugio 10 volte', ok: (st) => st.finished >= 10 },
  { id: 'wins10', icon: '🥇', name: 'Manico vero', desc: 'Vinci 10 gare', ok: (st) => st.wins >= 10 },
  { id: 'podi50', icon: '🏆', name: 'Sempre sul podio', desc: '50 podi', ok: (st) => st.podi >= 50 },
  { id: 'allwins', icon: '🗺', name: 'Giro d’Italia EDT', desc: 'Vinci almeno una volta su ogni percorso a gara', ok: (st) => MODES.filter(m => !m.hidden && !m.leap && !m.gev).every(m => st.winsBy?.[m.id]) },
  { id: 'caps1000', icon: '🍺', name: 'Mille bionde', desc: 'Raccogli 1.000 birre', ok: (st) => st.caps >= 1000 },
  { id: 'jumps500', icon: '🦘', name: 'Canguro', desc: 'Fai 500 salti', ok: (st) => st.jumps >= 500 },
  { id: 'km100', icon: '🛣', name: 'Cento chilometri', desc: 'Percorri 100 km', ok: (st) => st.km >= 100 },
  { id: 'gold1', icon: '✨', name: 'Cercatore d’oro', desc: 'Trova un boccale d’oro', ok: (st, d) => (d.goldTotal || 0) >= 1 },
  { id: 'goldTris', icon: '🔱', name: 'Tris d’oro', desc: 'Trova tutti e 3 i boccali d’oro di un percorso nella stessa settimana', ok: (st, d) => Object.values(d.gold?.f || {}).some(g => g.every(Boolean)) || st.goldTris },
  { id: 'gold30', icon: '👑', name: 'Re dei boccali', desc: 'Trova 30 boccali d’oro', ok: (st, d) => (d.goldTotal || 0) >= 30 },
  { id: 'dolmen', icon: '🗿', name: 'Amico di Costa', desc: 'Schiva 10 dolmen di Costa', ok: (st) => st.dolmen >= 10 },
  { id: 'drift', icon: '❄', name: 'Re del traverso', desc: '500 m di derapata in un giro di Ice Scrofy', ok: (st) => st.bestDrift >= 500 },
  { id: 'holeshot', icon: '🚀', name: 'Partenza a razzo', desc: '20 partenze a razzo', ok: (st) => st.holeshots >= 20 },
  { id: 'bar', icon: '🍻', name: 'Giro dei bar', desc: '25 soste al bar', ok: (st) => st.bars >= 25 },
  { id: 'hits', icon: '💥', name: 'Colpa di Angelo', desc: 'Prendi 200 botte (succede)', ok: (st) => st.hits >= 200 },
  { id: 'weekly', icon: '🗓', name: 'Settimane piene', desc: 'Completa 12 missioni della settimana', ok: (st) => st.weekly >= 12 },
];
export function trophies() { return data.trophies || (data.trophies = {}); }
export function checkTrophies() {
  const st = stats(), got = trophies(), fresh = [];
  for (const t of TROPHIES) if (!got[t.id] && t.ok(st, data)) { got[t.id] = todayKey(); fresh.push(t); }
  if (fresh.length) save();
  return fresh;
}
// v96 · statistiche di sempre del pilota
export function stats() { return data.stats || (data.stats = {}); }
export function recordRun(run) {
  { const st = stats();   // v96 · totali di sempre
    st.runs = (st.runs || 0) + 1; st.wins = (st.wins || 0) + (run.position === 1 ? 1 : 0); st.podi = (st.podi || 0) + (run.position && run.position <= 3 ? 1 : 0);
    st.finished = (st.finished || 0) + (run.finishTime > 0 ? 1 : 0); st.caps = (st.caps || 0) + (run.caps || 0); st.jumps = (st.jumps || 0) + (run.jumps || 0);
    st.km = (st.km || 0) + (run.km || 0); st.driftM = (st.driftM || 0) + (run.driftM || 0); st.hits = (st.hits || 0) + (run.hits || 0);
    st.holeshots = (st.holeshots || 0) + (run.holeshot ? 1 : 0); st.bars = (st.bars || 0) + (run.bars || 0); st.turbos = (st.turbos || 0) + (run.turbos || 0);
    st.bestLeap = Math.max(st.bestLeap || 0, run.leap || 0); st.bestDrift = Math.max(st.bestDrift || 0, run.driftM || 0); st.bestSlalom = Math.max(st.bestSlalom || 0, run.slaloms || 0);
    st.winsBy = st.winsBy || {}; if (run.position === 1 && run.finishTime > 0) st.winsBy[run.mode] = (st.winsBy[run.mode] || 0) + 1;
    st.dolmen = (st.dolmen || 0) + (run.dolmens && !run.dolmenHit ? run.dolmens : 0); st.gold = (st.gold || 0) + (run.gold || 0);
    st.best = st.best || {}; if (run.finishTime > 0 && run.mode !== 2 && run.mode !== 9 && (!st.best[run.mode] || run.finishTime < st.best[run.mode])) st.best[run.mode] = +run.finishTime.toFixed(1); }
  const weeklyDone = [];
  for (const m of weeklyMissions()) if (!m.done && m.ok(run)) { data.weekly.done[m.id] = true; data.beers += m.beers; weeklyDone.push(m); stats().weekly = (stats().weekly || 0) + 1; }
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
  const weeklyX2 = run.mode === weeklyTrack();
  const beersEarned = (run.caps + (finished ? 20 : 0) + completed.length * 10) * (weeklyX2 ? 2 : 1);
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
  const trophiesNew = checkTrophies();
  return { weeklyDone, completed, isRecord, previousBest, scoreXp, missionsXp, before, after, unlocked, position, beersEarned, weeklyX2, prize, wallet: data.beers, trophiesNew };
}
