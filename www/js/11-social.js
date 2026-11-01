/* =====================================================================
   11-social.js – Konto, Profil, Freunde, Gruppen und Chat (Daten)
   Hier wird nur geladen und gespeichert. Die Seiten dazu stehen in
   12-social-views.js. Tabellen: siehe supabase/schema-v2.sql
   ===================================================================== */

// Alles, was zu den gemeinsamen Funktionen geladen ist
const SOC = {
  ready: false,          // Profil geladen?
  error: "",             // "schema" = Tabellen fehlen noch (schema-v2.sql nicht ausgeführt)
  me: null,              // eigenes Profil { id, username, display_name, avatar_path }
  people: {},            // Profile nach ID (Freunde, Gruppenmitglieder)
  friendships: [],       // { id, requester, addressee, status }
  spaces: [],            // Gruppen
  members: {},           // spaceId → [{ user_id, role }]
  items: {},             // spaceId → Einträge (Termine, Listen, Listeneinträge)
  messages: {},          // Gesprächs-Schlüssel ("s:<gruppe>" oder "u:<freund>") → Nachrichten
  channel: null
};
const db = () => sync.client;
const me = () => (sync.user ? sync.user.id : null);

/* ---------- Anmeldung (Zustand der Anmeldeseite) ---------- */
const AUTH = { ready: false, mode: "login", info: "" };       // mode: login | signup | reset | newpw | check
const LAST_ACTIVE_KEY = "allreminde-last-active";
const AUTO_LOGOUT_MIN = 20;

/* ---------- Profil ---------- */
const displayName = p => p ? (p.display_name || "@" + p.username) : "Unbekannt";
const avatarUrl = p => p && p.avatar_path ? db().storage.from("avatars").getPublicUrl(p.avatar_path).data.publicUrl : "";
function avatarHtml(p, size) {
  const s = size || 40, url = avatarUrl(p);
  if (url) return '<span class="avatar-img" style="width:' + s + "px;height:" + s + 'px"><img src="' + esc(url) + '" alt=""></span>';
  const name = displayName(p), ini = name.replace("@", "").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const colors = Object.values(COLORS), c = colors[Math.abs([...(p ? p.id : "x")].reduce((h, ch) => h * 31 + ch.charCodeAt(0) | 0, 7)) % colors.length];
  return '<span class="avatar-img" style="width:' + s + "px;height:" + s + "px;background:" + c + ";font-size:" + Math.round(s * .4) + 'px">' + esc(ini) + "</span>";
}
async function loadMyProfile() {
  const { data, error } = await db().from("profiles").select("*").eq("id", me()).maybeSingle();
  SOC.error = error ? (/profiles|relation|schema/i.test(error.message) ? "schema" : "net") : "";
  if (error) console.error(error);
  SOC.me = data || null; SOC.ready = true;
  if (data) SOC.people[data.id] = data;
}
async function saveMyProfile(username, displayNameText) {
  const row = { id: me(), username: username.toLowerCase(), display_name: displayNameText };
  const { data, error } = await db().from("profiles").upsert(row).select().single();
  if (error) return error.code === "23505" ? "Dieser Benutzername ist schon vergeben." : error.message.includes("check") ? "Benutzername: 3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich." : error.message;
  SOC.me = data; SOC.people[data.id] = data; return null;
}
async function uploadAvatar(file) {
  const img = await shrinkImage(file, 512, 300e3);
  const path = me() + "/avatar-" + Date.now() + ".jpg";
  const { error } = await db().storage.from("avatars").upload(path, img, { contentType: img.type || "image/jpeg" });
  if (error) { toast("Foto konnte nicht hochgeladen werden"); return; }
  const old = SOC.me.avatar_path;
  await db().from("profiles").update({ avatar_path: path }).eq("id", me());
  if (old) db().storage.from("avatars").remove([old]);
  SOC.me.avatar_path = path; toast("Profilfoto gespeichert"); render();
}

