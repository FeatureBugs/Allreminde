/* =====================================================================
   04-logic.js – Rechenlogik: Fälligkeiten, Erinnerungen, Aktionen,
   automatische Aufgaben, Kosten, Suche. Hier wird nichts gezeichnet.
   ===================================================================== */

/* ---------- Nachschlagen ---------- */
const cat = id => S.categories.find(c => c.id === id);
const obj = id => S.objects.find(o => o.id === id);
const doc = id => S.docs.find(d => d.id === id);
const task = id => S.tasks.find(t => t.id === id);
const contact = id => S.contacts.find(c => c.id === id);
const kindOf = k => KINDS[k && k.kind] || KINDS.allgemein;
const colorOf = k => COLORS[k && k.color] || COLORS.grau;

const dtype = d => DOCTYPES[d && d.type] || DOCTYPES.sonst;
const docImgs = d => (d.files || []).filter(f => (f.type || "").startsWith("image/"));
// Dokumente tun bei Aufgaben so, als wären sie ein Bereich "Dokumente"
const docCat = d => ({ id: "__docs", name: "Dokumente", icon: dtype(d)[1], color: dtype(d)[3] });

// Wozu gehört eine Aufgabe? → { o: Eintrag, k: Bereich, d: Dokument }
function parentOf(t) {
  if (t.docId) { const d = doc(t.docId); return { o: null, k: d ? docCat(d) : null, d }; }
  const o = t.objId ? obj(t.objId) : null;
  const k = o ? cat(o.catId) : (t.catId ? cat(t.catId) : null);
  return { o, k, d: null };
}
const parentName = t => { const p = parentOf(t); return p.o ? p.o.name : p.d ? p.d.name : p.k ? p.k.name : "Allgemein"; };

/* ---------- Zählerstände (km, kWh …) ---------- */
const counterNow = o => { const h = (o && o.counter) || []; return h.length ? h[h.length - 1].v : null; };
const counterUnit = o => (o && o.counterUnit) || ((cat(o && o.catId) || {}).counter || {}).unit || "";
function counterRate(o) {                         // Durchschnitt pro Tag
  const h = ((o && o.counter) || []).slice().sort(by("d"));
  if (h.length < 2) return null;
  const a = h[0], b = h[h.length - 1], days = diffDays(parse(a.d), parse(b.d));
  return days >= 1 && b.v > a.v ? (b.v - a.v) / days : null;
}
function addCounterReading(o, dateStr, value) {
  o.counter = (o.counter || []).filter(h => h.d !== dateStr).concat([{ d: dateStr, v: value }]).sort(by("d"));
}

/* ---------- Erinnerungen ---------- */
// Welche Erinnerungen (Tage vorher) gelten für diese Aufgabe?
function remindersOf(t) {
  let list = t.reminders;
  if (!Array.isArray(list)) { const k = parentOf(t).k; list = (k && Array.isArray(k.reminders)) ? k.reminders : S.settings.reminders; }
  return [...new Set((list || [0]).map(Number))].sort((a, b) => b - a);
}

/* ---------- Fälligkeit berechnen ---------- */
function nextWeekday(from, days) {               // days: 1 = Mo … 7 = So
  const wanted = days && days.length ? days.map(Number) : [1];
  for (let i = 0; i < 8; i++) { const d = addDays(from, i); const wd = (d.getDay() + 6) % 7 + 1; if (wanted.includes(wd)) return d; }
  return from;
}
function nextMonthDay(from, mday) {               // mday: 1–31 oder "last"
  const pick = (y, m) => new Date(y, m, mday === "last" ? lastDayOfMonth(y, m) : Math.min(Number(mday) || 1, lastDayOfMonth(y, m)));
  let d = pick(from.getFullYear(), from.getMonth());
  if (d < from) d = pick(from.getFullYear(), from.getMonth() + 1);
  return d;
}
function skipPausedMonths(date, pause) {          // z. B. Düngepause im Winter
  if (!pause || !pause.length) return date;
  let d = new Date(date);
  for (let i = 0; i < 12 && pause.includes(d.getMonth() + 1); i++) d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return d;
}
// Intervall abhängig von der Jahreszeit (z. B. im Winter seltener gießen)
const intervalFor = (t, from) => (Number(t.winterEvery) > 0 && WINTER.includes(from.getMonth() + 1)) ? Number(t.winterEvery) : Number(t.every) || 1;

