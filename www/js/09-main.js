/* =====================================================================
   09-main.js – Steuerung: Seitenwechsel, Klicks, Formulare, Start
   ACTIONS  = was bei Klick auf ein Element mit data-act="…" passiert
   SUBMIT   = was beim Speichern eines Formulars passiert
   ===================================================================== */

/* ---------- Seite zeichnen ---------- */
const route = () => decodeURIComponent((location.hash || "").slice(1)) || "start";
function go(hash) { if (route() === hash) render(); else location.hash = hash; }

function render() {
  const r = route();
  const key = Object.keys(ROUTES).find(k => k.endsWith("-") ? r.startsWith(k) : r === k) || "start";
  const view = ROUTES[key];
  const html = key.endsWith("-") ? view(r.slice(key.length)) : view();
  $("#view").innerHTML = '<div class="page' + (UI.edit ? " editing" : "") + '">' + html + "</div>";
  renderNav(NAV_PARENT[key] != null ? NAV_PARENT[key] : key);
  bindTileDrag();
  loadMissingUrls();
}
function renderNav(active) {
  const link = ([id, ic, label]) => '<a href="#' + id + '" class="' + (active === id ? "on" : "") + '">' + icon(ic) + "<span>" + label + "</span></a>";
  $("#nav-side").innerHTML = NAV.filter(n => n[0] !== "mehr").map(link).join("") + '<div class="nav-sep"></div>' + MORE_PAGES.map(link).join("");
  $("#nav-tab").innerHTML = NAV.map(link).join("");
  const over = activeTasks().filter(x => x.c.st === "over").length;
  $$(".nav a[href='#aufgaben'], .tabbar a[href='#aufgaben']").forEach(a => { if (over) a.insertAdjacentHTML("beforeend", '<em class="badge-n">' + over + "</em>"); });
}
window.addEventListener("hashchange", () => { UI.edit = false; closeSheet(); $("#lb-root").innerHTML = ""; render(); window.scrollTo(0, 0); });

/* ---------- Hilfen für Aktionen ---------- */
const findIn = (list, id) => list.find(x => x.id === id);
function toggleFlag(item, key, onText, offText) { item[key] = !item[key]; commit(item[key] ? onText : offText); }
function lightbox(images, i, ownerId, isDoc) {
  if (!images[i]) { $("#lb-root").innerHTML = ""; return; }
  const n = images.length, nav = d => btn(isDoc ? "doc-lightbox" : "lightbox", "", d < 0 ? "chevron_left" : "chevron_right", "", ' data-id="' + ownerId + '" data-i="' + ((i + d + n) % n) + '" aria-label="' + (d < 0 ? "Zurück" : "Weiter") + '"');
  $("#lb-root").innerHTML = '<div class="lightbox" data-act="lb-bg"><img src="' + blobUrl(images[i].id) + '" alt="Foto ' + (i + 1) + '"><div class="row center">' + (n > 1 ? nav(-1) : "") +
    (!isDoc && i > 0 ? btn("lb-cover", "Als Titelbild", "wallpaper", "", ' data-id="' + ownerId + '" data-i="' + i + '"') : "") +
    (!isDoc ? btn("lb-del", "Löschen", "delete", "", ' data-id="' + ownerId + '" data-i="' + i + '"') : "") + btn("lb-close", "Schließen", "close") + (n > 1 ? nav(1) : "") + "</div></div>";
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Kopiert"); }
  catch (e) { const ta = $("#copy-text"); if (ta) { ta.focus(); ta.select(); } toast("Bitte manuell kopieren: markieren und Strg+C"); }
}
// Löschen mit Papierkorb
function deleteTask(t) {
  const undo = snapshot();
  if (t.auto) S.autoOff.push(t.auto + ":" + t.ref); else toTrash("Aufgabe: " + t.title, { tasks: [t] });
  S.tasks = S.tasks.filter(x => x.id !== t.id);
  closeSheet(); commit("Aufgabe gelöscht", undo);
}

/* =====================================================================
   ACTIONS – Klicks
   ===================================================================== */
