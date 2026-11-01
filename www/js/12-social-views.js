/* =====================================================================
   12-social-views.js – Seiten für Anmeldung, Freunde, Gruppen und Chat
   Daten und Speichern: 11-social.js
   ===================================================================== */

Object.assign(UI, { gtab: "gruppen", sptab: "plan", found: null, showDone: false });
const SPACE_ICONS = ["group", "family_restroom", "groups", "home", "favorite", "celebration", "cake", "flight", "beach_access", "sports_soccer", "restaurant", "pets", "work", "school", "directions_car", "event"];
const REMIND_CHOICES = [["all", "Alle in der Gruppe"], ["assigned", "Nur wer zuständig ist"], ["none", "Niemand"]];
const SHARED_REMINDERS = [[0, "Am Tag"], [1, "1 Tag vorher"], [2, "2 Tage vorher"], [7, "1 Woche vorher"]];

/* ---------- Was wird statt der App angezeigt? (null = normale App) ---------- */
function authGate() {
  if (!cloudReady()) return null;                        // ohne Online-Speicher: keine Anmeldung nötig
  if (!AUTH.ready || (sync.user && !SOC.ready && AUTH.mode !== "newpw")) {
    clearTimeout(AUTH.slowTimer);
    AUTH.slowTimer = setTimeout(() => { const box = $("#loading-help"); if (box) box.outerHTML = loadingHelp("Das dauert ungewöhnlich lange."); }, 8000);
    return '<div class="auth"><div class="auth-card center"><div class="spinner"></div><p class="muted">Lädt …</p><div id="loading-help"></div></div></div>';
  }
  if (!sync.user || AUTH.mode === "newpw") return vAuth();
  if (!SOC.me && SOC.error === "net") return '<div class="auth">' + loadingHelp("Dein Profil konnte nicht geladen werden.") + "</div>";
  if (!SOC.me) return vSetupProfile();
  return null;
}

// Hilfe, falls das Laden hängt oder ein Fehler passiert (zeigt auch die Fehlermeldung für die Fehlersuche)
const ERRORS = [];
function noteError(e) { ERRORS.push(String((e && (e.message || e.reason && e.reason.message || e.reason)) || e).slice(0, 300)); ERRORS.splice(0, ERRORS.length - 5); }
window.addEventListener("error", e => noteError(e.error || e.message));
window.addEventListener("unhandledrejection", e => noteError(e.reason));
function loadingHelp(title) {
  return '<div class="auth-card" style="margin:16px auto;max-width:520px"><h2 style="margin:0">' + esc(title) + '</h2><p class="muted" style="margin:0">Lade die Seite neu. Hilft das nicht, melde dich ab und wieder an.</p>' +
    (ERRORS.length ? '<pre class="err-box">' + esc(ERRORS.join("\n")) + "</pre>" : "") +
    '<div class="auth-links">' + btn("reload", "Neu laden", "refresh", "primary") + btn("hard-logout", "Abmelden", "logout", "ghost") + "</div></div>";
}

/* ---------- Anmelden, Registrieren, Passwort ---------- */
function vAuth() {
  const m = AUTH.mode, f = (id, label, type, ac, ph) => '<label class="f full">' + label + '<input type="' + type + '" id="' + id + '" autocomplete="' + ac + '"' + (ph ? ' placeholder="' + ph + '"' : "") + " required></label>";
  const T = {
    login:  ["Willkommen zurück", "Melde dich an, um deine Erinnerungen zu sehen.", f("a-email", "E-Mail", "email", "email", "name@beispiel.de") + f("a-pw", "Passwort", "password", "current-password"), "Anmelden"],
    signup: ["Konto erstellen", "Kostenlos – du startest mit einer leeren App und richtest sie dir ein.", f("a-email", "E-Mail", "email", "email", "name@beispiel.de") + f("a-pw", "Passwort", "password", "new-password", "mindestens 8 Zeichen") + f("a-pw2", "Passwort wiederholen", "password", "new-password"), "Konto erstellen"],
    reset:  ["Passwort vergessen?", "Gib deine E-Mail ein. Du bekommst einen Link, mit dem du ein neues Passwort festlegst.", f("a-email", "E-Mail", "email", "email", "name@beispiel.de"), "Link senden"],
    newpw:  ["Neues Passwort", "Lege jetzt dein neues Passwort fest.", f("a-pw", "Neues Passwort", "password", "new-password", "mindestens 8 Zeichen") + f("a-pw2", "Passwort wiederholen", "password", "new-password"), "Passwort speichern"],
    check:  ["Schau in dein Postfach", AUTH.info || "Wir haben dir eine E-Mail geschickt.", "", ""]
  }[m] || [];
  const links = {
    login: btn("auth-mode", "Passwort vergessen?", null, "ghost", ' data-mode="reset"') + btn("auth-mode", "Neues Konto erstellen", null, "ghost", ' data-mode="signup"'),
    signup: btn("auth-mode", "Ich habe schon ein Konto", null, "ghost", ' data-mode="login"'),
    reset: btn("auth-mode", "Zurück zur Anmeldung", null, "ghost", ' data-mode="login"'),
    check: btn("auth-mode", "Zur Anmeldung", "arrow_back", "", ' data-mode="login"'),
    newpw: ""
  }[m];
  const info = AUTH.info && m !== "check" ? '<div class="banner auth-info">' + icon("info") + "<p>" + esc(AUTH.info) + "</p></div>" : "";
  return '<div class="auth"><div class="auth-card"><div class="auth-logo"><img src="icons/icon-192.png" alt=""><b>Allreminde</b></div>' +
    "<h1>" + T[0] + '</h1><p class="muted">' + esc(T[1]) + "</p>" + info +
    (T[2] ? '<form data-form="auth" data-mode="' + m + '" novalidate><div class="form">' + T[2] + '</div><button class="btn primary wide" type="submit">' + T[3] + "</button></form>" : (m === "check" ? '<div class="auth-mail">' + icon("mark_email_unread") + "</div>" : "")) +
    '<div class="auth-links">' + links + "</div></div></div>";
}
function authError(err) {
  const t = (err && err.message) || "";
  if (/Invalid login/i.test(t)) return "E-Mail oder Passwort stimmt nicht.";
  if (/not confirmed/i.test(t)) return "Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail anklicken).";
  if (/rate limit|too many/i.test(t)) return "Gerade wurden zu viele E-Mails verschickt. Bitte in einer Stunde nochmal versuchen.";
  if (/already registered|already exists/i.test(t)) return "Für diese E-Mail gibt es schon ein Konto. Melde dich an oder nutze „Passwort vergessen“.";
  if (/should be different/i.test(t)) return "Das neue Passwort muss sich vom alten unterscheiden.";
  if (/weak|at least/i.test(t)) return "Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.";
  if (/fetch|network/i.test(t)) return "Keine Verbindung zum Server.";
  return t || "Das hat nicht geklappt.";
}
async function submitAuth(form) {
  const m = form.dataset.mode, v = id => ($("#" + id) ? $("#" + id).value : "").trim();
  const email = v("a-email"), pw = $("#a-pw") ? $("#a-pw").value : "", pw2 = $("#a-pw2") ? $("#a-pw2").value : "";
  const fail = msg => { AUTH.info = msg; render(); };
  if (m !== "newpw" && !/^\S+@\S+\.\S+$/.test(email)) return fail("Bitte eine gültige E-Mail-Adresse eingeben.");
  if ((m === "signup" || m === "newpw") && pw.length < 8) return fail("Das Passwort braucht mindestens 8 Zeichen.");
  if ((m === "signup" || m === "newpw") && pw !== pw2) return fail("Die beiden Passwörter sind nicht gleich.");
  if (m === "login" && !pw) return fail("Bitte dein Passwort eingeben.");
  form.querySelector("button[type=submit]").disabled = true;
  AUTH.info = "";
  if (m === "login") { const err = await signIn(email, pw); if (err) return fail(authError(err)); }
  if (m === "signup") {
    const err = await signUp(email, pw);
    if (err && !err.confirm) return fail(authError(err));
    if (err && err.confirm) { AUTH.mode = "check"; AUTH.info = "Wir haben dir an " + email + " einen Bestätigungs-Link geschickt. Klicke darauf und melde dich danach hier an. Schau auch im Spam-Ordner nach."; render(); }
  }
  if (m === "reset") {
    const err = await requestPasswordReset(email);
    if (err) return fail(authError(err));
    AUTH.mode = "check"; AUTH.info = "Falls es ein Konto für " + email + " gibt, ist ein Link zum Zurücksetzen unterwegs. Öffne ihn im selben Browser."; render();
  }
  if (m === "newpw") {
    const err = await setNewPassword(pw);
    if (err) return fail(authError(err));
    AUTH.mode = "login"; render(); toast("Neues Passwort gespeichert");
  }
}

