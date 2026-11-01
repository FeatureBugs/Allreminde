/* =====================================================================
   08-extras.js – Dateien, Export/Import, Claude-Funktionen, Aussehen,
   Startpakete
   ===================================================================== */

// Adresse der Web-Version (für QR-Codes)
const appLink = () => APP_URL || (location.protocol.startsWith("http") ? location.href.split("#")[0] : "");

/* ---------- Dateien (Fotos, Belege) im Online-Speicher ---------- */
const BUCKET = "files";
const canUpload = () => !!(sync.client && sync.user);
// Dateien sind privat. Zum Anzeigen braucht man einen zeitlich begrenzten Link (7 Tage), der hier zwischengespeichert wird.
const URLS = {}, missingUrls = new Set();
const PLACEHOLDER = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#8A95A0" opacity=".15"/></svg>');
function blobUrl(id) {
  if (URLS[id]) return URLS[id];
  if (id && id.includes("/")) missingUrls.add(id);         // nur Dateien aus dem Online-Speicher (Pfad "nutzer/datei")
  return PLACEHOLDER;
}
// Nach dem Zeichnen: fehlende Links holen und dann noch einmal zeichnen
let fetchingUrls = false;
async function loadMissingUrls() {
  if (fetchingUrls || !missingUrls.size || !canUpload()) return;
  fetchingUrls = true;
  const ids = [...missingUrls]; missingUrls.clear();
  const { data, error } = await sync.client.storage.from(BUCKET).createSignedUrls(ids, 7 * 24 * 3600);
  fetchingUrls = false;
  if (error || !data) return;
  data.forEach(x => { if (x.signedUrl) URLS[x.path] = x.signedUrl; });
  if (!$("#sheet")) render(); else ids.forEach(id => $$('img[data-file="' + id + '"]').forEach(img => img.src = URLS[id] || PLACEHOLDER));
}

// Große Fotos verkleinern (spart Platz, lädt schneller)
async function shrinkImage(file, maxSide, maxBytes) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || !window.createImageBitmap) return file;
  try {
    const bmp = await createImageBitmap(file), scale = Math.min(1, (maxSide || 1800) / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < (maxBytes || 1.5e6)) return file;
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", .85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch (e) { return file; }
}
// Lädt Dateien hoch und gibt [{id, name, type, size, d}] zurück
async function uploadFiles(fileList, onlyImages) {
  if (!canUpload()) { toast("Zum Hochladen bitte unter Mehr → Konto & Sync anmelden."); return []; }
  const out = [];
  for (const original of [...fileList]) {
    if (onlyImages && !original.type.startsWith("image/")) { toast("„" + original.name + "“ ist kein Bild"); continue; }
    if (!/^image\/|^application\/pdf$/.test(original.type)) { toast("„" + original.name + "“: nur Bilder oder PDF"); continue; }
    if (original.size > 20e6) { toast("„" + original.name + "“ ist zu groß (max. 20 MB)"); continue; }
    toast("Lade „" + original.name + "“ hoch …");
    const f = await shrinkImage(original);
    const ext = (f.type === "application/pdf" ? "pdf" : (f.type.split("/")[1] || "jpg")).replace("jpeg", "jpg");
    const path = sync.user.id + "/" + uid() + uid() + "." + ext;
    const { error } = await sync.client.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) { console.error(error); toast("„" + original.name + "“ konnte nicht hochgeladen werden"); continue; }
    out.push({ id: path, name: original.name, type: f.type, size: f.size, d: todayStr() });
  }
  if (out.length) { toast(out.length === 1 ? "Datei hochgeladen" : out.length + " Dateien hochgeladen"); missingUrls.clear(); out.forEach(f => missingUrls.add(f.id)); loadMissingUrls(); }
  return out;
}
const deleteAsset = id => { if (canUpload() && id && id.includes("/")) sync.client.storage.from(BUCKET).remove([id]); };

/* ---------- Dateien speichern (Export) ---------- */
// Am PC: normaler Download. Am Handy: über "Teilen" (z. B. in Dateien, Drive oder WhatsApp speichern).
async function saveFile(name, data, label) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: name.endsWith(".json") ? "application/json" : name.endsWith(".ics") ? "text/calendar" : name.endsWith(".html") ? "text/html" : "text/plain" });
  try {
    if (NATIVE) {
      const FS = Plugin("Filesystem"), Share = Plugin("Share");
      const base64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
      const res = await FS.writeFile({ path: name, data: base64, directory: "CACHE" });
      await Share.share({ title: name, url: res.uri, dialogTitle: "Speichern oder teilen" });
    } else {
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast((label || "Datei") + " gespeichert");
    }
  } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast("Datei konnte nicht gespeichert werden"); }
}

