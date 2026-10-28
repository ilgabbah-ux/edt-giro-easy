// EDT Giro Easy · Classifica del gruppo (Google Apps Script; i dati vanno nel foglio "Giro Easy · Classifica" su Drive)
// Pubblicato come app web: Esegui come "Me", accesso "Chiunque".
// GET ?action=top                 → classifiche di tutti i percorsi (migliori 10, un record per nome) + coppa della settimana
// GET ?action=add&name=..&score=..&mode=..&day=..&rider=..&time=..&win=..&v=..&g=..  → salva e restituisce le classifiche
// v48 · g = "fantasma" del giro (posizione sul percorso secondo per secondo), per correre contro il primo in classifica
// v78 · COPPA DELLA SETTIMANA (da lunedì a domenica, ora italiana): per ogni percorso si fa la classifica della settimana
//       e si danno punti coppa 10-8-6-5-4-3-2-1 ai primi 8; vince chi ne somma di più. Si azzera ogni lunedì.
// v79 · STAGIONI: il gioco manda minv = prima versione con le regole attuali (velocità, punteggi, tempi massimi).
//       Classifiche, tempi e coppa contano solo i giri fatti da quella versione in poi, così si confrontano
//       giri giudicati con lo stesso metro. minv=0 → archivio di tutte le stagioni. Le righe vecchie restano nel foglio.
//       act = percorsi ancora nel gioco (quelli tolti non danno punti coppa).
// v89 · NOMI PROTETTI: k = codice pilota del telefono. Il primo che usa un nome lo prenota (foglio "Nomi", solo l'impronta
//       del codice, non il codice). Chi usa lo stesso nome con un codice diverso non entra in classifica (taken: true).
//       b = livello della moto (somma dei potenziamenti dell'officina), mostrato accanto al nome.
// v108.5 · edtName: i nomi dei piloti EDT e quelli prenotati prima del 28/10/2026 vanno sempre nella classifica EDT (il gioco si sposta da solo).
// v108.3 · DUE CLASSIFICHE: grp = 'edt' (amici dell'Enduro Drinking Team) o 'pub' (tutti gli altri). Colonna L del foglio:
//       'pub' per i giri pubblici, vuota per l'EDT (così tutte le righe vecchie restano dell'EDT). Classifiche, tempi e coppa
//       si fanno separati per gruppo; i nomi protetti restano unici per tutti.
const SHEET = 'Punteggi';
const MODES = 20;           // percorsi 0..19 (9 Ice Scrophy, 10 MotoFogna, 11 Valle Argentera, 12 MontaFiga, 13 Anti-GEV · v57; spazio per quelli futuri)
const DAILY = 3;
const ICE = 9;
const CAP = { 0: 200000, 1: 150000, 2: 60000, 3: 160000, 9: 120000, 10: 210000, 11: 150000, 12: 160000, 13: 230000, 14: 160000, 15: 160000, 16: 160000 };   // v102 · rifatti col bot a potenziamenti tutti al massimo (moto, pilota, speciali, pezzi Factory): circa il doppio del suo punteggio migliore   // v96 · punteggio massimo credibile per percorso
function minvOf_(p) { return Math.max(0, Math.round(Number(p.minv) || 0)); }              // v92 · Ice Scrofy: nel campo tempo ci sono i metri di derapata            // Sfida del giorno: classifica solo del giorno
const MAX_SCORE = 250000;
const CUP = [10, 8, 6, 5, 4, 3, 2, 1];
const ACTIVE = [0, 1, 2, 3, 9, 10, 11, 12, 13, 14, 15];   // percorsi nel menu (4-8 tolti nella v59)
// v108.5 · i piloti EDT del gioco, e chi aveva già un nome in classifica prima delle due classifiche, stanno sempre nella classifica EDT
const EDT_NAMES = ['albertone', 'albo', 'alex', 'andrea', 'angelo', 'brizio', 'ciprian', 'claudio', 'costa', 'daniel', 'erika', 'gabbah', 'guccio', 'gusta', 'il gabbah', 'linus', 'luigi', 'maggie', 'max', 'mirco', 'miti', 'paletta', 'purcello', 'renard', 'sergio', 'siro'];
const EDT_CUTOFF = new Date('2026-10-28T00:00:00+01:00');