// Nächstes Fälligkeitsdatum ohne Verschiebung. pct = Fortschritt 0…1 für den Balken
function baseDue(t) {
  const T = today();
  let due = null, pct = null, extra = "";
  const lastOrStart = parse(t.lastDone || t.start) || T;
  const afterLast = t.lastDone ? addDays(parse(t.lastDone), 1) : (parse(t.start) || T);

  if (t.kind === "einmalig") {
    due = parse(t.date);
    const st = parse(t.start);
    if (due && st) { const total = diffDays(st, due); pct = total > 0 ? diffDays(st, T) / total : 1; }
  } else if (t.kind === "jaehrlich") {
    const d = parse(t.date);
    if (d) {
      const from = t.lastDone ? addDays(parse(t.lastDone), 1) : T;
      due = new Date(from.getFullYear(), d.getMonth(), d.getDate());
      if (due < from) due = new Date(from.getFullYear() + 1, d.getMonth(), d.getDate());
      pct = 1 - diffDays(T, due) / 365;
    }
  } else if (t.kind === "intervall") {
    due = skipPausedMonths(addUnit(lastOrStart, intervalFor(t, lastOrStart), t.unit), t.pause);
    const total = diffDays(lastOrStart, due); pct = total > 0 ? diffDays(lastOrStart, T) / total : 1;
  } else if (t.kind === "wochentage") {
    due = skipPausedMonths(nextWeekday(afterLast, t.days), t.pause);
  } else if (t.kind === "monatlich") {
    due = skipPausedMonths(nextMonthDay(afterLast, t.mday), t.pause);
  } else if (t.kind === "zaehler") {
    const o = obj(t.objId), cur = counterNow(o), every = Number(t.counterEvery) || 0;
    if (cur != null && every > 0) {
      const left = Number(t.lastValue) + every - cur;
      pct = (cur - Number(t.lastValue)) / every;
      extra = left > 0 ? fmtN(left) + " " + counterUnit(o) + " übrig" : fmtN(-left) + " " + counterUnit(o) + " drüber";
      const rate = counterRate(o);
      if (left <= 0) due = T; else if (rate) due = addDays(T, Math.round(left / rate));
    }
    if (Number(t.every) > 0) {                    // zusätzlich: spätestens nach Zeit
      const byTime = addUnit(lastOrStart, t.every, t.unit);
      if (!due || byTime < due) due = byTime;
      const total = diffDays(lastOrStart, byTime);
      pct = Math.max(pct || 0, total > 0 ? diffDays(lastOrStart, T) / total : 1);
    }
  }
  if (pct != null) pct = Math.min(1, Math.max(0, pct));
  return { due, pct, extra };
}

/* Vollständiger Status einer Aufgabe:
   st = done | ended | over | today | soon | snoozed | ok
   days = Tage bis fällig (negativ = überfällig) */
function calc(t) {
  const T = today();
  const rem = remindersOf(t);
  let { due, pct, extra } = baseDue(t);
  const orig = due;
  let snoozed = false;
  // Verschoben: nur Datum ("2026-11-05") oder Datum mit Uhrzeit ("2026-11-05T18:00")
  const hasTime = !!(t.snooze && t.snooze.length > 10);
  if (t.snooze && !t.done) { const sz = parse(t.snooze); if (sz && (hasTime ? parseDateTime(t.snooze) > new Date() : sz >= T)) { due = sz; snoozed = true; } }
  const snoozeTime = snoozed && hasTime ? t.snooze.slice(11, 16) : "";
  const ended = !!(t.until && orig && orig > parse(t.until));
  const days = due ? diffDays(T, due) : null;
  let st = "ok";
  if (t.done) st = "done";
  else if (ended) st = "ended";
  else if (snoozed && (days > 0 || snoozeTime)) st = "snoozed";
  else if (days != null && days < 0) st = "over";
  else if (t.kind === "zaehler" && pct >= 1) st = "over";
  else if (days === 0) st = "today";
  else if (days != null && days <= Math.max(...rem)) st = "soon";
  const remindToday = days != null && days > 0 && rem.includes(days) && !t.done;
  return { due, days, pct, st, extra, rem, snoozed, snoozeTime, orig, ended, remindToday };
}

