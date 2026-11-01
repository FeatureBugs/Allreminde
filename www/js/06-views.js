/* =====================================================================
   06-views.js – Die Seiten der App
   Jede Funktion vXyz() gibt den HTML-Inhalt einer Seite zurück.
   Welche Seite gezeigt wird, steht in ROUTES (ganz unten).
   ===================================================================== */

// Zustand der Oberfläche (nicht gespeichert)
const UI = { signup: false, edit: false, tab: "over", filter: "", dtab: "docs", ltab: "shopping", calMonth: null, calSel: null, year: null, costYear: null, q: "", showArchived: false };

/* ---------- Startseite ---------- */
function vStart() {
  const now = new Date(), h = now.getHours();
  const greet = h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend";
  const first = S.profile.name ? ", " + esc(S.profile.name.split(" ")[0]) : "";
  const act = activeTasks().sort(sortByDue);
  const over = act.filter(x => x.c.st === "over"), week = act.filter(x => x.c.st !== "over" && x.c.st !== "snoozed" && x.c.days != null && x.c.days <= 7);
  let out = '<div class="head"><div><div class="eyebrow">' + esc(fmtD(now, { weekday: "long", day: "numeric", month: "long" })) + "</div><h1>" + greet + first + '</h1><div class="sub">' +
    (over.length ? over.length + (over.length === 1 ? " Sache ist" : " Sachen sind") + " überfällig, " + week.length + " stehen diese Woche an." : week.length ? week.length + (week.length === 1 ? " Sache steht" : " Sachen stehen") + " diese Woche an." : "Alles im grünen Bereich.") +
    '</div></div><div class="row">' + btn("toggle-edit", UI.edit ? "Fertig" : "Startseite anpassen", UI.edit ? "check" : "dashboard_customize", UI.edit ? "on" : "") + btn("quick-add", "Neu", "add", "primary") + "</div></div>";

  if (S.example) out += '<div class="banner">' + icon("lightbulb", "color:var(--accent)") + "<p>Das sind <b>Beispieldaten</b>, damit du alles ausprobieren kannst. Starte mit dem Einrichtungs-Assistenten, um deine eigenen Bereiche anzulegen.</p>" +
    '<div class="row">' + btn("keep-example", "Beispiele behalten") + '<a class="btn primary" href="#assistent">' + icon("auto_fix_high") + "Assistent starten</a></div></div>";
  else if (!S.categories.length && !S.tasks.length) out += '<div class="banner">' + icon("waving_hand", "color:var(--accent)") + "<p>Willkommen! Der Assistent legt dir in einer Minute passende Bereiche und Erinnerungen an.</p>" + '<a class="btn primary" href="#assistent">' + icon("auto_fix_high") + "Assistent starten</a></div>";

  const secs = S.layout.sections;
  secs.forEach((s, i) => {
    if (!s.on && !UI.edit) return;
    const tools = '<div class="sec-tools">' + btn("sec-move", "", "arrow_upward", "icon-only", ' data-dir="-1" data-i="' + i + '" aria-label="Nach oben"' + (i === 0 ? " disabled" : "")) +
      btn("sec-move", "", "arrow_downward", "icon-only", ' data-dir="1" data-i="' + i + '" aria-label="Nach unten"' + (i === secs.length - 1 ? " disabled" : "")) +
      btn("sec-toggle", "", s.on ? "visibility" : "visibility_off", "icon-only", ' data-i="' + i + '" aria-label="' + (s.on ? "Ausblenden" : "Einblenden") + '"') + "</div>";
    const r = startSection(s.id, act, over, week);
    if (r === null) return;
    out += section(SECTIONS[s.id], r.body, (r.right || "") + tools, s.on ? "" : "hidden-sec");
  });
  return out;
}
// Inhalt eines Startseiten-Abschnitts → { body, right }
function startSection(id, act, over, week) {
  if (id === "shared") return typeof sharedSection === "function" ? sharedSection() : null;
  if (id === "today") {
    const list = act.filter(x => ["over", "today"].includes(x.c.st));
    const rem = act.filter(x => x.c.remindToday && !list.includes(x));
    if (!list.length && !rem.length) return { body: emptyBox("wb_sunny", "Heute ist nichts fällig. Genieß den Tag!") };
    return { body: (list.length ? taskList(list) : "") + (rem.length ? '<div class="sub-h">Erinnerungen für heute</div>' + taskList(rem, { reminderNote: true }) : "") };
  }
  if (id === "stats") return { body: '<div class="stats"><button class="stat over" data-act="goto-tab" data-tab="over"><b>' + over.length + '</b><span>Überfällig</span></button><button class="stat soon" data-act="goto-tab" data-tab="up"><b>' + week.length + '</b><span>Nächste 7 Tage</span></button><button class="stat done" data-act="goto-tab" data-tab="done"><b>' + doneThisMonth() + "</b><span>Diesen Monat erledigt</span></button></div>" };
  if (id === "fav") {
    const ft = act.filter(x => x.t.fav && !x.t.auto), fo = S.objects.filter(o => o.fav && !o.archived);
    if (!ft.length && !fo.length) return { body: emptyBox("star", "Tippe bei einer Aufgabe oder einem Eintrag auf den Stern, um ihn hier anzuheften.") };
    return { body: (ft.length ? taskList(ft) : "") + (fo.length ? '<div class="favs">' + fo.map(o => { const k = cat(o.catId), n = activeTasks().filter(x => x.t.objId === o.id).sort(sortByDue)[0];
      return '<div class="panel fav" data-act="open-obj" data-id="' + o.id + '">' + icoBox(k, null, o.photos) + '<div class="body"><div class="title">' + esc(o.name) + '</div><div class="meta">' + (n ? esc(n.t.title + " " + (n.c.days != null ? relDays(n.c.days) : "")) : "Keine offenen Aufgaben") + "</div></div></div>"; }).join("") + "</div>" : "") };
  }
  if (id === "next") {
    const list = act.filter(x => !["over", "today", "snoozed"].includes(x.c.st) && x.c.days != null && x.c.days <= 45).slice(0, 8);   // Überfälliges steht schon unter "Heute"
    return { right: '<a class="crumb" href="#aufgaben">Alle' + icon("chevron_right", "font-size:18px") + "</a>", body: list.length ? taskList(list) : emptyBox("event_available", "In den nächsten Wochen steht nichts an.") };
  }
  if (id === "cats") return { right: '<a class="crumb" href="#bereiche">Alle' + icon("chevron_right", "font-size:18px") + "</a>", body: categoryTiles() };
  if (id === "docs") {
    const ds = S.docs.filter(d => d.fav || ["over", "soon"].includes(docStatus(d).st)).slice(0, 6), fl = S.links.filter(l => l.fav);
    const body = (ds.length ? '<div class="docs">' + ds.map(d => docCard(d, true)).join("") + "</div>" : "") + (fl.length ? '<div class="lchips">' + fl.map(linkChip).join("") + "</div>" : "");
    return { right: '<a class="crumb" href="#dokumente">Alle' + icon("chevron_right", "font-size:18px") + "</a>", body: body || emptyBox("folder_open", "Markiere Dokumente oder Links als Favorit. Bald ablaufende Dokumente erscheinen hier automatisch.") };
  }
  if (id === "birthdays") {
    const b = upcomingBirthdays(5);
    if (!b.length) return { body: emptyBox("cake", "Trage bei Menschen oder Haustieren einen Geburtstag ein, dann erscheint er hier.") };
    return { body: '<div class="list panel">' + b.map(x => '<div class="item clickable" data-act="open-obj" data-id="' + x.o.id + '">' + icoBox(cat(x.o.catId), "cake", x.o.photos) + '<div class="body"><div class="title">' + esc(x.o.name) + '</div><div class="meta">' + esc(fmtLong(x.next) + (x.age ? " · wird " + x.age : "")) + '</div></div><span class="pill ' + (x.days <= 14 ? "soon" : "neutral") + '">' + esc(relDays(x.days)) + "</span></div>").join("") + "</div>" };
  }
  if (id === "costs") {
    const key = ymd(today()).slice(0, 7), list = allCosts().filter(c => c.d.startsWith(key));
    const sum = list.reduce((s, c) => s + c.amount, 0), byType = {};
    list.forEach(c => byType[c.type] = (byType[c.type] || 0) + c.amount);
    return { right: '<a class="crumb" href="#kosten">Details' + icon("chevron_right", "font-size:18px") + "</a>", body: '<div class="panel pad"><div class="big-num num">' + sens(fmtE(sum)) + "</div>" + (list.length ? barList(Object.entries(byType).sort((a, b) => b[1] - a[1])) : '<p class="muted">Noch keine Ausgaben in diesem Monat.</p>') + "</div>" };
  }
  if (id === "shopping") {
    const open = S.lists.shopping.filter(x => !x.done);
    return { right: '<a class="crumb" href="#listen">Liste' + icon("chevron_right", "font-size:18px") + "</a>", body: open.length ? '<div class="list panel">' + open.slice(0, 8).map(shoppingRow).join("") + "</div>" : emptyBox("shopping_cart", "Deine Einkaufsliste ist leer.") };
  }
  return null;
}
function doneThisMonth() { const key = ymd(today()).slice(0, 7); let n = 0; S.tasks.forEach(t => t.history.forEach(h => { if (!h.skipped && (h.d || "").startsWith(key)) n++; })); return n; }