function sheet_() {
  const ss = SpreadsheetApp.openById('1AVbuMrd3tPI9DCSv0b3XZo9q64egWY3yq1yan2OEHQg');
  let s = ss.getSheetByName(SHEET);
  if (!s) {
    s = ss.getSheets()[0];
    s.setName(SHEET);
    s.getRange(1, 1, 1, 9).setValues([['Data', 'Nome', 'Pilota', 'Percorso', 'Giorno', 'Punti', 'Tempo (s)', 'Arrivato', 'Versione']]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}

function names_() {
  const ss = SpreadsheetApp.openById('1AVbuMrd3tPI9DCSv0b3XZo9q64egWY3yq1yan2OEHQg');
  let s = ss.getSheetByName('Nomi');
  if (!s) { s = ss.insertSheet('Nomi'); s.getRange(1, 1, 1, 3).setValues([['Nome', 'Impronta codice', 'Dal']]).setFontWeight('bold'); s.setFrozenRows(1); }
  return s;
}
function hash_(k) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'edt|' + k)).slice(0, 24); }
// true = il nome si può usare con questo codice (e se era libero viene prenotato)
function claim_(name, k) {
  const s = names_(), last = s.getLastRow(), key = name.toLowerCase();
  const rows = last > 1 ? s.getRange(2, 1, last - 1, 2).getValues() : [];
  const row = rows.find(r => String(r[0]) === key);
  if (row) return !!k && row[1] === hash_(k);
  if (!k) return true;   // client vecchio su nome libero: passa ma non prenota
  s.appendRow([key, hash_(k), new Date()]);
  return true;
}

function edtName_(name) {
  const key = name.toLowerCase();
  if (EDT_NAMES.indexOf(key) >= 0) return true;
  const s = names_(), last = s.getLastRow();
  if (last < 2) return false;
  const row = s.getRange(2, 1, last - 1, 3).getValues().find(r => String(r[0]) === key);
  return !!row && row[2] instanceof Date && row[2] < EDT_CUTOFF;
}

function ymd_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Europe/Rome', 'yyyy-MM-dd') : String(v).slice(0, 10); }

function clean_(t, n) { return String(t || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); }