// Alle offenen Aufgaben mit Status (gelöschte Eltern und beendete Serien werden ignoriert)
function activeTasks() {
  return S.tasks.filter(t => !t.done && (!t.objId || obj(t.objId)) && (!t.docId || doc(t.docId)) && !(t.objId && obj(t.objId).archived))
    .map(t => ({ t, c: calc(t) })).filter(x => x.c.st !== "ended");
}
// Sortierung: zuerst nach Fälligkeit, bei Gleichstand wichtigere zuerst
function sortByDue(a, b) {
  const da = a.c.days == null ? 99999 : a.c.days, db = b.c.days == null ? 99999 : b.c.days;
  return da - db || (b.t.prio || 0) - (a.t.prio || 0);
}

// Alle Termine einer Aufgabe in einem Zeitraum (für Kalender, Jahresplaner, Export)
function occurrences(t, from, to) {
  const c = calc(t); if (!c.due || t.done || c.ended) return [];
  const out = [], until = parse(t.until);
  let d = c.due;
  for (let i = 0; i < 400 && d <= to && (!until || d <= until); i++) {
    if (d >= from) out.push(d);
    if (t.kind === "einmalig" || t.kind === "zaehler") break;
    if (t.kind === "jaehrlich") d = addUnit(d, 1, "y");
    else if (t.kind === "intervall") d = skipPausedMonths(addUnit(d, intervalFor(t, d), t.unit), t.pause);
    else if (t.kind === "wochentage") d = skipPausedMonths(nextWeekday(addDays(d, 1), t.days), t.pause);
    else if (t.kind === "monatlich") d = skipPausedMonths(nextMonthDay(addDays(d, 1), t.mday), t.pause);
  }
  return out;
}

/* ---------- Aktionen auf Aufgaben ---------- */
const stateOf = t => ({ lastDone: t.lastDone, lastValue: t.lastValue, done: t.done, snooze: t.snooze, rotIdx: t.rotIdx, checklist: clone(t.checklist || []) });
function pushHistory(t, entry) {
  t.history.forEach(h => delete h.prev);          // nur der letzte Schritt ist rückgängig machbar
  t.history.push(Object.assign({ prev: stateOf(t) }, entry));
  t.history = t.history.slice(-40);
}

// Erledigt: setzt den nächsten Termin, erzeugt ggf. Folge-Aufgabe. Gibt eine Meldung zurück.
function markDone(t, dateStr, extra) {
  const d = dateStr || todayStr();
  const o = t.objId ? obj(t.objId) : null;
  const value = extra && extra.counter != null ? extra.counter : counterNow(o);
  pushHistory(t, Object.assign({ d }, extra || {}));
  delete t.history[t.history.length - 1].counter;
  if (t.kind === "zaehler" && value != null) t.lastValue = value;
  t.lastDone = d; t.snooze = "";
  (t.checklist || []).forEach(x => x.done = false);
  if (t.rotation && t.rotation.length) t.rotIdx = ((t.rotIdx || 0) + 1) % t.rotation.length;
  if (t.kind === "einmalig") t.done = true;
  if (t.followUp && t.followUp.title) {
    S.tasks.push(newTask({ title: t.followUp.title, objId: t.objId, catId: t.catId, docId: t.docId, kind: "einmalig",
      date: ymd(addDays(parse(d), Number(t.followUp.days) || 0)), reminders: [0] }));
  }
  const c = calc(t);
  return t.done ? "„" + t.title + "“ erledigt" : "Erledigt. Nächstes Mal " + (c.days != null ? relDays(c.days) : "nach Zählerstand");
}
// Überspringen: dieses Mal auslassen, nächster Termin wird gesetzt
function skipTask(t) {
  const T = today(), c = calc(Object.assign({}, t, { snooze: "" }));
  pushHistory(t, { d: todayStr(), skipped: true });
  t.snooze = "";
  if (t.kind === "einmalig") t.done = true;
  else if (t.kind === "zaehler") { const cur = counterNow(obj(t.objId)); if (cur != null) t.lastValue = Math.max(cur, Number(t.lastValue) || 0); t.lastDone = todayStr(); }
  else { const due = c.due || T; t.lastDone = ymd(due > T ? due : T); }
}
// Letzten Schritt (erledigt/übersprungen) zurücknehmen
function undoLastStep(t) {
  const h = t.history[t.history.length - 1]; if (!h) return;
  if (h.prev) Object.assign(t, h.prev); else t.done = false;
  if (h.logId) { const o = obj(t.objId); if (o) o.log = o.log.filter(l => l.id !== h.logId); }
  t.history.pop();
}
// Vorschau: wann wäre der nächste Termin nach dem Überspringen?
function previewSkip(t) { const copy = clone(t); skipTask(copy); const c = calc(copy); return c.due && !copy.done ? fmtShort(c.due) : null; }

