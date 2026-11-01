/* =====================================================================
   03-store.js – Daten: Aufbau, Beispieldaten, Speichern & Sync

   Alle Daten liegen im Objekt S (State):
     S.profile     – deine Angaben          S.settings   – Aussehen & Standards
     S.categories  – Bereiche               S.objects    – Einträge (Auto, Waschmaschine …)
     S.tasks       – Aufgaben/Erinnerungen  S.docs       – Dokumente
     S.links       – Links                  S.contacts   – Kontakte
     S.lists       – Einkauf, Verliehen, Gutscheine
     S.trips       – Reisen                 S.trash      – Papierkorb
   ===================================================================== */

let S = null;                       // der aktuelle Zustand
const STORAGE_KEY = "allreminde-v1"; // Schlüssel im Browser-Speicher (nur ohne Online-Konto)
// Mit Konto bekommt jeder Nutzer seinen eigenen Speicher auf dem Gerät
const storageKey = () => sync.user ? "allreminde-u-" + sync.user.id : STORAGE_KEY;

/* ---------- Bausteine: neue Objekte mit allen Feldern ---------- */
function newCategory(p) {
  const kind = KINDS[p.kind] ? p.kind : "allgemein", K = KINDS[kind];
  return Object.assign({
    id: uid(), name: K.label, icon: K.icon, color: K.color, kind,
    fields: (K.fields || []).map(([label, type]) => ({ id: uid(), label, type, unit: "" })),
    counter: K.counter ? clone(K.counter) : null,
    modules: (K.modules || []).slice(),
    templates: clone(K.templates || []),
    reminders: (K.reminders || [1]).slice()
  }, p);
}
function newItem(p) {
  return Object.assign({
    id: uid(), catId: null, name: "", values: {}, counter: [], counterUnit: "", fav: false, note: "",
    photos: [], files: [], log: [], records: {}, contactIds: [], birthday: "", archived: false,
    buy: { date: "", price: "", shop: "", warranty: "", serial: "", online: false, tax: false },
    contract: null
  }, p);
}
function newTask(p) {
  return Object.assign({
    id: uid(), title: "", objId: null, catId: null, docId: null, auto: null, ref: null,
    kind: "einmalig", date: "", time: "", every: 1, unit: "m", days: [], mday: 1,
    counterEvery: 0, lastValue: 0, lastDone: "", start: todayStr(), until: "",
    winterEvery: 0, pause: [], reminders: null, prio: 0, fav: false, done: false,
    history: [], note: "", snooze: "", checklist: [], followUp: null, rotation: [], rotIdx: 0, notify: null
  }, p);
}
function newDoc(p) {
  return Object.assign({ id: uid(), type: "sonst", name: "", number: "", issued: "", expires: "", authority: "",
    renewEvery: 0, reminders: [90, 30, 7], note: "", files: [], links: [], history: [], fav: false, steps: [] }, p);
}

/* ---------- Startzustand ---------- */
function emptyState() {
  return {
    v: 4, example: false, setupDone: false,
    profile: { name: "", birthday: "", street: "", zip: "", city: "", email: "", phone: "", emergency: "", about: "" },
    settings: { color: "petrol", accent: "petrol", theme: "system", reminders: [7, 1], tileSize: "normal", zoom: 100, privacy: false, tripChecklist: TRIP_CHECKLIST.slice(),
      notify: { mode: "push", defaultTime: "08:00", quietOn: true, quietFrom: "22:00", quietTo: "07:00", nagHours: 0, summaryOn: false, summaryTime: "07:30", alarmSound: true } },
    layout: { sections: DEFAULT_SECTIONS.map(id => ({ id, on: !SECTIONS_OFF_BY_DEFAULT.includes(id) })) },
    categories: [], objects: [], tasks: [], docs: [], links: [], contacts: [],
    lists: { shopping: [], lent: [], vouchers: [] }, trips: [], trash: [], autoOff: []
  };
}