// lunedì della settimana di "day" (yyyy-MM-dd) e i 7 giorni prima
function monday_(day) {
  const p = day.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
function iso_(d) { return d.toISOString().slice(0, 10); }

function valid_(r, m, minv, grp) {
  if (Number(r[3]) !== m) return false;
  if ((String(r[11] || '') === 'pub') !== (grp === 'pub')) return false;   // v108.3 · solo i giri del proprio gruppo
  if ((Number(r[8]) || 0) < minv) return false;   // v79 · solo la stagione richiesta
  if (String(r[1]).indexOf('TEST_CLAUDE') === 0) return false;   // v57 · righe di prova ignorate
  if (m === 2 && (Number(r[8]) || 0) < 59) return false;   // v59 · Taglio di Angelo ora è una gara di salto: contano solo i salti
  return true;
}

// v78 · coppa: classifica della settimana per percorso → punti coppa
function cup_(rows, from, to, minv, act, grp) {
  const tot = {};
  act.forEach(m => {
    const best = {};
    rows.forEach(r => {
      if (!valid_(r, m, minv, grp)) return;
      const d = ymd_(r[0]); if (d < from || d > to) return;
      const k = String(r[1]).toLowerCase(), sc = Number(r[5]) || 0;
      if (!best[k] || sc > best[k].s) best[k] = { n: String(r[1]), r: String(r[2]), s: sc };
    });
    Object.values(best).sort((a, b) => b.s - a.s).slice(0, CUP.length).forEach((e, i) => {
      const k = e.n.toLowerCase();
      if (!tot[k]) tot[k] = { n: e.n, r: e.r, p: 0, w: 0, c: 0 };
      tot[k].p += CUP[i]; tot[k].c++; if (i === 0) tot[k].w++;
    });
  });
  return Object.values(tot).sort((a, b) => b.p - a.p || b.w - a.w);
}

function boards_(day, minv, act, grp) {
  const s = sheet_();
  const last = s.getLastRow();
  const rows = last > 1 ? s.getRange(2, 1, last - 1, 12).getValues() : [];
  const out = {}, times = {};
  for (let m = 0; m < MODES; m++) {
    const best = {}, bestT = {};
    rows.forEach(r => {
      if (!valid_(r, m, minv, grp)) return;
      if (m === DAILY && ymd_(r[4]) !== day) return;
      const k = String(r[1]).toLowerCase();
      const sc = Number(r[5]) || 0;
      const tt = Number(r[6]) || 0, won = r[7] === true || r[7] === 'TRUE' || r[7] === 'sì';
      if (m === ICE && tt > 0 && (!bestT[k] || tt > bestT[k].t)) bestT[k] = { n: String(r[1]), r: String(r[2]), s: sc, t: tt, w: true, d: ymd_(r[0]) };   // v92 · Ice Scrofy: metri di derapata, vince il più alto
      else if (m !== ICE && won && tt > 0 && (!bestT[k] || tt < bestT[k].t)) bestT[k] = { n: String(r[1]), r: String(r[2]), s: sc, t: tt, w: true, d: ymd_(r[0]) };
      if (!best[k] || sc > best[k].s) best[k] = { n: String(r[1]), r: String(r[2]), s: sc, t: Number(r[6]) || 0, w: r[7] === true || r[7] === 'TRUE' || r[7] === 'sì', d: ymd_(r[0]), g: String(r[9] || ''), b: r[10] === '' || r[10] == null ? null : Number(r[10]) };
    });
    Object.keys(best).forEach(k => { if (bestT[k]) best[k].bt = bestT[k].t; });
    out[m] = Object.values(best).sort((a, b) => b.s - a.s).slice(0, 10);
    times[m] = Object.values(bestT).sort((a, b) => m === ICE ? b.t - a.t : a.t - b.t).slice(0, 10);   // v48 · classifica dei tempi migliori
  }
  const mon = monday_(day), sun = new Date(mon.getTime() + 6 * 864e5);
  const pmon = new Date(mon.getTime() - 7 * 864e5), psun = new Date(mon.getTime() - 864e5);
  // v96 · la settimana scorsa si giudica con tutti i suoi giri (anche se nel frattempo è iniziata una stagione nuova): podio dei primi 3
  const prev3 = cup_(rows, iso_(pmon), iso_(psun), 0, act, grp).slice(0, 3);
  const week = { from: iso_(mon), to: iso_(sun), list: cup_(rows, iso_(mon), iso_(sun), minv, act, grp).slice(0, 15), prev: prev3[0] || null, prev3: prev3, prevFrom: iso_(pmon) };
  return { out: out, times: times, week: week };
}

function reply_(obj, cb) {
  const txt = JSON.stringify(obj);
  if (cb && /^[\w.$]+$/.test(cb)) return ContentService.createTextOutput(cb + '(' + txt + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

// v108.6 · CONTATORE GIOCATORI: il gioco manda action=hit con kind = open (prima apertura del giorno), play (primo giro
//       del giorno), new (primissima apertura su quel telefono), run (ogni giro finito). Una riga per evento nel foglio "Visite";
//       il foglio "Riepilogo" fa i conti per giorno (dispositivi unici che aprono / giocano, nuovi, giri).
const HIT_KINDS = ['open', 'play', 'new', 'run'];
function visits_() {
  const ss = SpreadsheetApp.openById('1AVbuMrd3tPI9DCSv0b3XZo9q64egWY3yq1yan2OEHQg');
  let s = ss.getSheetByName('Visite');
  if (!s) {
    s = ss.insertSheet('Visite'); s.getRange(1, 1, 1, 6).setValues([['Data', 'Giorno', 'Tipo', 'Dispositivo', 'Gruppo', 'Versione']]).setFontWeight('bold'); s.setFrozenRows(1);
    let r = ss.getSheetByName('Riepilogo');
    if (!r) { r = ss.insertSheet('Riepilogo'); r.getRange('A1').setFormula('=QUERY(Visite!B:E,"select B, count(D) where B is not null group by B pivot C order by B desc",1)'); r.getRange('H1').setValue('Aperture e giocatori = telefoni diversi al giorno · new = nuovi telefoni · run = giri finiti'); }
  }
  return s;
}
function hit_(p, day) {
  const kind = String(p.kind || ''); if (HIT_KINDS.indexOf(kind) < 0) return;
  const id = /^[a-z0-9]{6,16}$/.test(p.id || '') ? p.id : ''; if (!id) return;
  const c = CacheService.getScriptCache(), k = 'h|' + kind + '|' + id + '|' + day;
  if (kind !== 'run' && c.get(k)) return;   // un evento a testa al giorno (tranne i giri)
  if (kind !== 'run') c.put(k, '1', 21600);
  visits_().appendRow([new Date(), day, kind, id, p.grp === 'pub' ? 'pub' : 'edt', clean_(p.v, 8)]);
}
// v108.6 · SOTTO CARICO: le classifiche si rifanno al massimo ogni 20 s per gruppo (cache), e si ricalcolano subito dopo un giro salvato.
function boardsCached_(day, minv, act, grp) {
  const c = CacheService.getScriptCache(), key = ['b', grp, minv, act.join('.'), day, c.get('ver|' + grp) || '0'].join('|');
  try { const hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) {}
  const b = boards_(day, minv, act, grp);
  try { const txt = JSON.stringify(b); if (txt.length < 95000) c.put(key, txt, 20); } catch (e) {}
  return b;
}
function bump_(grp) { try { const c = CacheService.getScriptCache(); c.put('ver|' + grp, String(Date.now()), 21600); } catch (e) {} }

function doGet(e) {
  const p = (e && e.parameter) || {};
  const day = /^\d{4}-\d{2}-\d{2}$/.test(p.day || '') ? p.day : Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  if (p.action === 'hit') { try { hit_(p, day); } catch (err) {} return reply_({ ok: true }, p.callback); }
  let saved = false, taken = false, edtName = false;
  if (p.action === 'add') {
    const name = clean_(p.name, 16);
    const score = Math.round(Number(p.score));
    const mode = Math.round(Number(p.mode));
    // v96 · controlli di buon senso contro i giri truccati: punteggio, tempo, metri e versione devono essere credibili
    const tm = Number(p.time) || 0, vv = Number(p.v) || 0;
    const plausible = vv >= minvOf_(p) && score <= (CAP[mode] || 150000) &&
      (mode === 2 ? tm <= 400 : mode === ICE ? tm <= 1600 : (p.win !== '1' || tm >= 22));   // v102 · tempo minimo credibile 22 s: col bot a potenziamenti tutti al massimo il giro più veloce è 30,6 s (Argentera e Frontali); 22 s lascia margine a chi guida meglio del bot, con pietraie, turbo e premi del rifugio
    if (name && score > 0 && score <= MAX_SCORE && mode >= 0 && mode < MODES && plausible) {
      const lock = LockService.getScriptLock();
      lock.waitLock(8000);
      try {
        const k = /^[a-z0-9]{4,12}$/.test(p.k || '') ? p.k : '';
        if (!claim_(name, k)) { taken = true; throw new Error('taken'); }
        edtName = edtName_(name);   // v108.5 · nome EDT: il giro va nella classifica EDT anche da un telefono nuovo
        const g = /^[0-9a-z]{2,320}$/.test(p.g || '') ? p.g : '';
        const sh = sheet_();
        if (sh.getRange(1, 10).getValue() === '') sh.getRange(1, 10).setValue('Fantasma').setFontWeight('bold');
        if (sh.getRange(1, 11).getValue() === '') sh.getRange(1, 11).setValue('Moto').setFontWeight('bold');
        if (sh.getRange(1, 12).getValue() === '') sh.getRange(1, 12).setValue('Gruppo').setFontWeight('bold');
        sh.appendRow([new Date(), name, clean_(p.rider, 20), mode, day, score, Math.round((Number(p.time) || 0) * 10) / 10, p.win === '1', clean_(p.v, 8), g, Math.max(0, Math.min(99, Math.round(Number(p.b) || 0))), p.grp === 'pub' && !edtName ? 'pub' : '']);
        saved = true; bump_(p.grp === 'pub' && !edtName ? 'pub' : 'edt');
      } catch (err) { if (!taken) throw err; } finally { lock.releaseLock(); }
    }
  }
  const minv = Math.max(0, Math.round(Number(p.minv) || 0));
  const act = String(p.act || '').split(',').map(Number).filter(m => m >= 0 && m < MODES && String(p.act).length);
  const grp = p.grp === 'pub' && !edtName ? 'pub' : 'edt';
  const b = boardsCached_(day, minv, act.length ? act : ACTIVE, grp);
  return reply_({ ok: true, iceDesc: true, grp: grp, edtName: edtName, saved: saved, taken: taken, day: day, minv: minv, boards: b.out, times: b.times, week: b.week }, p.callback);
}