/* ---------- Verträge ---------- */
// Berechnet Laufzeitende und spätesten Kündigungstag
function contractInfo(c) {
  if (!c || !c.start) return null;
  const T = today(), step = Number(c.extendMonths) || 1;
  const monthly = (num(c.cost) || 0) / ({ m: 1, q: 3, y: 12 }[c.costEvery] || 1);
  if (c.status !== "aktiv") return { termEnd: parse(c.endDate), cancelBy: null, monthly, ended: c.status === "beendet" || (c.endDate && parse(c.endDate) < T) };
  let end = addUnit(parse(c.start), Number(c.minMonths) || step, "m");
  const noticeBefore = e => c.noticeUnit === "w" ? addDays(e, -7 * (Number(c.notice) || 0)) : addUnit(e, -(Number(c.notice) || 0), "m");
  for (let i = 0; i < 600 && (end <= T || noticeBefore(end) < T); i++) end = addUnit(end, step, "m");
  return { termEnd: end, cancelBy: noticeBefore(end), monthly, ended: false };
}
// Fertiger Text für ein Kündigungsschreiben
function cancellationLetter(o) {
  const p = S.profile, c = o.contract || {}, info = contractInfo(c) || {};
  const k = cat(o.catId), field = label => { const f = (k ? k.fields : []).find(x => x.label.toLowerCase().includes(label)); return f ? o.values[f.id] || "" : ""; };
  const nr = field("vertragsnummer") || field("kundennummer");
  return [p.name, p.street, [p.zip, p.city].filter(Boolean).join(" "), "", field("anbieter") || "[Anbieter]", "[Adresse des Anbieters]", "",
    [p.city, fmtD(today(), { day: "2-digit", month: "2-digit", year: "numeric" })].filter(Boolean).join(", "), "",
    "Kündigung meines Vertrags „" + o.name + "“" + (nr ? " – Nr. " + nr : ""), "",
    "Sehr geehrte Damen und Herren,", "",
    "hiermit kündige ich den oben genannten Vertrag fristgerecht zum " + (info.termEnd ? fmtD(info.termEnd, { day: "2-digit", month: "2-digit", year: "numeric" }) : "nächstmöglichen Zeitpunkt") + ", hilfsweise zum nächstmöglichen Zeitpunkt.",
    "Bitte bestätigen Sie mir den Eingang dieser Kündigung und das Vertragsende schriftlich.", "",
    "Mit freundlichen Grüßen", "", p.name].join("\n");
}

/* =====================================================================
   Automatische Aufgaben
   Manche Erinnerungen entstehen von selbst aus deinen Angaben, z. B.
   Ablaufdatum eines Dokuments, Garantieende, Geburtstag, Kündigungsfrist.
   Sie werden nach jeder Änderung abgeglichen.
   ===================================================================== */
