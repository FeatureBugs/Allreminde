/* =====================================================================
   07-forms.js – Formulare (Unterseiten zum Anlegen und Bearbeiten)
   Jedes xyzSheet() öffnet ein Formular. Gespeichert wird in
   09-main.js → SUBMIT[...] (gleicher Name wie SHEET.type).
   ===================================================================== */

/* ---------- "Neu"-Menü ---------- */
function quickAddSheet() {
  const inner = '<div class="acts">' +
    actionCard("new-task", "add_alert", "Aufgabe oder Termin", "Klausur, Arzttermin, Frist, Wartung …", "full") +
    (S.categories.length ? '<div class="snz full"><b>' + icon("inventory_2", "color:var(--accent)") + 'Eintrag anlegen</b><span class="hint">Ein Gerät, Fahrzeug, Haustier, eine Pflanze, Person oder einen Vertrag</span><div class="row nowrap"><select id="q-cat" aria-label="Bereich">' + S.categories.map(k => '<option value="' + k.id + '">' + esc(k.name) + "</option>").join("") + "</select>" + btn("q-obj", "Weiter", null, "primary") + "</div></div>" : "") +
    (S.objects.length ? '<div class="snz full"><b>' + icon("post_add", "color:var(--accent)") + 'Logbuch-Eintrag</b><span class="hint">Festhalten, was du gemacht oder gekauft hast</span><div class="row nowrap"><select id="q-obj" aria-label="Eintrag">' + S.objects.filter(o => !o.archived).map(o => { const k = cat(o.catId); return k ? '<option value="' + o.id + '">' + esc(k.name + " › " + o.name) + "</option>" : ""; }).join("") + "</select>" + btn("q-log", "Weiter", null, "primary") + "</div></div>" : "") +
    actionCard("new-alarm", "alarm_add", "Wecker stellen", "Erinnerung mit Ton zu einer Uhrzeit") + actionCard("new-doc", "note_add", "Dokument", "Ausweis, Führerschein, Versicherung …") + actionCard("new-simple", "shopping_cart", "Einkaufsliste", "Etwas zum Einkaufen", "", ' data-type="shopping"') +
    actionCard("new-cat", "grid_view", "Neuer Bereich", "Eigene Kategorie") + actionCard("goto", "auto_fix_high", "Startpakete", "Typische Bereiche auf einmal", "", ' data-h="assistent"') + "</div>";
  openSheet("Neu anlegen", inner, "", { type: "quick" });
}
const actionCard = (act, ic, title, sub, cls, attrs) => '<button type="button" class="act ' + (cls || "") + '" data-act="' + act + '"' + (attrs || "") + ">" + icon(ic) + "<span>" + esc(title) + "<small>" + esc(sub) + "</small></span></button>";