/* ---------- Erstes Anmelden: Benutzername wählen ---------- */
function vSetupProfile() {
  if (SOC.error === "schema") return '<div class="auth"><div class="auth-card"><h1>Fast fertig</h1><p class="muted">Die Datenbank kennt die neuen Tabellen noch nicht. Bitte in Supabase die Datei <b>supabase/schema-v2.sql</b> ausführen (SQL Editor → New query → Run) und die Seite neu laden.</p><div class="auth-links">' + btn("reload", "Neu laden", "refresh", "primary") + btn("sign-out", "Abmelden", "logout", "ghost") + "</div></div></div>";
  const suggestion = (sync.user.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20);
  return '<div class="auth"><div class="auth-card"><div class="auth-logo"><img src="icons/icon-192.png" alt=""><b>Allreminde</b></div><h1>Wie sollen dich Freunde finden?</h1>' +
    '<p class="muted">Dein Benutzername ist für andere sichtbar. Darüber können sie dich als Freund hinzufügen.</p>' + (AUTH.info ? '<div class="banner auth-info">' + icon("info") + "<p>" + esc(AUTH.info) + "</p></div>" : "") +
    '<form data-form="setup-profile" novalidate><div class="form">' +
    '<label class="f full">Benutzername<div class="at-input"><span>@</span><input type="text" id="p-user" autocomplete="username" maxlength="20" value="' + esc(suggestion) + '" required></div><span class="hint">3–20 Zeichen: a–z, 0–9, Punkt, Unterstrich</span></label>' +
    '<label class="f full">Anzeigename<input type="text" id="p-name" maxlength="40" placeholder="z. B. Max" required></label>' +
    '</div><button class="btn primary wide" type="submit">Los geht’s</button></form><div class="auth-links">' + btn("sign-out", "Abmelden", "logout", "ghost") + "</div></div></div>";
}

/* ---------- Profil: Foto, Name, Abmelden (oben auf der Profilseite) ---------- */
function accountBox() {
  if (!SOC.me) return "";
  const p = SOC.me;
  return '<div class="panel account">' +
    '<label class="avatar-edit" title="Profilfoto ändern">' + avatarHtml(p, 84) + '<span class="cam">' + icon("photo_camera") + '</span><input type="file" id="avatar-file" accept="image/*" hidden></label>' +
    '<div class="min0"><h1>' + esc(displayName(p)) + '</h1><div class="muted">@' + esc(p.username) + " · " + esc(sync.user.email) + "</div>" +
    '<div class="row">' + btn("edit-account", "Name ändern", "edit") + btn("sign-out", "Abmelden", "logout", "ghost") + "</div></div></div>";
}
function accountSheet() {
  const p = SOC.me;
  openSheet("Konto", '<div class="form"><label class="f full">Anzeigename<input type="text" id="p-name" maxlength="40" value="' + esc(p.display_name) + '"></label>' +
    '<label class="f full">Benutzername<div class="at-input"><span>@</span><input type="text" id="p-user" maxlength="20" value="' + esc(p.username) + '"></div></label>' +
    (p.avatar_path ? '<div class="full">' + btn("avatar-remove", "Profilfoto entfernen", "no_photography", "ghost") + "</div>" : "") +
    '<label class="f full">Neues Passwort (optional)<input type="password" id="p-pw" autocomplete="new-password" placeholder="leer lassen = unverändert"></label></div>', sheetFooter(), { type: "account" });
}