function wantedAutoTasks() {
  const list = [], T = today();
  const want = (auto, ref, p) => list.push(Object.assign({ auto, ref, kind: "einmalig" }, p));
  S.docs.forEach(d => { if (d.expires) want("doc", d.id, { docId: d.id, title: d.name + (Number(d.renewEvery) > 0 ? " erneuern" : " läuft ab"), date: d.expires, start: d.issued || "", reminders: d.reminders, fav: d.fav }); });
  S.objects.forEach(o => {
    if (o.archived) return;
    const b = o.buy || {};
    if (b.warranty) want("garantie", o.id, { objId: o.id, title: "Garantie endet: " + o.name, date: b.warranty, reminders: [30, 7] });
    if (b.online && b.date) { const end = addDays(parse(b.date), 14); if (diffDays(T, end) >= -30) want("widerruf", o.id, { objId: o.id, title: "Rückgabefrist endet: " + o.name, date: ymd(end), reminders: [3, 1] }); }
    if (o.birthday && kindOf(cat(o.catId)).birthday) want("birthday", o.id, { objId: o.id, kind: "jaehrlich", title: "Geburtstag", date: o.birthday });
    const ci = contractInfo(o.contract);
    if (ci && ci.cancelBy) want("kuendigung", o.id, { objId: o.id, title: "Kündigungsfrist: " + o.name, date: ymd(ci.cancelBy), reminders: [30, 7, 1] });
  });
  S.lists.lent.forEach(x => { if (x.due && !x.done) want("lent", x.id, { title: (x.dir === "in" ? "Zurückgeben: " + x.thing + " an " : "Zurückfordern: " + x.thing + " von ") + x.person, date: x.due, reminders: [2, 0] }); });
  S.lists.vouchers.forEach(x => { if (x.expires && !x.used) want("voucher", x.id, { title: "Gutschein einlösen: " + x.name, date: x.expires, reminders: [30, 7] }); });
  S.trips.forEach(x => { if (x.from && parse(x.from) >= addDays(T, -1)) want("trip", x.id, { title: "Reise: " + x.name, date: x.from, reminders: [14, 3, 1] }); });
  return list;
}
function syncAutoTasks() {
  const wanted = wantedAutoTasks(), key = x => x.auto + ":" + x.ref;
  const keep = new Set();
  wanted.forEach(w => {
    if (S.autoOff.includes(key(w))) return;
    keep.add(key(w));
    let t = S.tasks.find(x => x.auto === w.auto && x.ref === w.ref);
    if (!t) { S.tasks.push(newTask(w)); return; }
    if (t.date !== w.date) { t.done = false; t.snooze = ""; }        // neues Datum → wieder offen
    Object.assign(t, { title: w.title, date: w.date, objId: w.objId || null, docId: w.docId || null, kind: w.kind });
    if (w.start) t.start = w.start;
    if (w.auto === "doc") { t.reminders = w.reminders; t.fav = !!w.fav; }
  });
  S.tasks = S.tasks.filter(t => !t.auto || keep.has(key(t)));
}

/* ---------- Geburtstage ---------- */
function upcomingBirthdays(limit) {
  const T = today();
  return S.objects.filter(o => o.birthday && !o.archived && kindOf(cat(o.catId)).birthday).map(o => {
    const b = parse(o.birthday); let next = new Date(T.getFullYear(), b.getMonth(), b.getDate());
    if (next < T) next = new Date(T.getFullYear() + 1, b.getMonth(), b.getDate());
    return { o, next, days: diffDays(T, next), age: b.getFullYear() > 1900 ? next.getFullYear() - b.getFullYear() : null };
  }).sort(by("days")).slice(0, limit || 99);
}

/* ---------- Tankbuch ---------- */
// Verbrauch pro Tankfüllung (Vollgetankt-Methode) und Durchschnitt
function fuelStats(o) {
  const rows = ((o.records || {}).tanken || []).filter(r => num(r.km) != null).slice().sort((a, b) => num(a.km) - num(b.km));
  let lastFull = null, litersSince = 0, totalL = 0, totalKm = 0;
  const per = {};
  rows.forEach(r => {
    const l = num(r.liter) || 0;
    if (lastFull) litersSince += l;
    if (r.full) {
      if (lastFull && num(r.km) > num(lastFull.km)) { const km = num(r.km) - num(lastFull.km); per[r.id] = litersSince / km * 100; totalL += litersSince; totalKm += km; }
      lastFull = r; litersSince = 0;
    }
  });
  const all = (o.records.tanken || []);
  const money = all.reduce((s, r) => s + (num(r.total) || 0), 0);
  const kmSpan = rows.length > 1 ? num(rows[rows.length - 1].km) - num(rows[0].km) : 0;
  return { per, avg: totalKm ? totalL / totalKm * 100 : null, money, perKm: kmSpan > 0 ? money / kmSpan : null, count: all.length };
}