/* ---------- Bereich ---------- */
function iconGrid(selected, color) {
  return ICON_GROUPS.map(([group, list]) => '<div class="icon-grp" data-grp>' + esc(group) + "</div>" + list.map(([n, words]) =>
    '<button type="button" data-act="pick-icon" data-icon="' + n + '" data-k="' + esc(words + " " + group.toLowerCase()) + '" class="' + (n === selected ? "on" : "") + '" style="--c:' + color + '" title="' + esc(words.split(" ")[0]) + '" aria-label="' + esc(words.split(" ")[0]) + '">' + icon(n) + "</button>").join("")).join("");
}
function fieldRowHtml(f) {
  return '<div class="field-row" data-fid="' + esc(f.id) + '"><input type="text" class="fl-label" value="' + esc(f.label) + '" placeholder="Feldname" aria-label="Feldname"><select class="fl-type" aria-label="Feldtyp">' +
    Object.entries(FIELD_TYPES).map(([k, v]) => '<option value="' + k + '"' + (f.type === k ? " selected" : "") + ">" + v + "</option>").join("") + '</select><input type="text" class="fl-unit" value="' + esc(f.unit || "") + '" placeholder="Einheit" aria-label="Einheit">' +
    btn("del-row", "", "close", "icon-only", ' aria-label="Feld entfernen"') + "</div>";
}
function categorySheet(id) {
  const isNew = !id, k = isNew ? newCategory({ kind: "allgemein", name: "" }) : clone(cat(id));
  const swatches = Object.keys(COLORS).map(c => '<button type="button" class="swatch' + (k.color === c ? " on" : "") + '" data-act="pick-color" data-c="' + c + '" style="--c:' + COLORS[c] + '" aria-label="Farbe ' + c + '"></button>').join("");
  const inner = '<div class="form">' +
    '<label class="f">Art des Bereichs<select id="c-kind">' + Object.entries(KINDS).map(([kk, K]) => '<option value="' + kk + '"' + (k.kind === kk ? " selected" : "") + ">" + esc(K.label) + "</option>").join("") + "</select></label>" +
    '<label class="f">Name<input type="text" id="c-name" value="' + esc(k.name) + '" placeholder="z. B. Fahrzeuge, Haustiere, Garten"></label>' +
    (isNew ? '<p class="hint full">Die Art bringt passende Felder, Listen und Aufgaben-Vorlagen mit.</p>' : "") +
    '<div class="f full"><span class="f-l">Farbe</span><div class="swatches" id="c-swatches">' + swatches + "</div></div>" +
    '<div class="f full"><div class="row between"><span class="f-l">Symbol</span><input type="search" id="c-iconsearch" placeholder="Suchen, z. B. hund, drucker" aria-label="Symbol suchen"></div><div class="icons" id="c-icons">' + iconGrid(k.icon, COLORS[k.color]) + "</div></div>" +
    '<div class="f full"><span class="f-l">Eigene Felder <span class="hint">Kaufdaten, Fotos, Belege und Logbuch gibt es immer automatisch.</span></span><div class="fields-ed" id="c-fields">' + k.fields.map(fieldRowHtml).join("") + "</div><div>" + btn("add-field", "Feld hinzufügen", "add") + "</div></div>" +
    '<div class="f full"><span class="f-l">Zusatz-Listen</span><div class="chips multi" id="c-modules">' + Object.entries(MODULES).map(([m, M]) => '<label><input type="checkbox" value="' + m + '"' + (k.modules.includes(m) ? " checked" : "") + "><span>" + icon(M.icon, "font-size:16px") + esc(M.label) + "</span></label>").join("") + "</div></div>" +
    '<div class="f full"><label class="check"><input type="checkbox" id="c-hascounter"' + (k.counter ? " checked" : "") + '> <span>Zählerstand verfolgen (z. B. Kilometer, Betriebsstunden, kWh)</span></label><div class="row" id="c-counter"' + (k.counter ? "" : " hidden") + '><input type="text" id="c-clabel" value="' + esc(k.counter ? k.counter.label : "Kilometerstand") + '" placeholder="Bezeichnung" aria-label="Bezeichnung"><input type="text" id="c-cunit" value="' + esc(k.counter ? k.counter.unit : "km") + '" placeholder="Einheit" aria-label="Einheit" style="max-width:120px"></div></div>' +
    reminderPicker(k.reminders) +
    '<div class="f full"><span class="f-l">Aufgaben-Vorlagen <span class="hint">werden bei neuen Einträgen vorgeschlagen</span></span><div id="c-templates" class="fchips">' + templateChips(k.templates) + "</div></div>" +
    "</div>";
  openSheet(isNew ? "Neuer Bereich" : "Bereich bearbeiten", inner, sheetFooter(isNew ? null : "del-cat-ask"), { type: "category", k, isNew });
}
const templateChips = list => list.length ? list.map((t, i) => '<span class="fchip">' + esc(t.title) + " · " + esc(describeRepeat(t)) + btn("del-template", "", "close", "", ' data-i="' + i + '" aria-label="Vorlage entfernen"') + "</span>").join("") : '<span class="hint">Keine Vorlagen</span>';
// Wiederholung in Worten, z. B. "alle 3 Monate"
function describeRepeat(t) {
  if (t.kind === "intervall") return "alle " + plural(Number(t.every) || 1, t.unit) + (t.winterEvery ? " (Winter " + t.winterEvery + ")" : "");
  if (t.kind === "zaehler") return "alle " + fmtN(t.counterEvery) + (t.every ? " oder " + plural(t.every, t.unit) : "");
  if (t.kind === "jaehrlich") { const d = parse(t.date); return d ? "jährlich am " + d.getDate() + ". " + MONTHS[d.getMonth()] : "jährlich"; }
  if (t.kind === "monatlich") return "monatlich am " + (t.mday === "last" ? "Monatsletzten" : t.mday + ".");
  if (t.kind === "wochentage") return "jeden " + (t.days || []).map(d => WEEKDAYS[d - 1]).join(", ");
  return t.date ? "am " + fmtD(parse(t.date)) : "einmalig";
}
function readCategoryForm() {
  const k = SHEET.k;
  k.name = $("#c-name").value.trim();
  k.kind = $("#c-kind").value;
  k.fields = $$("#c-fields .field-row").map(r => ({ id: r.dataset.fid, label: r.querySelector(".fl-label").value.trim(), type: r.querySelector(".fl-type").value, unit: r.querySelector(".fl-unit").value.trim() })).filter(f => f.label);
  k.modules = $$("#c-modules input:checked").map(i => i.value);
  k.counter = $("#c-hascounter").checked ? { label: $("#c-clabel").value.trim() || "Zählerstand", unit: $("#c-cunit").value.trim() } : null;
  k.reminders = readReminders(false);
  return k;
}

