/* =====================================================================
   05-ui.js – Wiederverwendbare Bausteine für die Oberfläche
   Jede Funktion gibt HTML-Text zurück (außer Sheet/Toast).
   ===================================================================== */

// Symbol als Zeichen aus der Symbol-Schrift (Liste in 00-icons.js, erzeugt von tools/icons.py)
const iconChar = name => ICON_CP[name] ? String.fromCodePoint(parseInt(ICON_CP[name], 16)) : "•";
const icon = (name, style) => '<span class="ms" aria-hidden="true"' + (style ? ' style="' + style + '"' : "") + ">" + iconChar(name) + "</span>";
// Vertrauliches (Nummern, Beträge) – wird im Privatsphäre-Modus verschleiert
const sens = html => '<span class="sens" data-act="reveal">' + html + "</span>";

// Rundes Symbol eines Bereichs, oder Foto falls vorhanden
function icoBox(k, iconName, photos) {
  if (photos && photos.length) return '<span class="ico"><img src="' + blobUrl(photos[0].id) + '" alt=""></span>';
  return '<span class="ico" style="--c:' + colorOf(k) + '">' + icon(iconName || (k && k.icon) || "task_alt") + "</span>";
}
function emptyBox(iconName, text, button) {
  return '<div class="panel empty">' + icon(iconName) + "<p>" + text + "</p>" + (button || "") + "</div>";
}
function section(title, body, right, extraClass) {
  return '<section class="section ' + (extraClass || "") + '"><div class="section-h"><h2>' + esc(title) + '</h2><div class="row">' + (right || "") + "</div></div>" + body + "</section>";
}
const btn = (act, label, iconName, cls, attrs) => '<button type="button" class="btn ' + (cls || "") + '" data-act="' + act + '"' + (attrs || "") + ">" + (iconName ? icon(iconName) : "") + label + "</button>";
const crumb = (route, label) => '<a class="crumb" href="#' + route + '">' + icon("chevron_left", "font-size:18px") + esc(label) + "</a>";

/* ---------- Status-Plakette einer Aufgabe ---------- */
function statusPill(c) {
  if (c.st === "done") return '<span class="pill ok">' + icon("check", "font-size:15px") + "erledigt</span>";
  if (c.st === "snoozed") return '<span class="pill snoozed">' + icon("snooze", "font-size:15px") + esc(relDays(c.days) + (c.snoozeTime ? " " + c.snoozeTime : "")) + "</span>";
  if (c.days == null) return '<span class="pill neutral">' + esc(c.extra || "kein Termin") + "</span>";
  if (c.st === "over") return '<span class="pill over">' + (c.days < 0 ? "überfällig " + relDays(c.days) : "jetzt fällig") + "</span>";
  if (c.st === "today") return '<span class="pill today">heute</span>';
  return '<span class="pill ' + (c.st === "soon" ? "soon" : "ok") + '">' + esc(relDays(c.days)) + "</span>";
}
const prioMark = t => t.prio >= 2 ? '<span class="prio p2" title="Kritisch">' + icon("priority_high") + "</span>" : t.prio === 1 ? '<span class="prio p1" title="Wichtig">' + icon("flag") + "</span>" : "";

/* ---------- Eine Zeile in einer Aufgabenliste ---------- */
function taskRow(x, opts) {
  opts = opts || {};
  const t = x.t, c = x.c, p = parentOf(t);
  const photos = opts.noParent ? null : (p.o ? p.o.photos : p.d ? docImgs(p.d) : null);
  const when = c.due ? fmtShort(c.due) + (t.time ? " · " + t.time : "") : "";
  const meta = [opts.noParent ? null : parentName(t),
    t.kind === "intervall" ? "alle " + plural(intervalFor(t, today()), t.unit) : null,
    t.rotation && t.rotation.length ? "dran: " + t.rotation[(t.rotIdx || 0) % t.rotation.length] : null,
    when, c.extra || null,
    (t.checklist || []).length ? (t.checklist.filter(i => i.done).length + "/" + t.checklist.length + " erledigt") : null,
    opts.reminderNote ? "Erinnerung: " + relDays(c.days) : null
  ].filter(Boolean).map(esc).join(" · ");
  const bar = c.pct != null && !t.done && c.st !== "snoozed" ? '<div class="bar"><i class="' + c.st + '" style="width:' + Math.round(c.pct * 100) + '%"></i></div>' : "";
  return '<div class="item clickable prio-' + (t.prio || 0) + '" data-act="task-menu" data-id="' + t.id + '">' + icoBox(p.k, null, photos) +
    '<div class="body"><div class="title-row">' + prioMark(t) + (notifyModeOf(t) === "alarm" ? icon("alarm", "font-size:18px;color:var(--accent)") : "") + '<span class="title">' + esc(t.title) + "</span>" + statusPill(c) + "</div>" + bar + '<div class="meta">' + meta + "</div></div>" +
    '<button class="star ' + (t.fav ? "on" : "") + '" data-act="fav-task" data-id="' + t.id + '" aria-label="Favorit">' + icon("star") + "</button>" +
    (t.done ? "" : '<button class="done-btn" data-act="done" data-id="' + t.id + '" aria-label="Erledigt">' + icon("check") + "</button>") + "</div>";
}
const taskList = (list, opts) => '<div class="list panel">' + list.map(x => taskRow(x, opts)).join("") + "</div>";