/* ---------- Aufgaben ---------- */
function vAufgaben() {
  const filt = x => !UI.filter || ((parentOf(x.t).k || {}).id === UI.filter);
  const act = activeTasks().filter(filt).sort(sortByDue);
  const lists = {
    over: act.filter(x => x.c.st === "over"),
    today: act.filter(x => x.c.st === "today" || x.c.remindToday),
    up: act.filter(x => !["over", "snoozed"].includes(x.c.st)),
    snz: act.filter(x => x.c.st === "snoozed"),
    done: doneEntries().filter(x => !UI.filter || ((x.k || {}).id === UI.filter))
  };
  const tabs = [["over", "Überfällig", "t-over"], ["today", "Heute"], ["up", "Anstehend"], ["snz", "Verschoben"], ["done", "Erledigt"]];
  let out = '<div class="head"><div><h1>Aufgaben</h1><div class="sub">Alles, was ansteht, überfällig ist oder schon erledigt wurde.</div></div>' + btn("new-task", "Aufgabe", "add", "primary") + "</div>" +
    '<div class="tabs" role="tablist">' + tabs.map(([id, l, cl]) => '<button role="tab" aria-selected="' + (UI.tab === id) + '" class="' + (cl || "") + (UI.tab === id ? " on" : "") + '" data-act="tab" data-tab="' + id + '">' + l + '<span class="n">' + lists[id].length + "</span></button>").join("") + "</div>" +
    '<div class="chips">' + '<button class="' + (!UI.filter ? "on" : "") + '" data-act="filter" data-id="">Alle Bereiche</button>' +
    S.categories.map(k => '<button class="' + (UI.filter === k.id ? "on" : "") + '" data-act="filter" data-id="' + k.id + '">' + icon(k.icon, "color:" + colorOf(k)) + esc(k.name) + "</button>").join("") +
    (S.docs.length ? '<button class="' + (UI.filter === "__docs" ? "on" : "") + '" data-act="filter" data-id="__docs">' + icon("folder_open") + "Dokumente</button>" : "") + "</div>";
  if (UI.tab === "done") return out + doneList(lists.done);
  const empty = { over: ["celebration", "Nichts überfällig. Sehr gut!"], today: ["wb_sunny", "Heute ist nichts fällig."], up: ["event_available", "Keine anstehenden Aufgaben."], snz: ["snooze", "Keine verschobenen Aufgaben. Tippe auf eine Aufgabe und wähle „Verschieben“."] }[UI.tab];
  const list = lists[UI.tab];
  return out + (list.length ? taskList(list, { reminderNote: UI.tab === "today" }) : emptyBox(empty[0], empty[1]));
}
// Alles Erledigte (Aufgaben-Verlauf + Logbuch-Einträge ohne Aufgabe), neueste zuerst
function doneEntries() {
  const out = [];
  S.tasks.forEach(t => { const p = parentOf(t); if (t.docId && !p.d) return; t.history.forEach((h, i) => out.push({ d: h.d, title: t.title, t, o: p.o, k: p.k, doc: p.d, skipped: !!h.skipped, cost: h.cost, note: h.note, last: i === t.history.length - 1 })); });
  const linked = new Set(S.tasks.flatMap(t => t.history.map(h => h.logId).filter(Boolean)));
  S.objects.forEach(o => o.log.forEach(l => { if (!linked.has(l.id)) out.push({ d: l.d, title: l.title, o, k: cat(o.catId), cost: l.cost, note: l.note, log: true }); }));
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
}
function doneList(list) {
  if (!list.length) return emptyBox("task_alt", "Hier erscheint alles, was du erledigt oder übersprungen hast.");
  let month = "", html = "";
  list.slice(0, 300).forEach(x => {
    const key = fmtD(parse(x.d), { month: "long", year: "numeric" });
    if (key !== month) { month = key; html += '<div class="grp-h">' + esc(key) + "</div>"; }
    const go = x.o ? ' data-act="open-obj" data-id="' + x.o.id + '"' : x.doc ? ' data-act="open-doc" data-id="' + x.doc.id + '"' : "";
    const pill = x.skipped ? '<span class="pill neutral">übersprungen</span>' : x.log ? '<span class="pill neutral">Logbuch</span>' : '<span class="pill ok">erledigt</span>';
    html += '<div class="item' + (go ? " clickable" : "") + '"' + go + ">" + icoBox(x.k, null, x.o ? x.o.photos : null) + '<div class="body"><div class="title-row"><span class="title">' + esc(x.title) + "</span>" + pill + '</div><div class="meta">' +
      esc([x.o ? x.o.name : x.doc ? x.doc.name : (x.k ? x.k.name : "Allgemein"), fmtShort(parse(x.d)), num(x.cost) ? fmtE(x.cost) : null, x.note || null].filter(Boolean).join(" · ")) + "</div></div>" +
      (x.t && x.last ? btn("undo-step", "Rückgängig", "undo", "ghost small", ' data-id="' + x.t.id + '"') : "") + "</div>";
  });
  return '<div class="list panel">' + html + "</div>";
}

/* ---------- Bereiche ---------- */
function vBereiche() {
  return '<div class="head"><div><h1>Bereiche</h1><div class="sub">Ordne alles, woran du denken musst, in Bereiche mit eigenen Feldern.</div></div><div class="row">' +
    btn("toggle-edit", UI.edit ? "Fertig" : "Anordnen", UI.edit ? "check" : "swap_horiz", UI.edit ? "on" : "") + '<a class="btn" href="#assistent">' + icon("auto_fix_high") + "Startpakete</a>" + btn("new-cat", "Neuer Bereich", "add", "primary") + "</div></div>" +
    categoryTiles() + '<p class="muted small">Tipp: Über „Anordnen“ kannst du Kacheln per Ziehen (PC) oder mit den Pfeilen (Handy) verschieben.</p>';
}
function vCat(id) {
  const k = cat(id); if (!k) return vMissing();
  const K = kindOf(k);
  const items = S.objects.filter(o => o.catId === id && !o.archived), archived = S.objects.filter(o => o.catId === id && o.archived);
  const loose = activeTasks().filter(x => !x.t.objId && x.t.catId === id).sort(sortByDue);
  let out = crumb("bereiche", "Bereiche") + '<div class="hero" style="--c:' + colorOf(k) + '"><span class="big">' + icon(k.icon) + '</span><div class="txt"><div class="eyebrow">' + esc(K.label) + "</div><h1>" + esc(k.name) + '</h1><div class="muted">' + items.length + (items.length === 1 ? " Eintrag" : " Einträge") +
    (k.reminders ? " · Erinnerung: " + esc(k.reminders.map(reminderLabel).join(", ")) : "") + '</div></div><div class="row">' +
    btn("edit-cat", "Bereich bearbeiten", "tune", "", ' data-id="' + id + '"') + btn("new-task", "Aufgabe", "add_alert", "", ' data-cat="' + id + '"') + btn("new-obj", "Eintrag", "add", "primary", ' data-cat="' + id + '"') + "</div></div>";
  // Extras je nach Art
  if (k.kind === "pflanze" && items.length) out += '<div class="row">' + btn("water-list", "Gießliste für den Urlaub", "water_drop", "", ' data-id="' + id + '"') + "</div>";
  if (k.kind === "vertrag") { const fix = monthlyFixCosts().filter(x => x.o.catId === id); if (fix.length) out += '<div class="panel pad"><div class="sumrow"><div class="s"><b>' + sens(fmtE(fix.reduce((s, x) => s + x.ci.monthly, 0))) + '</b><span>pro Monat</span></div><div class="s"><b>' + sens(fmtE(fix.reduce((s, x) => s + x.ci.monthly, 0) * 12)) + '</b><span>pro Jahr</span></div></div></div>'; }
  if (loose.length) out += section("Aufgaben", taskList(loose));
  const list = items.length ? '<div class="list panel">' + items.map(o => objRow(o, k)).join("") + "</div>" :
    emptyBox(k.icon, "Lege deinen ersten Eintrag an, z. B. ein Gerät, ein Fahrzeug, eine Pflanze oder eine Person. Dazu kannst du Fotos, Belege, Aufgaben und ein Logbuch speichern.", btn("new-obj", "Eintrag anlegen", "add", "primary", ' data-cat="' + id + '"'));
  out += section("Einträge", list);
  if (archived.length) out += section("Archiv", UI.showArchived ? '<div class="list panel">' + archived.map(o => objRow(o, k)).join("") + "</div>" : "", btn("toggle-archive", UI.showArchived ? "Ausblenden" : archived.length + " anzeigen", "inventory_2", "ghost"));
  return out;
}
function objRow(o, k) {
  const next = activeTasks().filter(x => x.t.objId === o.id).sort(sortByDue)[0];
  const vals = k.fields.filter(f => o.values[f.id] && !["notiz", "link"].includes(f.type)).slice(0, 2).map(f => f.type === "datum" ? fmtD(parse(o.values[f.id])) : o.values[f.id] + (f.unit ? " " + f.unit : ""));
  const cn = counterNow(o); if (k.counter && cn != null) vals.unshift(fmtN(cn) + " " + counterUnit(o));
  const ci = contractInfo(o.contract); if (ci && ci.monthly) vals.unshift(fmtE(ci.monthly) + "/Monat");
  return '<div class="item clickable" data-act="open-obj" data-id="' + o.id + '">' + icoBox(k, null, o.photos) + '<div class="body"><div class="title">' + esc(o.name) + (o.archived ? ' <span class="pill neutral">archiviert</span>' : "") + '</div><div class="meta">' + esc(vals.join(" · ")) + "</div></div>" +
    (next ? statusPill(next.c) : "") + '<button class="star ' + (o.fav ? "on" : "") + '" data-act="fav-obj" data-id="' + o.id + '" aria-label="Favorit">' + icon("star") + "</button></div>";
}