/* ---------- Eintrag (Gerät, Auto, Pflanze, Person …) ---------- */
function itemSheet(id, catId) {
  const isNew = !id, o = isNew ? newItem({ catId }) : clone(obj(id)), k = cat(o.catId), K = kindOf(k), b = o.buy;
  SHEET = { photos: [], files: [] };            // für pendingBox
  const custom = k.fields.map(f => fieldHtml({ k: "v-" + f.id, label: f.label + (f.unit ? " (" + f.unit + ")" : ""), type: { zahl: "number", datum: "date", notiz: "textarea", link: "url" }[f.type] || "text" }, o.values[f.id]));
  const inner = '<div class="form">' + fieldHtml({ k: "name", label: "Name", req: true, full: true, ph: "z. B. Waschmaschine, Mein Golf, Bello, Oma" }, o.name) + custom.join("") +
    (K.birthday ? fieldHtml({ k: "birthday", label: "Geburtstag", type: "date", hint: "für Erinnerung & Alter" }, o.birthday) : "") +
    (k.counter && isNew ? fieldHtml({ k: "counter", label: "Aktueller " + k.counter.label, type: "number" }) : "") +
    (k.counter ? fieldHtml({ k: "cunit", label: "Einheit des Zählers", ph: k.counter.unit || "z. B. kWh", hint: "nur falls abweichend" }, o.counterUnit) : "") +
    '<div class="subh">Kauf & Garantie</div>' +
    fieldHtml({ k: "bdate", label: "Gekauft am", type: "date" }, b.date) + fieldHtml({ k: "bprice", label: "Kaufpreis (€)", type: "money" }, b.price) +
    fieldHtml({ k: "bshop", label: "Händler" }, b.shop) + fieldHtml({ k: "bwar", label: "Garantie bis", type: "date", hint: "Hersteller" }, b.warranty) +
    fieldHtml({ k: "bser", label: "Seriennummer" }, b.serial) + '<span></span>' +
    fieldHtml({ k: "bonline", label: "Online gekauft (14 Tage Rückgabefrist erinnern)", type: "check", full: true }, b.online) +
    fieldHtml({ k: "btax", label: "Kauf ist steuerrelevant", type: "check", full: true }, b.tax) +
    (isNew ? '<div class="subh">Fotos & Belege</div>' + pendingBox("photos", "Fotos", "image/*") + pendingBox("files", "Kaufbeleg, Rechnung, Anleitung", "image/*,application/pdf") : "") +
    (isNew && k.templates.length ? '<div class="subh">Aufgaben gleich mit anlegen</div><div class="f full"><div class="chips multi" id="o-templates">' + k.templates.map((t, i) => '<label><input type="checkbox" value="' + i + '" checked><span>' + esc(t.title) + " · " + esc(describeRepeat(t)) + "</span></label>").join("") + "</div></div>" : "") +
    '<div class="subh">Sonstiges</div>' + fieldHtml({ k: "note", label: "Notiz", type: "textarea" }, o.note) + fieldHtml({ k: "fav", label: "Als Favorit auf der Startseite anheften", type: "check", full: true }, o.fav) + "</div>";
  openSheet(isNew ? "Neu in „" + k.name + "“" : "Eintrag bearbeiten", inner, sheetFooter(isNew ? null : "del-obj-ask"), { type: "item", o, isNew, photos: [], files: [] });
}
// Upload-Feld innerhalb eines Formulars (Dateien werden sofort hochgeladen)
function pendingBox(kind, label, accept) {
  return '<div class="f full"><span class="f-l">' + esc(label) + '</span><div id="pend-' + kind + '">' + ((SHEET && SHEET[kind] || []).length ? fileChips(SHEET[kind], kind) : "") + "</div>" +
    (canUpload() ? '<div><label class="btn" for="pf-' + kind + '">' + icon(kind === "photos" ? "add_a_photo" : "attach_file") + 'Auswählen</label><input type="file" id="pf-' + kind + '" data-pending="' + kind + '" accept="' + accept + '" multiple hidden></div>' : '<span class="hint">Hochladen geht, wenn du unter Mehr → Konto & Sync angemeldet bist.</span>') + "</div>";
}
const refreshPending = kind => { const el = $("#pend-" + kind); if (el) el.innerHTML = fileChips(SHEET[kind] || [], kind); };

/* ---------- Vertrag ---------- */
const CONTRACT_FIELDS = [
  { k: "status", label: "Status", type: "select", options: [["aktiv", "Aktiv"], ["gekuendigt", "Gekündigt"], ["beendet", "Beendet"]] },
  { k: "start", label: "Vertragsbeginn", type: "date", req: true },
  { k: "minMonths", label: "Mindestlaufzeit (Monate)", type: "number", ph: "z. B. 24" },
  { k: "extendMonths", label: "Verlängert sich um (Monate)", type: "number", ph: "1 = monatlich kündbar", hint: "danach" },
  { k: "notice", label: "Kündigungsfrist", type: "number", ph: "z. B. 1" },
  { k: "noticeUnit", label: "Frist in", type: "select", options: [["m", "Monaten"], ["w", "Wochen"]] },
  { k: "cost", label: "Kosten (€)", type: "money" },
  { k: "costEvery", label: "pro", type: "select", options: [["m", "Monat"], ["q", "Quartal"], ["y", "Jahr"]] },
  { k: "endDate", label: "Endet am", type: "date", hint: "nur wenn gekündigt" }
];
function contractSheet(id) {
  const o = obj(id), c = o.contract || { status: "aktiv", start: "", minMonths: 24, extendMonths: 1, notice: 1, noticeUnit: "m", cost: "", costEvery: "m", endDate: "" };
  openSheet("Vertrag: " + o.name, formHtml(CONTRACT_FIELDS, c) + '<p class="hint pad-x">Allreminde rechnet daraus den spätesten Kündigungstag aus und erinnert dich 30, 7 und 1 Tag vorher.</p>', sheetFooter(o.contract ? "del-contract" : null), { type: "contract", id });
}