const ACTIONS = {
  // Navigation
  "goto": el => { closeSheet(); go(el.dataset.h); },
  "goto-tab": el => { UI.tab = el.dataset.tab; go("aufgaben"); },
  "tab": el => { UI.tab = el.dataset.tab; render(); },
  "dtab": el => { UI.dtab = el.dataset.tab; render(); },
  "ltab": el => { UI.ltab = el.dataset.tab; render(); },
  "filter": el => { UI.filter = el.dataset.id; render(); },
  "open-cat": el => go("bereich-" + el.dataset.id),
  "open-obj": el => { closeSheet(); go("objekt-" + el.dataset.id); },
  "open-doc": el => { closeSheet(); go("dokument-" + el.dataset.id); },
  "open-trip": el => go("reise-" + el.dataset.id),
  "cal-nav": el => { UI.calMonth = new Date(UI.calMonth.getFullYear(), UI.calMonth.getMonth() + Number(el.dataset.dir), 1); render(); },
  "cal-day": el => { UI.calSel = el.dataset.d; render(); },
  "year-nav": el => { UI.year = (UI.year || 0) + Number(el.dataset.dir); render(); },
  "toggle-archive": () => { UI.showArchived = !UI.showArchived; render(); },
  "close": () => closeSheet(),
  "reveal": el => el.classList.toggle("show"),
  "undo": () => { if (TOAST.undo) { const u = TOAST.undo; TOAST.undo = null; $("#toast-root").innerHTML = ""; u(); } },

  // Aufgaben
  "task-menu": el => taskMenu(el.dataset.id),
  "new-task": el => { closeSheet(); taskSheet(null, { objId: el.dataset.obj || null, catId: el.dataset.cat || (UI.filter && UI.filter !== "__docs" ? UI.filter : null), docId: el.dataset.doc || null }); },
  "edit-task": el => { closeSheet(); taskSheet(el.dataset.id); },
  "done": el => {
    const t = task(el.dataset.id); if (!t) return;
    closeSheet();
    if (t.auto === "doc") { renewSheet(t.ref); return; }            // Dokument: neues Datum eintragen
    const undo = snapshot(); commit(markDone(t), undo);
  },
  "done-details": el => doneDetailsSheet(el.dataset.id),
  "skip": el => { const t = task(el.dataset.id), undo = snapshot(); skipTask(t); closeSheet(); const c = calc(t); commit(t.done ? "Übersprungen" : "Übersprungen. Nächstes Mal " + (c.days != null ? relDays(c.days) : "nach Zählerstand"), undo); },
  "snooze": el => {
    const t = task(el.dataset.id), undo = snapshot(), v = el.dataset.d;
    t.snooze = v; closeSheet();
    commit("Erinnere dich wieder " + (v.length > 10 ? (v.slice(0, 10) === todayStr() ? "heute" : fmtShort(parse(v))) + " um " + v.slice(11) : "am " + fmtShort(parse(v))), undo);
  },
  "snooze-custom": el => {
    const d = $("#snz-date").value, tm = $("#snz-time").value;
    if (!d) { $("#snz-date").focus(); toast("Bitte ein Datum wählen"); return; }
    if (tm && parseDateTime(d + "T" + tm) <= new Date()) { toast("Dieser Zeitpunkt liegt in der Vergangenheit"); return; }
    el.dataset.d = tm ? d + "T" + tm : d; ACTIONS.snooze(el);
  },
  "new-alarm": () => { closeSheet(); const at = new Date(Date.now() + 3600e3); at.setMinutes(0); taskSheet(null, { title: "", kind: "einmalig", date: ymd(at), time: pad(at.getHours()) + ":00", notify: "alarm", reminders: [0] }); },
  "alarm-stop": () => stopAlarm(),
  "alarm-done": el => { stopAlarm(); const t = task(el.dataset.id); if (t) commit(markDone(t)); },
  "alarm-snooze": el => { stopAlarm(); const t = task(el.dataset.id); if (t) { t.snooze = localDateTime(new Date(Date.now() + 10 * 60e3)); commit("Wecker in 10 Minuten"); } },

  // Benachrichtigungen & Konto
  "notif-enable": async () => { if (await enableNotifications()) { toast("Benachrichtigungen sind an"); render(); } },
  "notif-disable": () => { saveDevice({ notify: false }); const LN = Plugin("LocalNotifications"); if (LN) LN.getPending().then(p => p.notifications.length && LN.cancel({ notifications: p.notifications.map(x => ({ id: x.id })) })); toast("Benachrichtigungen auf diesem Gerät aus"); render(); },
  "notif-test": el => testNotification(el.dataset.mode),
  "notif-exact": () => openExactAlarmSetting(),
  "sign-out": async () => { await signOut(); toast("Abgemeldet. Deine Daten bleiben auf diesem Gerät."); render(); },
  "login-mode": () => { UI.signup = !UI.signup; render(); },
  "ai-key-remove": () => { saveDevice({ apiKey: "" }); toast("Schlüssel entfernt"); render(); },
  "unsnooze": el => { task(el.dataset.id).snooze = ""; closeSheet(); commit("Verschiebung aufgehoben"); },
  "reopen": el => { task(el.dataset.id).done = false; closeSheet(); commit("Wieder geöffnet"); },
  "undo-step": el => { const t = task(el.dataset.id); undoLastStep(t); commit("„" + t.title + "“ wieder offen"); },
  "fav-task": el => toggleFlag(task(el.dataset.id), "fav", "Als Favorit angeheftet", "Favorit entfernt"),
  "task-check": el => { const t = task(el.dataset.id); t.checklist[el.dataset.i].done = el.checked; persist(); },
  "del-task-ask": () => askDelete("Aufgabe löschen?", "del-task"),
  "del-task": () => deleteTask(task(SHEET.t ? SHEET.t.id : SHEET.id)),

  // Startseite & Bereiche
  "toggle-edit": () => { UI.edit = !UI.edit; render(); },
  "sec-move": el => { const s = S.layout.sections, i = Number(el.dataset.i), j = i + Number(el.dataset.dir); if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; commit(); },
  "sec-toggle": el => { const s = S.layout.sections[el.dataset.i]; s.on = !s.on; commit(); },
  "move-cat": el => { const c = S.categories, i = c.findIndex(k => k.id === el.dataset.id), j = i + Number(el.dataset.dir); if (j < 0 || j >= c.length) return; [c[i], c[j]] = [c[j], c[i]]; commit(); },
  "new-cat": () => { closeSheet(); categorySheet(null); },
  "edit-cat": el => categorySheet(el.dataset.id),
  "pick-color": el => { SHEET.k.color = el.dataset.c; $$("#c-swatches .swatch").forEach(s => s.classList.toggle("on", s === el)); $$("#c-icons button").forEach(b => b.style.setProperty("--c", COLORS[el.dataset.c])); },
  "pick-icon": el => { SHEET.k.icon = el.dataset.icon; $$("#c-icons button").forEach(b => b.classList.toggle("on", b === el)); },
  "add-field": () => { $("#c-fields").insertAdjacentHTML("beforeend", fieldRowHtml({ id: uid(), label: "", type: "text", unit: "" })); $("#c-fields .field-row:last-child input").focus(); },
  "del-row": el => el.closest(".field-row, .link-row").remove(),
  "del-template": el => { SHEET.k.templates.splice(Number(el.dataset.i), 1); $("#c-templates").innerHTML = templateChips(SHEET.k.templates); },
  "rem-add": () => { const n = Number($("#rem-custom").value); if (!(n >= 0) || $("#rem-custom").value === "") return; if (!$$("#rem-chips input").some(i => Number(i.value) === n)) $("#rem-chips").insertAdjacentHTML("beforeend", '<label><input type="checkbox" value="' + n + '" checked><span>' + reminderLabel(n) + "</span></label>"); else $$("#rem-chips input").find(i => Number(i.value) === n).checked = true; $("#rem-custom").value = ""; const d = $("#rem-default"); if (d) d.checked = false; },
  "del-cat-ask": () => askDelete("Bereich mit allen Einträgen löschen? (landet im Papierkorb)", "del-cat"),
  "del-cat": () => {
    const k = SHEET.k, objs = S.objects.filter(o => o.catId === k.id), ids = objs.map(o => o.id), tasks = S.tasks.filter(t => ids.includes(t.objId) || t.catId === k.id);
    toTrash("Bereich: " + k.name, { categories: [cat(k.id)], objects: objs, tasks });
    S.categories = S.categories.filter(c => c.id !== k.id); S.objects = S.objects.filter(o => !ids.includes(o.id)); S.tasks = S.tasks.filter(t => !tasks.includes(t));
    closeSheet(); go("bereiche"); commit("Bereich in den Papierkorb verschoben");
  },

  // Einträge
  "new-obj": el => { closeSheet(); itemSheet(null, el.dataset.cat); },
  "q-obj": () => { const c = $("#q-cat").value; closeSheet(); itemSheet(null, c); },
  "q-log": () => { const o = $("#q-obj").value; closeSheet(); logSheet(o); },
  "edit-obj": el => itemSheet(el.dataset.id),
  "fav-obj": el => toggleFlag(obj(el.dataset.id), "fav", "Als Favorit angeheftet", "Favorit entfernt"),
  "archive-obj": el => { const o = obj(el.dataset.id); o.archived = !o.archived; commit(o.archived ? "Archiviert. Erinnerungen ruhen." : "Aus dem Archiv geholt"); },
  "apply-templates": el => { const o = obj(el.dataset.id), undo = snapshot(); tasksFromTemplates(o, cat(o.catId).templates); commit("Vorlagen übernommen", undo); },
  "del-obj-ask": () => askDelete("Eintrag samt Aufgaben löschen? (landet im Papierkorb)", "del-obj"),
  "del-obj": () => { const o = obj(SHEET.o.id), tasks = S.tasks.filter(t => t.objId === o.id); toTrash("Eintrag: " + o.name, { objects: [o], tasks }); S.objects = S.objects.filter(x => x.id !== o.id); S.tasks = S.tasks.filter(t => t.objId !== o.id); closeSheet(); go("bereich-" + o.catId); commit("In den Papierkorb verschoben"); },
  "new-log": el => logSheet(el.dataset.obj),
  "edit-log": el => logSheet(el.dataset.obj, el.dataset.id),
  "del-log-ask": () => askDelete("Logbuch-Eintrag löschen?", "del-log"),
  "del-log": () => { const o = obj(SHEET.objId), undo = snapshot(); o.log = o.log.filter(l => l.id !== SHEET.l.id); closeSheet(); commit("Logbuch-Eintrag gelöscht", undo); },
  "new-record": el => recordSheet(el.dataset.obj, el.dataset.mod),
  "edit-record": el => recordSheet(el.dataset.obj, el.dataset.mod, el.dataset.id),
  "del-record-ask": () => askDelete("Eintrag löschen?", "del-record"),
  "del-record": () => { const o = obj(SHEET.objId), undo = snapshot(); o.records[SHEET.mod] = o.records[SHEET.mod].filter(r => r.id !== SHEET.rowId); closeSheet(); commit("Gelöscht", undo); },
  "to-shopping": el => { const r = obj(el.dataset.obj).records.verbrauch.find(x => x.id === el.dataset.id); S.lists.shopping.push({ id: uid(), text: r.name, qty: "", link: r.link || "", done: false }); commit("„" + r.name + "“ auf die Einkaufsliste gesetzt"); },
  "edit-contract": el => contractSheet(el.dataset.id),
  "del-contract": () => { obj(SHEET.id).contract = null; closeSheet(); commit("Vertragsdaten entfernt"); },
  "cancel-letter": el => textSheet("Kündigungsschreiben", cancellationLetter(obj(el.dataset.id)), "Prüfe Anbieter-Adresse und Datum. Kündige am besten per Einschreiben oder über das Kündigungsformular des Anbieters." + (S.profile.street ? "" : " Tipp: Trage im Profil deine Adresse ein.")),
  "water-list": el => textSheet("Gießliste", waterListText(el.dataset.id), "Zum Weitergeben an Nachbarn oder Freunde."),
  "link-contact": el => linkContactSheet(el.dataset.id),
  "unlink-contact": el => { const o = obj(el.dataset.id); o.contactIds = o.contactIds.filter(c => c !== el.dataset.c); commit("Verknüpfung gelöst"); },
  "lightbox": el => lightbox(obj(el.dataset.id).photos, Number(el.dataset.i), el.dataset.id, false),
  "doc-lightbox": el => lightbox(docImgs(doc(el.dataset.id)), Number(el.dataset.i), el.dataset.id, true),
  "lb-bg": (el, e) => { if (e.target === el) $("#lb-root").innerHTML = ""; },
  "lb-close": () => { $("#lb-root").innerHTML = ""; },
  "lb-cover": el => { const o = obj(el.dataset.id), [p] = o.photos.splice(Number(el.dataset.i), 1); o.photos.unshift(p); commit("Titelbild gesetzt"); lightbox(o.photos, 0, o.id, false); },
  "lb-del": el => { if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.lastChild.textContent = "Wirklich löschen?"; return; } const o = obj(el.dataset.id), i = Number(el.dataset.i), [p] = o.photos.splice(i, 1); deleteAsset(p.id); commit("Foto gelöscht"); lightbox(o.photos, Math.max(0, i - 1), o.id, false); },
  "del-file": el => { if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.innerHTML = icon("delete_forever", "color:var(--danger)"); toast("Nochmal tippen zum Löschen"); return; } const o = obj(el.dataset.id), [f] = o.files.splice(Number(el.dataset.i), 1); deleteAsset(f.id); commit("Datei gelöscht"); },
  "rm-pending": el => { const list = SHEET[el.dataset.kind], [f] = list.splice(Number(el.dataset.i), 1); if (f && SHEET.type !== "log") deleteAsset(f.id); refreshPending(el.dataset.kind); },
  "ai-suggest": el => aiSuggest(el.dataset.id),
  "qr": el => qrSheet(el.dataset.id),
  "qr-download": el => downloadQr(el.dataset.id),
  "history-export": el => exportHistory(el.dataset.id),

  // Dokumente & Links
  "new-doc": () => { closeSheet(); docSheet(null); },
  "edit-doc": el => docSheet(el.dataset.id),
  "renew-doc": el => renewSheet(el.dataset.id),
  "fav-doc": el => toggleFlag(doc(el.dataset.id), "fav", "Als Favorit angeheftet", "Favorit entfernt"),
  "doc-step": el => { doc(el.dataset.id).steps[el.dataset.i].done = el.checked; persist(); },
  "add-linkrow": () => { $("#d-links").insertAdjacentHTML("beforeend", linkRowHtml({})); $("#d-links .link-row:last-child input").focus(); },
  "del-docfile": el => { if (el.dataset.sure !== "1") { el.dataset.sure = "1"; el.innerHTML = icon("delete_forever", "color:var(--danger)"); toast("Nochmal tippen zum Löschen"); return; } const d = doc(el.dataset.id), [f] = d.files.splice(Number(el.dataset.i), 1); deleteAsset(f.id); commit("Datei gelöscht"); },
  "del-doc-ask": () => askDelete("Dokument löschen? (landet im Papierkorb)", "del-doc"),
  "del-doc": () => { const d = doc(SHEET.d.id); toTrash("Dokument: " + d.name, { docs: [d], tasks: S.tasks.filter(t => t.docId === d.id && !t.auto) }); S.docs = S.docs.filter(x => x.id !== d.id); S.tasks = S.tasks.filter(t => t.docId !== d.id); closeSheet(); go("dokumente"); commit("In den Papierkorb verschoben"); },
  "new-link": () => simpleSheet("links"),
  "edit-link": el => simpleSheet("links", el.dataset.id),
  "fav-link": el => toggleFlag(findIn(S.links, el.dataset.id), "fav", "Als Favorit angeheftet", "Favorit entfernt"),
  "copy": el => copyText(el.dataset.text),
  "copy-sheet": () => copyText($("#copy-text").value),

  // Listen, Reisen, Kontakte
  "new-simple": el => { closeSheet(); simpleSheet(el.dataset.type); },
  "edit-simple": (el, e) => { e.preventDefault(); simpleSheet(el.dataset.type, el.dataset.id); },
  "del-simple-ask": () => askDelete("Wirklich löschen? (landet im Papierkorb)", "del-simple"),
  "del-simple": () => {
    const cfg = SIMPLE[SHEET.kind], item = findIn(cfg.list(), SHEET.id), key = ["shopping", "lent", "vouchers"].includes(SHEET.kind) ? "lists." + SHEET.kind : SHEET.kind;
    toTrash(cfg.title + ": " + (item.title || item.name || item.text || item.thing), { [key]: [item] });
    const list = cfg.list(); list.splice(list.indexOf(item), 1);
    if (SHEET.kind === "contacts") S.objects.forEach(o => o.contactIds = o.contactIds.filter(c => c !== item.id));
    const wasTrip = SHEET.kind === "trips"; closeSheet(); if (wasTrip) go("reisen"); commit("In den Papierkorb verschoben");
  },
  "shop-toggle": el => { findIn(S.lists.shopping, el.dataset.id).done = el.checked; commit(); },
  "shop-clear": () => { const undo = snapshot(); S.lists.shopping = S.lists.shopping.filter(x => !x.done); commit("Erledigte entfernt", undo); },
  "trip-check": el => { findIn(S.trips, el.dataset.id).checklist[el.dataset.i].done = el.checked; persist(); el.closest(".check-item").classList.toggle("is-done", el.checked); },

  // Daten & Einstellungen
  "ics-export": () => exportIcs(),
  "csv-costs": () => exportCsv("costs"), "csv-tax": () => exportCsv("tax"), "csv-inventory": () => exportCsv("inventory"), "csv-contracts": () => exportCsv("contracts"),
  "export-json": () => saveFile("allreminde-sicherung-" + todayStr() + ".json", JSON.stringify(S, null, 2), "Sicherung"),
  "trash-restore": el => { restoreFromTrash(el.dataset.id); commit("Wiederhergestellt"); },
  "trash-empty": () => { const undo = snapshot(); S.trash = []; commit("Papierkorb geleert", undo); },
  "keep-example": () => { S.example = false; commit("Beispieldaten übernommen"); },
  "quick-add": () => quickAddSheet(),
  "reset-ask": () => { $("#reset-row").lastElementChild.outerHTML = '<span class="confirm">Wirklich alles löschen?' + btn("reset", "Ja", null, "danger") + btn("reset-no", "Nein", null, "ghost") + "</span>"; },
  "reset-no": () => render(),
  "reset": () => { const undo = snapshot(), keep = { profile: S.profile, settings: S.settings }; S = Object.assign(emptyState(), keep, { setupDone: true }); commit("Alles zurückgesetzt", undo); },
  "del-cancel": () => { const act = { taskmenu: "del-task-ask", task: "del-task-ask", category: "del-cat-ask", item: "del-obj-ask", log: "del-log-ask", record: "del-record-ask", doc: "del-doc-ask", simple: "del-simple-ask" }[SHEET.type]; $("#del-zone").innerHTML = btn(act, "Löschen", "delete", "danger ghost"); }
};