/* ---------- Ein Eintrag (Auto, Waschmaschine, Pflanze …) ---------- */
function vObj(id) {
  const o = obj(id); if (!o) return vMissing();
  const k = cat(o.catId); if (!k) return vMissing();
  const K = kindOf(k), b = o.buy;
  const tasks = S.tasks.filter(t => t.objId === id).map(t => ({ t, c: calc(t) }));
  const open = tasks.filter(x => !x.t.done && x.c.st !== "ended").sort(sortByDue), closed = tasks.filter(x => x.t.done || x.c.st === "ended");
  const warrantyEnd = parse(b.warranty), legalEnd = b.date ? addUnit(parse(b.date), 2, "y") : null;
  const chips = [
    b.date ? "Gekauft " + fmtD(parse(b.date)) : null, num(b.price) ? sens(fmtE(b.price)) : null,
    warrantyEnd ? (warrantyEnd < today() ? "Garantie abgelaufen" : "Garantie bis " + fmtD(warrantyEnd)) : null,
    o.birthday ? "Geburtstag " + fmtD(parse(o.birthday), { day: "numeric", month: "long" }) : null
  ].filter(Boolean).map(c => '<span class="chip">' + c + "</span>").join("");
  const cover = o.photos.length ? '<button class="cover" data-act="lightbox" data-id="' + o.id + '" data-i="0" aria-label="Foto vergrößern"><img src="' + blobUrl(o.photos[0].id) + '" alt=""></button>' : '<span class="big">' + icon(k.icon) + "</span>";
  let out = crumb("bereich-" + k.id, k.name) + '<div class="hero" style="--c:' + colorOf(k) + '">' + cover + '<div class="txt"><div class="eyebrow">' + esc(k.name) + "</div><h1>" + esc(o.name) + (o.archived ? ' <span class="pill neutral">archiviert</span>' : "") + "</h1>" +
    (chips ? '<div class="row wrap-chips">' + chips + "</div>" : "") + '</div><div class="row">' +
    '<button class="star ' + (o.fav ? "on" : "") + '" data-act="fav-obj" data-id="' + o.id + '" aria-label="Favorit">' + icon("star", "font-size:26px") + "</button>" +
    btn("edit-obj", "Bearbeiten", "edit", "", ' data-id="' + id + '"') + btn("new-task", "Aufgabe", "add_alert", "", ' data-obj="' + id + '"') + btn("new-log", "Logbuch", "post_add", "primary", ' data-obj="' + id + '"') + "</div></div>";

  // Linke Spalte: Aufgaben, Vertrag, Module, Logbuch
  let left = section("Aufgaben & Erinnerungen", open.length ? taskList(open, { noParent: true }) :
    emptyBox("add_alert", "Noch keine Aufgaben." + (k.templates.length ? " Du kannst die Vorlagen des Bereichs übernehmen." : ""), (k.templates.length ? btn("apply-templates", "Vorlagen übernehmen", "playlist_add", "", ' data-id="' + id + '"') : "") + btn("new-task", "Aufgabe anlegen", "add", "primary", ' data-obj="' + id + '"')));
  if (K.contract || o.contract) left += contractBox(o);
  (k.modules || []).forEach(m => { if (MODULES[m]) left += moduleSection(o, m); });
  left += logSection(o, k);
  if (closed.length) left += section("Abgeschlossene Aufgaben", taskList(closed, { noParent: true }));

  // Rechte Spalte: Angaben, Zähler, Kontakte, Fotos, Dateien, Claude, Werkzeuge
  const rows = k.fields.map(f => { let v = o.values[f.id];
    if (!v) v = '<span class="muted">–</span>';
    else if (f.type === "datum") v = esc(fmtD(parse(v)));
    else if (f.type === "link") v = '<a href="' + esc(normUrl(v)) + '" target="_blank" rel="noopener">' + esc(hostOf(v)) + "</a>";
    else v = esc(v) + (f.unit ? " " + esc(f.unit) : "");
    return [f.label, v]; });
  [["Gekauft am", b.date ? fmtD(parse(b.date)) : ""], ["Kaufpreis", num(b.price) ? sens(fmtE(b.price)) : ""], ["Händler", esc(b.shop)], ["Online gekauft", b.online ? "ja, 14 Tage Widerrufsrecht" : ""],
   ["Gewährleistung", legalEnd ? (legalEnd < today() ? "abgelaufen" : "bis " + fmtD(legalEnd)) : ""], ["Garantie bis", warrantyEnd ? fmtD(warrantyEnd) : ""], ["Seriennummer", b.serial ? sens(esc(b.serial)) : ""]]
    .forEach(([l, v]) => { if (v) rows.push([l, v]); });
  let right = section("Angaben", '<div class="panel">' + (rows.length ? '<div class="kv">' + rows.map(r => '<div class="k">' + esc(r[0]) + "</div><div>" + r[1] + "</div>").join("") + "</div>" : '<div class="empty small"><p>Über „Bearbeiten“ kannst du Kaufdatum, Preis, Garantie und eigene Felder eintragen.</p></div>') +
    (o.note ? '<div class="note">' + esc(o.note) + "</div>" : "") + "</div>");
  if (k.counter) right += counterSection(o, k);
  right += contactsSection(o);
  right += photoSection(o, k);
  right += filesSection(o);
  right += claudeSection(o);
  right += section("Werkzeuge", '<div class="row">' + btn("qr", "QR-Code", "qr_code_2", "", ' data-id="' + id + '"') + btn("history-export", "Historie als Datei", "description", "", ' data-id="' + id + '"') +
    btn("archive-obj", o.archived ? "Aus Archiv holen" : "Archivieren", "inventory_2", "", ' data-id="' + id + '"') + "</div>");
  return out + '<div class="grid2"><div class="col">' + left + '</div><div class="col">' + right + "</div></div>";
}
function contractBox(o) {
  const c = o.contract, ci = contractInfo(c);
  if (!c) return section("Vertrag", emptyBox("contract", "Trage Laufzeit und Kündigungsfrist ein. Allreminde rechnet den spätesten Kündigungstag aus und erinnert dich.", btn("edit-contract", "Vertragsdaten eintragen", "edit", "primary", ' data-id="' + o.id + '"')));
  const status = { aktiv: "aktiv", gekuendigt: "gekündigt", beendet: "beendet" }[c.status] || c.status;
  const rows = [["Status", status], ["Beginn", c.start ? fmtD(parse(c.start)) : "–"], ["Mindestlaufzeit", (c.minMonths || 0) + " Monate"], ["Verlängert sich um", (c.extendMonths || 1) + (Number(c.extendMonths) === 1 ? " Monat" : " Monate")],
    ["Kündigungsfrist", (c.notice || 0) + (c.noticeUnit === "w" ? " Wochen" : " Monate")], ["Kosten", c.cost ? sens(fmtE(c.cost)) + " pro " + ({ m: "Monat", q: "Quartal", y: "Jahr" }[c.costEvery] || "Monat") : "–"]];
  if (ci && ci.cancelBy) rows.push(["Laufzeit bis", fmtD(ci.termEnd)], ["Spätestens kündigen", "<b>" + fmtLong(ci.cancelBy) + "</b> (" + relDays(diffDays(today(), ci.cancelBy)) + ")"]);
  if (c.status !== "aktiv" && c.endDate) rows.push(["Endet am", fmtD(parse(c.endDate))]);
  return section("Vertrag", '<div class="panel"><div class="kv">' + rows.map(r => '<div class="k">' + r[0] + "</div><div>" + r[1] + "</div>").join("") + "</div></div>",
    btn("edit-contract", "Bearbeiten", "edit", "", ' data-id="' + o.id + '"') + btn("cancel-letter", "Kündigungsschreiben", "mail", "", ' data-id="' + o.id + '"'));
}
// Eine Zusatz-Liste (Tankbuch, Teile, Reifen …)
function moduleSection(o, m) {
  const M = MODULES[m], rows = ((o.records || {})[m] || []).slice();
  if (M.fields[0].k === "d") rows.sort((a, b) => (a.d < b.d ? 1 : -1));
  let summary = "";
  if (m === "tanken" && rows.length) { const f = fuelStats(o); summary = '<div class="sumrow pad"><div class="s"><b>' + (f.avg ? fmtN(f.avg) + " l" : "–") + '</b><span>Ø pro 100 km</span></div><div class="s"><b>' + sens(fmtE(f.money)) + '</b><span>Tankkosten gesamt</span></div><div class="s"><b>' + (f.perKm ? sens(fmtE(f.perKm)) : "–") + "</b><span>pro km</span></div></div>"; }
  if (m === "gewicht" && rows.length > 1) summary = '<div class="pad">' + sparkline(rows.map(r => ({ d: r.d, v: r.kg }))) + "</div>";
  if (m === "noten" && rows.length) { const g = rows.map(r => num(r.grade)).filter(x => x != null); summary = '<div class="sumrow pad"><div class="s"><b>' + fmtN(g.reduce((a, b) => a + b, 0) / g.length) + "</b><span>Durchschnitt</span></div></div>"; }
  const fuel = m === "tanken" ? fuelStats(o).per : {};
  const list = rows.map(r => {
    const title = M.fields[0].type === "date" ? fmtD(parse(r.d)) : esc(r[M.fields[0].k]);
    const parts = M.fields.slice(1).filter(f => r[f.k] !== "" && r[f.k] != null && r[f.k] !== false).map(f =>
      f.type === "check" ? f.label : f.type === "number" ? esc(f.label.replace(/ \(.*\)/, "")) + ": " + fmtN(r[f.k]) + esc((f.label.match(/\((.*)\)/) || ["", ""])[1].replace(/^/, " ")) : f.type === "money" ? sens(fmtE(r[f.k])) : f.type === "url" ? '<a href="' + esc(r[f.k]) + '" target="_blank" rel="noopener">Link</a>' : esc(f.label.replace(/ \(.*\)/, "")) + ": " + esc(r[f.k]));
    if (fuel[r.id]) parts.unshift("<b>" + fmtN(fuel[r.id]) + " l/100 km</b>");
    const extra = m === "verbrauch" ? btn("to-shopping", "", "add_shopping_cart", "icon-only", ' data-obj="' + o.id + '" data-id="' + r.id + '" aria-label="Auf die Einkaufsliste"') : "";
    return '<div class="item clickable" data-act="edit-record" data-obj="' + o.id + '" data-mod="' + m + '" data-id="' + r.id + '"><div class="body"><div class="title">' + title + (r.mounted ? ' <span class="pill ok">montiert</span>' : "") + (r.done ? ' <span class="pill neutral">erledigt</span>' : "") + '</div><div class="meta wrap">' + parts.join(" · ") + "</div></div>" + extra + "</div>";
  }).join("");
  return section(M.label, '<div class="panel">' + summary + (rows.length ? '<div class="list">' + list + "</div>" : '<div class="empty small"><p>Noch nichts eingetragen.</p></div>') + "</div>",
    btn("new-record", M.add, "add", "", ' data-obj="' + o.id + '" data-mod="' + m + '"'));
}
function logSection(o, k) {
  const logs = o.log.slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  const cost = logs.reduce((s, l) => s + (num(l.cost) || 0), 0), price = num(o.buy.price) || 0;
  const body = logs.length ? '<div class="sumrow pad"><div class="s"><b>' + sens(fmtE(cost)) + "</b><span>Kosten im Logbuch</span></div>" + (price ? '<div class="s"><b>' + sens(fmtE(cost + price)) + "</b><span>inkl. Kaufpreis</span></div>" : "") + '<div class="s"><b>' + logs.length + "</b><span>Einträge</span></div></div>" +
    '<div class="log">' + logs.map(l => { const d = parse(l.d);
      const sub = [(LOGKINDS[l.kind] || LOGKINDS.sonst)[0], l.part, l.brand, l.partno ? "Art.-Nr. " + l.partno : null, l.shop, l.counter && k.counter ? fmtN(l.counter) + " " + counterUnit(o) : null, l.tax ? "steuerrelevant" : null].filter(Boolean).join(" · ");
      return '<div class="entry" data-act="edit-log" data-obj="' + o.id + '" data-id="' + l.id + '"><div class="when"><b>' + (d ? d.getDate() : "") + "</b><span>" + esc(d ? MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2) : "") + '</span></div><div class="min0"><div class="lt">' + esc(l.title) + '</div><div class="ld">' + esc(sub) + "</div>" +
        (l.note ? '<div class="ld">' + esc(l.note) + "</div>" : "") + (l.files.length ? fileChips(l.files) : "") + '</div><div class="cost num">' + (num(l.cost) ? sens(fmtE(l.cost)) : "") + "</div></div>"; }).join("") + "</div>"
    : '<div class="empty">' + icon("menu_book") + "<p>Halte fest, was du gemacht oder gekauft hast: z. B. „Ölfilter gewechselt“ mit Datum, Teil, Artikelnummer, Kosten und Beleg.</p></div>";
  return section("Logbuch", '<div class="panel">' + body + "</div>", btn("new-log", "Eintrag", "add", "", ' data-obj="' + o.id + '"'));
}
function counterSection(o, k) {
  const cn = counterNow(o), r = counterRate(o), u = counterUnit(o);
  return section(k.counter.label, '<div class="panel counter"><div class="val num">' + (cn != null ? fmtN(cn) + ' <small class="muted">' + esc(u) + "</small>" : "–") + '</div><div class="muted small">' +
    (r ? "Ø " + fmtN(r * 30.4) + " " + esc(u) + " pro Monat" : "Trage mindestens zwei Stände ein, dann wird hochgerechnet.") + "</div>" + sparkline(o.counter) +
    '<form class="row nowrap" data-form="counter" data-id="' + o.id + '"><input type="number" id="cnt-' + o.id + '" step="any" inputmode="decimal" placeholder="Neuer Stand' + (cn != null ? ", z. B. " + Math.round(cn + 100) : "") + '" required><button class="btn primary" type="submit">Eintragen</button></form></div>');
}
function contactsSection(o) {
  const list = o.contactIds.map(contact).filter(Boolean);
  return section("Kontakte", list.length ? '<div class="list panel">' + list.map(c => contactRow(c, o.id)).join("") + "</div>" : '<div class="panel empty small"><p>Z. B. Werkstatt, Tierarzt, Handwerker.</p></div>',
    btn("link-contact", "Verknüpfen", "person_add", "", ' data-id="' + o.id + '"'));
}
function photoSection(o, k) {
  const journal = k.kind === "pflanze" || k.kind === "tier";
  const items = o.photos.map((p, i) => '<button class="ph" data-act="lightbox" data-id="' + o.id + '" data-i="' + i + '" aria-label="Foto öffnen"><img src="' + blobUrl(p.id) + '" alt="" loading="lazy">' + (i === 0 ? '<span class="tag">Titelbild</span>' : journal && p.d ? '<span class="tag">' + esc(fmtD(parse(p.d), { month: "short", year: "2-digit" })) + "</span>" : "") + "</button>").join("");
  const upload = canUpload() ? '<label class="upl" for="up-photo-' + o.id + '">' + icon("add_a_photo") + "Foto</label>" + '<input type="file" id="up-photo-' + o.id + '" data-upload="photo" data-id="' + o.id + '" accept="image/*" multiple hidden>' : "";
  return section(journal ? "Fotos & Tagebuch" : "Fotos", '<div class="panel"><div class="gallery">' + items + upload + "</div>" + (!canUpload() && !o.photos.length ? '<div class="empty small"><p>Fotos kannst du hochladen, wenn du unter Mehr → Konto & Sync angemeldet bist.</p></div>' : "") + "</div>");
}
function filesSection(o) {
  const up = canUpload() ? '<label class="btn" for="up-file-' + o.id + '">' + icon("attach_file") + 'Datei</label><input type="file" id="up-file-' + o.id + '" data-upload="file" data-id="' + o.id + '" accept="image/*,application/pdf" multiple hidden>' : "";
  return section("Belege & Dokumente", '<div class="list panel">' + (o.files.length ? o.files.map((f, i) => fileRow(f, "del-file", o.id, i)).join("") : '<div class="empty small">' + icon("receipt_long") + "<p>Kaufbeleg, Rechnung, Garantieschein oder Anleitung als PDF oder Foto anheften.</p></div>") + "</div>", up);
}
const fileRow = (f, delAct, ownerId, i) => '<div class="item"><span class="ico" style="--c:' + COLORS.grau + '">' + ((f.type || "").startsWith("image/") ? '<img src="' + blobUrl(f.id) + '" alt="">' : icon(fileIcon(f.type))) + '</span><div class="body"><div class="title"><a href="' + blobUrl(f.id) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></div><div class="meta">' + esc(fmtD(parse(f.d))) + (f.size ? " · " + Math.max(1, Math.round(f.size / 1024)) + " KB" : "") + "</div></div>" +
  '<a class="icon-btn sm" href="' + blobUrl(f.id) + '" target="_blank" rel="noopener" aria-label="Öffnen">' + icon("open_in_new") + "</a>" + btn(delAct, "", "delete", "icon-only", ' data-id="' + ownerId + '" data-i="' + i + '" aria-label="Datei löschen"') + "</div>";