/* ---------- Alles laden ---------- */
async function loadSocial() {
  if (!me() || !SOC.me) return;
  const uid = me();
  const [fr, mem] = await Promise.all([
    db().from("friendships").select("*").or("requester.eq." + uid + ",addressee.eq." + uid),
    db().from("space_members").select("space_id").eq("user_id", uid)
  ]);
  SOC.friendships = fr.data || [];
  const spaceIds = (mem.data || []).map(m => m.space_id);
  let spaces = [], members = [], items = [];
  if (spaceIds.length) {
    const [sp, mm, it] = await Promise.all([
      db().from("spaces").select("*").in("id", spaceIds),
      db().from("space_members").select("*").in("space_id", spaceIds),
      db().from("space_items").select("*").in("space_id", spaceIds).order("sort").order("created_at")
    ]);
    spaces = sp.data || []; members = mm.data || []; items = it.data || [];
  }
  SOC.spaces = spaces.sort((a, b) => a.name.localeCompare(b.name, "de"));
  SOC.members = {}; members.forEach(m => (SOC.members[m.space_id] = SOC.members[m.space_id] || []).push(m));
  SOC.items = {}; items.forEach(i => (SOC.items[i.space_id] = SOC.items[i.space_id] || []).push(i));
  // Profile aller Personen, die vorkommen
  const ids = new Set();
  SOC.friendships.forEach(f => { ids.add(f.requester); ids.add(f.addressee); });
  members.forEach(m => ids.add(m.user_id));
  await loadProfiles([...ids]);
  await loadRecentMessages();
  if (typeof scheduleNotifications === "function") scheduleNotifications();
}
async function loadProfiles(ids) {
  const missing = ids.filter(id => id && !SOC.people[id]);
  if (!missing.length) return;
  const { data } = await db().from("profiles").select("*").in("id", missing);
  (data || []).forEach(p => SOC.people[p.id] = p);
}
// Die letzten Nachrichten aller Gespräche (für "ungelesen" und die Chat-Liste)
async function loadRecentMessages() {
  const uid = me(), spaceIds = SOC.spaces.map(s => s.id);
  const direct = await db().from("messages").select("*").is("space_id", null).or("from_user.eq." + uid + ",to_user.eq." + uid).order("created_at", { ascending: false }).limit(300);
  const group = spaceIds.length ? await db().from("messages").select("*").in("space_id", spaceIds).order("created_at", { ascending: false }).limit(300) : { data: [] };
  SOC.messages = {};
  [...(direct.data || []), ...(group.data || [])].reverse().forEach(addMessageToCache);
}
const convKey = m => m.space_id ? "s:" + m.space_id : "u:" + (m.from_user === me() ? m.to_user : m.from_user);
function addMessageToCache(m) {
  const k = convKey(m), list = (SOC.messages[k] = SOC.messages[k] || []);
  if (!list.some(x => x.id === m.id)) { list.push(m); list.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)); }
}

/* ---------- Live-Updates ---------- */
let socialReloadTimer = null;
function startSocialRealtime() {
  stopSocialRealtime();
  const reload = () => { clearTimeout(socialReloadTimer); socialReloadTimer = setTimeout(async () => { await loadSocial(); softRender(); }, 500); };
  SOC.channel = db().channel("social-" + me())
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "space_members" }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "spaces" }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "space_items" }, reload)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, ev => onNewMessage(ev.new))
    .subscribe();
}
function stopSocialRealtime() { if (SOC.channel) { db().removeChannel(SOC.channel); SOC.channel = null; } }
async function onNewMessage(m) {
  await loadProfiles([m.from_user]);
  addMessageToCache(m);
  const box = $("#chat-msgs"), k = convKey(m), viewing = box && box.dataset.k === k && !document.hidden;
  if (viewing) { markRead(k); renderChatMessages(k); return; }
  if (m.from_user !== me()) {
    const title = displayName(SOC.people[m.from_user]) + (m.space_id ? " in " + ((SOC.spaces.find(s => s.id === m.space_id) || {}).name || "Gruppe") : "");
    toast(title + ": " + m.body.slice(0, 60));
    if (document.hidden && device().notify) showBrowserNotification({ title, body: m.body.slice(0, 120), key: "msg" + m.id, mode: "push", taskId: null });
  }
  softRender();
}
// Neu zeichnen, ohne beim Tippen zu stören
function softRender() {
  const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value;
  if ($("#sheet") || typing || document.body.classList.contains("auth-mode")) { if (!document.body.classList.contains("auth-mode")) renderNav(NAV_ACTIVE); return; }
  const y = window.scrollY; render(); window.scrollTo(0, y);
}