/* ---------- Aufgabe ---------- */
function parentSelect(t) {
  const opt = (v, l, sel) => '<option value="' + v + '"' + (sel ? " selected" : "") + ">" + esc(l) + "</option>";
  return '<label class="f full">Gehört zu<select id="t-parent">' + opt("", "Allgemein (ohne Bereich)", !t.objId && !t.catId && !t.docId) +
    S.categories.map(k => '<optgroup label="' + esc(k.name) + '">' + opt("c:" + k.id, k.name + " (direkt)", !t.objId && t.catId === k.id) + S.objects.filter(o => o.catId === k.id && !o.archived).map(o => opt("o:" + o.id, o.name, t.objId === o.id)).join("") + "</optgroup>").join("") +
    (S.docs.length ? '<optgroup label="Dokumente">' + S.docs.map(d => opt("d:" + d.id, d.name, t.docId === d.id)).join("") + "</optgroup>" : "") + "</select></label>";
}
function taskSheet(id, preset) {
  const isNew = !id, t = isNew ? newTask(Object.assign({ kind: preset && preset.objId ? "intervall" : "einmalig" }, preset || {})) : clone(task(id));
  const o = t.objId ? obj(t.objId) : null, k = o ? cat(o.catId) : null, hasCounter = !!(k && k.counter), cn = counterNow(o);
  const unitSel = (idn, val) => '<select id="' + idn + '" aria-label="Einheit">' + Object.entries(UNITS).map(([u, l]) => '<option value="' + u + '"' + (val === u ? " selected" : "") + ">" + l[1] + "</option>").join("") + "</select>";
  const part = (kinds, html) => '<div class="kpart full" data-k="' + kinds + '">' + html + "</div>";
  const kinds = Object.entries(TASK_KINDS).map(([kk, v]) => '<label class="kind-' + kk + '"' + (kk === "zaehler" && !hasCounter ? " hidden" : "") + '><input type="radio" name="kind" value="' + kk + '"' + (t.kind === kk ? " checked" : "") + "><span>" + v.label + "</span></label>").join("");
  const inner = '<div class="form">' +
    fieldHtml({ k: "title", label: "Was ist zu tun?", full: true, req: true, ph: "z. B. Klausur Mathe, Ölwechsel, Impfung" }, t.title) + parentSelect(t) +
    '<div class="f full"><span class="f-l">Wiederholung</span><div class="chips seg" id="t-kinds">' + kinds + '</div><span class="hint" id="t-kindhint">' + esc(TASK_KINDS[t.kind].hint) + "</span></div>" +
    part("einmalig jaehrlich", '<label class="f"><span class="kp-label">Datum</span><input type="date" id="t-date" value="' + esc(t.date) + '"></label>') +
    part("intervall", '<div class="row fields"><label class="f"><span>Alle</span><input type="number" id="t-every" min="1" value="' + esc(t.every || 1) + '"></label><label class="f">' + "<span>&nbsp;</span>" + unitSel("t-unit", t.unit) + '</label><label class="f grow"><span>Zuletzt erledigt</span><input type="date" id="t-last" value="' + esc(t.lastDone || t.start) + '"></label></div>' +
      '<label class="f"><span>Im Winter (Nov–Feb) stattdessen alle … <span class="hint">leer = gleich</span></span><input type="number" id="t-winter" min="0" value="' + esc(t.winterEvery || "") + '"></label>') +
    part("wochentage", '<span class="f-l">An diesen Tagen</span><div class="chips multi" id="t-days">' + WEEKDAYS.map((d, i) => '<label><input type="checkbox" value="' + (i + 1) + '"' + ((t.days || []).includes(i + 1) ? " checked" : "") + "><span>" + d + "</span></label>").join("") + "</div>") +
    part("monatlich", '<label class="f"><span>Am Tag</span><select id="t-mday">' + Array.from({ length: 31 }, (_, i) => '<option value="' + (i + 1) + '"' + (String(t.mday) === String(i + 1) ? " selected" : "") + ">" + (i + 1) + ".</option>").join("") + '<option value="last"' + (t.mday === "last" ? " selected" : "") + ">Monatsletzten</option></select></label>") +
    part("zaehler", '<div class="row fields"><label class="f grow"><span>Fällig alle (' + esc(hasCounter ? counterUnit(o) : "") + ')</span><input type="number" id="t-cevery" step="any" value="' + esc(t.counterEvery || "") + '" placeholder="15000"></label><label class="f grow"><span>Zuletzt bei</span><input type="number" id="t-cval" step="any" value="' + esc(t.lastValue || (cn != null ? cn : "")) + '"></label></div>' +
      '<div class="row fields"><label class="f"><span>Oder spätestens nach</span><input type="number" id="t-zevery" min="0" value="' + esc(t.kind === "zaehler" ? t.every || "" : "") + '" placeholder="1"></label><label class="f"><span>&nbsp;</span>' + unitSel("t-zunit", t.kind === "zaehler" ? t.unit : "y") + '</label><label class="f grow"><span>Zuletzt erledigt</span><input type="date" id="t-zlast" value="' + esc(t.lastDone || todayStr()) + '"></label></div>') +
    part("intervall wochentage monatlich", '<span class="f-l">Pause in diesen Monaten <span class="hint">z. B. kein Düngen im Winter</span></span><div class="chips multi" id="t-pause">' + MONTHS.map((m, i) => '<label><input type="checkbox" value="' + (i + 1) + '"' + ((t.pause || []).includes(i + 1) ? " checked" : "") + "><span>" + m + "</span></label>").join("") + "</div>") +
    part("intervall wochentage monatlich jaehrlich", '<label class="f"><span>Wiederholen bis <span class="hint">leer = immer</span></span><input type="date" id="t-until" value="' + esc(t.until) + '"></label>') +
    '<div class="row fields full"><label class="f grow"><span>Uhrzeit <span class="hint">leer = Standard (' + esc(S.settings.notify.defaultTime) + ')</span></span><input type="time" id="t-time" value="' + esc(t.time) + '"></label>' +
      '<label class="f grow"><span>Benachrichtigung</span><select id="t-notify"><option value="">Standard</option>' + Object.entries(NOTIFY_MODES).map(([v, l]) => '<option value="' + v + '"' + (t.notify === v ? " selected" : "") + ">" + l + "</option>").join("") + "</select></label></div>" +
    reminderPicker(t.reminders, true) +
    fieldHtml({ k: "prio", label: "Wichtigkeit", type: "select", options: PRIOS }, String(t.prio || 0)) + fieldHtml({ k: "fav", label: "Favorit", type: "check" }, t.fav) +
    '<div class="subh">Extras</div>' +
    fieldHtml({ k: "checklist", label: "Checkliste", type: "textarea", hint: "ein Punkt pro Zeile", ph: "Luftdruck prüfen\nRadmuttern nachziehen" }, (t.checklist || []).map(x => x.text).join("\n")) +
    fieldHtml({ k: "fu-title", label: "Danach erinnern an", ph: "z. B. Note eintragen" }, t.followUp ? t.followUp.title : "") + fieldHtml({ k: "fu-days", label: "… nach Tagen", type: "number", ph: "7" }, t.followUp ? t.followUp.days : "") +
    fieldHtml({ k: "rotation", label: "Wer ist dran? (abwechselnd)", type: "textarea", hint: "ein Name pro Zeile, z. B. für den Putzplan" }, (t.rotation || []).join("\n")) +
    fieldHtml({ k: "note", label: "Notiz", type: "textarea", ph: "Welches Teil, was mitbringen, Link …" }, t.note) + "</div>";
  openSheet(isNew ? "Neue Aufgabe" : "Aufgabe bearbeiten", inner, sheetFooter(isNew ? null : "del-task-ask"), { type: "task", t, isNew });
  updateTaskKind();
}
// Zeigt nur die Felder, die zur gewählten Wiederholung passen
function updateTaskKind() {
  const sel = $("#t-kinds input:checked"); if (!sel) return;
  $$("#sheet .kpart").forEach(el => el.hidden = !el.dataset.k.split(" ").includes(sel.value));
  $("#t-kindhint").textContent = TASK_KINDS[sel.value].hint;
  const lb = $("#sheet .kp-label"); if (lb) lb.textContent = sel.value === "jaehrlich" ? "Datum (Jahr nur für Alter wichtig)" : "Fällig am";
}
// Beim Wechsel von "Gehört zu": Zähler-Option nur bei Einträgen mit Zähler
function updateTaskParent() {
  const v = $("#t-parent").value, o = v.startsWith("o:") ? obj(v.slice(2)) : null, k = o ? cat(o.catId) : null, has = !!(k && k.counter);
  $("#t-kinds .kind-zaehler").hidden = !has;
  if (!has && $("#t-kinds input:checked").value === "zaehler") $("#t-kinds input[value=intervall]").checked = true;
  updateTaskKind();
}