/* ---------- Kalender-Export (.ics) mit allen Erinnerungen ---------- */
// Zeitpunkt der Erinnerung: ganztägig → um 9 Uhr am Erinnerungstag, mit Uhrzeit → n Tage (am Tag: 1 Std.) vorher
const alarmTrigger = (n, timed) => timed ? (n === 0 ? "-PT1H" : "-P" + n + "D") : (n === 0 ? "PT9H" : "-PT" + (n * 24 - 9) + "H");
function exportIcs() {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Allreminde//DE", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Allreminde"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const icsText = s => String(s).replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const from = addDays(today(), -1), to = addUnit(today(), 12, "m");
  let count = 0;
  activeTasks().forEach(x => {
    const p = parentOf(x.t), dates = occurrences(x.t, from, to).slice(0, 60);
    dates.forEach(d => {
      const ds = ymd(d).replace(/-/g, "");
      lines.push("BEGIN:VEVENT", "UID:" + x.t.id + "-" + ds + "@allreminde", "DTSTAMP:" + stamp);
      if (x.t.time) { const tm = x.t.time.replace(":", "") + "00"; lines.push("DTSTART:" + ds + "T" + tm, "DURATION:PT1H"); }
      else lines.push("DTSTART;VALUE=DATE:" + ds, "DTEND;VALUE=DATE:" + ymd(addDays(d, 1)).replace(/-/g, ""));
      lines.push("SUMMARY:" + icsText(x.t.title + (p.o || p.d ? " – " + parentName(x.t) : "")), "DESCRIPTION:" + icsText((p.k ? p.k.name : "Allgemein") + (x.t.note ? "\n" + x.t.note : "")));
      x.c.rem.forEach(n => lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(x.t.title), "TRIGGER:" + alarmTrigger(n, !!x.t.time), "END:VALARM"));
      lines.push("END:VEVENT"); count++;
    });
  });
  lines.push("END:VCALENDAR");
  saveFile("allreminde-termine.ics", lines.join("\r\n"), "Kalender mit " + count + " Terminen");
}

/* ---------- Kalender-Import (.ics), z. B. Müllabfuhr ---------- */
function parseIcs(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, ""), events = [];
  unfolded.split("BEGIN:VEVENT").slice(1).forEach(block => {
    const get = key => { const m = block.match(new RegExp("^" + key + "[^:\\n]*:(.*)$", "m")); return m ? m[1].trim() : ""; };
    const start = get("DTSTART").match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!start) return;
    events.push({ title: get("SUMMARY").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ") || "Termin", date: start[1] + "-" + start[2] + "-" + start[3], time: start[4] ? start[4] + ":" + start[5] : "" });
  });
  return events;
}
function importIcs(text, fileName) {
  const T = today(), limit = addUnit(T, 13, "m");
  const events = parseIcs(text).filter(e => { const d = parse(e.date); return d >= T && d <= limit; });
  if (!events.length) { toast("Keine zukünftigen Termine in der Datei gefunden"); return; }
  const undo = snapshot();
  const name = /m(ü|ue)ll|abfall/i.test(fileName + events.map(e => e.title).join(" ")) ? "Müllabfuhr" : "Importierte Termine";
  let k = S.categories.find(c => c.name === name);
  if (!k) { k = newCategory({ kind: "allgemein", name, icon: name === "Müllabfuhr" ? "delete" : "event", color: "grau", reminders: [1] }); S.categories.push(k); }
  let added = 0;
  events.forEach(e => {
    if (S.tasks.some(t => t.catId === k.id && t.title === e.title && t.date === e.date)) return;   // doppelte überspringen
    S.tasks.push(newTask({ title: e.title, catId: k.id, kind: "einmalig", date: e.date, time: e.time })); added++;
  });
  commit(added + " Termine in „" + name + "“ importiert", undo);
}

