/* sw.js – macht die Web-Version offline-fähig und öffnet Aufgaben beim Klick auf eine Benachrichtigung */
const CACHE = "allreminde-v5";
const FILES = ["./", "index.html", "css/style.css", "fonts/symbols.woff", "manifest.webmanifest", "icons/icon-192.png",
  "vendor/supabase.js", "vendor/qrcode.js", "js/00-env.js", "js/00-icons.js", "js/01-config.js", "js/02-helpers.js", "js/03-store.js",
  "js/04-logic.js", "js/05-ui.js", "js/06-views.js", "js/07-forms.js", "js/08-extras.js", "js/09-main.js", "js/10-notify.js", "js/11-social.js", "js/12-social-views.js", "js/99-start.js"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
// Erst aus dem Netz (damit Updates sofort da sind), ohne Netz aus dem Zwischenspeicher
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const taskId = e.notification.data && e.notification.data.taskId;
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => {
    const c = list[0];
    if (c) { c.focus(); if (taskId) c.postMessage({ taskId }); return; }
    return self.clients.openWindow("./#aufgaben");
  }));
});