/* ---------- Aufgaben-Menü (Antippen einer Aufgabe) ---------- */
function taskMenu(id) {
  const t = task(id); if (!t) return;
  const c = calc(t), p = parentOf(t), T = today();
  const dw = (T.getDay() + 6) % 7;                         // 0 = Montag
  const now = new Date(), at = (d, hhmm) => localDateTime(atTime(d, hhmm)), morning = S.settings.notify.defaultTime;
  // Verschieben: [Text, Wert (Datum oder Datum+Uhrzeit), kleine Beschriftung]
  const snoozeOptions = [
    ["In 10 Min", localDateTime(new Date(now.getTime() + 10 * 60e3))], ["In 1 Std", localDateTime(new Date(now.getTime() + 3600e3))], ["In 3 Std", localDateTime(new Date(now.getTime() + 3 * 3600e3))],
    now.getHours() < 18 ? ["Heute Abend", at(T, "19:00")] : null, ["Morgen früh", at(addDays(T, 1), morning)], ["In 3 Tagen", ymd(addDays(T, 3))],
    ["Am Wochenende", ymd(addDays(T, dw >= 5 ? 7 - dw + 5 : 5 - dw))], ["Nächste Woche", ymd(addDays(T, 7 - dw))], ["In 1 Monat", ymd(addUnit(T, 1, "m"))]
  ].filter(Boolean);
  const snoozeHint = v => v.length > 10 ? (v.slice(0, 10) === ymd(T) ? v.slice(11) : fmtD(parse(v), { weekday: "short" }) + " " + v.slice(11)) : fmtD(parse(v), { weekday: "short", day: "numeric", month: "numeric" });
  const skipTo = t.kind !== "einmalig" ? previewSkip(t) : null;
  let inner = '<div class="t-head">' + icoBox(p.k, null, p.o ? p.o.photos : p.d ? docImgs(p.d) : null) + '<div class="min0"><div class="muted small">' + esc(parentName(t)) + '</div><div class="row">' + prioMark(t) + "<b class=\"t-title\">" + esc(t.title) + "</b>" + statusPill(c) + '</div><div class="muted small">' +
    esc(t.done ? "Abgeschlossen" : (c.due ? "Fällig " + fmtLong(c.due) + (t.time ? " um " + t.time : "") : "Ohne festes Datum") + (t.kind === "einmalig" ? "" : " · " + describeRepeat(t))) + (c.extra ? " · " + esc(c.extra) : "") +
    '</div><div class="muted small">' + esc(NOTIFY_MODES[notifyModeOf(t)]) + ": " + esc(c.rem.map(reminderLabel).join(", ")) + " um " + esc(t.time || S.settings.notify.defaultTime) + "</div>" + (t.note ? '<div class="note-inline">' + esc(t.note) + "</div>" : "") + "</div></div>";
  if ((t.checklist || []).length) inner += '<div class="list panel mx">' + t.checklist.map((x, i) => checkRow(x, "task-check", t.id, i)).join("") + "</div>";
  if (!t.done) {
    const isDoc = t.auto === "doc";
    inner += '<div class="acts">' + actionCard("done", isDoc ? "autorenew" : "check_circle", isDoc ? "Erneuert" : "Erledigt", isDoc ? "Neues Ablaufdatum eintragen" : "Heute bestätigen", "primary", ' data-id="' + t.id + '"') +
      (isDoc ? "" : actionCard("done-details", "edit_calendar", "Erledigt mit Details", p.o ? "Datum, Kosten, Beleg ins Logbuch" : "Datum, Kosten, Notiz", "", ' data-id="' + t.id + '"')) +
      '<div class="snz full"><div class="row between"><b>' + icon("snooze", "color:var(--accent)") + "Verschieben / später erinnern</b>" + (c.snoozed ? btn("unsnooze", "Aufheben", null, "ghost", ' data-id="' + t.id + '"') : "") + '</div><div class="chips">' +
      snoozeOptions.map(([l, v]) => '<button type="button" data-act="snooze" data-id="' + t.id + '" data-d="' + v + '">' + l + ' <span class="muted small">' + esc(snoozeHint(v)) + "</span></button>").join("") +
      '</div><div class="row fields"><input type="date" id="snz-date" min="' + ymd(T) + '" value="' + ymd(addDays(T, 1)) + '" aria-label="Datum"><input type="time" id="snz-time" value="' + esc(t.time || morning) + '" aria-label="Uhrzeit">' + btn("snooze-custom", "Verschieben", null, "", ' data-id="' + t.id + '"') + "</div></div>" +
      actionCard("skip", "redo", "Überspringen", skipTo ? "Nächstes Mal: " + skipTo : "Ohne Erledigen abschließen", "", ' data-id="' + t.id + '"') +
      actionCard("edit-task", "edit", "Bearbeiten", t.auto ? "Erinnerungen, Notiz" : "Termin, Erinnerungen, Notiz", "", ' data-id="' + t.id + '"') + "</div>";
  } else inner += '<div class="acts">' + actionCard("reopen", "undo", "Wieder öffnen", "Als offen markieren", "", ' data-id="' + t.id + '"') + actionCard("edit-task", "edit", "Bearbeiten", "", "", ' data-id="' + t.id + '"') + "</div>";
  const goto = p.o ? btn("open-obj", "Zu „" + p.o.name + "“", "chevron_right", "ghost", ' data-id="' + p.o.id + '"') : p.d ? btn("open-doc", "Zum Dokument", "chevron_right", "ghost", ' data-id="' + p.d.id + '"') : "";
  openSheet("Aufgabe", inner, '<span class="confirm" id="del-zone">' + btn("del-task-ask", "Löschen", "delete", "danger ghost") + "</span>" + goto, { type: "taskmenu", t: clone(t) });
}