/* ---------- CSV-Tabellen ---------- */
function exportCsv(type) {
  let rows, name;
  if (type === "inventory") {
    name = "allreminde-inventar.csv";
    rows = [["Bereich", "Eintrag", "Gekauft am", "Preis (€)", "Händler", "Garantie bis", "Seriennummer", "Archiviert"]].concat(S.objects.map(o => [(cat(o.catId) || {}).name, o.name, o.buy.date, num(o.buy.price) != null ? String(num(o.buy.price)).replace(".", ",") : "", o.buy.shop, o.buy.warranty, o.buy.serial, o.archived ? "ja" : ""]));
  } else if (type === "contracts") {
    name = "allreminde-vertraege.csv";
    rows = [["Vertrag", "Status", "Beginn", "Kosten pro Monat (€)", "Laufzeit bis", "Kündigen bis"]].concat(S.objects.filter(o => o.contract).map(o => { const ci = contractInfo(o.contract) || {}; return [o.name, o.contract.status, o.contract.start, ci.monthly ? ci.monthly.toFixed(2).replace(".", ",") : "", ci.termEnd ? ymd(ci.termEnd) : "", ci.cancelBy ? ymd(ci.cancelBy) : ""]; }));
  } else {
    const list = type === "tax" ? allCosts().filter(c => c.tax) : allCosts();
    name = type === "tax" ? "allreminde-steuer.csv" : "allreminde-kosten.csv";
    rows = [["Datum", "Betrag (€)", "Art", "Beschreibung", "Eintrag", "Bereich"]].concat(list.map(c => [c.d, c.amount.toFixed(2).replace(".", ","), c.type, c.label, c.o ? c.o.name : "", c.k ? c.k.name : ""]));
  }
  saveFile(name, toCsv(rows), "Tabelle");
}

/* ---------- Historie eines Eintrags als Datei (digitales Scheckheft) ---------- */
function exportHistory(objId) {
  const o = obj(objId), k = cat(o.catId), e = esc;
  const rows = o.log.slice().sort(by("d")).map(l => "<tr><td>" + e(fmtD(parse(l.d))) + "</td><td>" + e(l.title) + "</td><td>" + e([l.part, l.brand, l.partno].filter(Boolean).join(", ")) + "</td><td>" + (l.counter ? e(fmtN(l.counter) + " " + counterUnit(o)) : "") + "</td><td>" + e(l.shop) + "</td><td style='text-align:right'>" + (num(l.cost) ? e(fmtE(l.cost)) : "") + "</td></tr>").join("");
  const info = k.fields.filter(f => o.values[f.id]).map(f => "<tr><th>" + e(f.label) + "</th><td>" + e(o.values[f.id]) + "</td></tr>").join("") + (o.buy.date ? "<tr><th>Gekauft am</th><td>" + e(fmtD(parse(o.buy.date))) + "</td></tr>" : "");
  const html = "<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Historie " + e(o.name) + "</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 16px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;font-size:14px;vertical-align:top}th{color:#555;font-weight:600}</style></head><body>" +
    "<h1>" + e(o.name) + "</h1><p>" + e(k.name) + " · Stand " + e(fmtD(today())) + (counterNow(o) != null ? " · " + e(fmtN(counterNow(o)) + " " + counterUnit(o)) : "") + "</p><table>" + info + "</table><h2>Wartung & Reparaturen</h2>" +
    (rows ? "<table><tr><th>Datum</th><th>Arbeit</th><th>Teile</th><th>Stand</th><th>Werkstatt</th><th style='text-align:right'>Kosten</th></tr>" + rows + "</table>" : "<p>Keine Einträge.</p>") +
    "<p style='color:#777;font-size:12px'>Erstellt mit Allreminde. Zum Speichern als PDF: Datei im Browser öffnen und „Drucken → Als PDF sichern“ wählen.</p></body></html>";
  saveFile("historie-" + o.name.replace(/[^\wäöüÄÖÜß-]+/g, "_") + ".html", html, "Historie");
}

/* ---------- QR-Code als Bild ---------- */
async function downloadQr(objId) {
  if (!window.qrcode) { toast("QR-Code nicht verfügbar"); return; }
  const o = obj(objId), q = qrcode(0, "M"); q.addData(appLink() + "#objekt-" + o.id); q.make();
  const n = q.getModuleCount(), cell = 10, margin = 4, size = (n + margin * 2) * cell, label = 60;
  const c = document.createElement("canvas"); c.width = size; c.height = size + label;
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) g.fillRect((col + margin) * cell, (r + margin) * cell, cell, cell);
  g.font = "bold 26px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(o.name.slice(0, 30), size / 2, size + 36);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  saveFile("qr-" + o.name.replace(/[^\wäöüÄÖÜß-]+/g, "_") + ".png", blob, "QR-Code");
}