/* ---------- Beispieldaten (zum Ausprobieren beim ersten Start) ---------- */
function exampleState() {
  const s = emptyState(); s.example = true;
  const d = daysFromToday;
  const add = (cat, item, tasks) => { item.catId = cat.id; s.objects.push(item); (tasks || []).forEach(t => s.tasks.push(newTask(Object.assign({ objId: item.id }, t)))); return item; };
  const val = (cat, arr) => { const v = {}; cat.fields.forEach((f, i) => { if (arr[i]) v[f.id] = arr[i]; }); return v; };

  // Fahrzeug
  const car = newCategory({ kind: "fahrzeug" }); s.categories.push(car);
  const oil = { id: uid(), d: d(-300), title: "Ölwechsel mit Ölfilter", kind: "wartung", cost: "89.90", counter: "30500", part: "Ölfilter + 4,5 l Motoröl 5W-30", brand: "Mann-Filter", partno: "W 712/95", shop: "Selbst gemacht", note: "Neuer Dichtring an der Ablassschraube", files: [], tax: false };
  const auto = add(car, newItem({ name: "Mein Auto", fav: true, values: val(car, ["", "VW Golf 7", "", "0603 / BHR", "2016-05-12", "5W-30", "2,3 bar vorne / 2,1 bar hinten"]),
    counter: [{ d: d(-300), v: 30500 }, { d: d(-120), v: 41200 }, { d: d(-60), v: 43100 }, { d: d(-3), v: 45050 }],
    buy: { date: d(-1500), price: "14500", shop: "Autohaus", warranty: "", serial: "", online: false, tax: false },
    log: [oil, { id: uid(), d: d(-25), title: "Winterreifen montiert", kind: "wartung", cost: "40", counter: "44700", part: "", brand: "", partno: "", shop: "Reifenservice", note: "Profil vorne 6 mm", files: [], tax: false }],
    records: {
      tanken: [{ id: uid(), d: d(-60), km: 43100, liter: 42.1, total: "71.40", full: true, station: "Aral" }, { id: uid(), d: d(-31), km: 43820, liter: 40.3, total: "67.10", full: true, station: "Shell" }, { id: uid(), d: d(-3), km: 44510, liter: 41.8, total: "70.90", full: true, station: "Aral" }],
      teile: [{ id: uid(), name: "Ölfilter", brand: "Mann-Filter", partno: "W 712/95", link: "", note: "" }, { id: uid(), name: "Wischerblätter vorne", brand: "Bosch", partno: "A 979 S", link: "", note: "" }],
      reifen: [{ id: uid(), name: "Winterreifen", size: "205/55 R16 91H", dot: "3822", tread: 6, place: "", mounted: true }, { id: uid(), name: "Sommerreifen", size: "205/55 R16 91V", dot: "1521", tread: 4.5, place: "Keller", mounted: false }]
    } }), [
    { title: "Ölwechsel", kind: "zaehler", counterEvery: 15000, lastValue: 30500, every: 1, unit: "y", lastDone: d(-300), fav: true, prio: 1, history: [{ d: d(-300), logId: oil.id }] },
    { title: "HU / TÜV", kind: "intervall", every: 2, unit: "y", lastDone: d(-700), reminders: [30, 7] },
    { title: "Sommerreifen montieren", kind: "jaehrlich", date: "2000-04-15", checklist: [{ text: "Luftdruck prüfen", done: false }, { text: "Profiltiefe messen", done: false }], followUp: { title: "Radmuttern nachziehen (nach 50 km)", days: 3 } },
    { title: "Kilometerstand eintragen", kind: "monatlich", mday: 1, reminders: [0] }
  ]);

  // Geräte
  const dev = newCategory({ kind: "geraet" }); s.categories.push(dev);
  add(dev, newItem({ name: "Waschmaschine", values: val(dev, ["Bosch", "Serie 6", "Bad", ""]), buy: { date: d(-680), price: "549", shop: "Elektromarkt", warranty: d(50), serial: "", online: false, tax: false } }), [
    { title: "Pflegewaschgang 90 °C", kind: "intervall", every: 1, unit: "m", lastDone: d(-20) }, { title: "Flusensieb reinigen", kind: "intervall", every: 3, unit: "m", lastDone: d(-40) }]);
  add(dev, newItem({ name: "Wasserfilter", fav: true, values: val(dev, ["", "Tischwasserfilter", "Küche", ""]), buy: { date: d(-5), price: "29.99", shop: "Online-Shop", warranty: "", serial: "", online: true, tax: false },
    records: { verbrauch: [{ id: uid(), name: "Filterkartusche", stock: 1, partno: "", link: "" }] } }), [
    { title: "Filterkartusche wechseln", kind: "intervall", every: 4, unit: "w", lastDone: d(-25), reminders: [3], fav: true }]);

  // Pflanzen
  const pl = newCategory({ kind: "pflanze" }); s.categories.push(pl);
  add(pl, newItem({ name: "Monstera", values: val(pl, ["Monstera deliciosa", "Wohnzimmer", "hell, keine Mittagssonne", "Grünpflanzendünger"]) }), [
    { title: "Gießen", kind: "intervall", every: 7, unit: "d", winterEvery: 14, lastDone: d(-7), reminders: [0] }, { title: "Düngen", kind: "intervall", every: 2, unit: "w", pause: [11, 12, 1, 2], lastDone: d(-30), reminders: [0] }]);
  add(pl, newItem({ name: "Basilikum", values: val(pl, ["Ocimum basilicum", "Küchenfenster", "sonnig", ""]) }), [
    { title: "Gießen", kind: "intervall", every: 2, unit: "d", lastDone: d(-3), reminders: [0] }]);

  // Haustiere
  const pets = newCategory({ kind: "tier" }); s.categories.push(pets);
  add(pets, newItem({ name: "Bello", birthday: "2021-" + ymd(addDays(today(), 40)).slice(5), values: val(pets, ["Hund", "Labrador-Mix", "276 0981 2345 678", "Trockenfutter 12 kg", ""]),
    records: { gewicht: [{ id: uid(), d: d(-180), kg: 27.5 }, { id: uid(), d: d(-90), kg: 28.4 }, { id: uid(), d: d(-10), kg: 28.1 }] } }), [
    { title: "Impfung auffrischen", kind: "intervall", every: 1, unit: "y", lastDone: d(-340), reminders: [14, 3] }, { title: "Entwurmung", kind: "intervall", every: 3, unit: "m", lastDone: d(-95) },
    { title: "Floh- und Zeckenschutz", kind: "intervall", every: 1, unit: "m", pause: [12, 1, 2], lastDone: d(-20) }]);

  // Menschen
  const ppl = newCategory({ kind: "person" }); s.categories.push(ppl);
  add(ppl, newItem({ name: "Mama", birthday: "1965-" + ymd(addDays(today(), 12)).slice(5), values: val(ppl, ["Mutter", "", ""]),
    records: { geschenke: [{ id: uid(), idea: "Kochbuch italienisch", price: "25", link: "", done: false }] } }), []);

  // Schule
  const sch = newCategory({ kind: "schule" }); s.categories.push(sch);
  add(sch, newItem({ name: "Mathe", records: { noten: [{ id: uid(), d: d(-50), what: "Test Funktionen", grade: 2 }, { id: uid(), d: d(-20), what: "Klausur Ableitungen", grade: 3 }] } }), [
    { title: "Klausur Analysis", kind: "einmalig", date: d(9), time: "08:00", reminders: [7, 3, 1], prio: 1, note: "Kapitel 4 bis 6, Taschenrechner mitnehmen", followUp: { title: "Note eintragen", days: 7 } }]);

  // Verträge
  const con = newCategory({ kind: "vertrag" }); s.categories.push(con);
  add(con, newItem({ name: "Handyvertrag", values: val(con, ["Mobilfunk AG", "", ""]),
    contract: { start: ymd(addUnit(addDays(today(), 75), -24, "m")), minMonths: 24, extendMonths: 1, notice: 1, noticeUnit: "m", cost: "29.99", costEvery: "m", status: "aktiv", endDate: "" } }), []);
  add(con, newItem({ name: "Streaming-Abo", contract: { start: d(-400), minMonths: 1, extendMonths: 1, notice: 0, noticeUnit: "w", cost: "13.99", costEvery: "m", status: "aktiv", endDate: "" } }), []);

  // Gesundheit
  const hea = newCategory({ kind: "gesundheit" }); s.categories.push(hea);
  add(hea, newItem({ name: "Zahnarzt" }), [{ title: "Kontrolle (Bonusheft)", kind: "intervall", every: 6, unit: "m", lastDone: d(-170), reminders: [21, 1] }]);

  // Aufgabe ohne Bereich
  s.tasks.push(newTask({ title: "Steuererklärung abgeben", kind: "einmalig", date: (today().getFullYear() + 1) + "-07-31", reminders: [60, 14, 3], prio: 1 }));

  // Dokumente
  s.docs.push(newDoc({ type: "fs", name: "Führerschein", number: "B 072 XY 4711", issued: "2019-06-03", expires: "2034-06-02", authority: "Führerscheinstelle", renewEvery: 15, reminders: [180, 30], note: "Klassen: AM, B, BE, L" }));
  s.docs.push(newDoc({ type: "lkw", name: "LKW-Führerschein C/CE", issued: ymd(addUnit(addDays(today(), 150), -5, "y")), expires: d(150), renewEvery: 5, reminders: [180, 90, 30], fav: true,
    steps: [{ text: "Ärztliches Gutachten", done: false }, { text: "Sehtest", done: false }, { text: "Biometrisches Passfoto", done: false }, { text: "Antrag bei der Führerscheinstelle", done: false }],
    links: [{ label: "Kraftfahrt-Bundesamt", url: "https://www.kba.de" }] }));
  s.docs.push(newDoc({ type: "ausweis", name: "Personalausweis", issued: ymd(addUnit(addDays(today(), 400), -10, "y")), expires: d(400), authority: "Bürgeramt", renewEvery: 10 }));
  s.docs.push(newDoc({ type: "versich", name: "Kfz-Versicherung", note: "Kündigung jährlich zum 30.11." }));
  s.links.push({ id: uid(), title: "AusweisApp", url: "https://www.ausweisapp.bund.de", group: "Behörden", note: "Online-Ausweis", fav: true });
  s.links.push({ id: uid(), title: "Kraftfahrt-Bundesamt", url: "https://www.kba.de", group: "Fahrzeug & Führerschein", note: "Punktestand abfragen", fav: false });

  // Kontakte, Listen, Reise
  const shop = { id: uid(), name: "Autowerkstatt Müller", role: "Werkstatt", phone: "02771 123456", email: "", address: "", note: "" };
  s.contacts.push(shop, { id: uid(), name: "Tierarztpraxis am Park", role: "Tierarzt", phone: "02771 654321", email: "", address: "", note: "" });
  auto.contactIds = [shop.id];
  s.lists.shopping.push({ id: uid(), text: "Filterkartusche", done: false, qty: "2" }, { id: uid(), text: "Scheibenwischwasser Winter", done: false, qty: "" });
  s.lists.lent.push({ id: uid(), thing: "Bohrmaschine", person: "Tom", dir: "out", date: d(-12), due: d(5), done: false });
  s.lists.vouchers.push({ id: uid(), name: "Gutschein Baumarkt", shop: "Baumarkt", value: "25", code: "", expires: d(70), used: false });
  s.trips.push({ id: uid(), name: "Sommerurlaub", dest: "Italien", from: d(60), to: d(74), checklist: TRIP_CHECKLIST.map(text => ({ text, done: false })), note: "" });
  return s;
}

