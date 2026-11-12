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
  { id: 2, short: 'POTTER', name: 'Angelo Potter', desc: 'La vera storia del taglio di Angelo: giù dalla montagna prendendo le scope volanti (ognuna ti dà velocità), poi il burrone. Più veloce arrivi, più lontano voli. In volo tieni premuto IMPENNA per tenere dritta la moto (lancetta nel verde) e atterra sul bersaglio, lontano dai pietroni.', difficulty: 1, sky: 2, limit: 60, unlock: 1, leap: true,
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
  // v106.7 · Il Desertone: dune dove ti insabbi senza gas, cammelli che attraversano, spine che bucano la gomma
  { id: 16, short: 'DESERTO', name: 'Il Desertone', desc: 'Dune, sassi e cammelli. Sulle dune tieni il gas o ti insabbi; occhio alle spine: se buchi ti fermi a cambiare la camera d’aria e perdi tempo.', desert: true, difficulty: 1, sky: 6, limit: 61, unlock: 3,
    obs: { 0: ['rock', 'thorns', 'rock', 'thorns'], 1: ['thorns', 'rock', 'puddle', 'thorns'], 2: ['rock', 'thorns', 'rock'], 3: ['rock', 'rock', 'thorns'] },
    layout: [{ t: 0, len: 6, name: 'LA PISTA DEL SERIR' }, { t: 2, len: 9, climb: 1, name: 'LE PRIME DUNE' }, { t: 0, len: 6, down: 1, name: 'GIÙ DAL CORDONE' }, { t: 3, len: 8, name: 'LA HAMMADA' }, { t: 2, len: 10, climb: 1, name: 'IL MARE DI SABBIA' }, { t: 1, len: 6, name: 'L’OASI' }, { t: 2, len: 9, climb: 1, name: 'LA GRANDE DUNA' }, { t: 0, len: 6, down: 1, name: 'VERSO IL BIVACCO' }] },
  // v127 · CHRISTMAS MADNESS (evento di Natale, dal 1° dicembre all'Epifania): la gara nel fango dell'EDT, di sera con la neve,
  // lucine sulle fettucce, pacchi regalo e pupazzi di neve in pista. Il 21 dicembre (la gara vera) punti doppi.
  { id: 17, short: 'XMAS', name: 'Christmas Madness', desc: 'La gara nel fango dell’EDT sotto la neve: lucine sulle fettucce, pacchi regalo e pupazzi di neve in mezzo alla pista, birra e fuochi d’artificio all’arrivo. Il 21 dicembre punti doppi.', event: 'xmas', ranch: true, difficulty: 1, sky: 7, limit: 58, unlock: 1, dense: 0,   /* v127 · si corre al Gusta Ranch, come la gara vera */
    obs: { 0: ['gift', 'snowman', 'log', 'gift'], 1: ['puddle', 'gift', 'puddle', 'snowman'], 2: ['gift', 'step', 'snowman', 'rock'], 3: ['rock', 'gift', 'step', 'snowman'] },
    layout: [{ t: 0, len: 6, name: 'PARTENZA DAL BAR' }, { t: 1, len: 8, wet: 1, name: 'IL FANGO DELLA MADNESS' }, { t: 0, len: 7, name: 'IL BOSCO DEI REGALI' }, { t: 1, len: 6, down: 1, wet: 1, name: 'GIÙ NEL FANGO CHE SAPONE' }, { t: 2, len: 9, climb: .7, name: 'LA SALITA DI BABBO NATALE' }, { t: 1, len: 7, wet: 1, name: 'L’IGNORANZA È QUI' }, { t: 0, len: 6, down: 1, name: 'VERSO I FUOCHI' }] },
  // v132 · LEVENTINO: la passeggiata enduristica di Sostegno (marzo). Mulattiere degli Alpini, guadi, prati e pietraie; a metà il ristoro coi gazebo.
  // I compagni corrono vestiti da «Leventino Girls» (parrucca fucsia o azzurra e occhiali a cuore).
  { id: 18, short: 'LEVENTINO', name: 'Leventino', desc: 'La passeggiata enduristica di Sostegno: mulattiere degli Alpini, guadi, prati in salita e pietraie. A metà giro il ristoro coi gazebo (birra e salame al volo) e i compagni corrono vestiti da Leventino Girls.', difficulty: 1, sky: 0, limit: 58, unlock: 4, ristoro: true, wigs: true, story: true, look: 'lev', song: 22,
    obs: { 0: ['log', 'root', 'rock', 'stump'], 1: ['puddle', 'rock', 'puddle', 'root'], 2: ['step', 'rock', 'log', 'step'], 3: ['rock', 'step', 'cairn', 'rock'] },
    layout: [{ t: 0, len: 6, name: 'PARTENZA DA SOSTEGNO' }, { t: 3, len: 9, name: 'LA MULATTIERA DEGLI ALPINI' }, { t: 1, len: 7, down: 1, name: 'GIÙ NEL GUADO' }, { t: 2, len: 9, climb: .8, name: 'IL PRATONE IN SALITA' }, { t: 0, len: 6, name: 'IL RISTORO' }, { t: 3, len: 9, climb: 1, name: 'LA PIETRAIA DEL LEVENTINO' }, { t: 0, len: 7, down: 1, name: 'VERSO LA POLENTA' }] },
  // v133 · LEVENTINO VIETNAM EDITION: l'edizione super bagnata del Leventino. Diluvio dall'inizio alla fine, risaie allagate, fango fino al casco e sudore.
  { id: 19, hidden: true, short: '—', name: '(riservato)', desc: '', difficulty: 1, sky: 0, limit: 58, unlock: 99 },   // 19 = classifica delle cadute
  // v132 · MIRCO E GABBAH FEST: il compleanno di Mirco e del Gabbah al Gusta Ranch, il 1° marzo. Ghiaccio e fango, lucine, palloncini, torte in pista.
  { id: 20, short: 'FEST', name: 'Mirco e Gabbah Fest', desc: 'Il compleanno di Mirco e del Gabbah al Gusta Ranch: lastre di ghiaccio e fango, lucine sulle fettucce, palloncini e torte di compleanno in mezzo alla pista. All’arrivo «Tanti auguri» e fuochi d’artificio. Il 1° marzo punti doppi.', ranch: true, fest: true, story: true, difficulty: 1, sky: 8, limit: 57, unlock: 5, dense: 0, song: 21,
    obs: { 0: ['cake', 'hay', 'puddle', 'stump'], 1: ['puddle', 'cake', 'puddle', 'hay'], 2: ['cake', 'step', 'hay', 'rock'], 3: ['hay', 'cake', 'puddle', 'stump'] },
    layout: [{ t: 0, len: 6, name: 'LA FESTA COMINCIA' }, { t: 1, len: 8, wet: 1, name: 'IL FANGO DI MIRCO' }, { t: 0, len: 7, icy: 1, name: 'LASTRA DI GHIACCIO' }, { t: 1, len: 7, down: 1, wet: 1, name: 'CAMPA GIÙ!' }, { t: 0, len: 8, name: 'LE TORTE IN PISTA' }, { t: 0, len: 7, icy: 1, name: 'IL GHIACCIO DEL GUSTA' }, { t: 0, len: 5, down: 1, name: 'TANTI AUGURI!' }] },
  { id: 21, short: 'VIETNAM', name: 'Leventino Vietnam Edition', desc: 'L’edizione super bagnata del Leventino: piove dall’inizio alla fine, risaie allagate ai lati, guadi uno dopo l’altro, fango fino al casco e sudore negli occhi. Il ristoro c’è anche qui… sotto un gazebo che gocciola.', difficulty: 2, sky: 9, limit: 60, unlock: 6, rainy: true, ristoro: true, wigs: true, story: true, look: 'viet', song: 22, dense: .02,
    obs: { 0: ['puddle', 'log', 'root', 'puddle'], 1: ['puddle', 'puddle', 'root', 'log'], 2: ['puddle', 'step', 'root', 'log'], 3: ['puddle', 'rock', 'root', 'step'] },
    layout: [{ t: 1, len: 6, name: 'PARTENZA SOTTO IL DILUVIO' }, { t: 1, len: 9, name: 'LE RISAIE' }, { t: 1, len: 7, down: 1, name: 'IL GUADO INFINITO' }, { t: 2, len: 8, climb: .7, wet: 1, name: 'LA SALITA DEL SUDORE' }, { t: 1, len: 6, name: 'IL RISTORO ALLAGATO' }, { t: 3, len: 9, wet: 1, name: 'FANGO FINO AL CASCO' }, { t: 1, len: 7, down: 1, name: 'ARRIVO A MOLLO' }] },
  // v140 · SCUOLA DI ENDURO EDT: giro di allenamento lento, senza tempo e senza cadute che contano: un ostacolo alla volta col suo cartello.
  { id: 22, hidden: true, school: true, short: 'PROVA', name: 'Giro di prova col Gabbah', desc: 'Il giro di allenamento: senza cronometro, un ostacolo alla volta, il Gabbah ti spiega ostacoli, punti e trucchi.', difficulty: 0, sky: 0, limit: 240, unlock: 1, story: true, song: 6,
    layout: [{ t: 0, len: 60, name: 'GIRO DI PROVA COL GABBAH' }] },
];
// v59 · percorsi tolti dal menu (restano nell'elenco per non mescolare record e classifiche già salvati)
// v127 · eventi a tempo: Christmas Madness dal 1° dicembre al 6 gennaio (con ?xmas=1 si vede prima, per le prove)
export function xmasOn(d = new Date()) {
  try { if (/[?&]xmas=1/.test(location.search) || localStorage.getItem('edt-xmas') === '1') return true; } catch {}
  const m = d.getMonth(), g = d.getDate(); return m === 11 || (m === 0 && g <= 6);
}
export const xmasDouble = (d = new Date()) => d.getMonth() === 11 && d.getDate() === 21;   // la notte della Christmas Madness vera
export const xmasTeaser = (d = new Date()) => !xmasOn(d) && d.getMonth() === 10;   // v149 · tutto novembre si vede col lucchetto (prima dal 15)
export const eventOn = ev => ev === 'xmas' ? xmasOn() || xmasTeaser() : true;
export const lockText = m => m.event === 'xmas' && !xmasOn() ? 'ARRIVA IL 1° DICEMBRE' : 'LIV ' + (m.unlock || 1);
export const SHOWN = () => MODES.filter(m => !m.hidden && (!m.event || eventOn(m.event)));
export const isUnlocked = (m, level = levelInfo().level) => (m.event !== 'xmas' || xmasOn()) && level >= (m.unlock || 1);
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
  // v107.3 · la maglia vera del club: si sblocca tornando 3 giorni di fila (forziere del giorno)
  { id: 'semplice', name: 'Endurista Semplice', icon: '👕', level: 1, streak: 3, shirt: 'semplice', plastic: '#e93825', accent: '#141414', jersey: '#f4f3ee', pants: '#1c1e20', helmet: '#1b1b1b' },
  { id: 'oro', name: 'Oro Leggenda', icon: '🏆', level: 9, plastic: '#d9a826', accent: '#111111', jersey: '#141414', pants: '#141414', helmet: '#e7b934', pattern: 'righe', ink: '#f6d46a' },
  { id: 'stelle', name: 'Stellare', icon: '⭐', level: 1, stars: 18, plastic: '#1b1f3a', accent: '#f2c230', jersey: '#1b1f3a', pants: '#f2c230', helmet: '#f2c230', pattern: 'bolle', ink: '#f2c230' },   // v130 · 18 stelle
  { id: 'rookie', name: 'Debuttante EDT', icon: '🎓', level: 1, starter: true, plastic: '#1f8fd8', accent: '#fcd326', jersey: '#ffffff', pants: '#1f8fd8', helmet: '#fcd326' },   // v129 · si vince finendo le missioni del pilota nuovo
  { id: 'levgirl', name: 'Leventino Girl', icon: '💖', level: 1, lev: true, plastic: '#ff3fb4', accent: '#3fd0ff', jersey: '#ff3fb4', pants: '#1d1d1b', helmet: '#ff3fb4', wig: '#ff4fc0' },   // v132 · primo al Leventino
  { id: 'supergabbah', name: 'Super Gabbah', icon: '👑', level: 1, fest: true, plastic: '#141414', accent: '#d9ad2b', jersey: '#141414', pants: '#141414', helmet: '#d9ad2b' },   // v132 · si vince arrivando primo alla Mirco e Gabbah Fest
  { id: 'supermirco', name: 'Super Mirco', icon: '⚡', level: 1, fest: true, plastic: '#2160d6', accent: '#e32020', jersey: '#2160d6', pants: '#1d2440', helmet: '#e32020' },
  { id: 'stagione11', name: 'Stagione 11', icon: '🔟', level: 1, s11: true, plastic: '#101418', accent: '#19d3c5', jersey: '#101418', pants: '#19d3c5', helmet: '#19d3c5', pattern: 'righe', ink: '#19d3c5' },   // v150 · regalo a chi finisce un giro nella prima settimana dell'aggiornamento
  { id: 'babbo', name: 'Babbo Natale', icon: '🎅', level: 1, xmas: true, plastic: '#d8262f', accent: '#ffffff', jersey: '#d8262f', pants: '#1d1d1b', helmet: '#ffffff' },   // v127 · si vince finendo la Christmas Madness
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
export const MAX_UPGRADE = 8, LEGEND_FROM = 5;   // v106.6 · livelli Leggenda 6-8: carissimi, vantaggio piccolo (in gara valgono 0,4 l'uno)
const COSTS = [30, 60, 100, 160, 240, 700, 1000, 1400], PRO_COSTS = [150, 250, 350, 450, 500, 900, 1300, 1800];   // v96 · speciali: ~1.700 birre l'uno
export function upgradeLevel(id) { return Math.min(MAX_UPGRADE, data.upgrades[id] || 0); }
export function upgradeCost(id) { const l = upgradeLevel(id); return l >= MAX_UPGRADE ? null : (UPGRADES.find(u => u.id === id)?.pro ? PRO_COSTS : COSTS)[l]; }
export function buyUpgrade(id) {
  const cost = upgradeCost(id);
  if (cost == null || data.beers < cost) return false;
  data.beers -= cost; data.upgrades[id] = upgradeLevel(id) + 1; save(); return true;
}
// v109.4 · si può tornare indietro: un livello alla volta o tutto, e si riprende l'80% delle birre spese
export const REFUND = .8;
export function upgradeRefund(id) { const l = upgradeLevel(id); if (!l) return 0; return Math.floor((UPGRADES.find(u => u.id === id)?.pro ? PRO_COSTS : COSTS)[l - 1] * REFUND); }
export function sellUpgrade(id, doSave = true) { const r = upgradeRefund(id); if (!r) return 0; data.upgrades[id] = upgradeLevel(id) - 1; data.beers += r; if (doSave) save(); return r; }
export function refundAllValue() { let t = 0; for (const u of UPGRADES) { const pc = u.pro ? PRO_COSTS : COSTS; for (let l = upgradeLevel(u.id); l > 0; l--) t += Math.floor(pc[l - 1] * REFUND); } return t; }
export function resetUpgrades() { let t = 0; for (const u of UPGRADES) while (upgradeLevel(u.id) > 0) t += sellUpgrade(u.id, false); save(); return t; }