/* ---------- Kachel eines Bereichs ---------- */
function categoryTile(k, i, n) {
  const objs = S.objects.filter(o => o.catId === k.id && !o.archived);
  const open = activeTasks().filter(x => parentOf(x.t).k === k);
  const over = open.filter(x => x.c.st === "over").length, soon = open.filter(x => ["soon", "today"].includes(x.c.st)).length;
  const badge = over ? '<span class="pill over badge">' + over + " überfällig</span>" : soon ? '<span class="pill soon badge">' + soon + " bald</span>" : "";
  return '<div class="tile" role="button" tabindex="0" draggable="' + (UI.edit ? "true" : "false") + '" data-act="open-cat" data-id="' + k.id + '" style="--c:' + colorOf(k) + '">' + badge +
    icon(k.icon) + '<span class="t-name">' + esc(k.name) + '</span><span class="t-sub">' + objs.length + (objs.length === 1 ? " Eintrag" : " Einträge") + "</span>" +
    '<span class="move"><button class="icon-btn sm" data-act="move-cat" data-dir="-1" data-id="' + k.id + '" aria-label="Nach vorne"' + (i === 0 ? " disabled" : "") + ">" + icon("arrow_back") + "</button>" +
    '<button class="icon-btn sm" data-act="move-cat" data-dir="1" data-id="' + k.id + '" aria-label="Nach hinten"' + (i === n - 1 ? " disabled" : "") + ">" + icon("arrow_forward") + "</button>" +
    '<button class="icon-btn sm" data-act="edit-cat" data-id="' + k.id + '" aria-label="Bereich bearbeiten">' + icon("edit") + "</button></span></div>";
}
const categoryTiles = () => '<div class="tiles" id="tiles">' + S.categories.map((k, i) => categoryTile(k, i, S.categories.length)).join("") +
  '<button class="tile add" data-act="new-cat">' + icon("add_circle") + '<span class="t-name">Neuer Bereich</span></button></div>';

/* ---------- Dokument-Karte ---------- */
function docStatus(d) {
  if (!d.expires) return { st: "neutral", txt: "unbefristet", days: null, pct: null };
  const t = S.tasks.find(x => x.auto === "doc" && x.ref === d.id);
  const c = t ? calc(t) : null;
  const e = parse(d.expires), days = diffDays(today(), e);
  let pct = null; if (d.issued) { const tot = diffDays(parse(d.issued), e); pct = tot > 0 ? Math.min(1, Math.max(0, diffDays(parse(d.issued), today()) / tot)) : 1; }
  if (days < 0) return { st: "over", txt: "abgelaufen", days, pct };
  if (c && c.st === "snoozed") return { st: "snoozed", txt: "verschoben", days, pct };
  if (days <= Math.max(...(d.reminders && d.reminders.length ? d.reminders : [90]))) return { st: "soon", txt: days === 0 ? "läuft heute ab" : "läuft " + relDays(days) + " ab", days, pct };
  return { st: "ok", txt: "gültig bis " + fmtD(e, { month: "short", year: "numeric" }), days, pct };
}
function docCard(d, mini) {
  const ty = dtype(d), s = docStatus(d), img = docImgs(d)[0];
  return '<div class="panel doc' + (mini ? " mini" : "") + '" data-act="open-doc" data-id="' + d.id + '" role="button" tabindex="0" style="--c:' + COLORS[ty[3]] + '"><div class="thumb">' +
    (img ? '<img src="' + blobUrl(img.id) + '" alt="" loading="lazy">' : icon(ty[1])) + '<span class="pill ' + s.st + '">' + esc(s.txt) + "</span>" +
    (d.number && !mini ? '<span class="num">' + sens(esc(d.number)) + "</span>" : "") + '</div><div class="info"><div class="title">' +
    (d.fav ? icon("star", "font-size:16px;color:#E0A100;font-variation-settings:'FILL' 1") + " " : "") + esc(d.name) + '</div><div class="meta">' +
    esc([ty[0] !== d.name ? ty[0] : null, d.expires ? "bis " + fmtD(parse(d.expires)) : null, Number(d.renewEvery) > 0 ? "alle " + d.renewEvery + " Jahre" : null].filter(Boolean).join(" · ") || "Ohne Ablaufdatum") + "</div>" +
    (s.pct != null && !mini ? '<div class="bar"><i class="' + (s.st === "neutral" ? "ok" : s.st) + '" style="width:' + Math.round(s.pct * 100) + '%"></i></div>' : "") + "</div></div>";
}
const linkChip = l => '<a class="lchip" href="' + esc(normUrl(l.url)) + '" target="_blank" rel="noopener">' + icon("open_in_new") + '<span class="t">' + esc(l.title || l.label || hostOf(l.url)) + "</span></a>";

