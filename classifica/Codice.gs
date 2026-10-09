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
const SHEET = 'Punteggi';
const MODES = 20;           // percorsi 0..19 (9 Ice Scrophy, 10 MotoFogna, 11 Valle Argentera, 12 MontaFiga, 13 Anti-GEV · v57; spazio per quelli futuri)
const DAILY = 3;            // Sfida del giorno: classifica solo del giorno
const MAX_SCORE = 250000;
const CUP = [10, 8, 6, 5, 4, 3, 2, 1];
const ACTIVE = [0, 1, 2, 3, 9, 10, 11, 12, 13, 14];   // percorsi nel menu (4-8 tolti nella v59)

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

function ymd_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Europe/Rome', 'yyyy-MM-dd') : String(v).slice(0, 10); }

function clean_(t, n) { return String(t || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); }

// lunedì della settimana di "day" (yyyy-MM-dd) e i 7 giorni prima
function monday_(day) {
  const p = day.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow);
  return d;
}
function iso_(d) { return d.toISOString().slice(0, 10); }

function valid_(r, m, minv) {
  if (Number(r[3]) !== m) return false;
  if ((Number(r[8]) || 0) < minv) return false;   // v79 · solo la stagione richiesta
  if (String(r[1]).indexOf('TEST_CLAUDE') === 0) return false;   // v57 · righe di prova ignorate
  if (m === 2 && (Number(r[8]) || 0) < 59) return false;   // v59 · Taglio di Angelo ora è una gara di salto: contano solo i salti
  return true;
}

// v78 · coppa: classifica della settimana per percorso → punti coppa
function cup_(rows, from, to, minv, act) {
  const tot = {};
  act.forEach(m => {
    const best = {};
    rows.forEach(r => {
      if (!valid_(r, m, minv)) return;
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

function boards_(day, minv, act) {
  const s = sheet_();
  const last = s.getLastRow();
  const rows = last > 1 ? s.getRange(2, 1, last - 1, 10).getValues() : [];
  const out = {}, times = {};
  for (let m = 0; m < MODES; m++) {
    const best = {}, bestT = {};
    rows.forEach(r => {
      if (!valid_(r, m, minv)) return;
      if (m === DAILY && ymd_(r[4]) !== day) return;
      const k = String(r[1]).toLowerCase();
      const sc = Number(r[5]) || 0;
      const tt = Number(r[6]) || 0, won = r[7] === true || r[7] === 'TRUE' || r[7] === 'sì';
      if (won && tt > 0 && (!bestT[k] || tt < bestT[k].t)) bestT[k] = { n: String(r[1]), r: String(r[2]), s: sc, t: tt, w: true, d: ymd_(r[0]) };
      if (!best[k] || sc > best[k].s) best[k] = { n: String(r[1]), r: String(r[2]), s: sc, t: Number(r[6]) || 0, w: r[7] === true || r[7] === 'TRUE' || r[7] === 'sì', d: ymd_(r[0]), g: String(r[9] || '') };
    });
    Object.keys(best).forEach(k => { if (bestT[k]) best[k].bt = bestT[k].t; });
    out[m] = Object.values(best).sort((a, b) => b.s - a.s).slice(0, 10);
    times[m] = Object.values(bestT).sort((a, b) => a.t - b.t).slice(0, 10);   // v48 · classifica dei tempi migliori
  }
  const mon = monday_(day), sun = new Date(mon.getTime() + 6 * 864e5);
  const pmon = new Date(mon.getTime() - 7 * 864e5), psun = new Date(mon.getTime() - 864e5);
  const week = { from: iso_(mon), to: iso_(sun), list: cup_(rows, iso_(mon), iso_(sun), minv, act).slice(0, 15), prev: cup_(rows, iso_(pmon), iso_(psun), minv, act)[0] || null };
  return { out: out, times: times, week: week };
}

function reply_(obj, cb) {
  const txt = JSON.stringify(obj);
  if (cb && /^[\w.$]+$/.test(cb)) return ContentService.createTextOutput(cb + '(' + txt + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const day = /^\d{4}-\d{2}-\d{2}$/.test(p.day || '') ? p.day : Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  let saved = false;
  if (p.action === 'add') {
    const name = clean_(p.name, 16);
    const score = Math.round(Number(p.score));
    const mode = Math.round(Number(p.mode));
    if (name && score > 0 && score <= MAX_SCORE && mode >= 0 && mode < MODES) {
      const lock = LockService.getScriptLock();
      lock.waitLock(8000);
      try {
        const g = /^[0-9a-z]{2,320}$/.test(p.g || '') ? p.g : '';
        const sh = sheet_();
        if (sh.getRange(1, 10).getValue() === '') sh.getRange(1, 10).setValue('Fantasma').setFontWeight('bold');
        sh.appendRow([new Date(), name, clean_(p.rider, 20), mode, day, score, Math.round((Number(p.time) || 0) * 10) / 10, p.win === '1', clean_(p.v, 8), g]);
        saved = true;
      } finally { lock.releaseLock(); }
    }
  }
  const minv = Math.max(0, Math.round(Number(p.minv) || 0));
  const act = String(p.act || '').split(',').map(Number).filter(m => m >= 0 && m < MODES && String(p.act).length);
  const b = boards_(day, minv, act.length ? act : ACTIVE);
  return reply_({ ok: true, saved: saved, day: day, minv: minv, boards: b.out, times: b.times, week: b.week }, p.callback);
}