// ---------- v44 · Moto nuove e accessori (officina) ----------
// stats: speed = velocità, jump = salto, steer = sterzo, turbo = carica del turbo, wheelie = secondi di impennata in più, climb = salite
export const BIKES = [
  { id: 'edt250', name: 'EDT 250 4T', price: 0, level: 1, icon: '🏍', desc: 'La moto di tutti i giorni: nessun punto debole, nessun record.', ideal: 'tutti i percorsi', stats: {}, look: { paint: { plastic: '#d42a1e', accent: '#ffc61a', side: '#d42a1e', frame: '#9ea4a8', seat: '#1b1d1f', pattern: 'fiamme', ink: '#ffb000' }, scale: 1 } },
  { id: 'gp125', name: 'Due tempi 125', price: 140, level: 2, icon: '🏍', desc: 'Leggerissima: sterza al volo e salta di più. Sul dritto la passano.', ideal: 'MontaFiga, Ice', stats: { speed: -.03, jump: .1, steer: .22, turbo: .05 }, look: { paint: { plastic: '#f3f3ef', accent: '#ffd21a', side: '#f3f3ef', frame: '#b9bec1', seat: '#1b1d1f', pattern: 'mx', ink: '#2a86d6' }, scale: .93, twoStroke: true } },
  { id: 'trial', name: 'La Trial di Giacu', price: 260, level: 3, icon: '🏍', desc: 'Senza sella, nata per saltare e arrampicarsi: salti lunghi, impennate infinite, sale ovunque. Ma è lenta.', ideal: 'Angelo Potter, Dopo migliora!', stats: { speed: -.08, jump: .18, wheelie: 2.2, climb: .45, steer: .08 }, look: { paint: { plastic: '#f2f2f0', accent: '#e02a2a', side: '#d92525', frame: '#c4c8ca', seat: '#1b1d1f', pattern: 'mx', ink: '#d92525' }, scale: .96, trial: true } },
  { id: 'ts300', name: '300 Due tempi', price: 380, level: 4, icon: '🔥', desc: 'Cattiva: spunto da razzo e turbo che si carica in un attimo. Pesa un filo nei salti.', ideal: 'Giro easy, Anti-GEV', stats: { speed: .05, turbo: .35, jump: -.04, steer: .02 }, look: { paint: { plastic: '#ff6b00', accent: '#1a1a1a', side: '#ff6b00', frame: '#ff6b00', seat: '#1b1d1f', pattern: 'tigre', ink: '#141414' }, scale: 1.01, twoStroke: true } },
  { id: 'mulo450', name: '450 Mulo', price: 520, level: 5, icon: '🏍', desc: 'Tanta coppia e spalle larghe: vola in salita e nel fango, regge le botte, ma è dura da girare.', ideal: 'Dopo migliora!, Gusta Ranch', stats: { speed: .06, climb: .5, steer: -.12, protect: .3 }, look: { paint: { plastic: '#1f4fd1', accent: '#ffffff', side: '#f2f2f2', frame: '#b5bbbf', seat: '#1a2b6b', pattern: 'mx', ink: '#ffffff' }, scale: 1.05, big: true } },
  { id: 'vintage', name: 'Vecchia gloria ’89', price: 700, level: 6, icon: '🏆', desc: 'Doppio ammortizzatore e faro tondo: non è veloce, ma fa durare le combo, dà più punti e porta a casa più birre.', ideal: 'Giro easy, Sfida del giorno', stats: { speed: -.02, jump: .03, combo: 1.5, points: .06, beers: .1 }, look: { paint: { plastic: '#f4efe4', accent: '#d23a2a', side: '#f2c230', frame: '#202020', seat: '#141414', pattern: 'righina', ink: '#d23a2a' }, scale: 1, vintage: true } },
  // v46 · BO-anal Special Parts: le più care e le più forti di tutte.
  { id: 'boanal', name: 'T7 BO-anal Special', price: 1200, level: 6, icon: '💎', boanal: true, desc: 'BO-anal Special Parts: forte in tutto, senza punti deboli. Il turbo però è nella media.', ideal: 'tutti i percorsi', stats: { speed: .09, jump: .09, steer: .12, turbo: .15, climb: .25, wheelie: .8 }, look: { paint: { plastic: '#1f3fbf', accent: '#ffffff', side: '#f2f4f8', frame: '#e8ecf0', seat: '#1f3fbf', rims: '#2448c8', pattern: 'mx', ink: '#f2f4f8' }, scale: 1.02, twoStroke: true, boanal: true } },
  // v97 · tre moto per chi ha già tutto (dal livello 7)
  { id: 'electric', name: 'La Silenziosa', price: 1500, level: 7, icon: '⚡', top: true, desc: 'Elettrica: il turbo si carica più veloce di tutte e sale senza fatica. La batteria pesa: salta poco. Non fa rumore: fischia.', ideal: 'Notturna con le frontali, MotoFogna', stats: { speed: .07, turbo: .5, climb: .35, jump: -.06, steer: .08 }, look: { paint: { plastic: '#e9eef2', accent: '#19c37d', side: '#1b1f24', frame: '#2a2f35', seat: '#1b1d1f', pattern: 'mx', ink: '#19c37d' }, scale: .98, electric: true } },
  { id: 'dakar', name: 'Rally da Dakar 450', price: 1800, level: 7, icon: '🏍', top: true, desc: 'Cupolino e serbatoio grande: velocissima sul dritto e sulla sabbia, ma pesante da girare e da far saltare.', ideal: 'Il Desertone', stats: { speed: .15, climb: .15, turbo: .1, jump: -.06, steer: -.12 }, look: { paint: { plastic: '#f2f2ee', accent: '#d42a1e', side: '#1f3fbf', frame: '#c4c8ca', seat: '#1b1d1f', pattern: 'righina', ink: '#1f3fbf' }, scale: 1.06, big: true, rally: true } },
  { id: 'factory', name: 'Factory Ufficiale EDT', price: 2500, level: 7, icon: '🏁', top: true, desc: 'La moto ufficiale della squadra, nera e oro: la più completa di tutte. Nessun punto debole, ma nessun record.', ideal: 'tutti i percorsi', stats: { speed: .11, jump: .11, steer: .15, turbo: .3, climb: .3, wheelie: 1.2 }, look: { paint: { plastic: '#151515', accent: '#f2c230', side: '#151515', frame: '#f2c230', seat: '#151515', pattern: 'fiamme', ink: '#f2c230', rims: '#f2c230' }, scale: 1.02, twoStroke: true } },
  // v106.6 · tre moto nuove (modelli veri Higgsfield)
  { id: 'pitbike', name: 'La Pit bike di Siro', price: 900, level: 5, icon: '🏍', desc: 'Minimoto ridicola ma agilissima: sterza come nessuna, salta e impenna da paura. Sul dritto è la più lenta.', ideal: 'MontaFiga', stats: { speed: -.1, jump: .2, steer: .3, wheelie: 2.5 }, look: { paint: { plastic: '#ffd21a', accent: '#7b2fd0', side: '#ffd21a', frame: '#2a2a2a', seat: '#1b1d1f', pattern: 'mx', ink: '#7b2fd0' }, scale: 1 } },
  { id: 'bestia', name: 'La Bestia 690', price: 2800, level: 8, icon: '🏍', top: true, desc: 'Monocilindrico gigante: la più veloce di tutte, forte in salita. In curva è un camion.', ideal: 'Valle Argentera, Giro easy', stats: { speed: .18, climb: .3, turbo: .15, jump: -.04, steer: -.15 }, look: { paint: { plastic: '#3a3d42', accent: '#7dff2f', side: '#3a3d42', frame: '#b8bcc0', seat: '#1b1d1f', pattern: 'righina', ink: '#7dff2f' }, scale: 1.06, big: true } },
  // v144 · la moto vera del Gabbah: Honda Dominator "Fake Domi"
  { id: 'fakedomi', name: 'Fake Domi del Gabbah', price: 2200, level: 7, icon: '🏍', top: true, fakedomi: true, desc: 'La moto vera del Gabbah: Honda Dominator nera, rossa e gialla. Coppia da trattore in salita, e col portapacchi di serie porti a casa un quarto di birre in più. In curva pesa.', ideal: 'Leventino, Mirco e Gabbah Fest', stats: { speed: .1, climb: .45, turbo: .1, beers: .25, steer: -.08 }, look: { paint: { plastic: '#f4f4f4', accent: '#d42a1e', side: '#151515', frame: '#c4c8ca', seat: '#151515', ink: '#c41e14' }, scale: 1, big: true } },
  { id: 'hard300', name: 'Hard Enduro 300', price: 3200, level: 8, icon: '🏍', top: true, desc: 'La moto da Erzberg: la regina dell’hard enduro. Sale ovunque, salta, impenna e regge le botte; sul dritto va come le altre.', ideal: 'MotoFogna, Notturna con le frontali', stats: { speed: .07, jump: .17, steer: .16, turbo: .3, climb: .6, wheelie: 2.2, protect: .3 }, look: { paint: { plastic: '#ff6a13', accent: '#151515', side: '#ff6a13', frame: '#151515', seat: '#1b1d1f', pattern: 'mx', ink: '#151515', rims: '#d6a531' }, scale: 1.02, twoStroke: true } },
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
  // v106.6 · STILE: solo estetica, nessun vantaggio in gara
  { slot: 'casco', name: 'Casco', style: true, items: [
    { id: 'livrea', name: 'Colore della livrea', price: 0 },
    { id: 'opaco', name: 'Nero opaco', price: 150, color: '#1b1c1e' }, { id: 'perla', name: 'Bianco perla', price: 150, color: '#f3efe6' },
    { id: 'rosa', name: 'Rosa shocking', price: 200, color: '#ff3fa4' }, { id: 'acido', name: 'Verde acido', price: 200, color: '#9dff2f' },
    { id: 'carbonio', name: 'Carbonio', price: 260, color: '#33373d' }, { id: 'cromo', name: 'Cromo', price: 320, color: '#dfe6ea' } ] },
  { slot: 'fiamma', name: 'Fiamma del turbo', style: true, items: [
    { id: 'classica', name: 'Classica', price: 0, color: '#ffb12b' }, { id: 'blu', name: 'Blu gas', price: 180, color: '#3aa0ff' },
    { id: 'verde', name: 'Verde Kawa', price: 180, color: '#46ff5a' }, { id: 'viola', name: 'Viola', price: 220, color: '#b45cff' },
    { id: 'plasma', name: 'Plasma bianco', price: 300, color: '#e9f4ff' } ] },
  { slot: 'festa', name: 'Festa al traguardo', style: true, items: [
    { id: 'nessuna', name: 'Niente', price: 0 }, { id: 'coriandoli', name: 'Coriandoli EDT', price: 150, color: '#ffc61a' },
    { id: 'birre', name: 'Pioggia di birre', price: 250, color: '#e8a21c' }, { id: 'fuochi', name: 'Fuochi d’artificio', price: 350, color: '#ff5a3a' } ] },
];
data.bike ||= 'edt250'; data.owned ||= {}; data.parts ||= {};
export const ownsBike = id => id === 'edt250' || !!data.owned['bike:' + id];
// v106.6 · collezioni: completale per un titolo accanto al tuo pilota e un premio in birre
export const COLLECTIONS = [
  { id: 'factory', name: 'Squadra Factory', icon: '🏁', desc: 'Tutti i pezzi EDT Factory', prize: 400, items: () => PARTS.flatMap(p => p.items.filter(i => i.factory).map(i => [p.slot, i.id])) },
  { id: 'boanal', name: 'Cliente BO-anal', icon: '💎', desc: 'Tutti i pezzi BO-anal Special e la T7', prize: 300, items: () => [...PARTS.flatMap(p => p.items.filter(i => i.boanal).map(i => [p.slot, i.id])), ['bike', 'boanal']] },
  { id: 'garage', name: 'Garage pieno', icon: '🏍', desc: 'Tutte le moto', prize: 400, items: () => BIKES.filter(b => b.price).map(b => ['bike', b.id]) },
  { id: 'chiodi', name: 'Re del ghiaccio', icon: '❄', desc: 'Tutti i chiodi', prize: 250, items: () => PARTS.find(p => p.slot === 'studs').items.slice(1).map(i => ['studs', i.id]) },
  { id: 'stile', name: 'Fighetto del paddock', icon: '✨', desc: 'Tutto lo stile: caschi, fiamme e feste', prize: 300, items: () => PARTS.filter(p => p.style).flatMap(p => p.items.slice(1).map(i => [p.slot, i.id])) },
  { id: 'leggenda', name: 'Leggenda EDT', icon: '👑', desc: 'Tutti i potenziamenti al livello 8', prize: 1000, items: () => UPGRADES.map(u => ['upg', u.id]) },
];
const hasItem = ([slot, id]) => slot === 'bike' ? ownsBike(id) : slot === 'upg' ? upgradeLevel(id) >= MAX_UPGRADE : ownsPart(slot, id);
export function collectionProgress(c) { const it = c.items(); return { have: it.filter(hasItem).length, tot: it.length }; }
// premio una volta sola: torna le collezioni appena completate
export function claimCollections() {
  data.colls ||= {}; const out = [];
  for (const c of COLLECTIONS) { const p = collectionProgress(c); if (p.have >= p.tot && !data.colls[c.id]) { data.colls[c.id] = 1; data.beers += c.prize; out.push(c); } }
  if (out.length) save(); return out;
}
export function bestTitle() { data.colls ||= {}; const c = [...COLLECTIONS].reverse().find(x => data.colls[x.id]); return c ? c.icon + ' ' + c.name : ''; }
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

