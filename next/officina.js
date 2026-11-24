// Accessori, chiodi e stile: gli stessi del gioco uscito (copiati da progress.js), usati dalla versione nuova
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
export const STAT_TEXT = { speed: 'velocità', jump: 'salto', steer: 'sterzo', turbo: 'turbo', protect: 's protezione dopo un urto', combo: 's di combo', points: 'punti', sight: 'vedi meglio nella nebbia e al buio', climb: 'in salita', wheelie: 's impennata', grip: 'grip sul ghiaccio', drift: 'punti derapata' };
export function statLabel(st = {}) {
  return Object.entries(st).map(([k, v]) => k === 'sight' ? STAT_TEXT.sight : ['protect', 'combo', 'wheelie'].includes(k) ? '+' + String(v).replace('.', ',') + ' ' + STAT_TEXT[k] : (v > 0 ? '+' : '') + Math.round(v * 100) + '% ' + STAT_TEXT[k]).join(' · ');
}