/* ---------- Logbuch ---------- */
const LOG_FIELDS = k => [
  { k: "title", label: "Was wurde gemacht?", req: true, full: true, ph: "z. B. Ölfilter gewechselt, entkalkt, Impfung" },
  { k: "d", label: "Datum", type: "date", req: true }, { k: "kind", label: "Art", type: "select", options: Object.entries(LOGKINDS).map(([v, l]) => [v, l[0]]) },
  { k: "cost", label: "Kosten (€)", type: "money" },
  ...(k && k.counter ? [{ k: "counter", label: k.counter.label, type: "number" }] : []),
  { k: "part", label: "Teil oder Material", full: true, ph: "z. B. Ölfilter, 4,5 l Motoröl 5W-30" }, { k: "brand", label: "Marke / Hersteller" }, { k: "partno", label: "Artikelnummer" },
  { k: "shop", label: "Gekauft bei / Werkstatt", full: true }, { k: "note", label: "Notiz", type: "textarea" },
  { k: "tax", label: "Steuerrelevant (z. B. Handwerkerleistung, Arbeitsmittel)", type: "check", full: true },
  { k: "savepart", label: "Teil unter „Meine Teile“ merken", type: "check", full: true }
];
function logSheet(objId, logId, taskId) {
  const o = obj(objId), k = cat(o.catId), isNew = !logId, t = taskId ? task(taskId) : null;
  const l = isNew ? { id: uid(), d: todayStr(), title: t ? t.title : "", kind: "wartung", cost: "", counter: counterNow(o) != null ? counterNow(o) : "", part: "", brand: "", partno: "", shop: "", note: "", files: [], tax: false } : clone(o.log.find(x => x.id === logId));
  const openTasks = S.tasks.filter(x => x.objId === objId && !x.done);
  const fields = LOG_FIELDS(k).filter(f => f.k !== "savepart" || (isNew && k.modules.includes("teile")));
  SHEET = { files: l.files.slice() };            // für pendingBox
  const inner = formHtml(fields, l).replace(/<\/div>$/, "") + pendingBox("files", "Belege & Fotos", "image/*,application/pdf") +
    (isNew && openTasks.length ? '<label class="f full">Damit erledigt <span class="hint">setzt die Erinnerung zurück</span><select id="l-task"><option value="">Keine Aufgabe</option>' + openTasks.map(x => '<option value="' + x.id + '"' + (t && t.id === x.id ? " selected" : "") + ">" + esc(x.title) + "</option>").join("") + "</select></label>" : "") + "</div>";
  openSheet(isNew ? "Logbuch: " + o.name : "Logbuch-Eintrag bearbeiten", inner, sheetFooter(isNew ? null : "del-log-ask"), { type: "log", objId, l, isNew, files: l.files.slice(), fields });
}
// Erledigt mit Details (für Aufgaben ohne Eintrag)
function doneDetailsSheet(id) {
  const t = task(id), p = parentOf(t);
  if (p.o) { closeSheet(); logSheet(p.o.id, null, t.id); return; }
  const defs = [{ k: "d", label: "Erledigt am", type: "date", req: true }, { k: "cost", label: "Kosten (€)", type: "money" }, { k: "note", label: "Notiz", type: "textarea", ph: "z. B. Note, Ergebnis" }];
  openSheet("„" + t.title + "“ erledigt", formHtml(defs, { d: todayStr() }), sheetFooter(null, "Erledigt"), { type: "done", id, defs });
}

/* ---------- Zusatz-Listen (Tankbuch, Teile …) ---------- */
function recordSheet(objId, mod, rowId) {
  const o = obj(objId), M = MODULES[mod], isNew = !rowId;
  const row = isNew ? {} : clone(((o.records || {})[mod] || []).find(r => r.id === rowId));
  if (isNew && M.fields.some(f => f.k === "d")) row.d = todayStr();
  if (isNew && mod === "tanken" && counterNow(o) != null) row.km = "";
  openSheet((isNew ? M.add : M.label + " bearbeiten") + " · " + o.name, formHtml(M.fields, row), sheetFooter(isNew ? null : "del-record-ask"), { type: "record", objId, mod, rowId });
}