// v128 · si possono azzerare anche accessori (kind 'parts') e stile ('style'): tutto torna di serie e si riprende l'80% delle birre
const partSlots = kind => PARTS.filter(pt => kind === 'style' ? pt.style : !pt.style && !pt.ice);
export function partsRefundValue(kind) { let t = 0; for (const pt of partSlots(kind)) for (const it of pt.items) if (it.price && ownsPart(pt.slot, it.id)) t += Math.floor(it.price * REFUND); return t; }
export function resetParts(kind) {
  const t = partsRefundValue(kind);
  for (const pt of partSlots(kind)) { for (const it of pt.items) if (it.price && ownsPart(pt.slot, it.id)) delete data.owned[pt.slot + ':' + it.id]; data.parts[pt.slot] = pt.items[0].id; }
  data.beers += t; save(); return t;
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

// v130 · TRE STELLE PER PERCORSO: ★ arrivi al rifugio · ★★ tempo d'argento (6 s sotto il massimo) · ★★★ tempo d'oro (12 s sotto) senza cadute.
// Premi a 9, 18 e 27 stelle. Valgono i percorsi "a tempo" fissi (niente Potter, Ice, Sfida del giorno ed eventi).
export const STAR_MODES = [0, 1, 10, 11, 12, 13, 14, 15, 16, 18, 20, 21];
export const starTimes = m => { const L = MODES[m]?.limit || 58; return { silver: L - 6, gold: L - 12 }; };
export const starsFor = m => (data.stars || {})[m] || 0;
export const totalStars = () => STAR_MODES.reduce((a, m) => a + starsFor(m), 0);
export const maxStars = () => STAR_MODES.length * 3;
export const STAR_PRIZES = [{ at: 9, beers: 150, text: '+150 birre e «Il Bosco dell’Ignoranza» in radio' }, { at: 18, livery: 'stelle', text: 'la maglia «Stellare» e «Gas a martello» in radio' }, { at: 27, beers: 1000, text: '+1000 birre e il titolo «Re delle stelle»' }];
export function recordStars(m, win, time, hits) {
  if (!STAR_MODES.includes(m) || !win) return null;
  const t = starTimes(m), got = 1 + (time <= t.silver ? 1 : 0) + (time <= t.gold && !hits ? 1 : 0);
  data.stars = data.stars || {}; const before = starsFor(m), totBefore = totalStars();
  if (got > before) data.stars[m] = got;
  const totAfter = totalStars(), prizes = STAR_PRIZES.filter(pz => totBefore < pz.at && totAfter >= pz.at);
  for (const pz of prizes) if (pz.beers) data.beers += pz.beers;
  save(); return { got, before, best: Math.max(got, before), total: totAfter, prizes };
}
// v130 · CAMPIONATO EDT: 5 gare di fila contro gli stessi 3 piloti, punti 10-6-4-2, coppa e birre alla fine
export const CHAMP_POINTS = [10, 6, 4, 2];
export const champ = () => data.champ && !data.champ.over ? data.champ : null;
export const champOpen = () => STAR_MODES.filter(m => isUnlocked(MODES[m])).length >= 3;
export const champLevel = () => STAR_MODES.map(m => MODES[m].unlock || 1).sort((a, b) => a - b)[2] || 1;
export function champStart(riders, me, rng = Math.random) {
  const open = STAR_MODES.filter(m => isUnlocked(MODES[m])).sort(() => rng() - .5);
  const tracks = [0, ...open.filter(m => m !== 0)].slice(0, 5); while (tracks.length < 5) tracks.push(open[tracks.length % open.length]);
  const rivals = riders.filter(r => r !== me).sort(() => rng() - .5).slice(0, 3);
  data.champ = { tracks, rivals, i: 0, pts: Object.fromEntries([...rivals, '__me'].map(n => [n, 0])), last: null, over: false }; save(); return data.champ;
}
// order = nomi dall'arrivo (primo → ultimo, '__me' = io)
export function champRecord(order, dnf = false) {
  const c = champ(); if (!c) return null;
  order.forEach((n, k) => { if (!(dnf && n === '__me')) c.pts[n] = (c.pts[n] || 0) + (CHAMP_POINTS[k] || 0); });
  c.last = order; c.i++;
  if (c.i >= c.tracks.length) { c.over = true; const rank = Object.entries(c.pts).sort((a, b) => b[1] - a[1]).map(x => x[0]); c.final = rank; const pos = rank.indexOf('__me') + 1; c.prize = [0, 400, 200, 100, 0][pos] || 0; data.beers += c.prize; if (pos === 1) data.champWins = (data.champWins || 0) + 1; data.champDone = (data.champDone || 0) + 1; }
  save(); return c;
}
export function champQuit() { if (data.champ) { data.champ.over = true; data.champ.quit = true; save(); } }
export const lastChamp = () => data.champ || null;

// v131 · RADIO EDT: le canzoni dei percorsi sono sempre in radio; queste si sbloccano (id = indice della canzone in audio.js)
export const RADIO_EXTRA = [
  { id: 19, how: 'Finisci un Campionato EDT', ok: () => !!(data.champDone || data.champWins) },
  { id: 20, how: '9 stelle', ok: () => totalStars() >= 9 },
  { id: 24, how: '18 stelle', ok: () => totalStars() >= 18 },
  { id: 23, how: 'Livello 7', ok: () => levelInfo().level >= 7 },
];
export const radioOpen = id => { const x = RADIO_EXTRA.find(r => r.id === id); return !x || x.ok(); };
export function radioNew() {   // canzoni appena sbloccate (una volta sola)
  data.radioSeen = data.radioSeen || [];
  const nw = RADIO_EXTRA.filter(r => r.ok() && !data.radioSeen.includes(r.id)).map(r => r.id);
  if (nw.length) { data.radioSeen.push(...nw); save(); }
  return nw;
}

// v129 · MISSIONI DEL PILOTA NUOVO: 5 cose da fare nei primi giorni, in premio la maglia "Debuttante EDT".
// Partono solo per chi ha fatto meno di 12 giri quando le vede la prima volta (i veterani non le hanno).
export const STARTER = [
  { id: 'easy', name: 'Arriva al rifugio sul Giro Easy', icon: 'flag' },
  { id: 'perfect', name: 'Fai 3 salti perfetti in un giro', icon: 'star' },
  { id: 'upgrade', name: 'Compra il primo potenziamento in Officina', icon: 'wrench' },
  { id: 'share', name: 'Sfida un amico: mandagli il tuo punteggio', icon: 'share' },
  { id: 'back', name: 'Torna a giocare un altro giorno', icon: 'calendar' },
];
export function starter() {
  if (!data.starter) { if ((data.totals?.runs || 0) >= 12) return null; data.starter = { d: {}, day0: dayIndex() }; save(); }
  return data.starter;
}
// missioni che si fanno da sole (tornare un altro giorno, avere già un potenziamento)
export function starterAuto() { const s = starter(); if (!s) return []; const out = []; if (!s.d.back && dayIndex() > s.day0) out.push('back'); if (!s.d.upgrade && UPGRADES.some(u => upgradeLevel(u.id) > 0)) out.push('upgrade'); return out; }
export const totalUpgrades = () => UPGRADES.reduce((a, u) => a + upgradeLevel(u.id), 0);
export const cheapestUpgrade = () => COSTS[0];
export const starterDone = () => { const s = data.starter; return !!s && STARTER.every(m => s.d[m.id]); };
// segna una missione; restituisce 'new' se appena fatta, 'all' se con questa sono finite tutte (maglia sbloccata)
export function markStarter(id) {
  const s = starter(); if (!s || s.d[id]) return '';
  s.d[id] = 1; let r = 'new'; if (STARTER.every(m => s.d[m.id]) && !s.claimed) { s.claimed = 1; r = 'all'; } save(); return r;
}
export function markFestWin() { if (!data.festWin) { data.festWin = 1; save(); return true; } return false; }
export function markLevWin() { if (!data.levWin) { data.levWin = 1; save(); return true; } return false; }   // v132
export const festDouble = (d = new Date()) => d.getMonth() === 2 && d.getDate() === 1;   // v132 · 1° marzo: il compleanno vero
export function markXmasWin() { if (!data.xmasWin) { data.xmasWin = 1; save(); return true; } return false; }   // v127
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

export const liveryOpen = (l, level = levelInfo().level) => l.stars ? totalStars() >= l.stars : l.starter ? !!data.starter?.claimed : l.s11 ? !!data.s11Gift : l.xmas ? !!data.xmasWin : l.lev ? !!data.levWin : l.fest ? !!data.festWin : l.streak ? (data.daily?.best || 0) >= l.streak : l.level <= level;
export function unlockedLiveries(level = levelInfo().level) {
  return LIVERIES.filter(l => liveryOpen(l, level));
}
export function currentLivery() {
  const lv = LIVERIES.find(l => l.id === data.livery);
  return lv && liveryOpen(lv) ? lv : LIVERIES[0];
}

// ---------- v107.3 · Forziere del giorno: al primo giro di ogni giorno, più birre se torni tutti i giorni di fila ----------
export const CHEST = [20, 30, 40, 50, 60, 80, 300];   // v138 · settimo giorno di fila: forziere d'oro
const dayIndex = (d = new Date()) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime() / 864e5);
export function dailyInfo() {
  const g = data.daily || {}, today = dayIndex();
  const done = g.last === today, alive = done || g.last === today - 1;
  const next = done ? g.n : alive ? (g.n || 0) + 1 : 1;
  return { done, streak: alive ? g.n || 0 : 0, next, beers: CHEST[Math.min(next, CHEST.length) - 1], best: g.best || 0, lost: !alive && (g.n || 0) > 1 ? g.n : 0 };
}
export function claimDaily() {
  const info = dailyInfo(); if (info.done) return null;
  const before = unlockedLiveries().map(l => l.id);
  data.daily = { last: dayIndex(), n: info.next, best: Math.max(info.best, info.next) };
  data.beers += info.beers; save();
  const fresh = unlockedLiveries().filter(l => !before.includes(l.id));
  return { n: info.next, beers: info.beers, lost: info.lost, wallet: data.beers, fresh, tomorrow: CHEST[Math.min(info.next + 1, CHEST.length) - 1] };
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
// v123 · numero della settimana per la classifica cadute: 1 = settimana di lunedì 2/11/2026, poi +1 ogni lunedì
export function fallsWeek(d = new Date()) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return Math.round((x - new Date(2026, 10, 2, 12)) / 6048e5) + 1; }
export function weekFalls() { const st = stats(), w = st.wkHits; return w && w.w === fallsWeek() ? w.n : 0; }
// v96 · statistiche di sempre del pilota
export function stats() { return data.stats || (data.stats = {}); }
export function recordRun(run) {
  { const st = stats();   // v96 · totali di sempre
    st.runs = (st.runs || 0) + 1; st.wins = (st.wins || 0) + (run.position === 1 ? 1 : 0); st.podi = (st.podi || 0) + (run.position && run.position <= 3 ? 1 : 0);
    st.finished = (st.finished || 0) + (run.finishTime > 0 ? 1 : 0); st.caps = (st.caps || 0) + (run.caps || 0); st.jumps = (st.jumps || 0) + (run.jumps || 0);
    st.km = (st.km || 0) + (run.km || 0); st.driftM = (st.driftM || 0) + (run.driftM || 0); st.hits = (st.hits || 0) + (run.hits || 0);
    { const wk = fallsWeek(); if (!st.wkHits || st.wkHits.w !== wk) st.wkHits = { w: wk, n: 0 }; st.wkHits.n += run.hits || 0; }   // v123 · cadute della settimana (classifica cadute che riparte ogni lunedì)
    st.holeshots = (st.holeshots || 0) + (run.holeshot ? 1 : 0); st.bars = (st.bars || 0) + (run.bars || 0); st.turbos = (st.turbos || 0) + (run.turbos || 0);
    st.bestLeap = Math.max(st.bestLeap || 0, run.leap || 0); st.bestDrift = Math.max(st.bestDrift || 0, run.driftM || 0); st.bestSlalom = Math.max(st.bestSlalom || 0, run.slaloms || 0);
    st.winsBy = st.winsBy || {}; if (run.position === 1 && run.finishTime > 0) st.winsBy[run.mode] = (st.winsBy[run.mode] || 0) + 1;
    st.dolmen = (st.dolmen || 0) + (run.dolmens && !run.dolmenHit ? run.dolmens : 0); st.gold = (st.gold || 0) + (run.gold || 0);
    st.best = st.best || {}; if (run.finishTime > 0 && run.mode !== 2 && run.mode !== 9 && (!st.best[run.mode] || run.finishTime < st.best[run.mode])) st.best[run.mode] = +run.finishTime.toFixed(1); }
  const weeklyDone = [];
  for (const m of weeklyMissions()) if (!m.done && m.ok(run)) { data.weekly.done[m.id] = true; data.beers += m.beers; weeklyDone.push(m); stats().weekly = (stats().weekly || 0) + 1; }
  const before = levelInfo();
  data.totals.runs = (data.totals.runs || 0) + 1;
  if (run.finishTime > 0) data.totals.wins = (data.totals.wins || 0) + 1;   // v138 · arrivi al rifugio (per l'aiuto ai nuovi)
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
  const beersEarned = Math.round((run.caps * (1 + (currentStats().beers || 0)) + (finished ? 20 : 0) + completed.length * 10) * (weeklyX2 ? 2 : 1));   // v149 · Fake Domi e Vecchia gloria: più birre
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

// v149 · progressi nel cloud: cosa si salva (tutto tranne la classifica del bar, che resta del telefono) e come si rimette
export function cloudSnapshot() { const o = { ...data }; delete o.board; return { v: 1, data: o }; }
export function cloudApply(snap) {
  if (!snap || snap.v !== 1 || !snap.data || typeof snap.data !== 'object') return false;
  const keep = data.board || {};
  try { localStorage.setItem(KEY, JSON.stringify({ ...snap.data, board: keep })); return true; } catch { return false; }
}
export const progressScore = (o = data) => Math.round((o.xp || 0) + (o.beers || 0) / 10 + Object.values(o.upgrades || {}).reduce((a, b) => a + b, 0) * 50);
// v150 · MOTO GIUSTA: il percorso dove la moto rende di più (la riga «🎯 Ideale») vale +10% punti all'arrivo
export const FIT_BONUS = .1;
export function bikeFits(bikeId, modeId) {
  const b = BIKES.find(x => x.id === bikeId), m = MODES[modeId];
  if (!b || !m || !b.ideal || /tutti/i.test(b.ideal)) return false;
  return b.ideal.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).some(t => m.name.toLowerCase().startsWith(t));
}
export const fitBikes = modeId => BIKES.filter(b => bikeFits(b.id, modeId));
// v150 · REGALO DI STAGIONE 11: finisci un giro entro SEASON_GIFT.until → maglia «Stagione 11» + birre
export const SEASON_GIFT = { n: 11, until: 20261122, beers: 250 };
export const seasonGiftOpen = (d = new Date()) => !data.s11Gift && todayKey(d) <= SEASON_GIFT.until;
export function claimSeasonGift() {
  if (!seasonGiftOpen()) return null;
  data.s11Gift = todayKey(); data.beers = (data.beers || 0) + SEASON_GIFT.beers; save();
  return { beers: SEASON_GIFT.beers };
}