/* ---------- Startseite: Abschnitt "Gemeinsam" ---------- */
function sharedSection() {
  if (!SOC.me) return null;
  const up = mySharedTasks().filter(x => x.days <= 14).slice(0, 5), unread = totalUnread(), req = incomingRequests().length;
  if (!up.length && !unread && !req) return { body: emptyBox("group", "Noch nichts Gemeinsames geplant. Füge Freunde hinzu und lege eine Gruppe an.", '<a class="btn" href="#gemeinsam">Zu Gemeinsam</a>'), right: "" };
  const notes = (req ? '<a class="item clickable" href="#gemeinsam" data-act="gtab-go" data-tab="freunde">' + '<span class="ico" style="--c:var(--accent)">' + icon("person_add") + '</span><div class="body"><div class="title">' + req + (req === 1 ? " Freundschaftsanfrage" : " Freundschaftsanfragen") + "</div></div></a>" : "") +
    (unread ? '<a class="item clickable" href="#gemeinsam" data-act="gtab-go" data-tab="chats"><span class="ico" style="--c:var(--accent)">' + icon("chat") + '</span><div class="body"><div class="title">' + unread + (unread === 1 ? " neue Nachricht" : " neue Nachrichten") + "</div></div></a>" : "");
  return { right: '<a class="crumb" href="#gemeinsam">Alle' + icon("chevron_right", "font-size:18px") + "</a>", body: '<div class="panel list">' + notes + up.map(x => sharedTaskRow(x.i, x.s)).join("") + "</div>" };
}
function whenText(i) {
  if (!i.date) return "";
  const d = parse(i.date), days = diffDays(today(), d);
  return ({ "-1": "Gestern", 0: "Heute", 1: "Morgen" }[days] || fmtShort(d)) + (i.time ? " · " + i.time : "");
}
function sharedTaskRow(i, s) {
  const kids = childrenOf(i.space_id, i.id), open = kids.filter(k => !k.done).length, who = i.assigned_to && SOC.people[i.assigned_to];
  const days = i.date ? diffDays(today(), parse(i.date)) : null, st = i.done ? "" : days != null && days < 0 ? "over" : days === 0 ? "today" : "";
  return '<div class="item clickable" data-act="goto" data-h="gruppe-' + i.space_id + '"><span class="ico" style="--c:' + (COLORS[s.color] || COLORS.blau || "var(--accent)") + '">' + icon(s.icon) + "</span>" +
    '<div class="body"><div class="title-row"><span class="title">' + esc(i.title) + "</span>" + (st ? '<span class="pill ' + st + '">' + (st === "over" ? "Überfällig" : "Heute") + "</span>" : "") + '</div><div class="meta">' +
    esc([s.name, whenText(i), kids.length ? open + " von " + kids.length + " Dingen offen" : "", who ? "zuständig: " + displayName(who) : ""].filter(Boolean).join(" · ")) + "</div></div></div>";
}

/* ---------- Seite "Gemeinsam": Gruppen, Chats, Freunde ---------- */
function vGemeinsam() {
  if (!SOC.me) return emptyBox("cloud_off", "Gemeinsame Bereiche gibt es nur mit Konto.");
  const req = incomingRequests().length, unread = totalUnread();
  const tabs = [["gruppen", "Gruppen", SOC.spaces.length], ["chats", "Chats", unread], ["freunde", "Freunde", req || friendIds().length]];
  let out = '<div class="head"><div><h1>Gemeinsam</h1><div class="sub">Plane Termine und Listen mit Freunden und Familie und schreibt euch Nachrichten.</div></div>' +
    (UI.gtab === "gruppen" ? btn("space-new", "Neue Gruppe", "add", "primary") : UI.gtab === "freunde" ? "" : "") + "</div>" +
    '<div class="tabs" role="tablist">' + tabs.map(([id, l, n]) => '<button role="tab" aria-selected="' + (UI.gtab === id) + '" class="' + (UI.gtab === id ? "on" : "") + ((id === "chats" && unread) || (id === "freunde" && req) ? " alert" : "") + '" data-act="gtab" data-tab="' + id + '">' + l + '<span class="n">' + n + "</span></button>").join("") + "</div>";
  if (UI.gtab === "gruppen") out += spacesList();
  if (UI.gtab === "chats") out += chatsList();
  if (UI.gtab === "freunde") out += friendsPage();
  return out;
}
function spacesList() {
  if (!SOC.spaces.length) return emptyBox("groups", friendIds().length ? "Lege eine Gruppe an, z. B. „Familie“ oder „Grillabend“. Darin plant ihr Termine und Listen gemeinsam." : "Füge zuerst Freunde hinzu (Reiter „Freunde“). Danach kannst du Gruppen mit ihnen anlegen.", btn("space-new", "Neue Gruppe", "add", "primary"));
  return '<div class="spaces">' + SOC.spaces.map(s => {
    const items = SOC.items[s.id] || [], next = items.filter(i => i.kind === "task" && !i.done && i.date).sort((a, b) => (a.date + (a.time || "") < b.date + (b.time || "") ? -1 : 1))[0];
    const un = unreadCount("s:" + s.id), mem = spaceMembers(s.id);
    return '<a class="panel space-card" href="#gruppe-' + s.id + '"><span class="ico" style="--c:' + (COLORS[s.color] || "var(--accent)") + '">' + icon(s.icon) + '</span><div class="min0"><div class="title">' + esc(s.name) + (un ? '<em class="badge-n">' + un + "</em>" : "") + "</div>" +
      '<div class="meta">' + (next ? esc(next.title + " · " + whenText(next)) : "Nichts geplant") + '</div><div class="faces">' + mem.slice(0, 6).map(p => avatarHtml(p, 26)).join("") + (mem.length > 6 ? '<span class="more">+' + (mem.length - 6) + "</span>" : "") + "</div></div></a>";
  }).join("") + "</div>";
}
function chatsList() {
  const convs = SOC.spaces.map(s => ({ k: "s:" + s.id, name: s.name, av: '<span class="ico" style="--c:' + (COLORS[s.color] || "var(--accent)") + '">' + icon(s.icon) + "</span>" }))
    .concat(friendIds().map(id => ({ k: "u:" + id, name: displayName(SOC.people[id]), av: avatarHtml(SOC.people[id], 42) })))
    .map(c => { const list = SOC.messages[c.k] || []; return Object.assign(c, { last: list[list.length - 1] }); })
    .sort((a, b) => ((b.last ? b.last.created_at : "") > (a.last ? a.last.created_at : "") ? 1 : -1));
  if (!convs.length) return emptyBox("chat", "Hier erscheinen deine Chats, sobald du Freunde hast.");
  return '<div class="panel list">' + convs.map(c => {
    const un = unreadCount(c.k), who = c.last && c.last.from_user === me() ? "Du: " : c.last && c.k.startsWith("s:") ? displayName(SOC.people[c.last.from_user]) + ": " : "";
    return '<a class="item clickable' + (un ? " unread" : "") + '" href="#' + chatRoute(c.k) + (c.k.startsWith("s:") ? '" data-act="chat-open" data-k="' + c.k : "") + '">' + c.av + '<div class="body"><div class="title-row"><span class="title">' + esc(c.name) + '</span><span class="muted small">' + (c.last ? esc(msgTime(c.last.created_at)) : "") + "</span></div>" +
      '<div class="meta">' + (c.last ? esc(who + c.last.body) : "Noch keine Nachrichten") + "</div></div>" + (un ? '<em class="badge-n">' + un + "</em>" : "") + "</a>";
  }).join("") + "</div>";
}
function friendsPage() {
  const inc = incomingRequests(), outg = outgoingRequests(), fr = friendIds().map(id => SOC.people[id]).filter(Boolean).sort((a, b) => displayName(a).localeCompare(displayName(b), "de"));
  const person = (p, right) => '<div class="item">' + avatarHtml(p, 42) + '<div class="body"><div class="title">' + esc(displayName(p)) + '</div><div class="meta">@' + esc(p.username) + "</div></div>" + right + "</div>";
  let out = section("Freund hinzufügen", '<form class="panel pad" data-form="friend-search"><div class="row nowrap"><div class="at-input grow"><span>@</span><input type="text" id="fs-q" placeholder="Benutzername eingeben" autocomplete="off" aria-label="Benutzername"></div><button class="btn primary" type="submit">' + icon("search") + "Suchen</button></div>" +
    (UI.found ? (UI.found.length ? '<div class="list found">' + UI.found.map(p => {
      const f = SOC.friendships.find(x => x.requester === p.id || x.addressee === p.id);
      const right = !f ? btn("friend-add", "Anfragen", "person_add", "", ' data-id="' + p.id + '"') : '<span class="chip">' + (f.status === "accepted" ? "Befreundet" : "Angefragt") + "</span>";
      return person(p, right);
    }).join("") + "</div>" : '<p class="muted small">Niemand gefunden. Der Benutzername muss genau stimmen (Anfang reicht).</p>') : '<p class="muted small" style="margin:8px 0 0">Dein Benutzername: <b>@' + esc(SOC.me.username) + "</b> – gib ihn an Freunde weiter.</p>") + "</form>");
  if (inc.length) out += section("Anfragen an dich", '<div class="panel list">' + inc.map(f => person(SOC.people[f.requester] || { id: f.requester, username: "?" }, '<div class="row nowrap">' + btn("friend-accept", "Annehmen", "check", "primary", ' data-id="' + f.id + '"') + btn("friend-remove", "", "close", "icon-only", ' data-id="' + f.id + '" aria-label="Ablehnen"') + "</div>")).join("") + "</div>");
  out += section("Deine Freunde", fr.length ? '<div class="panel list">' + fr.map(p => person(p, '<div class="row nowrap"><a class="btn icon-only" href="#chat-' + p.id + '" aria-label="Nachricht schreiben">' + icon("chat") + "</a>" +
    btn("friend-menu", "", "more_vert", "icon-only", ' data-id="' + p.id + '" aria-label="Mehr"') + "</div>")).join("") + "</div>" : emptyBox("person_search", "Noch keine Freunde. Suche oben nach dem Benutzernamen deiner Freunde."));
  if (outg.length) out += section("Gesendete Anfragen", '<div class="panel list">' + outg.map(f => person(SOC.people[f.addressee] || { id: f.addressee, username: "?" }, btn("friend-remove", "Zurückziehen", null, "ghost", ' data-id="' + f.id + '"'))).join("") + "</div>");
  return out;
}