/* =====================================================================
   SUBMIT – Formulare speichern
   ===================================================================== */
// Checkliste aus Textzeilen bauen, Haken bei gleichem Text behalten
const mergeChecklist = (text, old) => linesOf(text).map(line => ({ text: line, done: !!(old || []).find(x => x.text === line && x.done) }));

const SUBMIT = {
  category() {
    const k = readCategoryForm(); if (!k.name) { $("#c-name").focus(); toast("Bitte einen Namen eingeben"); return; }
    if (SHEET.isNew) S.categories.push(k); else S.categories[S.categories.findIndex(c => c.id === k.id)] = k;
    const isNew = SHEET.isNew; closeSheet(); commit(isNew ? "Bereich „" + k.name + "“ angelegt" : "Bereich gespeichert"); if (isNew) go("bereich-" + k.id);
  },
  item() {
    const o = SHEET.o, k = cat(o.catId), val = id => { const el = $("#f-" + id); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };
    o.name = val("name"); if (!o.name) { $("#f-name").focus(); toast("Bitte einen Namen eingeben"); return; }
    k.fields.forEach(f => { const v = val("v-" + f.id); if (v) o.values[f.id] = f.type === "link" ? normUrl(v) : v; else delete o.values[f.id]; });
    o.birthday = val("birthday") || ""; o.counterUnit = val("cunit") || "";
    o.buy = { date: val("bdate"), price: val("bprice") ? String(num(val("bprice"))) : "", shop: val("bshop"), warranty: val("bwar"), serial: val("bser"), online: val("bonline"), tax: val("btax") };
    o.note = val("note"); o.fav = val("fav");
    if (SHEET.isNew) {
      if (num(val("counter")) != null) o.counter = [{ d: todayStr(), v: num(val("counter")) }];
      o.photos = SHEET.photos.map(p => Object.assign(p, { d: todayStr() })); o.files = SHEET.files;
      S.objects.push(o);
      const chosen = $$("#o-templates input:checked").map(i => k.templates[Number(i.value)]);
      tasksFromTemplates(o, chosen);
      closeSheet(); commit("„" + o.name + "“ angelegt" + (chosen.length ? " mit " + chosen.length + " Aufgaben" : "")); go("objekt-" + o.id);
    } else { S.objects[S.objects.findIndex(x => x.id === o.id)] = o; closeSheet(); commit("Gespeichert"); }
  },
  contract() { const v = readForm(CONTRACT_FIELDS); if (!v) return; obj(SHEET.id).contract = v; closeSheet(); commit("Vertragsdaten gespeichert"); },
  task() {
    const t = SHEET.t, v = id => ($("#" + id) || {}).value || "";
    t.title = $("#f-title").value.trim(); if (!t.title) { $("#f-title").focus(); toast("Bitte eintragen, was zu tun ist"); return; }
    const p = $("#t-parent").value;
    t.objId = p.startsWith("o:") ? p.slice(2) : null; t.catId = p.startsWith("c:") ? p.slice(2) : null; t.docId = p.startsWith("d:") ? p.slice(2) : null;
    if (!t.auto) t.kind = $("#t-kinds input:checked").value;
    if (t.kind === "einmalig" || t.kind === "jaehrlich") { t.date = v("t-date"); if (!t.date) { $("#t-date").focus(); toast("Bitte ein Datum wählen"); return; } if (SHEET.isNew) t.start = todayStr(); }
    if (t.kind === "intervall") { t.every = Math.max(1, num(v("t-every")) || 1); t.unit = v("t-unit"); t.lastDone = v("t-last") || todayStr(); t.winterEvery = num(v("t-winter")) || 0; }
    if (t.kind === "wochentage") { t.days = $$("#t-days input:checked").map(i => Number(i.value)); if (!t.days.length) { toast("Bitte mindestens einen Wochentag wählen"); return; } }
    if (t.kind === "monatlich") t.mday = v("t-mday") === "last" ? "last" : Number(v("t-mday"));
    if (t.kind === "zaehler") { t.counterEvery = num(v("t-cevery")) || 0; if (!t.counterEvery) { $("#t-cevery").focus(); toast("Bitte das Intervall angeben"); return; } t.lastValue = num(v("t-cval")) || 0; t.every = num(v("t-zevery")) || 0; t.unit = v("t-zunit"); t.lastDone = v("t-zlast") || todayStr(); }
    t.pause = ["intervall", "wochentage", "monatlich"].includes(t.kind) ? $$("#t-pause input:checked").map(i => Number(i.value)) : [];
    t.until = v("t-until");
    t.time = v("t-time"); t.notify = v("t-notify") || null;
    t.reminders = readReminders(true);
    t.prio = Number(v("f-prio")) || 0; t.fav = $("#f-fav").checked; t.note = v("f-note").trim();
    t.checklist = mergeChecklist(v("f-checklist"), t.checklist);
    t.followUp = v("f-fu-title").trim() ? { title: v("f-fu-title").trim(), days: num(v("f-fu-days")) || 0 } : null;
    t.rotation = linesOf(v("f-rotation"));
    if (SHEET.isNew) S.tasks.push(t); else S.tasks[S.tasks.findIndex(x => x.id === t.id)] = t;
    const isNew = SHEET.isNew; closeSheet(); commit(isNew ? "Aufgabe angelegt" : "Aufgabe gespeichert");
  },
  log() {
    const v = readForm(SHEET.fields); if (!v) return;
    const o = obj(SHEET.objId), undo = snapshot(), l = Object.assign(SHEET.l, v, { files: SHEET.files });
    const savePart = l.savepart; delete l.savepart;
    if (num(l.counter) != null && cat(o.catId).counter) addCounterReading(o, l.d, num(l.counter));
    if (savePart && l.part) { o.records.teile = o.records.teile || []; o.records.teile.push({ id: uid(), name: l.part, brand: l.brand, partno: l.partno, link: "", note: "" }); }
    let msg = "Im Logbuch gespeichert";
    if (SHEET.isNew) {
      o.log.push(l);
      const tid = $("#l-task") ? $("#l-task").value : "";
      if (tid) { markDone(task(tid), l.d, { logId: l.id, counter: num(l.counter) }); msg = "Gespeichert und Aufgabe erledigt"; }
    } else o.log[o.log.findIndex(x => x.id === l.id)] = l;
    closeSheet(); commit(msg, undo);
  },
  done() { const v = readForm(SHEET.defs); if (!v) return; const undo = snapshot(); const msg = markDone(task(SHEET.id), v.d, { cost: v.cost, note: v.note }); closeSheet(); commit(msg, undo); },
  record() {
    const M = MODULES[SHEET.mod], v = readForm(M.fields); if (!v) return;
    const o = obj(SHEET.objId), list = (o.records[SHEET.mod] = o.records[SHEET.mod] || []);
    if (SHEET.rowId) Object.assign(list.find(r => r.id === SHEET.rowId), v); else list.push(Object.assign({ id: uid() }, v));
    if (SHEET.mod === "tanken" && num(v.km) != null && cat(o.catId).counter) addCounterReading(o, v.d, num(v.km));   // Tanken aktualisiert km-Stand
    if (SHEET.mod === "reifen" && v.mounted) list.forEach(r => { if (r.name !== v.name) r.mounted = false; });       // nur ein Satz montiert
    closeSheet(); commit("Gespeichert");
  },
  doc() {
    const v = readForm(SHEET.defs); if (!v) return;
    const d = Object.assign(SHEET.d, v, {
      renewEvery: num(v.renewEvery) || 0, reminders: readReminders(false), steps: mergeChecklist(v.steps, SHEET.d.steps),
      links: $$("#d-links .link-row").map(r => ({ label: r.querySelector(".lk-label").value.trim(), url: normUrl(r.querySelector(".lk-url").value.trim()) })).filter(l => l.url)
    });
    if (SHEET.isNew) { d.files = SHEET.files; S.docs.push(d); } else S.docs[S.docs.findIndex(x => x.id === d.id)] = d;
    const isNew = SHEET.isNew; closeSheet(); commit(isNew ? "„" + d.name + "“ angelegt" + (d.expires ? ", Erinnerung gesetzt" : "") : "Gespeichert"); if (isNew) go("dokument-" + d.id);
  },
  renew() {
    const v = readForm(SHEET.defs); if (!v) return;
    const d = doc(SHEET.id), undo = snapshot(), t = S.tasks.find(x => x.auto === "doc" && x.ref === d.id);
    if (t) pushHistory(t, { d: todayStr(), note: "gültig bis " + fmtD(parse(v.expires)) });
    d.history.push({ d: todayStr(), from: d.expires, to: v.expires });
    Object.assign(d, { expires: v.expires, issued: v.issued || d.issued, number: v.number });
    d.files.push(...SHEET.files); d.steps.forEach(s => s.done = false);
    closeSheet(); commit("Erneuert, gültig bis " + fmtD(parse(v.expires)), undo);
  },
  simple() {
    const cfg = SIMPLE[SHEET.kind], v = readForm(cfg.fields); if (!v) return;
    const list = cfg.list(), old = SHEET.id ? findIn(list, SHEET.id) : null;
    if (SHEET.kind === "trips") v.checklist = mergeChecklist(v.checklist, old && old.checklist);
    if (old) Object.assign(old, v); else list.push(Object.assign({ id: uid() }, v));
    const isNewTrip = !old && SHEET.kind === "trips", id = old ? old.id : list[list.length - 1].id;
    closeSheet(); commit("Gespeichert"); if (isNewTrip) go("reise-" + id);
  },
  linkcontact() {
    const o = obj(SHEET.objId), pick = $("#lc-pick") ? $("#lc-pick").value : "";
    let id = pick;
    if (!id) { const v = readForm(SIMPLE.contacts.fields.map(f => Object.assign({}, f, { req: false }))); if (!v || !v.name) { toast("Bitte einen Kontakt wählen oder einen Namen eingeben"); return; } id = uid(); S.contacts.push(Object.assign({ id }, v)); }
    o.contactIds.push(id); closeSheet(); commit("Kontakt verknüpft");
  },
  suggest() {
    const o = obj(SHEET.objId), chosen = $$("#sheet input[type=checkbox]:checked").map(i => SHEET.list[Number(i.value)]);
    const undo = snapshot(); tasksFromTemplates(o, chosen); closeSheet(); commit(chosen.length + " Aufgaben übernommen", undo);
  }
};