/* ---------- Ungelesen ---------- */
const READ_KEY = () => "allreminde-read-" + me();
const readMap = () => { try { return JSON.parse(localStorage.getItem(READ_KEY()) || "{}"); } catch (e) { return {}; } };
function markRead(k) {   // Zeit der neuesten Nachricht merken (Uhren von Server und Gerät können abweichen)
  const m = readMap(), list = SOC.messages[k] || [], last = list.length ? list[list.length - 1].created_at : ""; m[k] = last > new Date().toISOString() ? last : new Date().toISOString(); try { localStorage.setItem(READ_KEY(), JSON.stringify(m)); } catch (e) {} }
function unreadCount(k) { const since = readMap()[k] || ""; return (SOC.messages[k] || []).filter(m => m.from_user !== me() && m.created_at > since).length; }
const totalUnread = () => Object.keys(SOC.messages).reduce((s, k) => s + unreadCount(k), 0);
const chatRoute = k => k.startsWith("s:") ? "gruppe-" + k.slice(2) : "chat-" + k.slice(2);
const socialBadge = () => SOC.me ? totalUnread() + incomingRequests().length : 0;

/* ---------- Freunde ---------- */
const friendIds = () => SOC.friendships.filter(f => f.status === "accepted").map(f => f.requester === me() ? f.addressee : f.requester);
const incomingRequests = () => SOC.friendships.filter(f => f.status === "pending" && f.addressee === me());
const outgoingRequests = () => SOC.friendships.filter(f => f.status === "pending" && f.requester === me());
async function searchUsers(q) {
  q = q.trim().replace(/^@/, "").toLowerCase(); if (q.length < 2) return [];
  const { data } = await db().from("profiles").select("*").ilike("username", q.replace(/[%_]/g, "") + "%").neq("id", me()).limit(10);
  (data || []).forEach(p => SOC.people[p.id] = p);
  return data || [];
}
async function sendFriendRequest(uid) {
  const { error } = await db().from("friendships").insert({ requester: me(), addressee: uid });
  if (error) { toast(error.code === "23505" ? "Ihr seid schon befreundet oder es gibt bereits eine Anfrage" : "Anfrage fehlgeschlagen"); return; }
  toast("Anfrage gesendet"); await loadSocial(); render();
}
async function acceptFriend(id) { await db().from("friendships").update({ status: "accepted" }).eq("id", id); toast("Ihr seid jetzt befreundet"); await loadSocial(); render(); }
async function removeFriendship(id) { await db().from("friendships").delete().eq("id", id); await loadSocial(); render(); }

/* ---------- Gruppen ---------- */
async function createSpace(name, icon, color, memberIds) {
  const { data: space, error } = await db().from("spaces").insert({ name, icon, color, created_by: me() }).select().single();
  if (error) { toast("Gruppe konnte nicht angelegt werden"); return null; }
  await db().from("space_members").insert({ space_id: space.id, user_id: me(), role: "owner" });
  if (memberIds.length) await db().from("space_members").insert(memberIds.map(u => ({ space_id: space.id, user_id: u, role: "member" })));
  await loadSocial(); return space;
}
async function updateSpace(id, patch) { await db().from("spaces").update(patch).eq("id", id); await loadSocial(); }
async function addMembers(spaceId, ids) { if (ids.length) await db().from("space_members").insert(ids.map(u => ({ space_id: spaceId, user_id: u, role: "member" }))); await loadSocial(); }
async function removeMember(spaceId, uid) { await db().from("space_members").delete().eq("space_id", spaceId).eq("user_id", uid); await loadSocial(); }
async function deleteSpace(id) { await db().from("spaces").delete().eq("id", id); await loadSocial(); }
const isOwner = spaceId => (SOC.members[spaceId] || []).some(m => m.user_id === me() && m.role === "owner");
const spaceMembers = spaceId => (SOC.members[spaceId] || []).map(m => Object.assign({ role: m.role }, SOC.people[m.user_id] || { id: m.user_id, username: "?" }));

