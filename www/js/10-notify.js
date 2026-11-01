/* =====================================================================
   10-notify.js – Benachrichtigungen & Wecker

   Am Handy (Android-App): Erinnerungen werden direkt auf dem Gerät
   geplant und kommen auch, wenn die App geschlossen ist.
   Im Browser (PC): solange Allreminde geöffnet ist (auch minimiert),
   prüft die App jede halbe Minute und zeigt Windows-Benachrichtigungen.
   ===================================================================== */

const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const Plugin = name => NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null;
const DEVICE_KEY = "allreminde-device";   // Einstellungen nur für dieses Gerät

// Geräte-Einstellungen (nicht synchronisiert): Benachrichtigungen an/aus, Claude-Schlüssel
function device() { try { return Object.assign({ notify: false, apiKey: "", lastCheck: 0, fired: [] }, JSON.parse(localStorage.getItem(DEVICE_KEY) || "{}")); } catch (e) { return { notify: false, apiKey: "", lastCheck: 0, fired: [] }; } }
function saveDevice(patch) { const d = Object.assign(device(), patch); try { localStorage.setItem(DEVICE_KEY, JSON.stringify(d)); } catch (e) {} return d; }

/* ---------- Welche Benachrichtigungen stehen an? ---------- */
// Art der Benachrichtigung einer Aufgabe: push | alarm | none
function notifyModeOf(t) {
  if (t.notify) return t.notify;
  const k = parentOf(t).k;
  return (k && k.notify) || S.settings.notify.mode || "push";
}
// Datum + "HH:MM" → Zeitpunkt
const atTime = (date, hhmm) => { const [h, m] = String(hhmm || "08:00").split(":").map(Number); const d = new Date(date); d.setHours(h || 0, m || 0, 0, 0); return d; };
// Liegt ein Zeitpunkt in der Ruhezeit? Dann auf das Ende der Ruhezeit verschieben.
function outsideQuiet(d) {
  const n = S.settings.notify; if (!n.quietOn) return d;
  const mins = d.getHours() * 60 + d.getMinutes(), toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const from = toMin(n.quietFrom), to = toMin(n.quietTo);
  const inQuiet = from > to ? (mins >= from || mins < to) : (mins >= from && mins < to);
  if (!inQuiet) return d;
  let end = atTime(d, n.quietTo); if (end <= d) end = addDays(end, 1);
  return end;
}
// Alle Benachrichtigungen zwischen from und to: [{ at, taskId, title, body, mode, key }]
function upcomingNotifications(from, to) {
  const n = S.settings.notify, out = [];
  activeTasks().forEach(({ t, c }) => {
    const mode = notifyModeOf(t); if (mode === "none" || !c.due) return;
    const body = parentName(t) + (c.extra ? " · " + c.extra : "");
    const push = (at, text, m, key) => { const when = m === "alarm" ? at : outsideQuiet(at); if (when >= from && when <= to) out.push({ at: when, taskId: t.id, title: text, body, mode: m, key: t.id + ":" + key }); };
    // Verschoben mit Uhrzeit → genau dann erinnern
    if (t.snooze && t.snooze.length > 10) { push(parseDateTime(t.snooze), t.title, mode, "snz" + t.snooze); return; }
    const time = t.time || n.defaultTime;
    c.rem.forEach(days => {
      const at = atTime(addDays(c.due, -days), days === 0 ? time : n.defaultTime);
      const label = days === 0 ? t.title + (t.time ? " um " + t.time : " ist heute fällig") : t.title + " – " + relDays(days);
      push(at, label, days === 0 ? mode : "push", "r" + days + ymd(c.due));
    });
    // Nachhaken bei Überfälligem
    if (c.st === "over" && Number(n.nagHours) > 0) {
      let at = new Date(from); at.setMinutes(0, 0, 0); at = new Date(at.getTime() + 3600e3);
      for (let i = 0; i < 6; i++, at = new Date(at.getTime() + Number(n.nagHours) * 3600e3)) push(at, "Überfällig: " + t.title, "push", "nag" + at.getTime());
    }
  });
  // Gemeinsame Termine aus Gruppen (siehe 11-social.js)
  if (typeof mySharedTasks === "function") mySharedTasks().forEach(({ i, s, due }) => {
    (i.reminders || [1, 0]).forEach(days => {
      let at = atTime(addDays(due, -days), days === 0 && i.time ? i.time : n.defaultTime);
      at = outsideQuiet(at);
      if (at < from || at > to) return;
      const title = days === 0 ? i.title + (i.time ? " um " + i.time : " ist heute") : i.title + " – " + relDays(days);
      out.push({ at, taskId: null, title, body: s.name, mode: "push", key: "sp:" + i.id + ":" + days + i.date + (i.time || "") });
    });
  });
  // Tägliche Zusammenfassung
  if (n.summaryOn) for (let i = 0; i < 7; i++) {
    const day = addDays(today(), i), at = atTime(day, n.summaryTime);
    if (at < from || at > to) continue;
    const count = activeTasks().filter(x => x.c.due && x.c.due <= day).length;
    if (count) out.push({ at, taskId: null, title: "Heute in Allreminde", body: count + (count === 1 ? " Sache ist fällig" : " Sachen sind fällig"), mode: "push", key: "sum" + ymd(day) });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* ---------- Android: auf dem Gerät planen ---------- */
const numericId = key => { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000; };
let scheduleTimer = null;
function scheduleNotifications() { clearTimeout(scheduleTimer); scheduleTimer = setTimeout(doSchedule, 1500); }
async function doSchedule() {
  const LN = Plugin("LocalNotifications"); if (!LN || !device().notify) return;
  try {
    const pending = await LN.getPending();
    if (pending.notifications.length) await LN.cancel({ notifications: pending.notifications.map(p => ({ id: p.id })) });
    const list = upcomingNotifications(new Date(Date.now() + 30e3), addDays(new Date(), 30)).slice(0, 60);
    if (!list.length) return;
    await LN.schedule({ notifications: list.map(x => ({
      id: numericId(x.key), title: x.title, body: x.body, channelId: x.mode === "alarm" && S.settings.notify.alarmSound ? "wecker" : "erinnerung",
      schedule: { at: x.at, allowWhileIdle: true }, actionTypeId: x.taskId ? "TASK" : undefined, extra: { taskId: x.taskId },
      autoCancel: true, smallIcon: "ic_stat_notify"
    })) });
  } catch (e) { console.error("Planen fehlgeschlagen", e); }
}
async function setupNative() {
  const LN = Plugin("LocalNotifications"); if (!LN) return;
  try {
    await LN.createChannel({ id: "erinnerung", name: "Erinnerungen", description: "Fällige Aufgaben und Vorab-Erinnerungen", importance: 4, vibration: true });
    await LN.createChannel({ id: "wecker", name: "Wecker", description: "Alarm mit Ton für wichtige Termine", importance: 5, sound: "wecker.wav", vibration: true, visibility: 1 });
    await LN.registerActionTypes({ types: [{ id: "TASK", actions: [{ id: "done", title: "Erledigt" }, { id: "snooze10", title: "10 Min" }, { id: "snooze60", title: "1 Std" }] }] });
    LN.addListener("localNotificationActionPerformed", ev => handleNotificationAction(ev.actionId, ev.notification.extra && ev.notification.extra.taskId));
  } catch (e) { console.error(e); }
  const App = Plugin("App");
  if (App) App.addListener("appStateChange", st => { if (st.isActive) { if (typeof refreshFromCloud === "function") refreshFromCloud(); render(); scheduleNotifications(); } });
}
// Knöpfe in der Benachrichtigung: Erledigt / Schlummern
function handleNotificationAction(action, taskId) {
  const t = taskId && task(taskId); if (!t) return;
  if (action === "done") { const msg = markDone(t); commit(msg); return; }
  if (action === "snooze10" || action === "snooze60") { t.snooze = localDateTime(new Date(Date.now() + (action === "snooze10" ? 10 : 60) * 60e3)); commit("Erinnere dich wieder um " + t.snooze.slice(11)); return; }
  go("aufgaben"); setTimeout(() => taskMenu(taskId), 50);       // Antippen → Aufgabe öffnen
}

/* ---------- Browser (PC): prüfen, solange die App offen ist ---------- */
function checkBrowserNotifications() {
  const dev = device(); if (NATIVE || !dev.notify) return;
  const now = Date.now(), from = new Date(Math.max(dev.lastCheck || now - 60e3, now - 6 * 3600e3));
  const due = upcomingNotifications(from, new Date(now)).filter(x => !dev.fired.includes(x.key));
  due.forEach(x => {
    showBrowserNotification(x);
    if (x.mode === "alarm" && S.settings.notify.alarmSound) showAlarm(x);
  });
  saveDevice({ lastCheck: now, fired: dev.fired.concat(due.map(x => x.key)).slice(-300) });
}
async function showBrowserNotification(x) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: x.body, tag: x.key, icon: "icons/icon-192.png", requireInteraction: x.mode === "alarm", data: { taskId: x.taskId } };
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification(x.title, opts);
    else { const n = new Notification(x.title, opts); n.onclick = () => { window.focus(); if (x.taskId) taskMenu(x.taskId); }; }
  } catch (e) { try { new Notification(x.title, opts); } catch (_) {} }
}
// Wecker-Fenster mit Ton (wenn die App geöffnet ist)
// Browser (z. B. Firefox) erlauben Ton erst nach einem Klick in die Seite. Daher wird der Ton beim ersten Klick "freigeschaltet".
let alarmAudio = null, audioCtx = null;
function unlockAudio() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === "suspended") audioCtx.resume(); } catch (e) {}
}
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
function showAlarm(x) {
  $("#alarm-root").innerHTML = '<div class="alarm" role="alertdialog" aria-label="Wecker">' + icon("alarm") + "<b>" + esc(x.title) + "</b><span>" + esc(x.body) + '</span><div class="row center">' +
    btn("alarm-snooze", "10 Min später", "snooze", "", ' data-id="' + (x.taskId || "") + '"') + btn("alarm-done", "Erledigt", "check", "primary", ' data-id="' + (x.taskId || "") + '"') + btn("alarm-stop", "Aus", "close") + "</div></div>";
  try {
    const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx = ctx;
    if (ctx.state === "suspended") ctx.resume();
    alarmAudio = [];
    for (let i = 0; i < 60; i++) {                       // 60 Pieptöne (ca. 36 Sekunden)
      const t0 = ctx.currentTime + i * .6, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(.25, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .4);
      o.start(t0); o.stop(t0 + .4); alarmAudio.push(o);
    }
  } catch (e) {}
}
function stopAlarm() { $("#alarm-root").innerHTML = ""; (alarmAudio || []).forEach(o => { try { o.stop(); } catch (e) {} }); alarmAudio = null; }