/* ---------- Dateien ---------- */
const fileIcon = type => (type || "").startsWith("image/") ? "image" : type === "application/pdf" ? "picture_as_pdf" : "draft";
function fileChips(files, removableKey) {
  return '<div class="fchips">' + files.map((f, i) => '<span class="fchip">' + icon(fileIcon(f.type), "font-size:16px") + '<a href="' + blobUrl(f.id) + '" target="_blank" rel="noopener">' + esc(f.name) + "</a>" +
    (removableKey ? '<button type="button" data-act="rm-pending" data-kind="' + removableKey + '" data-i="' + i + '" aria-label="Entfernen">' + icon("close") + "</button>" : "") + "</span>").join("") + "</div>";
}

/* ---------- Mini-Diagramme ---------- */
// Linie mit Fläche, points = [{d:"2026-01-01", v: 123}]
function sparkline(points) {
  if (!points || points.length < 2) return "";
  const pts = points.slice().sort(by("d")), xs = pts.map(p => parse(p.d).getTime()), ys = pts.map(p => Number(p.v));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), W = 300, H = 70, P = 6;
  const sx = x => P + (x1 === x0 ? 0 : (x - x0) / (x1 - x0)) * (W - 2 * P), sy = y => H - P - (y1 === y0 ? .5 : (y - y0) / (y1 - y0)) * (H - 2 * P);
  const line = pts.map((p, i) => sx(xs[i]).toFixed(1) + "," + sy(ys[i]).toFixed(1)).join(" ");
  const last = pts.length - 1;
  return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="M' + sx(xs[0]).toFixed(1) + "," + (H - P) + " L" + line.split(" ").join(" L") + " L" + sx(xs[last]).toFixed(1) + "," + (H - P) + 'Z" fill="var(--accent-soft)"/><polyline points="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="' + sx(xs[last]).toFixed(1) + '" cy="' + sy(ys[last]).toFixed(1) + '" r="3.5" fill="var(--accent)"/></svg>';
}
// Waagerechte Balken, rows = [[Name, Wert]]
function barList(rows, fmt) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return '<div class="hbars">' + rows.map(r => '<div class="hb"><span class="hl">' + esc(r[0]) + '</span><span class="ht"><i style="width:' + Math.max(2, r[1] / max * 100) + '%"></i></span><span class="hv num">' + sens(esc((fmt || fmtE)(r[1]))) + "</span></div>").join("") + "</div>";
}

/* =====================================================================
   Formular-Baukasten
   Ein Feld wird beschrieben als { k, label, type, req, ph, hint, full, options }
   type: text, number, money, date, time, url, textarea, select, check
   ===================================================================== */