/* =====================================================================
   Claude-Funktionen (optional, mit eigenem API-Schlüssel von Anthropic)
   Der Schlüssel wird nur auf diesem Gerät gespeichert.
   ===================================================================== */
const aiEnabled = () => !!device().apiKey;
async function claudeCall(prompt, image) {
  const content = [];
  if (image) {
    const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(image); });
    content.push({ type: "image", source: { type: "base64", media_type: image.type || "image/jpeg", data: b64 } });
  }
  content.push({ type: "text", text: prompt });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": device().apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1200, messages: [{ role: "user", content }] })
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Der API-Schlüssel ist ungültig." : "Claude antwortet gerade nicht (" + res.status + ").");
  const data = await res.json();
  return (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
}
// Antwort als JSON lesen (auch wenn Claude ```json … ``` drumherum schreibt)
async function claudeJson(prompt, image) {
  const text = await claudeCall(prompt + "\nAntworte ausschließlich mit gültigem JSON, ohne Erklärung.", image);
  const m = text.match(/[\[{][\s\S]*[\]}]/); if (!m) throw new Error("Keine verwertbare Antwort");
  return JSON.parse(m[0]);
}
function itemContext(o) {
  const k = cat(o.catId);
  return "Bereich: " + k.name + " (" + kindOf(k).label + ")\nName: " + o.name + "\n" + k.fields.filter(f => o.values[f.id]).map(f => f.label + ": " + o.values[f.id]).join("\n") +
    (counterNow(o) != null ? "\n" + (k.counter ? k.counter.label : "Zählerstand") + ": " + counterNow(o) + " " + counterUnit(o) : "") +
    (o.buy.date ? "\nGekauft: " + o.buy.date : "") + "\nVorhandene Aufgaben: " + (S.tasks.filter(t => t.objId === o.id).map(t => t.title).join(", ") || "keine");
}
// Claude schlägt passende Wartungs-/Pflegeaufgaben vor
async function aiSuggest(objId) {
  const o = obj(objId), hasCounter = !!cat(o.catId).counter;
  toast("Claude überlegt …");
  try {
    const list = await claudeJson("Du hilfst in einer deutschen Erinnerungs-App. Schlage 3 bis 8 sinnvolle wiederkehrende Wartungs-, Pflege- oder Prüfaufgaben für diesen Eintrag vor, die noch nicht vorhanden sind. Verwende realistische, übliche Intervalle.\n\n" + itemContext(o) +
      "\n\nFormat: JSON-Array. Jedes Element: {\"title\": string (kurz, deutsch), \"kind\": \"intervall\"" + (hasCounter ? " | \"zaehler\"" : "") + " | \"jaehrlich\", \"every\": Zahl, \"unit\": \"d\"|\"w\"|\"m\"|\"y\", " + (hasCounter ? "\"counterEvery\": Zahl (nur bei zaehler), " : "") + "\"date\": \"2000-MM-TT\" (nur bei jaehrlich), \"note\": string (ein kurzer Hinweis)}.");
    const clean = (Array.isArray(list) ? list : []).filter(t => t && t.title && TASK_KINDS[t.kind]).map(t => ({ title: String(t.title).slice(0, 80), kind: t.kind === "zaehler" && !hasCounter ? "intervall" : t.kind, every: Number(t.every) || 1, unit: UNITS[t.unit] ? t.unit : "m", counterEvery: Number(t.counterEvery) || 0, date: /^\d{4}-\d{2}-\d{2}$/.test(t.date || "") ? t.date : "", note: String(t.note || "").slice(0, 160) }));
    if (!clean.length) { toast("Claude hatte keine Vorschläge"); return; }
    suggestionSheet(objId, clean);
  } catch (e) { toast(e.message || "Claude ist gerade nicht erreichbar"); }
}
// Foto auslesen: Typenschild, Beleg oder Pflanze → Felder ausfüllen
async function aiReadPhoto(objId, file) {
  const o = obj(objId), k = cat(o.catId);
  try {
    const img = await shrinkImage(file, 1568, 3.5e6);
    toast("Claude liest das Foto …");
    const r = await claudeJson("Auf dem Foto ist ein Typenschild, ein Kaufbeleg/eine Rechnung oder eine Pflanze/ein Tier zu „" + o.name + "“. Lies alle erkennbaren Angaben aus.\nFormat: {\"art\": \"typenschild\"|\"beleg\"|\"pflanze\"|\"sonstiges\", \"felder\": {" + k.fields.map(f => JSON.stringify(f.label) + ": string").join(", ") + "}, \"kaufdatum\": \"JJJJ-MM-TT\", \"preis\": Zahl, \"haendler\": string, \"seriennummer\": string, \"hinweis\": string (ein Satz, z. B. Pflegetipp)}. Lass unbekannte Werte leer.", img);
    const undo = snapshot(), filled = [];
    k.fields.forEach(f => { const v = r && r.felder && r.felder[f.label]; if (v && !o.values[f.id]) { o.values[f.id] = String(v).slice(0, 200); filled.push(f.label); } });
    if (r.kaufdatum && /^\d{4}-\d{2}-\d{2}$/.test(r.kaufdatum) && !o.buy.date) { o.buy.date = r.kaufdatum; filled.push("Kaufdatum"); }
    if (num(r.preis) && !num(o.buy.price)) { o.buy.price = String(num(r.preis)); filled.push("Preis"); }
    if (r.haendler && !o.buy.shop) { o.buy.shop = String(r.haendler).slice(0, 80); filled.push("Händler"); }
    if (r.seriennummer && !o.buy.serial) { o.buy.serial = String(r.seriennummer).slice(0, 80); filled.push("Seriennummer"); }
    if (r.hinweis) o.note = (o.note ? o.note + "\n" : "") + "Claude: " + String(r.hinweis).slice(0, 300);
    commit(filled.length ? "Ausgefüllt: " + filled.join(", ") : "Nichts Neues erkannt" + (r.hinweis ? " (Hinweis in der Notiz)" : ""), undo);
  } catch (e) { toast(e.message || "Das Foto konnte nicht ausgelesen werden"); }
}
// Frage zu einem Eintrag stellen, Antwort erscheint darunter
async function aiAsk(objId, question) {
  if (!question) return;
  const box = $("#ai-a-" + objId); box.hidden = false; box.textContent = "Claude denkt nach …";
  try { box.textContent = await claudeCall("Beantworte kurz und praktisch auf Deutsch (höchstens 6 Sätze) eine Frage zu diesem Eintrag aus einer Erinnerungs-App. Wenn du etwas nicht sicher weißt, sag das und nenne, wo man nachsehen kann (z. B. Bedienungsanleitung, Fahrzeugschein).\n\n" + itemContext(obj(objId)) + "\n\nFrage: " + question); }
  catch (e) { box.textContent = e.message || "Claude ist gerade nicht erreichbar."; }
}