/* ---------- Eine Gruppe ---------- */
function vGruppe(id) {
  const s = SOC.spaces.find(x => x.id === id); if (!s) return SOC.me ? vMissing() : "";
  if (UI.sptab === "chat") markRead("s:" + id);
  const items = SOC.items[id] || [], tasks = items.filter(i => i.kind === "task"), lists = items.filter(i => i.kind === "list"), mem = spaceMembers(id), un = unreadCount("s:" + id);
  let out = crumb("gemeinsam", "Gemeinsam") + '<div class="head"><div class="row nowrap min0"><span class="ico big" style="--c:' + (COLORS[s.color] || "var(--accent)") + '">' + icon(s.icon) + '</span><div class="min0"><h1>' + esc(s.name) + "</h1>" +
    '<button class="faces linkish" data-act="space-members" data-id="' + id + '">' + mem.slice(0, 8).map(p => avatarHtml(p, 28)).join("") + '<span class="muted small">' + mem.length + " Mitglieder</span></button></div></div>" +
    '<div class="row">' + btn("space-edit", "", "settings", "icon-only", ' data-id="' + id + '" aria-label="Gruppe bearbeiten"') + "</div></div>" +
    '<div class="tabs">' + [["plan", "Planung"], ["chat", "Chat"]].map(([k, l]) => '<button class="' + (UI.sptab === k ? "on" : "") + (k === "chat" && un ? " alert" : "") + '" data-act="sptab" data-tab="' + k + '">' + l + (k === "chat" && un ? '<span class="n">' + un + "</span>" : "") + "</button>").join("") + "</div>";
  if (UI.sptab === "chat") return out + chatBox("s:" + id);

  const open = tasks.filter(i => !i.done).sort((a, b) => ((a.date || "9999") + (a.time || "") < (b.date || "9999") + (b.time || "") ? -1 : 1)), done = tasks.filter(i => i.done);
  out += section("Termine & Aufgaben", (open.length ? open.map(i => spTaskCard(i)).join("") : emptyBox("event", "Noch nichts geplant. Lege einen Termin an – z. B. „Grillabend am Samstag“ mit einer Liste, wer was mitbringt.")) +
    (done.length ? '<button class="btn ghost small" data-act="sp-showdone">' + icon(UI.showDone ? "expand_less" : "expand_more") + "Erledigt (" + done.length + ")</button>" + (UI.showDone ? done.map(i => spTaskCard(i)).join("") : "") : ""),
    btn("sp-new", "Termin", "add", "primary", ' data-kind="task" data-space="' + id + '"'));
  out += section("Listen", lists.length ? '<div class="sp-lists">' + lists.map(l => spListCard(l)).join("") + "</div>" : emptyBox("checklist", "Gemeinsame Listen, z. B. Einkauf für den Urlaub oder Geschenkideen."),
    btn("sp-new", "Liste", "add", "", ' data-kind="list" data-space="' + id + '"'));
  return out;
}
function spTaskCard(i) {
  const who = i.assigned_to && SOC.people[i.assigned_to], days = i.date ? diffDays(today(), parse(i.date)) : null;
  const st = i.done ? "done" : days != null && days < 0 ? "over" : days === 0 ? "today" : days != null && days <= 7 ? "soon" : "";
  const remind = { all: "Alle werden erinnert", assigned: "Nur Zuständige werden erinnert", none: "" }[i.remind];
  return '<div class="panel sp-card' + (i.done ? " is-done" : "") + '"><div class="item">' +
    '<button class="done-btn' + (i.done ? " on" : "") + '" data-act="sp-done" data-id="' + i.id + '" aria-label="' + (i.done ? "Wieder öffnen" : "Erledigt") + '">' + icon("check") + "</button>" +
    '<div class="body clickable" data-act="sp-edit" data-id="' + i.id + '"><div class="title-row"><span class="title">' + esc(i.title) + "</span>" + (st && st !== "done" ? '<span class="pill ' + st + '">' + (st === "over" ? "Überfällig" : st === "today" ? "Heute" : relDays(days)) + "</span>" : "") + "</div>" +
    '<div class="meta wrap">' + esc([whenText(i), who ? "zuständig: " + displayName(who) : "", i.done && i.done_by ? "erledigt von " + displayName(SOC.people[i.done_by]) : ""].filter(Boolean).join(" · ")) +
    (remind && !i.done ? " · " + icon(i.remind === "all" ? "notifications" : "notifications_active", "font-size:15px;vertical-align:-3px") : "") + "</div>" +
    (i.note ? '<div class="note">' + esc(i.note) + "</div>" : "") + "</div>" + (who ? avatarHtml(who, 30) : "") + "</div>" +
    entriesBlock(i, "Was wir brauchen") + "</div>";
}
function spListCard(l) {
  return '<div class="panel sp-card"><div class="item"><span class="ico" style="--c:var(--accent)">' + icon("checklist") + '</span><div class="body clickable" data-act="sp-edit" data-id="' + l.id + '"><div class="title">' + esc(l.title) + '</div><div class="meta">' +
    esc(l.note || (childrenOf(l.space_id, l.id).filter(x => !x.done).length + " offen")) + "</div></div>" + btn("sp-edit", "", "edit", "icon-only", ' data-id="' + l.id + '" aria-label="Bearbeiten"') + "</div>" + entriesBlock(l, null) + "</div>";
}
// Einträge unter einem Termin oder in einer Liste ("bringt mit")
function entriesBlock(parent, title) {
  const kids = childrenOf(parent.space_id, parent.id).sort((a, b) => (a.done - b.done) || (a.created_at < b.created_at ? -1 : 1));
  if (parent.kind === "task" && parent.done && !kids.length) return "";
  return '<div class="entries">' + (title && kids.length ? '<div class="sub-h">' + title + "</div>" : "") + kids.map(e => {
    const who = e.assigned_to && SOC.people[e.assigned_to];
    return '<div class="entry-row' + (e.done ? " is-done" : "") + '"><input type="checkbox" data-act="sp-entry-toggle" data-id="' + e.id + '"' + (e.done ? " checked" : "") + ' aria-label="Abhaken"><button class="entry-t" data-act="sp-edit" data-id="' + e.id + '">' + esc(e.title) +
      (who ? '<span class="brings">' + avatarHtml(who, 20) + esc(who.id === me() ? "ich" : displayName(who)) + "</span>" : "") + "</button>" +
      (!who && !e.done ? btn("sp-take", "Ich", "back_hand", "ghost small", ' data-id="' + e.id + '" title="Übernehme ich"') : "") + "</div>";
  }).join("") +
    (parent.done ? "" : '<form class="entry-add" data-form="sp-entry" data-parent="' + parent.id + '" data-space="' + parent.space_id + '"><input type="text" placeholder="' + (parent.kind === "task" ? "Was wird gebraucht? z. B. Grillkohle" : "Neuer Eintrag") + '" aria-label="Neuer Eintrag" maxlength="200"><button class="btn icon-only" type="submit" aria-label="Hinzufügen">' + icon("add") + "</button></form>") + "</div>";
}