function claudeSection(o) {
  if (!aiEnabled()) return "";
  return section("Claude fragen", '<div class="panel pad stack"><div class="row">' + btn("ai-suggest", "Aufgaben vorschlagen", "auto_awesome", "", ' data-id="' + o.id + '"') +
    '<label class="btn" for="ai-photo-' + o.id + '">' + icon("photo_camera") + 'Foto auslesen</label><input type="file" id="ai-photo-' + o.id + '" data-ai-photo="' + o.id + '" accept="image/*" hidden>' + "</div>" +
    '<p class="muted small">„Foto auslesen“ erkennt Typenschild, Beleg oder Pflanze und füllt die Angaben aus.</p>' +
    '<form class="row nowrap" data-form="ai-ask" data-id="' + o.id + '"><input type="text" id="ai-q-' + o.id + '" placeholder="Frage zu „' + esc(o.name) + '“, z. B. welches Öl passt?"><button class="btn" type="submit">' + icon("send") + "</button></form>" +
    '<div class="ai-answer" id="ai-a-' + o.id + '" hidden></div></div>');
}

/* ---------- Dokumente & Links ---------- */
function vDokumente() {
  const docs = S.docs.slice().sort((a, b) => { const x = docStatus(a).days, y = docStatus(b).days; return (x == null ? 99999 : x) - (y == null ? 99999 : y); });
  const tabs = [["docs", "Dokumente", S.docs.length], ["links", "Links", S.links.length]];
  let out = '<div class="head"><div><h1>Dokumente</h1><div class="sub">Ausweise, Führerscheine, Verträge und Zertifikate mit Ablaufdatum und Erinnerungen. Dazu deine wichtigen Links.</div></div>' +
    (UI.dtab === "links" ? btn("new-link", "Link", "add_link", "primary") : btn("new-doc", "Dokument", "note_add", "primary")) + "</div>" +
    '<div class="tabs" role="tablist">' + tabs.map(([id, l, n]) => '<button role="tab" aria-selected="' + (UI.dtab === id) + '" class="' + (UI.dtab === id ? "on" : "") + '" data-act="dtab" data-tab="' + id + '">' + l + '<span class="n">' + n + "</span></button>").join("") + "</div>";
  if (UI.dtab === "links") {
    if (!S.links.length) return out + emptyBox("link", "Speichere wichtige Seiten: Behörden-Portale, Online-Banking, Versicherungen, Kundenkonten oder Anleitungen.", btn("new-link", "Ersten Link speichern", "add_link", "primary"));
    const groups = {}; S.links.forEach(l => (groups[l.group || "Ohne Gruppe"] = groups[l.group || "Ohne Gruppe"] || []).push(l));
    return out + Object.keys(groups).sort((a, b) => a === "Ohne Gruppe" ? 1 : b === "Ohne Gruppe" ? -1 : a.localeCompare(b, "de")).map(g => section(g, '<div class="list panel">' + groups[g].map(linkRow).join("") + "</div>")).join("");
  }
  if (!docs.length) return out + emptyBox("folder_open", "Lege dein erstes Dokument an, z. B. den Führerschein. Lade ein Foto oder PDF hoch, trage das Ablaufdatum ein und werde rechtzeitig erinnert.", btn("new-doc", "Dokument anlegen", "note_add", "primary"));
  const att = docs.filter(d => ["over", "soon"].includes(docStatus(d).st));
  if (att.length) out += '<div class="banner warn">' + icon("schedule") + "<p><b>" + att.length + (att.length === 1 ? " Dokument braucht" : " Dokumente brauchen") + "</b> bald deine Aufmerksamkeit: " + esc(att.map(d => d.name).join(", ")) + ".</p></div>";
  return out + '<div class="docs">' + docs.map(d => docCard(d)).join("") + "</div>";
}
function linkRow(l) {
  return '<div class="item"><span class="ico" style="--c:' + COLORS.petrol + '">' + icon("link") + '</span><div class="body"><div class="title"><a href="' + esc(normUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.title) + '</a></div><div class="meta">' + esc([hostOf(l.url), l.note].filter(Boolean).join(" · ")) + "</div></div>" +
    '<button class="star ' + (l.fav ? "on" : "") + '" data-act="fav-link" data-id="' + l.id + '" aria-label="Favorit">' + icon("star") + "</button>" + btn("copy", "", "content_copy", "icon-only", ' data-text="' + esc(normUrl(l.url)) + '" aria-label="Adresse kopieren"') + btn("edit-link", "", "edit", "icon-only", ' data-id="' + l.id + '" aria-label="Bearbeiten"') + "</div>";
}
function vDoc(id) {
  const d = doc(id); if (!d) return vMissing();
  const ty = dtype(d), s = docStatus(d), imgs = docImgs(d);
  const open = S.tasks.filter(t => t.docId === id && !t.done).map(t => ({ t, c: calc(t) })).sort(sortByDue);
  const hero = imgs.length ? '<button class="hero-doc" data-act="doc-lightbox" data-id="' + d.id + '" data-i="0" aria-label="Bild vergrößern"><img src="' + blobUrl(imgs[0].id) + '" alt=""></button>' : '<span class="hero-doc">' + icon(ty[1]) + "</span>";
  let out = crumb("dokumente", "Dokumente") + '<div class="hero" style="--c:' + COLORS[ty[3]] + '">' + hero + '<div class="txt"><div class="eyebrow">' + esc(ty[0]) + "</div><h1>" + esc(d.name) + '</h1><div class="row wrap-chips"><span class="pill ' + s.st + '">' + esc(s.txt) + "</span>" +
    (Number(d.renewEvery) > 0 ? '<span class="chip">' + icon("autorenew", "font-size:16px") + "alle " + esc(d.renewEvery) + " Jahre erneuern</span>" : "") + '</div></div><div class="row">' +
    '<button class="star ' + (d.fav ? "on" : "") + '" data-act="fav-doc" data-id="' + d.id + '" aria-label="Favorit">' + icon("star", "font-size:26px") + "</button>" + btn("edit-doc", "Bearbeiten", "edit", "", ' data-id="' + id + '"') + (d.expires ? btn("renew-doc", "Erneuert", "autorenew", "primary", ' data-id="' + id + '"') : "") + "</div></div>";
  const rows = [["Art", esc(ty[0])], ["Nummer", d.number ? sens(esc(d.number)) : ""], ["Ausgestellt am", d.issued ? fmtD(parse(d.issued)) : ""], ["Gültig bis", d.expires ? fmtLong(parse(d.expires)) + " " + parse(d.expires).getFullYear() : "unbefristet"],
    ["Aussteller", esc(d.authority)], ["Erneuerung", Number(d.renewEvery) > 0 ? "alle " + d.renewEvery + " Jahre" : ""], ["Erinnerungen", d.expires ? esc(d.reminders.map(reminderLabel).join(", ")) : ""]].filter(r => r[1]);
  let left = section("Angaben", '<div class="panel"><div class="kv">' + rows.map(r => '<div class="k">' + r[0] + "</div><div>" + r[1] + "</div>").join("") + "</div>" + (d.note ? '<div class="note">' + esc(d.note) + "</div>" : "") + "</div>");
  left += section("Zur Verlängerung", d.steps.length ? '<div class="list panel">' + d.steps.map((x, i) => checkRow(x, "doc-step", d.id, i)).join("") + "</div>" : '<div class="panel empty small"><p>Lege eine Checkliste an, z. B. Sehtest, Passfoto, Gutachten.</p></div>', btn("edit-doc", "Bearbeiten", "edit", "ghost", ' data-id="' + id + '"'));
  left += section("Erinnerungen", open.length ? taskList(open, { noParent: true }) : '<div class="panel empty small"><p>Trage ein Ablaufdatum ein oder lege eigene Erinnerungen an.</p></div>', btn("new-task", "Hinzufügen", "add_alert", "", ' data-doc="' + id + '"'));
  const up = canUpload() ? '<label class="btn" for="up-doc-' + d.id + '">' + icon("upload_file") + 'Hochladen</label><input type="file" id="up-doc-' + d.id + '" data-upload="doc" data-id="' + d.id + '" accept="image/*,application/pdf" multiple hidden>' : "";
  let right = section("Dateien", '<div class="list panel">' + (d.files.length ? d.files.map((f, i) => fileRow(f, "del-docfile", d.id, i)).join("") : '<div class="empty small">' + icon("add_photo_alternate") + "<p>" + (canUpload() ? "Vorder- und Rückseite als Foto oder das Dokument als PDF hochladen." : "Dateien kannst du hochladen, wenn du unter Mehr → Konto & Sync angemeldet bist.") + "</p></div>") + "</div>", up);
  right += section("Links", d.links.length ? '<div class="lchips">' + d.links.map(linkChip).join("") + "</div>" : '<div class="panel empty small"><p>Z. B. Terminbuchung beim Amt oder Antragsformular.</p></div>');
  if (d.history.length) right += section("Verlauf", '<div class="panel"><div class="timeline">' + d.history.slice().reverse().map(h => '<div class="ev"><span class="d num">' + esc(fmtD(parse(h.d))) + "</span><span>Erneuert" + (h.to ? ", gültig bis " + esc(fmtD(parse(h.to))) : "") + "</span></div>").join("") + "</div></div>");
  return out + '<div class="grid2"><div class="col">' + left + '</div><div class="col">' + right + "</div></div>";
}
// Zeile mit Abhak-Kästchen (Checklisten)
const checkRow = (x, act, id, i) => '<label class="item check-item' + (x.done ? " is-done" : "") + '"><input type="checkbox" data-act="' + act + '" data-id="' + id + '" data-i="' + i + '"' + (x.done ? " checked" : "") + '><span class="body">' + esc(x.text) + "</span></label>";