/* ---------- Aussehen anwenden ---------- */
function applyLook() {
  const st = S.settings, root = document.documentElement, a = ACCENTS[st.accent] || ACCENTS.petrol;
  if (st.theme === "light" || st.theme === "dark") root.setAttribute("data-theme", st.theme); else root.removeAttribute("data-theme");
  root.style.setProperty("--accent-l", a[0]); root.style.setProperty("--accent-d", a[1]);
  document.body.classList.toggle("privacy", !!st.privacy);
  document.body.classList.toggle("tiles-small", st.tileSize === "small");
  document.body.classList.toggle("tiles-large", st.tileSize === "large");
  const view = $("#view"); if (view) view.style.zoom = (Number(st.zoom) || 100) / 100;
}

/* ---------- Aufgaben aus Vorlagen erzeugen ---------- */
function tasksFromTemplates(o, templates) {
  templates.forEach(tp => S.tasks.push(newTask(Object.assign(clone(tp), { objId: o.id, lastDone: tp.kind === "intervall" || tp.kind === "zaehler" ? todayStr() : "", lastValue: counterNow(o) || 0 }))));
}

/* ---------- Startpakete anlegen (Assistent) ---------- */
function createStarterPacks(ids) {
  ids.forEach(id => {
    const p = STARTER.find(x => x.id === id); if (!p) return;
    const k = newCategory({ kind: p.kind, name: p.name }); S.categories.push(k);
    p.items.forEach(it => {
      const o = newItem({ catId: k.id, name: it.name, counterUnit: it.unit || "" }); S.objects.push(o);
      tasksFromTemplates(o, it.useTemplates ? k.templates : (it.tasks || []));
    });
  });
}