/* ---------- Ältere Daten in das aktuelle Format bringen ---------- */
function normalize(s) {
  if (!s || typeof s !== "object") return null;
  const base = emptyState();
  const oldVersion = s.v || 1;
  s.profile = Object.assign(base.profile, s.profile || {});
  s.settings = Object.assign(base.settings, s.settings || {});
  s.settings.notify = Object.assign(emptyState().settings.notify, s.settings.notify || {});
  if (oldVersion < 4) {               // frühere Versionen hatten Farbe/Design im Profil
    ["color", "theme"].forEach(k => { if (s.profile[k]) s.settings[k] = s.profile[k]; });
    if (s.profile.lead != null) s.settings.reminders = [Number(s.profile.lead) || 0];
  }
  ["categories", "objects", "tasks", "docs", "links", "contacts", "trips", "trash", "autoOff"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  s.lists = Object.assign({ shopping: [], lent: [], vouchers: [] }, s.lists || {});

  // Startseiten-Abschnitte: unbekannte entfernen, neue ergänzen
  const secs = ((s.layout && s.layout.sections) || []).filter(x => SECTIONS[x.id]);
  DEFAULT_SECTIONS.forEach((id, i) => { if (!secs.some(x => x.id === id)) secs.splice(Math.min(i, secs.length), 0, { id, on: !SECTIONS_OFF_BY_DEFAULT.includes(id) }); });
  s.layout = { sections: secs };

  s.categories = s.categories.map(c => {
    if (!c.kind) c.kind = c.counter ? "fahrzeug" : "allgemein";
    const K = KINDS[c.kind] || KINDS.allgemein;
    return Object.assign({ fields: [], counter: null, modules: (K.modules || []).slice(), templates: [], reminders: (K.reminders || [1]).slice() }, c);
  });
  s.objects = s.objects.map(o => {
    const n = newItem(o); n.buy = Object.assign(newItem({}).buy, o.buy || {}); n.records = o.records || {};
    n.log = (o.log || []).map(l => Object.assign({ files: [], tax: false }, l));
    return n;
  });
  s.tasks = s.tasks.map(t => {
    if (oldVersion < 4) {
      if (t.lead != null && t.lead !== "" && t.reminders == null) t.reminders = [Number(t.lead)];
      if (t.auto === true) { t.auto = "doc"; t.ref = t.docId; }
      // Vorgängerversion speicherte "Rückgängig"-Daten in jedem Eintrag: nur den letzten behalten
    }
    delete t.lead;
    const n = newTask(t); n.history = (t.history || []).slice(-40);
    n.history.forEach((h, i) => { if (i < n.history.length - 1) delete h.prev; });
    return n;
  });
  s.docs = s.docs.map(d => {
    if (oldVersion < 4 && d.lead != null) d.reminders = [Number(d.lead) || 90, 30];
    delete d.lead; return newDoc(d);
  });
  // Papierkorb: Einträge älter als 30 Tage endgültig entfernen
  const limit = Date.now() - 30 * 864e5;
  s.trash = s.trash.filter(x => new Date(x.at).getTime() > limit);
  s.v = 4;
  return s;
}

/* =====================================================================
   Speichern
   – immer im Browser (localStorage) als Zwischenspeicher
   – wenn angemeldet: online bei Supabase (Tabelle "docs"), aufgeteilt in mehrere
     Dokumente (jedes darf max. ~256 KB groß sein):
       ar-core        alles außer Einträgen, Aufgaben und Papierkorb
       ar-tasks       Aufgaben ohne Eintrag
       ar-o-<id>      ein Eintrag samt seiner Aufgaben
       ar-trash       Papierkorb
   ===================================================================== */
const sync = { client: null, user: null, mode: "local", saved: {}, queue: [], busy: false, timer: null, dirty: false, channel: null };
const MAX_DOC = 250000;

// Zustand → einzelne Speicher-Dokumente (Name → JSON-Text)
function splitState(st) {
  const out = {};
  const core = Object.assign({}, st); delete core.objects; delete core.tasks; delete core.trash;
  core.objectOrder = st.objects.map(o => o.id);
  out["ar-core"] = JSON.stringify(core);
  out["ar-tasks"] = JSON.stringify(st.tasks.filter(t => !t.objId || !st.objects.some(o => o.id === t.objId)));
  st.objects.forEach(o => { out["ar-o-" + o.id] = JSON.stringify({ o, tasks: st.tasks.filter(t => t.objId === o.id) }); });
  out["ar-trash"] = JSON.stringify(st.trash);
  return out;
}
// Speicher-Dokumente → Zustand
function joinState(map) {
  const core = JSON.parse(map["ar-core"]);
  const objs = {}, tasks = JSON.parse(map["ar-tasks"] || "[]");
  Object.keys(map).filter(k => k.startsWith("ar-o-")).forEach(k => { const x = JSON.parse(map[k]); objs[x.o.id] = x.o; tasks.push(...x.tasks); });
  const order = core.objectOrder || [];
  core.objects = order.filter(id => objs[id]).map(id => objs[id]).concat(Object.values(objs).filter(o => !order.includes(o.id)));
  core.tasks = tasks; core.trash = JSON.parse(map["ar-trash"] || "[]");
  delete core.objectOrder;
  return core;
}

// Speichern anstoßen (wird nach jeder Änderung aufgerufen)
function persist() {
  if (cloudReady() && !sync.user) return;                // abgemeldet: nichts speichern
  try { localStorage.setItem(storageKey(), JSON.stringify(S)); } catch (e) { /* Speicher voll oder gesperrt */ }
  if (typeof scheduleNotifications === "function") scheduleNotifications();
  if (!sync.user) return;
  sync.dirty = true;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(queueCloudWrites, 800);
}
function queueCloudWrites() {
  const docs = splitState(S);
  Object.keys(docs).forEach(id => {
    if (docs[id] === sync.saved[id]) return;
    if (docs[id].length > MAX_DOC) { setSyncStatus("full"); toast("Speicher für einen Bereich ist fast voll. Bitte alte Einträge aufräumen."); return; }
    sync.queue.push({ id, json: docs[id] }); sync.saved[id] = docs[id];
  });
  Object.keys(sync.saved).forEach(id => { if (!(id in docs)) { sync.queue.push({ id, del: true }); delete sync.saved[id]; } });
  sync.dirty = false;
  runQueue();
}
async function runQueue() {
  if (sync.busy) return;
  sync.busy = true;
  while (sync.queue.length) {
    const job = sync.queue.shift();
    const q = sync.client.from("docs");
    const { error } = job.del ? await q.delete().eq("user_id", sync.user.id).eq("id", job.id)
                              : await q.upsert({ user_id: sync.user.id, id: job.id, json: job.json, updated_at: new Date().toISOString() });
    if (error) { console.error(error); setSyncStatus("err"); sync.saved = {}; break; }   // beim nächsten Speichern alles erneut senden
    else setSyncStatus("cloud");
  }
  sync.busy = false;
}

// Anzeige unten in der Seitenleiste
function setSyncStatus(mode) {
  sync.mode = mode;
  const el = $("#sync-side"); if (!el) return;
  const txt = { local: "Nur auf diesem Gerät – zum Synchronisieren anmelden", cloud: "Synchronisiert", wait: "Verbinde …", err: "Sync gerade nicht möglich", full: "Speicher fast voll", off: "Sync noch nicht eingerichtet" }[mode];
  el.className = "sync" + (mode === "cloud" ? " cloud" : mode === "err" || mode === "full" ? " err" : "");
  el.lastElementChild.textContent = txt;
}

/* ---------- Verbindung zu Supabase (Konto & Sync) ---------- */
const cloudReady = () => !!(SUPABASE_URL && SUPABASE_KEY && window.supabase);
async function connectCloud() {
  if (!cloudReady()) { AUTH.ready = true; setSyncStatus("off"); return; }
  if (/[?&]reset=1/.test(location.search)) AUTH.mode = "newpw";      // kommt vom Link "Passwort zurücksetzen"
  sync.client = sync.client || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });
  sync.client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") AUTH.mode = "newpw";           // Link aus "Passwort vergessen"-E-Mail
    setTimeout(() => userChanged(session ? session.user : null), 0);
  });
  let { data } = await sync.client.auth.getSession();
  if (AUTH.mode === "newpw") {
    if (data.session) touchActivity();
    else { AUTH.mode = "reset"; AUTH.info = "Der Link ist abgelaufen oder wurde in einem anderen Browser geöffnet. Fordere hier einen neuen an."; }
  }
  if (data.session && !NATIVE && inactiveTooLong()) {                 // PC: zu lange nichts gemacht → abmelden
    AUTH.info = "Du wurdest nach " + AUTO_LOGOUT_MIN + " Minuten ohne Aktivität abgemeldet.";
    await sync.client.auth.signOut(); data = { session: null };
  }
  if (/[?&](code|reset)=/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash);   // Adresse aufräumen
  AUTH.ready = true;
  await userChanged(data.session ? data.session.user : null);
}
// Angemeldeter Nutzer hat gewechselt (Anmelden, Abmelden, anderes Konto)
let currentUserId;
async function userChanged(user) {
  const id = user ? user.id : null;
  sync.user = user;
  if (id === currentUserId) return;
  currentUserId = id; sync.saved = {}; stopRealtime();
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}          // alte Daten ohne Konto nicht liegen lassen
  if (!user) { setSyncStatus("local"); onSignedOut(); return; }
  SOC.ready = false;
  let cached = null;                                                  // eigener Speicher dieses Kontos auf dem Gerät
  try { const raw = localStorage.getItem(storageKey()); if (raw) cached = normalize(JSON.parse(raw)); } catch (e) {}
  S = cached || normalize(emptyState());                              // neues Konto startet leer
  syncAutoTasks(); applyLook(); render();
  await startCloudSync();
  await onSignedIn();
}
async function startCloudSync() {
  setSyncStatus("wait");
  await refreshFromCloud(true);
  stopRealtime();
  sync.channel = sync.client.channel("docs-" + sync.user.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "user_id=eq." + sync.user.id }, () => { clearTimeout(sync.rt); sync.rt = setTimeout(() => refreshFromCloud(false), 700); })
    .subscribe();
}
function stopRealtime() { if (sync.channel) { sync.client.removeChannel(sync.channel); sync.channel = null; } }
// Daten vom Server holen und übernehmen, falls sie sich geändert haben
async function refreshFromCloud(first) {
  if (!sync.user || sync.busy || sync.dirty || sync.queue.length) return;
  const { data, error } = await sync.client.from("docs").select("id,json").eq("user_id", sync.user.id);
  if (error) { console.error(error); setSyncStatus("err"); return; }
  const map = {}; data.forEach(r => { map[r.id] = r.json; });
  if (map["ar-core"]) {
    const changed = Object.keys(map).some(k => map[k] !== sync.saved[k]) || Object.keys(sync.saved).some(k => !(k in map));
    sync.saved = map;
    if (changed) { try { S = normalize(joinState(map)); syncAutoTasks(); afterLoad(); } catch (e) { console.error(e); } }
  } else if (first) {
    sync.saved = {}; queueCloudWrites();                 // neues Konto: leeren Anfang speichern
  }
  setSyncStatus("cloud");
}
function afterLoad() {
  try { localStorage.setItem(storageKey(), JSON.stringify(S)); } catch (e) {}
  applyLook();
  if (typeof scheduleNotifications === "function") scheduleNotifications();
  if (!$("#sheet")) render();
}
// Anmelden / Registrieren / Abmelden
async function signIn(email, password) { const { error } = await sync.client.auth.signInWithPassword({ email, password }); return error; }
async function signUp(email, password) {
  const { data, error } = await sync.client.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL || location.href.split(/[?#]/)[0] } });
  return error || (data && data.session ? null : { confirm: true });   // confirm: E-Mail muss noch bestätigt werden
}
async function signOut() { await sync.client.auth.signOut(); }

// Nach jeder Änderung: automatische Aufgaben abgleichen, speichern, neu zeichnen, Hinweis zeigen
function commit(message, undo) {
  syncAutoTasks();
  persist();
  render();
  if (message) toast(message, undo);
}
// Momentaufnahme für "Rückgängig"
function snapshot() { const saved = JSON.stringify(S); return () => { S = JSON.parse(saved); commit("Rückgängig gemacht"); }; }

/* ---------- Papierkorb ---------- */
// data enthält die gelöschten Dinge, z. B. { objects:[…], tasks:[…] }
function toTrash(label, data) {
  S.trash.unshift({ id: uid(), label, at: new Date().toISOString(), data });
  S.trash = S.trash.slice(0, 100);
}
function restoreFromTrash(id) {
  const item = S.trash.find(x => x.id === id); if (!item) return;
  Object.entries(item.data).forEach(([key, list]) => {
    const target = key.startsWith("lists.") ? S.lists[key.slice(6)] : S[key];
    if (!Array.isArray(target)) return;
    list.forEach(x => { if (!target.some(y => y.id === x.id)) target.push(x); });
  });
  S.trash = S.trash.filter(x => x.id !== id);
}