/* ---------- Gemeinsame Einträge ---------- */
async function saveItem(row) {
  row.updated_at = new Date().toISOString();
  if (row.id) Object.values(SOC.items).forEach(list => { const x = list.find(i => i.id === row.id); if (x) Object.assign(x, row); });   // sofort anzeigen
  const q = row.id ? db().from("space_items").update(row).eq("id", row.id) : db().from("space_items").insert(row);
  const { error } = await q;
  if (error) { console.error(error); toast("Speichern fehlgeschlagen"); return false; }
  await loadSocial(); return true;
}
async function deleteItem(id) {
  Object.keys(SOC.items).forEach(k => SOC.items[k] = SOC.items[k].filter(i => i.id !== id && i.parent_id !== id));
  await db().from("space_items").delete().eq("id", id); await loadSocial();
}
const childrenOf = (spaceId, parentId) => (SOC.items[spaceId] || []).filter(i => i.parent_id === parentId);

// Gemeinsame Termine für mich (für Startseite und Erinnerungen)
function mySharedTasks() {
  const out = [];
  SOC.spaces.forEach(s => (SOC.items[s.id] || []).forEach(i => {
    if (i.kind !== "task" || i.done || !i.date) return;
    if (i.remind === "none" || (i.remind === "assigned" && i.assigned_to && i.assigned_to !== me())) return;
    out.push({ i, s, due: parse(i.date), days: diffDays(today(), parse(i.date)) });
  }));
  return out.sort((a, b) => a.days - b.days);
}

/* ---------- Chat ---------- */
async function sendMessage(k, body) {
  body = body.trim(); if (!body) return;
  const row = k.startsWith("s:") ? { space_id: k.slice(2), body } : { to_user: k.slice(2), body };
  const { data, error } = await db().from("messages").insert(row).select().single();
  if (error) { toast("Nachricht konnte nicht gesendet werden"); return; }
  addMessageToCache(data); markRead(k); renderChatMessages(k);
}
async function loadConversation(k) {
  const q = k.startsWith("s:") ? db().from("messages").select("*").eq("space_id", k.slice(2))
    : db().from("messages").select("*").is("space_id", null).or("and(from_user.eq." + me() + ",to_user.eq." + k.slice(2) + "),and(from_user.eq." + k.slice(2) + ",to_user.eq." + me() + ")");
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  (data || []).forEach(addMessageToCache);
  await loadProfiles((data || []).map(m => m.from_user));
  renderChatMessages(k);
}

/* ---------- Automatisch abmelden am PC (20 Min ohne Aktivität) ---------- */
function touchActivity() { try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch (e) {} }
const inactiveTooLong = () => { const t = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0); return t && Date.now() - t > AUTO_LOGOUT_MIN * 60e3; };
function startAutoLogout() {
  if (NATIVE) return;                                     // Handy-App bleibt angemeldet (sonst keine Wecker)
  let last = 0;
  ["click", "keydown", "touchstart", "scroll"].forEach(ev => document.addEventListener(ev, () => { if (Date.now() - last > 10e3) { last = Date.now(); touchActivity(); } }, { passive: true }));
  setInterval(() => { if (sync.user && inactiveTooLong()) autoLogout(); }, 30e3);
}
async function autoLogout() { AUTH.info = "Du wurdest nach " + AUTO_LOGOUT_MIN + " Minuten ohne Aktivität abgemeldet."; await signOut(); }

/* ---------- An- und Abmelden ---------- */
// Wird von connectCloud() aufgerufen, sobald jemand angemeldet ist
async function onSignedIn() {
  touchActivity();
  try {
    await withTimeout(loadMyProfile(), 15000, "Profil laden");
    if (SOC.me) { await withTimeout(loadSocial(), 20000, "Freunde und Gruppen laden"); startSocialRealtime(); }
  } catch (e) { console.error(e); noteError(e); if (!SOC.me) SOC.error = "net"; }
  SOC.ready = true;
  render();
}
function onSignedOut() {
  stopSocialRealtime();
  Object.assign(SOC, { ready: false, error: "", me: null, people: {}, friendships: [], spaces: [], members: {}, items: {}, messages: {} });
  const LN = Plugin("LocalNotifications");
  if (LN) LN.getPending().then(p => p.notifications.length && LN.cancel({ notifications: p.notifications.map(x => ({ id: x.id })) }));
  S = emptyState();                                       // Daten des vorherigen Nutzers nicht mehr anzeigen
  if (!["reset", "check"].includes(AUTH.mode)) AUTH.mode = "login";
  render();
}
async function requestPasswordReset(email) {
  const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo: (APP_URL || location.href.split(/[?#]/)[0]) + "?reset=1" });
  return error;
}
async function setNewPassword(pw) { const { error } = await db().auth.updateUser({ password: pw }); return error; }