/* ---------- Mehr ---------- */
function vMehr() {
  return '<div class="head"><div><h1>Mehr</h1><div class="sub">Weitere Werkzeuge und Einstellungen.</div></div></div><div class="more-grid">' +
    MORE_PAGES.map(([r, ic, l, sub]) => '<a class="panel more" href="#' + r + '">' + icon(ic) + "<b>" + esc(l) + '</b><span class="muted small">' + esc(sub) + "</span></a>").join("") + "</div>";
}

/* ---------- Kalender (Monat) ---------- */
function vKalender() {
  const T = today(); if (!UI.calMonth) UI.calMonth = new Date(T.getFullYear(), T.getMonth(), 1);
  const m = UI.calMonth, start = addDays(m, -((m.getDay() + 6) % 7)), end = addDays(start, 41);
  const byDay = {};
  activeTasks().forEach(x => occurrences(x.t, start, end).forEach(d => (byDay[ymd(d)] = byDay[ymd(d)] || []).push(x)));
  let cells = WEEKDAYS.map(d => '<div class="wd">' + d + "</div>").join("");
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), k = ymd(d), list = byDay[k] || [];
    cells += '<button class="day' + (d.getMonth() !== m.getMonth() ? " other" : "") + (k === ymd(T) ? " today" : "") + (UI.calSel === k ? " sel" : "") + '" data-act="cal-day" data-d="' + k + '" aria-label="' + esc(fmtD(d)) + ", " + list.length + ' Termine"><span class="n">' + d.getDate() + '</span><span class="dots">' +
      list.slice(0, 5).map(x => '<i style="--c:' + colorOf(parentOf(x.t).k) + '"></i>').join("") + '</span><span class="lbl">' + esc(list.map(x => x.t.title).join(", ")) + "</span></button>";
  }
  const sel = UI.calSel || ymd(T), selList = byDay[sel] || [];
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Kalender</h1><div class="sub">Alle Termine inklusive Wiederholungen.</div></div>' + btn("ics-export", "In Handy-Kalender exportieren", "event") + "</div>" +
    '<div class="panel cal"><div class="cal-h">' + btn("cal-nav", "", "chevron_left", "icon-only", ' data-dir="-1" aria-label="Vorheriger Monat"') + "<h2>" + esc(fmtD(m, { month: "long", year: "numeric" })) + "</h2>" + btn("cal-nav", "", "chevron_right", "icon-only", ' data-dir="1" aria-label="Nächster Monat"') + '</div><div class="cal-grid">' + cells + "</div></div>" +
    section(fmtLong(parse(sel)), selList.length ? taskList(selList.map(x => ({ t: x.t, c: Object.assign({}, x.c, { due: parse(sel), days: diffDays(T, parse(sel)) }) }))) : '<div class="panel empty small"><p>An diesem Tag ist nichts fällig.</p></div>');
}

/* ---------- Jahresplaner ---------- */
function vJahr() {
  // Zeigt 12 Monate ab dem aktuellen Monat (mit Pfeilen jeweils 12 Monate weiter/zurück)
  const off = UI.year || 0, T = today();
  const from = new Date(T.getFullYear(), T.getMonth() + off * 12, 1), to = new Date(from.getFullYear(), from.getMonth() + 12, 0);
  const months = Array.from({ length: 12 }, (_, i) => ({ d: new Date(from.getFullYear(), from.getMonth() + i, 1), list: [] }));
  activeTasks().forEach(x => {
    if (x.t.kind === "wochentage" || (x.t.kind === "intervall" && ["d", "w"].includes(x.t.unit))) return;   // Häufiges weglassen
    occurrences(x.t, from, to).forEach(d => { const m = months.find(mm => mm.d.getFullYear() === d.getFullYear() && mm.d.getMonth() === d.getMonth()); if (m) m.list.push({ x, d }); });
  });
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Jahresplaner</h1><div class="sub">' + esc(fmtD(from, { month: "long", year: "numeric" }) + " bis " + fmtD(to, { month: "long", year: "numeric" })) + '. Tägliche und wöchentliche Aufgaben sind ausgeblendet.</div></div><div class="row">' + btn("year-nav", "", "chevron_left", "icon-only", ' data-dir="-1" aria-label="12 Monate zurück"') + btn("year-nav", "", "chevron_right", "icon-only", ' data-dir="1" aria-label="12 Monate weiter"') + "</div></div>" +
    '<div class="year">' + months.map(({ d, list }) => '<div class="panel month' + (d.getFullYear() === T.getFullYear() && d.getMonth() === T.getMonth() ? " now" : "") + '"><h3>' + MONTHS[d.getMonth()] + " " + d.getFullYear() + "</h3>" +
      (list.length ? list.sort((a, b) => a.d - b.d).map(({ x, d: dd }) => '<button class="yl" data-act="task-menu" data-id="' + x.t.id + '"><i style="--c:' + colorOf(parentOf(x.t).k) + '"></i><span class="num">' + dd.getDate() + ".</span> " + esc(x.t.title) + '<span class="muted"> · ' + esc(parentName(x.t)) + "</span></button>").join("") : '<p class="muted small">Nichts geplant</p>') + "</div>").join("") + "</div>";
}

/* ---------- Listen: Einkauf, Verliehen, Gutscheine ---------- */
function shoppingRow(x) {
  return '<label class="item check-item' + (x.done ? " is-done" : "") + '"><input type="checkbox" data-act="shop-toggle" data-id="' + x.id + '"' + (x.done ? " checked" : "") + '><span class="body"><span class="title">' + esc(x.text) + "</span>" + (x.qty ? '<span class="meta"> × ' + esc(x.qty) + "</span>" : "") + "</span>" +
    (x.link ? '<a class="icon-btn sm" href="' + esc(x.link) + '" target="_blank" rel="noopener" aria-label="Kaufen">' + icon("open_in_new") + "</a>" : "") + btn("edit-simple", "", "edit", "icon-only", ' data-type="shopping" data-id="' + x.id + '" aria-label="Bearbeiten"') + "</label>";
}
function vListen() {
  const tabs = [["shopping", "Einkaufsliste", S.lists.shopping.filter(x => !x.done).length], ["lent", "Verliehen", S.lists.lent.filter(x => !x.done).length], ["vouchers", "Gutscheine", S.lists.vouchers.filter(x => !x.used).length]];
  let out = crumb("mehr", "Mehr") + '<div class="head"><div><h1>Listen</h1></div>' + btn("new-simple", "Hinzufügen", "add", "primary", ' data-type="' + UI.ltab + '"') + "</div>" +
    '<div class="tabs">' + tabs.map(([id, l, n]) => '<button class="' + (UI.ltab === id ? "on" : "") + '" data-act="ltab" data-tab="' + id + '">' + l + '<span class="n">' + n + "</span></button>").join("") + "</div>";
  if (UI.ltab === "shopping") {
    const open = S.lists.shopping.filter(x => !x.done), done = S.lists.shopping.filter(x => x.done);
    out += '<form class="row nowrap" data-form="shop-quick"><input type="text" id="shop-new" placeholder="Was brauchst du?" aria-label="Neuer Artikel"><button class="btn primary" type="submit">' + icon("add") + "</button></form>";
    out += open.length ? '<div class="list panel">' + open.map(shoppingRow).join("") + "</div>" : emptyBox("shopping_cart", "Die Einkaufsliste ist leer. Verbrauchsmaterial kannst du direkt vom Gerät aus hinzufügen.");
    if (done.length) out += section("Erledigt", '<div class="list panel">' + done.map(shoppingRow).join("") + "</div>", btn("shop-clear", "Erledigte entfernen", "delete_sweep", "ghost"));
    return out;
  }
  if (UI.ltab === "lent") {
    const list = S.lists.lent.slice().sort((a, b) => (a.done - b.done) || ((a.due || "9") < (b.due || "9") ? -1 : 1));
    return out + (list.length ? '<div class="list panel">' + list.map(x => { const late = x.due && !x.done && parse(x.due) < today();
      return '<div class="item clickable" data-act="edit-simple" data-type="lent" data-id="' + x.id + '">' + icoBox(null, x.dir === "in" ? "call_received" : "call_made") + '<div class="body"><div class="title">' + esc(x.thing) + '</div><div class="meta">' + esc((x.dir === "in" ? "geliehen von " : "verliehen an ") + x.person + (x.date ? " · seit " + fmtD(parse(x.date)) : "") + (x.due ? " · zurück bis " + fmtD(parse(x.due)) : "")) + "</div></div>" +
        (x.done ? '<span class="pill ok">zurück</span>' : late ? '<span class="pill over">überfällig</span>' : "") + "</div>"; }).join("") + "</div>" : emptyBox("swap_horiz", "Notiere, was du verliehen oder ausgeliehen hast. Mit Rückgabedatum wirst du erinnert."));
  }
  const list = S.lists.vouchers.slice().sort((a, b) => a.used - b.used || ((a.expires || "9") < (b.expires || "9") ? -1 : 1));
  return out + (list.length ? '<div class="list panel">' + list.map(x => { const left = x.expires ? diffDays(today(), parse(x.expires)) : null;
    return '<div class="item clickable" data-act="edit-simple" data-type="vouchers" data-id="' + x.id + '">' + icoBox(null, "redeem") + '<div class="body"><div class="title">' + esc(x.name) + (num(x.value) ? " · " + sens(fmtE(x.value)) : "") + '</div><div class="meta">' + esc([x.shop, x.expires ? "gültig bis " + fmtD(parse(x.expires)) : "ohne Ablauf"].filter(Boolean).join(" · ")) + (x.code ? " · Code: " + sens(esc(x.code)) : "") + "</div></div>" +
      (x.used ? '<span class="pill neutral">eingelöst</span>' : left != null && left < 0 ? '<span class="pill over">abgelaufen</span>' : left != null && left <= 30 ? '<span class="pill soon">' + relDays(left) + "</span>" : "") + "</div>"; }).join("") + "</div>" : emptyBox("redeem", "Speichere Gutscheine mit Wert, Code und Ablaufdatum, damit nichts verfällt."));
}