// Formulare auf normalen Seiten (nicht in einem Sheet)
const PAGE_FORMS = {
  "counter": f => { const v = num(f.querySelector("input").value); if (v == null) return; const o = obj(f.dataset.id), before = counterNow(o); addCounterReading(o, todayStr(), v); commit(before != null && v < before ? "Eingetragen (kleiner als vorher – bitte prüfen)" : "Stand eingetragen"); },
  "profile": () => { const v = readForm(PROFILE_FIELDS); if (!v) return; Object.assign(S.profile, v); commit("Profil gespeichert"); },
  "settings-rem": () => { S.settings.reminders = readReminders(false); commit("Standard-Erinnerungen gespeichert"); },
  "settings-trip": () => { S.settings.tripChecklist = linesOf($("#f-tripcl").value); commit("Vorlage gespeichert"); },
  "search": () => { UI.q = $("#search-q").value; render(); },
  "notify-settings": () => {
    const n = S.settings.notify, val = id => $("#" + id).value;
    Object.assign(n, { mode: val("n-mode"), defaultTime: val("n-time") || "08:00", quietOn: $("#n-quiet").checked, quietFrom: val("n-qfrom") || "22:00", quietTo: val("n-qto") || "07:00",
      nagHours: Number(val("n-nag")) || 0, summaryOn: $("#n-sum").checked, summaryTime: val("n-sumtime") || "07:30", alarmSound: $("#n-sound").checked });
    commit("Einstellungen gespeichert");
  },
  "login": async f => {
    const email = $("#k-email").value.trim(), pw = $("#k-pw").value, isNew = f.dataset.mode === "signup";
    if (!email || pw.length < 6) { toast("Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben"); return; }
    toast(isNew ? "Konto wird angelegt …" : "Anmelden …");
    const err = isNew ? await signUp(email, pw) : await signIn(email, pw);
    if (err) { toast(err.message.includes("Invalid login") ? "E-Mail oder Passwort stimmt nicht" : err.message.includes("confirm") ? "Bitte zuerst den Link in der Bestätigungs-E-Mail anklicken" : err.message); return; }
    toast(isNew ? "Fast fertig: Bitte bestätige die E-Mail, die du gerade bekommen hast. Danach hier anmelden." : "Angemeldet – Daten werden synchronisiert");
    render();
  },
  "ai-key": () => { const k = $("#ai-key").value.trim(); if (!k.startsWith("sk-")) { toast("Der Schlüssel beginnt mit „sk-“"); return; } saveDevice({ apiKey: k }); toast("Claude-Funktionen sind an"); render(); },
  "shop-quick": () => { const v = $("#shop-new").value.trim(); if (!v) return; S.lists.shopping.push({ id: uid(), text: v, qty: "", link: "", done: false }); commit(); setTimeout(() => $("#shop-new") && $("#shop-new").focus(), 0); },
  "ai-ask": f => aiAsk(f.dataset.id, f.querySelector("input").value.trim()),
  "assistant": () => {
    const packs = $$("input[name=pack]:checked").map(i => i.value), undo = snapshot();
    if ($("#clear-example") && $("#clear-example").checked && S.example) { const keep = { profile: S.profile, settings: S.settings, layout: S.layout }; S = Object.assign(emptyState(), keep); }
    if ($("#f-aname").value.trim()) S.profile.name = $("#f-aname").value.trim();
    createStarterPacks(packs); S.example = false; S.setupDone = true;
    commit(packs.length ? packs.length + " Bereiche angelegt" : "Fertig", undo); go("start");
  }
};