/* ---------- Kosten ---------- */
// Alle Ausgaben als Liste: { d, amount, type, label, o, k, tax }
function allCosts() {
  const out = [], T = today();
  S.objects.forEach(o => {
    const k = cat(o.catId), b = o.buy || {};
    if (b.date && num(b.price)) out.push({ d: b.date, amount: num(b.price), type: "Kauf", label: o.name, o, k, tax: !!b.tax });
    (o.log || []).forEach(l => { if (num(l.cost)) out.push({ d: l.d, amount: num(l.cost), type: (LOGKINDS[l.kind] || LOGKINDS.sonst)[0], label: l.title, o, k, tax: !!l.tax, log: l }); });
    ((o.records || {}).tanken || []).forEach(r => { if (num(r.total)) out.push({ d: r.d, amount: num(r.total), type: "Tanken", label: (r.station || "Tanken"), o, k, tax: false }); });
    const c = o.contract, ci = contractInfo(c);
    if (ci && ci.monthly && c.start) {         // Vertragskosten: ein Eintrag pro Monat
      const stop = ci.ended && ci.termEnd ? ci.termEnd : T;
      let d = parse(c.start);
      for (let i = 0; i < 240 && d <= stop; i++, d = addUnit(parse(c.start), i, "m")) out.push({ d: ymd(d), amount: ci.monthly, type: "Vertrag / Abo", label: o.name, o, k, tax: false });
    }
  });
  return out.sort((a, b) => (a.d < b.d ? 1 : -1));
}
// Laufende Fixkosten pro Monat aus aktiven Verträgen
function monthlyFixCosts() {
  return S.objects.map(o => ({ o, ci: contractInfo(o.contract) })).filter(x => x.ci && !x.ci.ended && x.ci.monthly).sort((a, b) => b.ci.monthly - a.ci.monthly);
}

/* ---------- Reisen: Dokumenten-Check ---------- */
function tripWarnings(trip) {
  const out = [], end = parse(trip.to) || parse(trip.from); if (!end) return out;
  S.docs.filter(d => ["ausweis", "pass", "fs"].includes(d.type) && d.expires).forEach(d => {
    const e = parse(d.expires);
    if (e < end) out.push({ d, level: "over", msg: d.name + " läuft vor oder während der Reise ab (" + fmtD(e) + ")." });
    else if (d.type === "pass" && e < addUnit(end, 6, "m")) out.push({ d, level: "soon", msg: d.name + " ist nach der Reise weniger als 6 Monate gültig. Viele Länder verlangen das aber." });
  });
  return out;
}

/* ---------- Suche über alles ---------- */
function searchAll(q) {
  q = q.trim().toLowerCase(); if (q.length < 2) return [];
  const hit = (...xs) => xs.some(x => String(x || "").toLowerCase().includes(q));
  const res = [];
  S.objects.forEach(o => {
    const k = cat(o.catId);
    const recs = Object.values(o.records || {}).flat();
    if (hit(o.name, o.note, ...Object.values(o.values), o.buy.serial, o.buy.shop) || recs.some(r => hit(...Object.values(r))) || o.log.some(l => hit(l.title, l.part, l.brand, l.partno, l.note, l.shop)))
      res.push({ type: "Eintrag", title: o.name, sub: k ? k.name : "", route: "objekt-" + o.id, icon: k ? k.icon : "label", k });
  });
  S.tasks.forEach(t => { if (hit(t.title, t.note)) res.push({ type: "Aufgabe", title: t.title, sub: parentName(t), task: t.id, icon: "task_alt", k: parentOf(t).k }); });
  S.docs.forEach(d => { if (hit(d.name, d.number, d.note, d.authority)) res.push({ type: "Dokument", title: d.name, sub: dtype(d)[0], route: "dokument-" + d.id, icon: dtype(d)[1], k: docCat(d) }); });
  S.links.forEach(l => { if (hit(l.title, l.url, l.note, l.group)) res.push({ type: "Link", title: l.title, sub: hostOf(l.url), url: normUrl(l.url), icon: "link" }); });
  S.contacts.forEach(c => { if (hit(c.name, c.role, c.phone, c.email, c.note)) res.push({ type: "Kontakt", title: c.name, sub: [c.role, c.phone].filter(Boolean).join(" · "), route: "kontakte", icon: "contact_phone" }); });
  S.categories.forEach(k => { if (hit(k.name)) res.push({ type: "Bereich", title: k.name, sub: kindOf(k).label, route: "bereich-" + k.id, icon: k.icon, k }); });
  return res.slice(0, 80);
}