/* ---------- Chat ---------- */
function msgTime(iso) {
  const d = new Date(iso), days = diffDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today());
  const t = pad(d.getHours()) + ":" + pad(d.getMinutes());
  return days === 0 ? t : days === 1 ? "Gestern " + t : fmtD(d, { day: "numeric", month: "short" }) + " " + t;
}
function chatBox(k) {
  markRead(k);
  if (!UI.loadedConv) UI.loadedConv = {};
  if (!UI.loadedConv[k]) { UI.loadedConv[k] = true; setTimeout(() => loadConversation(k), 0); }
  setTimeout(() => renderChatMessages(k), 0);
  const ok = k.startsWith("s:") || friendIds().includes(k.slice(2));
  return '<div class="panel chat"><div class="chat-msgs" id="chat-msgs" data-k="' + k + '"></div>' +
    (ok ? '<form class="chat-form" data-form="chat" data-k="' + k + '"><textarea id="chat-in" rows="1" placeholder="Nachricht schreiben …" maxlength="4000" aria-label="Nachricht"></textarea><button class="btn primary icon-only" type="submit" aria-label="Senden">' + icon("send") + "</button></form>"
      : '<p class="muted small pad">Ihr seid nicht mehr befreundet – Nachrichten sind nicht möglich.</p>') + "</div>";
}
function renderChatMessages(k) {
  const box = $("#chat-msgs"); if (!box || box.dataset.k !== k) return;
  const list = SOC.messages[k] || [], group = k.startsWith("s:");
  let lastDay = "", lastFrom = "";
  box.innerHTML = list.length ? list.map(m => {
    const mine = m.from_user === me(), day = m.created_at.slice(0, 10), p = SOC.people[m.from_user];
    const sep = day !== lastDay ? '<div class="chat-day">' + esc(fmtD(new Date(m.created_at), { weekday: "short", day: "numeric", month: "long" })) + "</div>" : "";
    const showName = group && !mine && (lastFrom !== m.from_user || sep);
    lastDay = day; lastFrom = m.from_user;
    const t = new Date(m.created_at);
    return sep + '<div class="msg' + (mine ? " mine" : "") + '">' + (group && !mine ? (showName ? avatarHtml(p, 28) : '<span class="av-gap"></span>') : "") +
      '<div class="bubble">' + (showName ? '<b class="from">' + esc(displayName(p)) + "</b>" : "") + '<span class="txt">' + esc(m.body) + '</span><span class="time">' + pad(t.getHours()) + ":" + pad(t.getMinutes()) + "</span></div>" +
      (mine ? btn("msg-del", "", "delete", "icon-only msg-del", ' data-id="' + m.id + '" data-k="' + k + '" aria-label="Löschen"') : "") + "</div>";
  }).join("") : '<div class="chat-empty muted">Noch keine Nachrichten. Sag hallo!</div>';
  box.scrollTop = box.scrollHeight;
}
function vChat(uid) {
  const p = SOC.people[uid]; if (!p) return SOC.me ? vMissing() : "";
  return crumb("gemeinsam", "Gemeinsam") + '<div class="head"><div class="row nowrap min0">' + avatarHtml(p, 48) + '<div class="min0"><h1>' + esc(displayName(p)) + '</h1><div class="sub">@' + esc(p.username) + "</div></div></div></div>" + chatBox("u:" + uid);
}