/* =====================================================================
   Ereignisse verbinden
   ===================================================================== */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act;
  if (act === "sheet-bg") { if (e.target === el) closeSheet(); return; }
  if (UI.edit && act === "open-cat" && !e.target.closest("button")) return;       // im Anordnen-Modus nicht öffnen
  if (el.closest(".item, .tile, .fav, .doc, .entry") && el.tagName === "BUTTON") e.stopPropagation();
  const fn = ACTIONS[act];
  if (fn) { if (el.tagName === "BUTTON" || el.tagName === "A") e.preventDefault(); fn(el, e); }
});
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === "sheet" && SHEET && SUBMIT[SHEET.type]) SUBMIT[SHEET.type]();
  else if (f.dataset.form && PAGE_FORMS[f.dataset.form]) PAGE_FORMS[f.dataset.form](f);
});
document.addEventListener("input", e => {
  if (e.target.id === "c-iconsearch") {
    const q = e.target.value.trim().toLowerCase();
    $$("#c-icons button").forEach(b => b.hidden = !!q && !(b.dataset.k.includes(q) || b.dataset.icon.includes(q)));
    $$("#c-icons [data-grp]").forEach(g => g.hidden = !!q);
  }
});
document.addEventListener("change", async e => {
  const t = e.target, st = S.settings;
  if (t.closest && t.closest("#rem-chips") && $("#rem-default")) $("#rem-default").checked = false;   // eigene Auswahl statt Standard
  if (t.name === "kind") updateTaskKind();
  else if (t.id === "t-parent") updateTaskParent();
  else if (t.id === "c-hascounter") $("#c-counter").hidden = !t.checked;
  else if (t.id === "c-kind" && SHEET && SHEET.isNew) {                       // neue Art → passende Vorgaben übernehmen
    const name = $("#c-name").value.trim(), fresh = newCategory({ kind: t.value });
    if (name) fresh.name = name;
    SHEET.k = Object.assign(fresh, { id: SHEET.k.id });
    $("#c-name").value = fresh.name; $("#c-fields").innerHTML = fresh.fields.map(fieldRowHtml).join("");
    $("#c-icons").innerHTML = iconGrid(fresh.icon, COLORS[fresh.color]); $$("#c-swatches .swatch").forEach(s => s.classList.toggle("on", s.dataset.c === fresh.color));
    $$("#c-modules input").forEach(i => i.checked = fresh.modules.includes(i.value));
    $("#c-hascounter").checked = !!fresh.counter; $("#c-counter").hidden = !fresh.counter; if (fresh.counter) { $("#c-clabel").value = fresh.counter.label; $("#c-cunit").value = fresh.counter.unit; }
    $$("#rem-chips input").forEach(i => i.checked = fresh.reminders.includes(Number(i.value)));
    $("#c-templates").innerHTML = templateChips(fresh.templates);
  }
  else if (t.id === "f-type" && SHEET && SHEET.type === "doc") {             // Dokumentart → Name & Intervall vorschlagen
    const ty = DOCTYPES[t.value], nm = $("#f-name"), rn = $("#f-renewEvery");
    if (!nm.value || Object.values(DOCTYPES).some(x => x[0] === nm.value)) nm.value = ty[0];
    if (!rn.value || Object.values(DOCTYPES).some(x => String(x[2]) === rn.value)) rn.value = ty[2] || "";
  }
  else if (t.id === "cost-year") { UI.costYear = t.value; render(); }
  // Aussehen (Profilseite) – wird sofort gespeichert
  else if (t.name === "accent") { st.accent = t.value; applyLook(); commit(); }
  else if (t.name === "pcolor") { st.color = t.value; commit(); }
  else if (t.id === "f-theme" && !SHEET) { st.theme = t.value; applyLook(); commit(); }
  else if (t.id === "f-tiles" && !SHEET) { st.tileSize = t.value; applyLook(); commit(); }
  else if (t.id === "f-zoom" && !SHEET) { st.zoom = Number(t.value); applyLook(); commit(); }
  else if (t.id === "f-privacy" && !SHEET) { st.privacy = t.checked; applyLook(); commit(st.privacy ? "Privatsphäre-Modus an" : "Privatsphäre-Modus aus"); }
  // Dateien
  else if (t.dataset.pending && t.files.length) { const kind = t.dataset.pending, files = [...t.files]; t.value = ""; const up = await uploadFiles(files, kind === "photos"); if (SHEET && SHEET[kind]) { SHEET[kind].push(...up); refreshPending(kind); } }
  else if (t.dataset.upload && t.files.length) {
    const files = [...t.files], type = t.dataset.upload, id = t.dataset.id; t.value = "";
    const up = await uploadFiles(files, type === "photo"); if (!up.length) return;
    if (type === "doc") doc(id).files.push(...up); else if (type === "photo") obj(id).photos.push(...up); else obj(id).files.push(...up);
    commit();
  }
  else if (t.dataset.aiPhoto && t.files.length) { const f = t.files[0]; t.value = ""; aiReadPhoto(t.dataset.aiPhoto, f); }
  else if (t.id === "ics-file" && t.files[0]) { const f = t.files[0]; t.value = ""; importIcs(await f.text(), f.name); }
  else if (t.id === "imp-file" && t.files[0]) {
    const f = t.files[0]; t.value = "";
    try { const ns = normalize(JSON.parse(await f.text())); if (!ns || !Array.isArray(ns.categories)) throw new Error(); const undo = snapshot(); S = ns; applyLook(); commit("Sicherung eingespielt", undo); }
    catch (err) { toast("Die Datei ist keine gültige Allreminde-Sicherung"); }
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if ($("#lb-root").innerHTML) $("#lb-root").innerHTML = ""; else if ($("#sheet")) closeSheet(); }
  const el = e.target;
  if ((e.key === "Enter" || e.key === " ") && el.matches && el.matches(".tile[data-id], .doc[data-id]") && !UI.edit) { e.preventDefault(); el.click(); }
});