function fieldHtml(f, value) {
  const id = "f-" + f.k, v = value == null ? (f.def != null ? f.def : "") : value;
  const ph = f.ph ? ' placeholder="' + esc(f.ph) + '"' : "";
  const label = esc(f.label) + (f.hint ? ' <span class="hint">' + esc(f.hint) + "</span>" : "");
  if (f.type === "check") return '<label class="f check' + (f.full ? " full" : "") + '"><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + "> " + label + "</label>";
  let input;
  if (f.type === "textarea") input = '<textarea id="' + id + '"' + ph + ">" + esc(v) + "</textarea>";
  else if (f.type === "select") input = '<select id="' + id + '">' + f.options.map(([val, l]) => '<option value="' + esc(val) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>";
  else {
    const type = { number: "number", money: "number", date: "date", time: "time", url: "text" }[f.type] || "text";
    const extra = f.type === "money" ? ' step="0.01" inputmode="decimal"' : f.type === "number" ? ' step="any" inputmode="decimal"' : f.type === "url" ? ' inputmode="url"' : "";
    input = '<input type="' + type + '" id="' + id + '" value="' + esc(v) + '"' + ph + extra + (f.list ? ' list="' + f.list + '"' : "") + ">";
  }
  return '<label class="f' + (f.full || f.type === "textarea" ? " full" : "") + '">' + label + input + "</label>";
}
const formHtml = (defs, data) => '<div class="form">' + defs.map(f => fieldHtml(f, (data || {})[f.k])).join("") + "</div>";
// Liest die Werte aus. Gibt null zurück, wenn ein Pflichtfeld leer ist.
function readForm(defs) {
  const out = {};
  for (const f of defs) {
    const el = $("#f-" + f.k); if (!el) continue;
    let v = f.type === "check" ? el.checked : el.value.trim();
    if (f.type === "number" && v !== "") v = num(v);
    if (f.type === "money" && v !== "") v = String(num(v) ?? "");
    if (f.type === "url" && v) v = normUrl(v);
    if (f.req && (v === "" || v == null)) { el.focus(); toast("Bitte „" + f.label + "“ ausfüllen"); return null; }
    out[f.k] = v;
  }
  return out;
}

/* ---------- Auswahl mehrerer Erinnerungen ---------- */
function reminderPicker(selected, withDefault) {
  const set = new Set((selected || []).map(Number));
  const custom = [...set].filter(n => !REMINDER_CHOICES.includes(n));
  return '<div class="f full"><span class="f-l">Erinnern <span class="hint">mehrere möglich</span></span>' +
    (withDefault ? '<label class="check"><input type="checkbox" id="rem-default"' + (selected == null ? " checked" : "") + "> Standard des Bereichs verwenden</label>" : "") +
    '<div class="chips multi" id="rem-chips">' + REMINDER_CHOICES.concat(custom).map(n => '<label><input type="checkbox" value="' + n + '"' + (set.has(n) ? " checked" : "") + "><span>" + reminderLabel(n) + "</span></label>").join("") +
    '</div><div class="row nowrap" style="max-width:320px"><input type="number" id="rem-custom" min="0" placeholder="Eigene: Tage vorher" aria-label="Eigene Erinnerung in Tagen">' + btn("rem-add", "Hinzufügen") + "</div></div>";
}
function readReminders(withDefault) {
  if (withDefault && $("#rem-default") && $("#rem-default").checked) return null;
  const list = $$("#rem-chips input:checked").map(i => Number(i.value));
  return list.length ? list.sort((a, b) => b - a) : [0];
}

/* ---------- Unterseite (Sheet) ---------- */
let SHEET = null;   // Daten des offenen Formulars
function openSheet(title, inner, footer, ctx) {
  SHEET = ctx || {};
  $("#sheet-root").innerHTML = '<div class="backdrop" data-act="sheet-bg"><form class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '" novalidate>' +
    '<div class="sheet-h"><h2>' + esc(title) + '</h2><button type="button" class="icon-btn" data-act="close" aria-label="Schließen">' + icon("close") + "</button></div>" +
    inner + (footer ? '<div class="sheet-f">' + footer + "</div>" : "") + "</form></div>";
  document.body.style.overflow = "hidden";
  const first = $("#sheet .form input[type=text]");
  if (first && window.innerWidth > 760) setTimeout(() => first.focus(), 30);
}
function closeSheet() { $("#sheet-root").innerHTML = ""; document.body.style.overflow = ""; SHEET = null; }
// Standard-Fußzeile: Löschen links, Abbrechen/Speichern rechts
const sheetFooter = (deleteAct, saveLabel) => (deleteAct ? '<span class="confirm" id="del-zone">' + btn(deleteAct, "Löschen", "delete", "danger ghost") + "</span>" : "<span></span>") +
  '<div class="row">' + btn("close", "Abbrechen", null, "ghost") + '<button type="submit" class="btn primary">' + (saveLabel || "Speichern") + "</button></div>";
// Löschen mit Rückfrage: erster Klick fragt, zweiter löscht
function askDelete(question, act) {
  $("#del-zone").innerHTML = "<span>" + esc(question) + "</span>" + btn(act, "Ja, löschen", null, "danger") + btn("del-cancel", "Nein", null, "ghost");
}

/* ---------- Kurze Meldung unten ---------- */
let TOAST = { undo: null, timer: null };
function toast(msg, undo) {
  $("#toast-root").innerHTML = '<div class="toast" role="status"><span>' + esc(msg) + "</span>" + (undo ? '<button data-act="undo">Rückgängig</button>' : "") + "</div>";
  TOAST.undo = undo || null;
  clearTimeout(TOAST.timer);
  TOAST.timer = setTimeout(() => { $("#toast-root").innerHTML = ""; TOAST.undo = null; }, 5000);
}