/* ---------- Formulare (Bottom-Sheets) ---------- */
function spaceSheet(id) {
  const s = id ? SOC.spaces.find(x => x.id === id) : { name: "", icon: "group", color: "blau" }, owner = !id || isOwner(id);
  const friends = friendIds().map(f => SOC.people[f]).filter(Boolean);
  const inner = '<div class="form">' + (owner ? '<label class="f full">Name<input type="text" id="sp-name" maxlength="60" value="' + esc(s.name) + '" placeholder="z. B. Familie, WG, Urlaub Kroatien" required></label>' +
    '<div class="f full"><span class="f-l">Symbol</span><div class="icon-pick">' + SPACE_ICONS.map(n => '<label><input type="radio" name="sp-icon" value="' + n + '"' + (s.icon === n ? " checked" : "") + "><span>" + icon(n) + "</span></label>").join("") + "</div></div>" +
    '<div class="f full"><span class="f-l">Farbe</span><div class="swatches">' + Object.keys(COLORS).map(c => '<label><input type="radio" name="sp-color" value="' + c + '"' + (s.color === c ? " checked" : "") + '><span class="swatch" style="--c:' + COLORS[c] + '" title="' + c + '"></span></label>').join("") + "</div></div>" : "") +
    (!id ? '<div class="f full"><span class="f-l">Wer ist dabei?</span>' + (friends.length ? '<div class="pick-people">' + friends.map(p => '<label class="check"><input type="checkbox" name="sp-mem" value="' + p.id + '">' + avatarHtml(p, 28) + esc(displayName(p)) + "</label>").join("") + "</div>" : '<p class="muted small">Du hast noch keine Freunde. Du kannst sie später hinzufügen.</p>') + "</div>" : "") +
    (id ? '<div class="full">' + (owner ? '<span class="confirm" id="del-zone">' + btn("space-del", "Gruppe löschen", "delete", "danger ghost", ' data-id="' + id + '"') + "</span>" : btn("space-leave", "Gruppe verlassen", "logout", "danger ghost", ' data-id="' + id + '"')) + "</div>" : "") + "</div>";
  openSheet(id ? "Gruppe bearbeiten" : "Neue Gruppe", inner, owner ? sheetFooter(null, id ? "Speichern" : "Gruppe anlegen") : "", { type: "space", id });
}
function membersSheet(id) {
  const mem = spaceMembers(id), owner = isOwner(id), ids = mem.map(m => m.id), addable = friendIds().filter(f => !ids.includes(f)).map(f => SOC.people[f]).filter(Boolean);
  const inner = '<div class="list">' + mem.map(p => '<div class="item">' + avatarHtml(p, 38) + '<div class="body"><div class="title">' + esc(displayName(p)) + (p.id === me() ? " (du)" : "") + '</div><div class="meta">@' + esc(p.username) + (p.role === "owner" ? " · Verwaltet die Gruppe" : "") + "</div></div>" +
    (p.id !== me() && friendIds().includes(p.id) ? '<a class="btn icon-only" href="#chat-' + p.id + '" data-act="goto" data-h="chat-' + p.id + '" aria-label="Nachricht">' + icon("chat") + "</a>" : "") +
    (owner && p.id !== me() ? btn("member-remove", "", "person_remove", "icon-only", ' data-id="' + p.id + '" data-space="' + id + '" aria-label="Entfernen"') : "") + "</div>").join("") + "</div>" +
    (owner ? '<div class="form"><div class="f full"><span class="f-l">Freunde hinzufügen</span>' + (addable.length ? '<div class="pick-people">' + addable.map(p => '<label class="check"><input type="checkbox" name="sp-mem" value="' + p.id + '">' + avatarHtml(p, 28) + esc(displayName(p)) + "</label>").join("") + "</div>" : '<p class="muted small">Alle deine Freunde sind schon dabei.</p>') + "</div></div>" : '<p class="muted small">Nur wer die Gruppe verwaltet, kann Mitglieder hinzufügen.</p>');
  openSheet("Mitglieder", inner, owner && addable.length ? sheetFooter(null, "Hinzufügen") : "", { type: "members", id });
}
function itemSheet2(kind, spaceId, id, parentId) {
  const i = id ? (SOC.items[spaceId] || []).find(x => x.id === id) : { kind, title: "", note: "", date: "", time: "", assigned_to: null, remind: "all", reminders: [1, 0] };
  const mem = spaceMembers(spaceId), k = i.kind;
  const whoSel = (label) => '<label class="f full">' + label + '<select id="si-who"><option value="">Niemand</option>' + mem.map(p => '<option value="' + p.id + '"' + (i.assigned_to === p.id ? " selected" : "") + ">" + esc(displayName(p)) + (p.id === me() ? " (ich)" : "") + "</option>").join("") + "</select></label>";
  let inner = '<div class="form"><label class="f full">' + (k === "entry" ? "Was" : k === "list" ? "Name der Liste" : "Titel") + '<input type="text" id="si-title" maxlength="200" value="' + esc(i.title) + '" placeholder="' + (k === "task" ? "z. B. Oma besuchen, Grillabend" : k === "list" ? "z. B. Urlaub packen" : "") + '" required></label>';
  if (k === "task") inner += '<div class="row fields full"><label class="f">Datum<input type="date" id="si-date" value="' + esc(i.date || "") + '"></label><label class="f">Uhrzeit<input type="time" id="si-time" value="' + esc(i.time || "") + '"></label></div>' +
    whoSel("Zuständig") +
    '<div class="f full"><span class="f-l">Wer wird erinnert?</span><div class="chips">' + REMIND_CHOICES.map(([v, l]) => '<label><input type="radio" name="si-remind" value="' + v + '"' + (i.remind === v ? " checked" : "") + "><span>" + l + "</span></label>").join("") + "</div></div>" +
    '<div class="f full"><span class="f-l">Wann erinnern?</span><div class="chips">' + SHARED_REMINDERS.map(([v, l]) => '<label><input type="checkbox" name="si-rem" value="' + v + '"' + ((i.reminders || []).includes(v) ? " checked" : "") + "><span>" + l + "</span></label>").join("") + "</div></div>";
  if (k === "entry") inner += whoSel("Wer bringt es mit / kümmert sich?");
  if (k !== "entry") inner += '<label class="f full">Notiz<textarea id="si-note" rows="2" maxlength="2000">' + esc(i.note || "") + "</textarea></label>";
  inner += "</div>";
  const title = id ? "Bearbeiten" : k === "task" ? "Neuer Termin" : k === "list" ? "Neue Liste" : "Neuer Eintrag";
  openSheet(title, inner, sheetFooter(id ? "sp-del-ask" : null, id ? "Speichern" : "Anlegen"), { type: "sp-item", kind: k, space: spaceId, id, parent: parentId || null });
}
function friendMenu(uid) {
  const p = SOC.people[uid], f = SOC.friendships.find(x => x.status === "accepted" && (x.requester === uid || x.addressee === uid));
  openSheet(displayName(p), '<div class="list"><a class="item clickable" href="#chat-' + uid + '" data-act="goto" data-h="chat-' + uid + '">' + icon("chat") + '<div class="body">Nachricht schreiben</div></a>' +
    '<span class="confirm" id="del-zone">' + btn("friend-remove-ask", "Freundschaft beenden", "person_remove", "danger ghost", ' data-id="' + (f ? f.id : "") + '"') + "</span></div>", "", { type: "friend" });
}
const findSpaceItem = id => { for (const k in SOC.items) { const x = SOC.items[k].find(i => i.id === id); if (x) return x; } return null; };