/* ---------- Kacheln per Ziehen verschieben (PC) ---------- */
function bindTileDrag() {
  if (!UI.edit) return;
  const wrap = $("#tiles"); if (!wrap) return;
  let dragId = null;
  $$("#tiles .tile[data-id]").forEach(t => {
    t.addEventListener("dragstart", e => { dragId = t.dataset.id; t.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", dragId); } catch (_) {} });
    t.addEventListener("dragend", () => t.classList.remove("dragging"));
    t.addEventListener("dragover", e => e.preventDefault());
    t.addEventListener("drop", e => {
      e.preventDefault(); const to = t.dataset.id; if (!dragId || dragId === to) return;
      const c = S.categories, [moved] = c.splice(c.findIndex(k => k.id === dragId), 1);
      c.splice(c.findIndex(k => k.id === to), 0, moved); dragId = null; commit();
    });
  });
}

/* ---------- Start ---------- */
function start() {
  $$("[data-icon]").forEach(el => { el.textContent = iconChar(el.dataset.icon); });   // Symbole im Grundgerüst
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) S = normalize(JSON.parse(raw)); } catch (e) { S = null; }
  if (!S) S = normalize(exampleState());
  syncAutoTasks();
  applyLook();
  render();
  connectCloud();
  startNotifications();
}