/* ---------- Dokument ---------- */
function docSheet(id) {
  const isNew = !id, d = isNew ? newDoc({ type: "fs", name: DOCTYPES.fs[0], renewEvery: DOCTYPES.fs[2] }) : clone(doc(id));
  const defs = [
    { k: "type", label: "Art", type: "select", options: Object.entries(DOCTYPES).map(([v, x]) => [v, x[0]]) }, { k: "name", label: "Bezeichnung", req: true },
    { k: "number", label: "Nummer" }, { k: "authority", label: "Aussteller / Behörde" }, { k: "issued", label: "Ausgestellt am", type: "date" },
    { k: "expires", label: "Gültig bis", type: "date", hint: "leer = unbefristet" }, { k: "renewEvery", label: "Erneuern alle … Jahre", type: "number", hint: "z. B. LKW 5" },
    { k: "fav", label: "Favorit", type: "check" }, { k: "note", label: "Details / Notiz", type: "textarea", ph: "z. B. Klassen, Kündigungsfrist" },
    { k: "steps", label: "Checkliste zur Verlängerung", type: "textarea", hint: "ein Punkt pro Zeile", ph: "Sehtest\nPassfoto\nÄrztliches Gutachten" }
  ];
  SHEET = { files: [] };
  const inner = formHtml(defs, Object.assign({}, d, { steps: d.steps.map(x => x.text).join("\n") })).replace(/<\/div>$/, "") + reminderPicker(d.reminders) +
    '<div class="f full"><span class="f-l">Links <span class="hint">z. B. Terminbuchung, Antrag</span></span><div class="fields-ed" id="d-links">' + d.links.map(linkRowHtml).join("") + "</div><div>" + btn("add-linkrow", "Link hinzufügen", "add_link") + "</div></div>" +
    (isNew ? pendingBox("files", "Foto oder PDF (Vorder- und Rückseite)", "image/*,application/pdf") : "") + "</div>";
  openSheet(isNew ? "Neues Dokument" : "Dokument bearbeiten", inner, sheetFooter(isNew ? null : "del-doc-ask"), { type: "doc", d, isNew, defs, files: [] });
}
const linkRowHtml = l => '<div class="link-row"><input type="text" class="lk-label" value="' + esc(l.label || "") + '" placeholder="Bezeichnung" aria-label="Bezeichnung"><input type="text" class="lk-url" value="' + esc(l.url || "") + '" placeholder="https://…" inputmode="url" aria-label="Adresse">' + btn("del-row", "", "close", "icon-only", ' aria-label="Entfernen"') + "</div>";
function renewSheet(id) {
  const d = doc(id), n = Number(d.renewEvery) || 0, base = d.expires && parse(d.expires) > today() ? parse(d.expires) : today();
  const defs = [{ k: "issued", label: "Neu ausgestellt am", type: "date" }, { k: "expires", label: "Neu gültig bis", type: "date", req: true }, { k: "number", label: "Neue Nummer", hint: "falls geändert" }];
  SHEET = { files: [] };
  const inner = '<p class="hint pad-x">Die Erinnerung wird automatisch neu gesetzt.' + (n ? " Vorschlag: " + n + " Jahre später." : "") + "</p>" + formHtml(defs, { issued: todayStr(), expires: n ? ymd(addUnit(base, n, "y")) : "", number: d.number }).replace(/<\/div>$/, "") + pendingBox("files", "Neuen Scan hochladen", "image/*,application/pdf") + "</div>";
  openSheet("„" + d.name + "“ erneuert", inner, sheetFooter(null), { type: "renew", id, defs, files: [] });
}