/* ---------- Klicks ---------- */
Object.assign(ACTIONS, {
  "auth-mode": el => { AUTH.mode = el.dataset.mode; AUTH.info = ""; render(); },
  "reload": () => location.reload(),
  "hard-logout": () => {                                   // Anmeldung auf diesem Gerät löschen, auch wenn der Server nicht antwortet
    try { Object.keys(localStorage).filter(k => k.startsWith("sb-")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    location.reload();
  },
  "edit-account": () => accountSheet(),
  "avatar-remove": async () => { const old = SOC.me.avatar_path; await db().from("profiles").update({ avatar_path: null }).eq("id", me()); if (old) db().storage.from("avatars").remove([old]); SOC.me.avatar_path = null; closeSheet(); render(); toast("Profilfoto entfernt"); },
  "gtab": el => { UI.gtab = el.dataset.tab; UI.found = null; render(); },
  "gtab-go": (el, e) => { e.preventDefault(); UI.gtab = el.dataset.tab; go("gemeinsam"); },
  "sptab": el => { UI.sptab = el.dataset.tab; render(); },
  "chat-open": (el, e) => { e.preventDefault(); UI.sptab = "chat"; go(chatRoute(el.dataset.k)); },
  "friend-add": async el => { el.disabled = true; await sendFriendRequest(el.dataset.id); },
  "friend-accept": el => acceptFriend(Number(el.dataset.id)),
  "friend-remove": el => removeFriendship(Number(el.dataset.id)),
  "friend-menu": el => friendMenu(el.dataset.id),
  "friend-remove-ask": el => { $("#del-zone").innerHTML = "<span>Wirklich?</span>" + btn("friend-remove-yes", "Ja, beenden", null, "danger", ' data-id="' + el.dataset.id + '"') + btn("close", "Nein", null, "ghost"); },
  "friend-remove-yes": el => { closeSheet(); removeFriendship(Number(el.dataset.id)); toast("Freundschaft beendet"); },
  "space-new": () => spaceSheet(null),
  "space-edit": el => spaceSheet(el.dataset.id),
  "space-members": el => membersSheet(el.dataset.id),
  "space-del": el => { $("#del-zone").innerHTML = "<span>Gruppe mit allen Terminen, Listen und Nachrichten löschen?</span>" + btn("space-del-yes", "Ja, löschen", null, "danger", ' data-id="' + el.dataset.id + '"') + btn("space-del-no", "Nein", null, "ghost", ' data-id="' + el.dataset.id + '"'); },
  "space-del-no": el => { $("#del-zone").innerHTML = btn("space-del", "Gruppe löschen", "delete", "danger ghost", ' data-id="' + el.dataset.id + '"'); },
  "space-del-yes": async el => { closeSheet(); await deleteSpace(el.dataset.id); go("gemeinsam"); toast("Gruppe gelöscht"); },
  "space-leave": async el => { closeSheet(); await removeMember(el.dataset.id, me()); go("gemeinsam"); toast("Du hast die Gruppe verlassen"); },
  "member-remove": async el => { await removeMember(el.dataset.space, el.dataset.id); membersSheet(el.dataset.space); render(); },
  "sp-new": el => itemSheet2(el.dataset.kind, el.dataset.space, null),
  "sp-edit": el => { const i = findSpaceItem(el.dataset.id); if (i) itemSheet2(i.kind, i.space_id, i.id, i.parent_id); },
  "sp-done": async el => { const i = findSpaceItem(el.dataset.id); if (!i) return; const done = !i.done; i.done = done; render(); await saveItem({ id: i.id, done, done_by: done ? me() : null }); softRender(); if (done) toast("„" + i.title + "“ erledigt"); },
  "sp-entry-toggle": async el => { const i = findSpaceItem(el.dataset.id); if (!i) return; await saveItem({ id: i.id, done: el.checked, done_by: el.checked ? me() : null }); softRender(); },
  "sp-take": async el => { await saveItem({ id: el.dataset.id, assigned_to: me() }); softRender(); toast("Eingetragen: du kümmerst dich darum"); },
  "sp-showdone": () => { UI.showDone = !UI.showDone; render(); },
  "sp-del-ask": () => askDelete(SHEET.kind === "task" ? "Termin mit allen Einträgen löschen?" : SHEET.kind === "list" ? "Liste mit allen Einträgen löschen?" : "Eintrag löschen?", "sp-del"),
  "sp-del": async () => { const id = SHEET.id; closeSheet(); await deleteItem(id); render(); toast("Gelöscht"); },
  "msg-del": async el => { const k = el.dataset.k, id = Number(el.dataset.id); await db().from("messages").delete().eq("id", id); SOC.messages[k] = (SOC.messages[k] || []).filter(m => m.id !== id); renderChatMessages(k); }
});

/* ---------- Speichern ---------- */
Object.assign(SUBMIT, {
  "account": async () => {
    const name = $("#p-name").value.trim(), user = $("#p-user").value.trim().replace(/^@/, ""), pw = $("#p-pw").value;
    if (!name) { toast("Bitte einen Anzeigenamen eingeben"); return; }
    if (pw && pw.length < 8) { toast("Das Passwort braucht mindestens 8 Zeichen"); return; }
    const err = await saveMyProfile(user, name); if (err) { toast(err); return; }
    if (pw) { const e2 = await setNewPassword(pw); if (e2) { toast(authError(e2)); return; } }
    closeSheet(); render(); toast(pw ? "Gespeichert, neues Passwort gilt ab sofort" : "Gespeichert");
  },
  "space": async () => {
    const name = $("#sp-name") ? $("#sp-name").value.trim() : "";
    if ($("#sp-name") && !name) { toast("Bitte einen Namen eingeben"); return; }
    const ic = ($("input[name=sp-icon]:checked") || {}).value || "group", col = ($("input[name=sp-color]:checked") || {}).value || "blau";
    if (SHEET.id) { const id = SHEET.id; closeSheet(); await updateSpace(id, { name, icon: ic, color: col }); render(); toast("Gespeichert"); return; }
    const mem = $$("input[name=sp-mem]:checked").map(x => x.value);
    closeSheet(); toast("Gruppe wird angelegt …");
    const s = await createSpace(name, ic, col, mem);
    if (s) { UI.sptab = "plan"; go("gruppe-" + s.id); toast("Gruppe „" + name + "“ angelegt"); }
  },
  "members": async () => { const id = SHEET.id, ids = $$("input[name=sp-mem]:checked").map(x => x.value); if (!ids.length) { closeSheet(); return; } closeSheet(); await addMembers(id, ids); render(); toast(ids.length === 1 ? "Mitglied hinzugefügt" : ids.length + " Mitglieder hinzugefügt"); },
  "sp-item": async () => {
    const title = $("#si-title").value.trim(); if (!title) { toast("Bitte einen Titel eingeben"); return; }
    const ctx = SHEET, row = { title };
    if (!ctx.id) Object.assign(row, { space_id: ctx.space, kind: ctx.kind, parent_id: ctx.parent });
    else row.id = ctx.id;
    if ($("#si-who")) row.assigned_to = $("#si-who").value || null;
    if ($("#si-note")) row.note = $("#si-note").value.trim();
    if (ctx.kind === "task") {
      row.date = $("#si-date").value || null; row.time = $("#si-time").value || null;
      row.remind = ($("input[name=si-remind]:checked") || {}).value || "all";
      row.reminders = $$("input[name=si-rem]:checked").map(x => Number(x.value));
      if (row.remind === "assigned" && !row.assigned_to) { toast("Wähle aus, wer zuständig ist – oder „Alle“ erinnern"); return; }
    }
    closeSheet();
    if (await saveItem(row)) { render(); toast(ctx.id ? "Gespeichert" : ctx.kind === "task" ? "Termin angelegt" : ctx.kind === "list" ? "Liste angelegt" : "Hinzugefügt"); }
  }
});

/* ---------- Formulare auf Seiten ---------- */
Object.assign(PAGE_FORMS, {
  "auth": f => submitAuth(f),
  "setup-profile": async f => {
    const user = $("#p-user").value.trim().replace(/^@/, "").toLowerCase(), name = $("#p-name").value.trim();
    if (!/^[a-z0-9_.]{3,20}$/.test(user)) { AUTH.info = "Benutzername: 3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich."; render(); return; }
    if (!name) { AUTH.info = "Bitte einen Anzeigenamen eingeben."; render(); return; }
    f.querySelector("button[type=submit]").disabled = true;
    const err = await saveMyProfile(user, name);
    if (err) { AUTH.info = err; render(); return; }
    AUTH.info = ""; await loadSocial(); startSocialRealtime(); location.hash = "start"; render(); toast("Willkommen, " + name + "!");
  },
  "friend-search": async () => { UI.found = await searchUsers($("#fs-q").value); const q = $("#fs-q").value; render(); const inp = $("#fs-q"); if (inp) inp.value = q; },
  "sp-entry": async f => {
    const inp = f.querySelector("input"), title = inp.value.trim(); if (!title) return;
    inp.value = ""; await saveItem({ space_id: f.dataset.space, parent_id: f.dataset.parent, kind: "entry", title });
    render(); const again = $('form[data-parent="' + f.dataset.parent + '"] input'); if (again) again.focus();
  },
  "chat": f => { const ta = f.querySelector("textarea"), body = ta.value; ta.value = ""; ta.style.height = ""; sendMessage(f.dataset.k, body); }
});

// Chat: Enter sendet, Umschalt+Enter macht eine neue Zeile; Feld wächst mit
document.addEventListener("keydown", e => {
  if (e.target.id === "chat-in" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit(); }
});
document.addEventListener("input", e => {
  if (e.target.id === "chat-in") { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }
});
document.addEventListener("change", e => { if (e.target.id === "avatar-file" && e.target.files[0]) { toast("Foto wird hochgeladen …"); uploadAvatar(e.target.files[0]); } });

/* ---------- Adressen ---------- */
Object.assign(ROUTES, { gemeinsam: vGemeinsam, "gruppe-": vGruppe, "chat-": vChat });
Object.assign(NAV_PARENT, { "gruppe-": "gemeinsam", "chat-": "gemeinsam" });