/* ---------- Reisen ---------- */
function vReisen() {
  const list = S.trips.slice().sort(by("from"));
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Reisen</h1><div class="sub">Checkliste und automatischer Dokumenten-Check für jede Reise.</div></div>' + btn("new-simple", "Reise", "add", "primary", ' data-type="trips"') + "</div>" +
    (list.length ? '<div class="list panel">' + list.map(x => { const w = tripWarnings(x), done = x.checklist.filter(c => c.done).length, past = parse(x.to || x.from) < today();
      return '<div class="item clickable" data-act="open-trip" data-id="' + x.id + '">' + icoBox(null, "luggage") + '<div class="body"><div class="title">' + esc(x.name) + '</div><div class="meta">' + esc([x.dest, x.from ? fmtD(parse(x.from)) + (x.to ? " – " + fmtD(parse(x.to)) : "") : null, done + "/" + x.checklist.length + " gepackt"].filter(Boolean).join(" · ")) + "</div></div>" +
        (w.length ? '<span class="pill ' + w[0].level + '">' + icon("warning", "font-size:15px") + "Dokumente</span>" : past ? '<span class="pill neutral">vorbei</span>' : x.from ? '<span class="pill ok">' + relDays(diffDays(today(), parse(x.from))) + "</span>" : "") + "</div>"; }).join("") + "</div>"
      : emptyBox("luggage", "Lege eine Reise an. Allreminde prüft, ob Ausweis, Pass und Führerschein rechtzeitig gültig sind, und gibt dir eine Packliste."));
}
function vReise(id) {
  const x = S.trips.find(t => t.id === id); if (!x) return vMissing();
  const w = tripWarnings(x);
  return crumb("reisen", "Reisen") + '<div class="head"><div><div class="eyebrow">' + esc(x.dest || "Reise") + "</div><h1>" + esc(x.name) + '</h1><div class="sub">' + esc(x.from ? fmtD(parse(x.from), { weekday: "short", day: "numeric", month: "long", year: "numeric" }) + (x.to ? " bis " + fmtD(parse(x.to), { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "") : "") + "</div></div>" + btn("edit-simple", "Bearbeiten", "edit", "", ' data-type="trips" data-id="' + id + '"') + "</div>" +
    section("Dokumenten-Check", w.length ? '<div class="list panel">' + w.map(v => '<div class="item clickable" data-act="open-doc" data-id="' + v.d.id + '">' + icoBox(docCat(v.d)) + '<div class="body"><div class="title">' + esc(v.d.name) + '</div><div class="meta wrap">' + esc(v.msg) + '</div></div><span class="pill ' + v.level + '">prüfen</span></div>').join("") + "</div>" :
      '<div class="panel empty small">' + icon("verified", "color:var(--ok)") + "<p>" + (S.docs.some(d => ["ausweis", "pass", "fs"].includes(d.type)) ? "Deine Ausweisdokumente sind für diese Reise gültig." : "Lege Ausweis oder Reisepass unter Dokumente an, dann wird hier geprüft, ob sie gültig sind.") + "</p></div>") +
    section("Checkliste", '<div class="list panel">' + x.checklist.map((c, i) => checkRow(c, "trip-check", id, i)).join("") + "</div>") + (x.note ? section("Notiz", '<div class="panel note">' + esc(x.note) + "</div>") : "");
}

/* ---------- Kontakte ---------- */
function contactRow(c, unlinkFrom) {
  return '<div class="item"><span class="ico" style="--c:' + COLORS.blau + '">' + icon("contact_phone") + '</span><div class="body"><div class="title">' + esc(c.name) + '</div><div class="meta">' + esc([c.role, c.phone, c.email].filter(Boolean).join(" · ")) + "</div></div>" +
    (c.phone ? btn("copy", "", "content_copy", "icon-only", ' data-text="' + esc(c.phone) + '" aria-label="Nummer kopieren"') : "") +
    (unlinkFrom ? btn("unlink-contact", "", "link_off", "icon-only", ' data-id="' + unlinkFrom + '" data-c="' + c.id + '" aria-label="Verknüpfung lösen"') : btn("edit-simple", "", "edit", "icon-only", ' data-type="contacts" data-id="' + c.id + '" aria-label="Bearbeiten"')) + "</div>";
}
function vKontakte() {
  const list = S.contacts.slice().sort(by("name"));
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Kontakte</h1><div class="sub">Werkstatt, Ärzte, Handwerker, Vermieter. Verknüpfe sie mit deinen Einträgen.</div></div>' + btn("new-simple", "Kontakt", "person_add", "primary", ' data-type="contacts"') + "</div>" +
    (list.length ? '<div class="list panel">' + list.map(c => contactRow(c)).join("") + "</div>" : emptyBox("contacts", "Noch keine Kontakte gespeichert."));
}

/* ---------- Kosten ---------- */
function vKosten() {
  const all = allCosts(), years = [...new Set(all.map(c => c.d.slice(0, 4)))].sort().reverse();
  const y = UI.costYear || years[0] || String(today().getFullYear());
  const list = all.filter(c => c.d.startsWith(y)), sum = list.reduce((s, c) => s + c.amount, 0);
  const byCat = {}, byType = {}, byMonth = MONTHS.map(() => 0);
  list.forEach(c => { const n = c.k ? c.k.name : "Sonstiges"; byCat[n] = (byCat[n] || 0) + c.amount; byType[c.type] = (byType[c.type] || 0) + c.amount; byMonth[parse(c.d).getMonth()] += c.amount; });
  const fix = monthlyFixCosts();
  const maxM = Math.max(1, ...byMonth);
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Kosten</h1><div class="sub">Käufe, Logbuch, Tankbuch und Verträge zusammengerechnet.</div></div><div class="row">' +
    '<select id="cost-year" aria-label="Jahr">' + (years.length ? years : [y]).map(v => '<option' + (v === y ? " selected" : "") + ">" + v + "</option>").join("") + "</select>" + btn("csv-costs", "CSV", "download") + "</div></div>" +
    '<div class="panel pad"><div class="sumrow"><div class="s"><b>' + sens(fmtE(sum)) + "</b><span>Ausgaben " + y + '</span></div><div class="s"><b>' + sens(fmtE(fix.reduce((s, x) => s + x.ci.monthly, 0))) + '</b><span>Fixkosten pro Monat</span></div></div>' +
    '<div class="months">' + byMonth.map((v, i) => '<div class="mcol"><span class="mbar"><i style="height:' + Math.round(v / maxM * 100) + '%"></i></span><span class="small muted">' + MONTHS[i][0] + "</span></div>").join("") + "</div></div>" +
    '<div class="grid2"><div class="col">' + section("Nach Bereich", '<div class="panel pad">' + (list.length ? barList(Object.entries(byCat).sort((a, b) => b[1] - a[1])) : '<p class="muted">Keine Ausgaben.</p>') + "</div>") + "</div>" +
    '<div class="col">' + section("Nach Art", '<div class="panel pad">' + (list.length ? barList(Object.entries(byType).sort((a, b) => b[1] - a[1])) : '<p class="muted">Keine Ausgaben.</p>') + "</div>") + "</div></div>" +
    (fix.length ? section("Laufende Verträge & Abos", '<div class="list panel">' + fix.map(x => '<div class="item clickable" data-act="open-obj" data-id="' + x.o.id + '">' + icoBox(cat(x.o.catId), null, x.o.photos) + '<div class="body"><div class="title">' + esc(x.o.name) + '</div><div class="meta">' + (x.ci.cancelBy ? "kündbar bis " + esc(fmtD(x.ci.cancelBy)) : "") + '</div></div><span class="num">' + sens(fmtE(x.ci.monthly)) + "/Monat</span></div>").join("") + "</div>") : "") +
    section("Letzte Ausgaben", list.length ? '<div class="list panel">' + list.slice(0, 40).map(c => '<div class="item' + (c.o ? " clickable" : "") + '"' + (c.o ? ' data-act="open-obj" data-id="' + c.o.id + '"' : "") + ">" + icoBox(c.k) + '<div class="body"><div class="title">' + esc(c.label) + '</div><div class="meta">' + esc([c.type, c.o ? c.o.name : null, fmtD(parse(c.d))].filter(Boolean).join(" · ")) + '</div></div><span class="num">' + sens(fmtE(c.amount)) + "</span></div>").join("") + "</div>" : emptyBox("payments", "Noch keine Ausgaben in diesem Jahr."));
}

/* ---------- Steuer ---------- */
function vSteuer() {
  const all = allCosts().filter(c => c.tax), years = [...new Set(all.map(c => c.d.slice(0, 4)))].sort().reverse();
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Steuer-Belege</h1><div class="sub">Markiere Käufe oder Logbuch-Einträge als „steuerrelevant“, z. B. Handwerkerrechnungen, Arbeitsmittel oder Fachliteratur. Hier findest du sie pro Jahr gesammelt.</div></div>' + btn("csv-tax", "CSV", "download") + "</div>" +
    (years.length ? years.map(y => { const list = all.filter(c => c.d.startsWith(y));
      return section(y + " · " + fmtE(list.reduce((s, c) => s + c.amount, 0)), '<div class="list panel">' + list.map(c => { const files = c.log ? c.log.files : (c.o ? c.o.files : []);
        return '<div class="item clickable" data-act="open-obj" data-id="' + c.o.id + '">' + icoBox(c.k) + '<div class="body"><div class="title">' + esc(c.label) + '</div><div class="meta">' + esc([c.type, c.o.name, fmtD(parse(c.d))].join(" · ")) + "</div>" + (files.length ? fileChips(files) : '<div class="meta warn-text">Kein Beleg angehängt</div>') + '</div><span class="num">' + sens(fmtE(c.amount)) + "</span></div>"; }).join("") + "</div>"); }).join("")
      : emptyBox("receipt_long", "Noch nichts markiert. Beim Bearbeiten eines Eintrags (Kauf) oder Logbuch-Eintrags findest du das Kästchen „steuerrelevant“."));
}

/* ---------- Import & Export ---------- */
function vDaten() {
  const row = (ic, title, sub, action) => '<div class="item">' + icoBox({ color: "petrol" }, ic) + '<div class="body"><div class="title">' + title + '</div><div class="meta wrap">' + sub + "</div></div>" + action + "</div>";
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Import & Export</h1><div class="sub">Termine mit dem Handy-Kalender verbinden, Daten sichern und Tabellen exportieren.</div></div></div>' +
    section("Erinnerungen aufs Handy", '<div class="list panel">' +
      row("event", "Kalender-Export (.ics)", "Alle Termine der nächsten 12 Monate mit allen Erinnerungsstufen. In Google-, Apple- oder Outlook-Kalender importieren, dann meldet sich dein Handy.", btn("ics-export", "Exportieren")) + "</div>") +
    section("Importieren", '<div class="list panel">' +
      row("delete", "Müllabfuhr- oder anderen Kalender importieren", "Lade die .ics-Datei deiner Gemeinde, Schulferien oder einen Schichtplan hoch. Die Termine werden zu Aufgaben mit Erinnerung am Vorabend.", '<label class="btn" for="ics-file">Datei wählen</label><input type="file" id="ics-file" accept=".ics,text/calendar" hidden>') +
      row("upload", "Sicherung einspielen", "Ersetzt alle aktuellen Daten durch eine Allreminde-Sicherung (.json).", '<label class="btn" for="imp-file">Datei wählen</label><input type="file" id="imp-file" accept=".json,application/json" hidden>') + "</div>") +
    section("Exportieren", '<div class="list panel">' +
      row("download", "Sicherung herunterladen", "Alle Daten als JSON-Datei. Fotos und Belege bleiben online gespeichert.", btn("export-json", "Sichern")) +
      row("table", "Inventar (CSV)", "Alle Einträge mit Kaufdatum, Preis, Händler, Garantie und Seriennummer, z. B. für die Hausratversicherung.", btn("csv-inventory", "Exportieren")) +
      row("payments", "Kosten (CSV)", "Alle Ausgaben mit Datum, Art und Bereich.", btn("csv-costs", "Exportieren")) +
      row("contract", "Verträge (CSV)", "Alle Verträge mit Kosten und Kündigungsfristen.", btn("csv-contracts", "Exportieren")) + "</div>");
}

/* ---------- Papierkorb ---------- */
function vPapierkorb() {
  return crumb("mehr", "Mehr") + '<div class="head"><div><h1>Papierkorb</h1><div class="sub">Gelöschtes bleibt 30 Tage hier und kann wiederhergestellt werden.</div></div>' + (S.trash.length ? btn("trash-empty", "Leeren", "delete_forever", "danger") : "") + "</div>" +
    (S.trash.length ? '<div class="list panel">' + S.trash.map(x => '<div class="item">' + icoBox(null, "delete") + '<div class="body"><div class="title">' + esc(x.label) + '</div><div class="meta">Gelöscht am ' + esc(fmtD(new Date(x.at))) + " · noch " + Math.max(0, 30 - diffDays(new Date(x.at), new Date())) + " Tage</div></div>" + btn("trash-restore", "Wiederherstellen", "restore_from_trash", "", ' data-id="' + x.id + '"') + "</div>").join("") + "</div>" : emptyBox("delete", "Der Papierkorb ist leer."));
}

/* ---------- Profil & Einstellungen ---------- */
const PROFILE_FIELDS = [
  { k: "name", label: "Name", ph: "Max Mustermann" }, { k: "birthday", label: "Geburtstag", type: "date" },
  { k: "street", label: "Straße & Hausnummer" }, { k: "zip", label: "PLZ" }, { k: "city", label: "Ort" },
  { k: "email", label: "E-Mail", ph: "name@beispiel.de" }, { k: "phone", label: "Telefon" }, { k: "emergency", label: "Notfallkontakt", ph: "Name und Nummer" },
  { k: "about", label: "Notizen", type: "textarea", ph: "z. B. Hausarzt, Kleidergrößen, wichtige Nummern …" }
];
function vProfil() {
  const p = S.profile, st = S.settings, initials = (p.name || "?").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const swatches = (name, list, cur) => '<div class="swatches">' + Object.keys(list).map(c => '<label><input type="radio" name="' + name + '" value="' + c + '"' + (cur === c ? " checked" : "") + '><span class="swatch" style="--c:' + (Array.isArray(list[c]) ? list[c][0] : list[c]) + '" title="' + c + '"></span></label>').join("") + "</div>";
  return crumb("mehr", "Mehr") + (typeof accountBox === "function" ? accountBox() : "") + '<div class="panel profile-card"><div class="avatar" style="background:' + (COLORS[st.color] || COLORS.petrol) + '">' + esc(initials) + '</div><div class="min0"><h1>' + (p.name ? esc(p.name) : "Dein Profil") + '</h1><div class="muted">' + esc([p.city, p.birthday ? "Geboren am " + fmtD(parse(p.birthday), { day: "numeric", month: "long", year: "numeric" }) : ""].filter(Boolean).join(" · ")) + '</div><div class="row wrap-chips"><span class="chip">' + S.categories.length + ' Bereiche</span><span class="chip">' + S.objects.length + ' Einträge</span><span class="chip">' + S.docs.length + " Dokumente</span></div></div></div>" +
    '<form class="panel" data-form="profile">' + formHtml(PROFILE_FIELDS, p) + '<div class="form-f"><span class="muted small">Die Adresse wird für Kündigungsschreiben verwendet.</span><button class="btn primary" type="submit">' + icon("save") + "Profil speichern</button></div></form>" +
    section("Erinnerungen", '<form class="panel" data-form="settings-rem"><div class="form">' + reminderPicker(st.reminders) + '<p class="hint full">Gilt für alle Aufgaben, bei denen weder die Aufgabe noch der Bereich eigene Erinnerungen hat.</p></div><div class="form-f"><span></span><button class="btn primary" type="submit">Speichern</button></div></form>') +
    section("Aussehen", '<div class="panel"><div class="form">' +
      '<div class="f full"><span class="f-l">Akzentfarbe</span>' + swatches("accent", ACCENTS, st.accent) + "</div>" +
      '<div class="f full"><span class="f-l">Profilfarbe</span>' + swatches("pcolor", COLORS, st.color) + "</div>" +
      fieldHtml({ k: "theme", label: "Hell / Dunkel", type: "select", options: [["system", "Wie im System"], ["light", "Hell"], ["dark", "Dunkel"]] }, st.theme) +
      fieldHtml({ k: "tiles", label: "Kachelgröße", type: "select", options: [["small", "Klein"], ["normal", "Normal"], ["large", "Groß"]] }, st.tileSize) +
      fieldHtml({ k: "zoom", label: "Schriftgröße", type: "select", options: [["90", "Klein"], ["100", "Normal"], ["112", "Groß"], ["125", "Sehr groß"]] }, String(st.zoom)) +
      fieldHtml({ k: "privacy", label: "Privatsphäre-Modus: Nummern und Beträge verschleiern, bis man darauf tippt", type: "check", full: true }, st.privacy) + "</div></div>") +
    section("Reise-Checkliste (Vorlage)", '<form class="panel" data-form="settings-trip"><div class="form">' + fieldHtml({ k: "tripcl", label: "Ein Punkt pro Zeile", type: "textarea" }, st.tripChecklist.join("\n")) + '</div><div class="form-f"><span></span><button class="btn primary" type="submit">Speichern</button></div></form>') +
    section("Alles zurücksetzen", '<div class="list panel"><div class="item" id="reset-row">' + icoBox({ color: "rot" }, "restart_alt") + '<div class="body"><div class="title">Alle Daten löschen</div><div class="meta">Bereiche, Einträge, Aufgaben, Dokumente, Links, Listen</div></div>' + btn("reset-ask", "Zurücksetzen", null, "danger") + "</div></div>");
}

/* ---------- Suche ---------- */
function vSuche() {
  const res = searchAll(UI.q);
  return '<div class="head"><div><h1>Suche</h1></div></div><form class="row nowrap" data-form="search"><input type="search" id="search-q" value="' + esc(UI.q) + '" placeholder="Suche nach Aufgaben, Einträgen, Artikelnummern, Dokumenten …" aria-label="Suchbegriff"><button class="btn primary" type="submit">' + icon("search") + "</button></form>" +
    (UI.q.length < 2 ? '<p class="muted">Mindestens 2 Zeichen eingeben.</p>' : res.length ? '<div class="list panel">' + res.map(r => {
      const attrs = r.task ? ' data-act="task-menu" data-id="' + r.task + '"' : r.url ? "" : ' data-act="goto" data-h="' + r.route + '"';
      const inner = icoBox(r.k, r.icon) + '<div class="body"><div class="title">' + esc(r.title) + '</div><div class="meta">' + esc(r.type + (r.sub ? " · " + r.sub : "")) + "</div></div>";
      return r.url ? '<a class="item clickable" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + inner + "</a>" : '<div class="item clickable"' + attrs + ">" + inner + "</div>";
    }).join("") + "</div>" : emptyBox("search_off", "Nichts gefunden für „" + esc(UI.q) + "“."));
}

/* ---------- Einrichtungs-Assistent ---------- */
function vAssistent() {
  return '<div class="head"><div><div class="eyebrow">Einrichtung</div><h1>Was möchtest du im Blick behalten?</h1><div class="sub">Wähle aus, was zu dir passt. Allreminde legt passende Bereiche mit typischen Aufgaben und sinnvollen Intervallen an. Alles lässt sich später ändern.</div></div></div>' +
    '<form data-form="assistant" class="stack">' + fieldHtml({ k: "aname", label: "Wie heißt du?", ph: "Vorname" }, S.profile.name) +
    '<div class="packs">' + STARTER.map(p => { const K = KINDS[p.kind]; const exists = S.categories.some(c => c.kind === p.kind && !S.example);
      return '<label class="panel pack' + (exists ? " exists" : "") + '"><input type="checkbox" name="pack" value="' + p.id + '"' + (exists ? " disabled" : "") + ">" + icoBox({ color: K.color }, K.icon) + '<span class="min0"><b>' + esc(p.label) + '</b><span class="muted small">' +
        esc(exists ? "schon vorhanden" : p.items.length ? p.items.map(i => i.name).join(", ") : K.templates.length ? K.templates.slice(0, 3).map(t => t.title).join(", ") + " …" : "eigene Einträge anlegen") + "</span></span></label>"; }).join("") + "</div>" +
    (S.example ? '<label class="check"><input type="checkbox" id="clear-example" checked> Beispieldaten vorher entfernen</label>' : "") +
    '<div class="row"><button class="btn primary" type="submit">' + icon("check") + "Bereiche anlegen</button>" + '<a class="btn ghost" href="#start">Überspringen</a></div></form>';
}

/* ---------- Benachrichtigungen ---------- */
function vBenachrichtigungen() {
  const n = S.settings.notify, dev = device();
  const perm = NATIVE ? null : ("Notification" in window ? Notification.permission : "unsupported");
  const status = dev.notify ? '<span class="pill ok">' + icon("check", "font-size:15px") + "An auf diesem Gerät</span>" : '<span class="pill neutral">Aus auf diesem Gerät</span>';
  const opt = (v, cur, l) => '<option value="' + v + '"' + (String(cur) === String(v) ? " selected" : "") + ">" + l + "</option>";
  let out = crumb("mehr", "Mehr") + '<div class="head"><div><h1>Benachrichtigungen</h1><div class="sub">Lege fest, wie und wann Allreminde dich erinnert. Ob Benachrichtigungen kommen, stellst du auf jedem Gerät einzeln ein.</div></div></div>';
  out += section("Dieses Gerät", '<div class="panel pad"><div class="row between"><div class="min0"><b>' + (NATIVE ? "Handy-App" : "Browser") + "</b> " + status + '<div class="muted small">' +
    (NATIVE ? "Erinnerungen werden auf dem Handy geplant und kommen auch, wenn die App geschlossen ist." : "Im Browser kommen Benachrichtigungen, solange Allreminde geöffnet ist (auch minimiert). Tipp: Als App installieren und mit Windows starten lassen, siehe unten.") +
    (perm === "denied" ? '<div class="warn-text">Benachrichtigungen sind im Browser blockiert. Klicke links in der Adresszeile auf das Schloss-Symbol und erlaube sie.</div>' : "") + "</div></div>" +
    (dev.notify ? btn("notif-disable", "Ausschalten", "notifications_off") : btn("notif-enable", "Einschalten", "notifications_active", "primary")) + "</div>" +
    '<div class="row">' + btn("notif-test", "Test-Erinnerung", "notifications", "", ' data-mode="push"') + btn("notif-test", "Test-Wecker", "alarm", "", ' data-mode="alarm"') + (NATIVE ? btn("notif-exact", "Pünktliche Wecker erlauben", "alarm_on") : "") + "</div></div>");
  out += section("Standards", '<form class="panel" data-form="notify-settings"><div class="form">' +
    '<label class="f">Art der Erinnerung<select id="n-mode">' + Object.entries(NOTIFY_MODES).map(([v, l]) => opt(v, n.mode, l)).join("") + '</select><span class="hint">Pro Aufgabe und Bereich änderbar</span></label>' +
    '<label class="f">Uhrzeit für ganztägige Aufgaben<input type="time" id="n-time" value="' + esc(n.defaultTime) + '"><span class="hint">und für Vorab-Erinnerungen</span></label>' +
    '<label class="f check full"><input type="checkbox" id="n-quiet"' + (n.quietOn ? " checked" : "") + '> Ruhezeit (keine Benachrichtigungen, Wecker klingeln trotzdem)</label>' +
    '<label class="f">Ruhezeit von<input type="time" id="n-qfrom" value="' + esc(n.quietFrom) + '"></label><label class="f">bis<input type="time" id="n-qto" value="' + esc(n.quietTo) + '"></label>' +
    '<label class="f">Bei Überfälligem nachhaken<select id="n-nag">' + [[0, "Nein"], [1, "Jede Stunde"], [3, "Alle 3 Stunden"], [6, "Alle 6 Stunden"], [24, "Einmal am Tag"]].map(([v, l]) => opt(v, n.nagHours, l)).join("") + "</select></label>" +
    '<span></span><label class="f check"><input type="checkbox" id="n-sum"' + (n.summaryOn ? " checked" : "") + '> Tägliche Zusammenfassung</label>' +
    '<label class="f">um<input type="time" id="n-sumtime" value="' + esc(n.summaryTime) + '"></label>' +
    '<label class="f check full"><input type="checkbox" id="n-sound"' + (n.alarmSound ? " checked" : "") + "> Wecker mit Alarmton</label>" +
    '</div><div class="form-f"><span class="muted small">Gilt auf allen Geräten.</span><button class="btn primary" type="submit">Speichern</button></div></form>');
  const tips = NATIVE ? [
      "Einstellungen → Apps → Allreminde → Akku → <b>Nicht eingeschränkt</b> wählen.",
      "Einstellungen → Akku → Hintergrund-Nutzungslimits → Allreminde zu den <b>Apps, die nie in den Standby gehen</b> hinzufügen.",
      "Einstellungen → Apps → Allreminde → Benachrichtigungen: Kategorie <b>Wecker</b> auf „Ton und Pop-up“ stellen.",
      "Tippe oben auf „Pünktliche Wecker erlauben“ und schalte den Schalter ein."]
    : ["<b>Firefox (ab Version 143):</b> rechts in der Adresszeile auf das Web-App-Symbol klicken. Allreminde bekommt ein eigenes Fenster und ein Symbol in der Taskleiste.",
       "<b>Mit Windows starten:</b> Windows-Taste + R → <b>shell:startup</b> eingeben → die Allreminde-Verknüpfung aus dem Startmenü in diesen Ordner ziehen.",
       "Nach dem Start einmal kurz in Allreminde klicken. Erst dann darf der Browser den Weckton abspielen.",
       "Windows-Einstellungen → System → Benachrichtigungen: <b>Firefox</b> erlauben und „Nicht stören“ prüfen."];
  out += section(NATIVE ? "Damit am Samsung nichts verloren geht" : "Damit es am PC zuverlässig klappt", '<div class="panel pad"><ol class="steps">' + tips.map(t => "<li>" + t + "</li>").join("") + "</ol></div>");
  const next = upcomingNotifications(new Date(), addDays(new Date(), 7)).slice(0, 8);
  out += section("Die nächsten Erinnerungen", next.length ? '<div class="list panel">' + next.map(x => '<div class="item">' + icoBox(null, x.mode === "alarm" ? "alarm" : "notifications") + '<div class="body"><div class="title">' + esc(x.title) + '</div><div class="meta">' + esc(fmtShort(x.at) + " · " + pad(x.at.getHours()) + ":" + pad(x.at.getMinutes()) + " · " + x.body) + "</div></div></div>").join("") + "</div>" : emptyBox("notifications_paused", "In den nächsten 7 Tagen sind keine Benachrichtigungen geplant."));
  return out;
}

/* ---------- Konto & Sync ---------- */
function vKonto() {
  let out = crumb("mehr", "Mehr") + '<div class="head"><div><h1>Konto & Sync</h1><div class="sub">Melde dich auf PC und Handy mit demselben Konto an. Dann sind deine Daten, Fotos und Belege überall gleich.</div></div></div>';
  if (!cloudReady()) out += emptyBox("cloud_off", "Der Online-Speicher ist noch nicht eingerichtet. Trage in js/00-env.js die Supabase-Adresse und den Schlüssel ein (siehe ANLEITUNG.md).");
  else if (sync.user) out += section("Angemeldet", '<div class="panel pad"><div class="row between"><div class="min0"><b>' + esc(sync.user.email) + '</b><div class="muted small">' + esc({ cloud: "Alles synchronisiert", wait: "Verbinde …", err: "Gerade keine Verbindung – Änderungen werden später übertragen", full: "Speicher fast voll" }[sync.mode] || "") + "</div></div>" + btn("sign-out", "Abmelden", "logout") + "</div></div>");
  else {
    const signup = UI.signup;
    out += section(signup ? "Konto anlegen" : "Anmelden", '<form class="panel" data-form="login" data-mode="' + (signup ? "signup" : "signin") + '"><div class="form">' +
      '<label class="f full">E-Mail<input type="email" id="k-email" autocomplete="email" placeholder="name@beispiel.de"></label>' +
      '<label class="f full">Passwort<input type="password" id="k-pw" autocomplete="' + (signup ? "new-password" : "current-password") + '" placeholder="mindestens 6 Zeichen"></label>' +
      '</div><div class="form-f">' + btn("login-mode", signup ? "Ich habe schon ein Konto" : "Neues Konto anlegen", null, "ghost") + '<button class="btn primary" type="submit">' + (signup ? "Konto anlegen" : "Anmelden") + "</button></div></form>");
  }
  out += section("Claude-Funktionen (optional)", '<div class="panel pad">' + (aiEnabled() ? '<div class="row between"><span>' + icon("check_circle", "color:var(--ok)") + " Aktiv auf diesem Gerät</span>" + btn("ai-key-remove", "Schlüssel entfernen", null, "ghost") + "</div>" :
    '<p class="muted small" style="margin:0">Für „Foto auslesen“, „Aufgaben vorschlagen“ und Fragen zu Einträgen brauchst du einen API-Schlüssel von console.anthropic.com. Jede Nutzung kostet ein paar Cent. Der Schlüssel bleibt nur auf diesem Gerät.</p>' +
    '<form class="row nowrap" data-form="ai-key"><input type="password" id="ai-key" placeholder="sk-ant-…" aria-label="API-Schlüssel"><button class="btn" type="submit">Speichern</button></form>') + "</div>");
  return out;
}

function vMissing() { return emptyBox("search_off", "Das gibt es nicht mehr.", '<a class="btn" href="#start">Zur Startseite</a>'); }

/* ---------- Welche Adresse zeigt welche Seite? ---------- */
const ROUTES = {
  start: vStart, aufgaben: vAufgaben, bereiche: vBereiche, dokumente: vDokumente, mehr: vMehr, kalender: vKalender, jahr: vJahr,
  listen: vListen, reisen: vReisen, kontakte: vKontakte, kosten: vKosten, steuer: vSteuer, daten: vDaten, papierkorb: vPapierkorb,
  profil: vProfil, suche: vSuche, assistent: vAssistent, benachrichtigungen: vBenachrichtigungen, konto: vKonto,
  "bereich-": vCat, "objekt-": vObj, "dokument-": vDoc, "reise-": vReise           // mit ID dahinter
};
// Zu welchem Menüpunkt gehört eine Seite (für die Markierung im Menü)?
const NAV_PARENT = { "bereich-": "bereiche", "objekt-": "bereiche", "dokument-": "dokumente", "reise-": "mehr", kalender: "mehr", jahr: "mehr", listen: "mehr", reisen: "mehr", kontakte: "mehr", kosten: "mehr", steuer: "mehr", daten: "mehr", papierkorb: "mehr", profil: "mehr", benachrichtigungen: "mehr", konto: "mehr", assistent: "start", suche: "" };