/* ---------- Einschalten, Testen ---------- */
async function enableNotifications() {
  if (NATIVE) {
    const LN = Plugin("LocalNotifications");
    const p = await LN.requestPermissions();
    if (p.display !== "granted") { toast("Benachrichtigungen wurden nicht erlaubt. Bitte in den Android-Einstellungen erlauben."); return false; }
  } else {
    if (!("Notification" in window)) { toast("Dieser Browser unterstützt keine Benachrichtigungen"); return false; }
    const p = await Notification.requestPermission();
    if (p !== "granted") { toast("Benachrichtigungen wurden im Browser blockiert. Erlaube sie über das Schloss-Symbol in der Adresszeile."); return false; }
  }
  saveDevice({ notify: true, lastCheck: Date.now() }); scheduleNotifications(); return true;
}
async function testNotification(mode) {
  const x = { at: new Date(), taskId: null, title: mode === "alarm" ? "Test-Wecker" : "Test-Erinnerung", body: "So sehen deine Erinnerungen aus.", mode, key: "test" + Date.now() };
  if (NATIVE) {
    const LN = Plugin("LocalNotifications");
    await LN.schedule({ notifications: [{ id: numericId(x.key), title: x.title, body: x.body, channelId: mode === "alarm" ? "wecker" : "erinnerung", schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, smallIcon: "ic_stat_notify" }] });
    toast("Kommt in 5 Sekunden – du kannst die App schließen");
  } else { showBrowserNotification(x); if (mode === "alarm") showAlarm(x); }
}
async function exactAlarmStatus() {
  const LN = Plugin("LocalNotifications"); if (!LN || !LN.checkExactNotificationSetting) return null;
  try { return (await LN.checkExactNotificationSetting()).exact_alarm; } catch (e) { return null; }
}
async function openExactAlarmSetting() { const LN = Plugin("LocalNotifications"); if (LN && LN.changeExactNotificationSetting) await LN.changeExactNotificationSetting(); }

function startNotifications() {
  if (NATIVE) { setupNative().then(scheduleNotifications); return; }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", ev => { if (ev.data && ev.data.taskId) taskMenu(ev.data.taskId); });
  }
  setInterval(checkBrowserNotifications, 30e3);
  setTimeout(checkBrowserNotifications, 3000);
}