/* ---------- Einfache Listen: Links, Kontakte, Einkauf, Verliehen, Gutscheine, Reisen ---------- */
const SIMPLE = {
  links: { title: "Link", list: () => S.links, fields: [{ k: "title", label: "Titel", req: true }, { k: "url", label: "Adresse", type: "url", req: true, ph: "https://…" }, { k: "group", label: "Gruppe", list: "dl-groups", ph: "z. B. Behörden" }, { k: "note", label: "Notiz", ph: "z. B. Benutzername (kein Passwort!)" }, { k: "fav", label: "Favorit auf der Startseite", type: "check", full: true }] },
  contacts: { title: "Kontakt", list: () => S.contacts, fields: [{ k: "name", label: "Name", req: true }, { k: "role", label: "Rolle", ph: "z. B. Werkstatt, Tierarzt" }, { k: "phone", label: "Telefon" }, { k: "email", label: "E-Mail" }, { k: "address", label: "Adresse", full: true }, { k: "note", label: "Notiz", type: "textarea" }] },
  shopping: { title: "Einkauf", list: () => S.lists.shopping, fields: [{ k: "text", label: "Was", req: true }, { k: "qty", label: "Menge" }, { k: "link", label: "Link zum Kaufen", type: "url", full: true }, { k: "done", label: "Gekauft", type: "check" }] },
  lent: { title: "Verliehen / Geliehen", list: () => S.lists.lent, fields: [{ k: "thing", label: "Was", req: true }, { k: "dir", label: "Richtung", type: "select", options: [["out", "Ich habe verliehen"], ["in", "Ich habe ausgeliehen"]] }, { k: "person", label: "Person", req: true }, { k: "date", label: "Seit", type: "date" }, { k: "due", label: "Zurück bis", type: "date", hint: "für Erinnerung" }, { k: "done", label: "Ist zurück", type: "check" }] },
  vouchers: { title: "Gutschein", list: () => S.lists.vouchers, fields: [{ k: "name", label: "Bezeichnung", req: true }, { k: "shop", label: "Geschäft" }, { k: "value", label: "Wert (€)", type: "money" }, { k: "code", label: "Code" }, { k: "expires", label: "Gültig bis", type: "date" }, { k: "used", label: "Eingelöst", type: "check" }] },
  trips: { title: "Reise", list: () => S.trips, fields: [{ k: "name", label: "Name", req: true, ph: "z. B. Sommerurlaub" }, { k: "dest", label: "Ziel" }, { k: "from", label: "Von", type: "date", req: true }, { k: "to", label: "Bis", type: "date" }, { k: "checklist", label: "Checkliste", type: "textarea", hint: "ein Punkt pro Zeile" }, { k: "note", label: "Notiz", type: "textarea" }] }
};
function simpleSheet(type, id) {
  const cfg = SIMPLE[type], isNew = !id;
  const data = isNew ? { date: todayStr(), dir: "out" } : clone(cfg.list().find(x => x.id === id));
  if (type === "trips") data.checklist = isNew ? S.settings.tripChecklist.join("\n") : data.checklist.map(c => c.text).join("\n");
  const groups = type === "links" ? '<datalist id="dl-groups">' + [...new Set(S.links.map(l => l.group).filter(Boolean).concat(["Behörden", "Banken & Finanzen", "Versicherungen", "Fahrzeug & Führerschein", "Schule & Arbeit", "Gesundheit", "Kundenkonten"]))].map(g => '<option value="' + esc(g) + '">').join("") + "</datalist>" : "";
  openSheet((isNew ? "Neu: " : "") + cfg.title, formHtml(cfg.fields, data) + groups, sheetFooter(isNew ? null : "del-simple-ask"), { type: "simple", kind: type, id });
}

/* ---------- Kontakte verknüpfen ---------- */
function linkContactSheet(objId) {
  const o = obj(objId), free = S.contacts.filter(c => !o.contactIds.includes(c.id));
  const inner = '<div class="form">' + (free.length ? '<label class="f full">Vorhandenen Kontakt wählen<select id="lc-pick"><option value="">–</option>' + free.map(c => '<option value="' + c.id + '">' + esc(c.name + (c.role ? " (" + c.role + ")" : "")) + "</option>").join("") + "</select></label>" + '<div class="subh">oder neu anlegen</div>' : "") +
    SIMPLE.contacts.fields.map(f => fieldHtml(Object.assign({}, f, { req: false }))).join("") + "</div>";
  openSheet("Kontakt verknüpfen", inner, sheetFooter(null, "Verknüpfen"), { type: "linkcontact", objId });
}

/* ---------- Text zum Kopieren (Kündigungsschreiben, Gießliste) ---------- */
function textSheet(title, text, hint) {
  openSheet(title, '<div class="form">' + (hint ? '<p class="hint full">' + esc(hint) + "</p>" : "") + '<textarea id="copy-text" class="full tall">' + esc(text) + "</textarea></div>",
    "<span></span>" + btn("copy-sheet", "Kopieren", "content_copy", "primary"), { type: "text" });
}
function waterListText(catId) {
  const lines = S.objects.filter(o => o.catId === catId && !o.archived).map(o => {
    const k = cat(o.catId), field = n => { const f = k.fields.find(x => x.label.toLowerCase() === n); return f ? o.values[f.id] : ""; };
    const ts = S.tasks.filter(t => t.objId === o.id && !t.done).map(t => t.title + " " + describeRepeat(t));
    return "• " + o.name + (field("standort") ? " (" + field("standort") + ")" : "") + ": " + (ts.join(", ") || "nach Bedarf");
  });
  return "Pflanzen-Pflege während meines Urlaubs\n\n" + lines.join("\n") + "\n\nDanke fürs Gießen!" + (S.profile.name ? "\n" + S.profile.name.split(" ")[0] : "");
}

/* ---------- Vorschläge von Claude auswählen ---------- */
function suggestionSheet(objId, list) {
  const inner = '<div class="form"><p class="hint full">Claude schlägt diese Aufgaben vor. Wähle aus, was du übernehmen möchtest. Intervalle kannst du danach anpassen.</p><div class="list panel full">' +
    list.map((t, i) => '<label class="item check-item"><input type="checkbox" value="' + i + '" checked><span class="body"><span class="title">' + esc(t.title) + '</span><span class="meta">' + esc(describeRepeat(t) + (t.note ? " · " + t.note : "")) + "</span></span></label>").join("") + "</div></div>";
  openSheet("Vorschläge für „" + obj(objId).name + "“", inner, sheetFooter(null, "Übernehmen"), { type: "suggest", objId, list });
}

/* ---------- QR-Code ---------- */
function qrSheet(objId) {
  const o = obj(objId), url = appLink() + "#objekt-" + o.id;
  const svg = window.qrcode ? (() => { const q = qrcode(0, "M"); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); })() : "<p>QR-Code konnte nicht geladen werden.</p>";
  openSheet("QR-Code: " + o.name, '<div class="form"><p class="hint full">Ausdrucken und aufs Gerät kleben. Ein Scan mit dem Handy öffnet direkt diese Seite in Allreminde (Web-Version, du musst angemeldet sein).</p><div class="qr full">' + svg + '</div><p class="small muted full break">' + esc(url) + "</p></div>",
    "<span></span>" + btn("qr-download", "Als Bild speichern", "download", "primary", ' data-id="' + o.id + '"'), { type: "qr" });
}
