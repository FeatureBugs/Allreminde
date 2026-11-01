/* =====================================================================
   02-helpers.js – Kleine Hilfsfunktionen (Datum, Text, Zahlen)
   ===================================================================== */

// Ein Element finden / mehrere Elemente finden
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

// Text sicher ins HTML einsetzen (verhindert kaputtes HTML)
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Zufällige, eindeutige ID
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

/* ---------- Datum ---------- */
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());   // Date → "2026-11-01"
const parse = s => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null; };   // nur das Datum
// "2026-11-01T14:30" → Zeitpunkt (ohne Uhrzeit: 00:00)
const parseDateTime = s => { const d = parse(s); if (!d) return null; const t = String(s).slice(11, 16); if (t) { const [h, mi] = t.split(":").map(Number); d.setHours(h || 0, mi || 0); } return d; };
const localDateTime = d => ymd(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());   // Zeitpunkt → "2026-11-01T14:30"
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayStr = () => ymd(today());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDays = (a, b) => Math.round((b - a) / 864e5);          // Tage von a bis b
const daysFromToday = n => ymd(addDays(today(), n));
const lastDayOfMonth = (y, m) => new Date(y, m + 1, 0).getDate();

// Datum + n Einheiten (d = Tage, w = Wochen, m = Monate, y = Jahre)
function addUnit(date, n, unit) {
  const x = new Date(date); n = Number(n) || 0;
  if (unit === "d") x.setDate(x.getDate() + n);
  else if (unit === "w") x.setDate(x.getDate() + 7 * n);
  else if (unit === "m" || unit === "y") {
    const day = x.getDate(); x.setDate(1);
    x.setMonth(x.getMonth() + (unit === "y" ? 12 * n : n));
    x.setDate(Math.min(day, lastDayOfMonth(x.getFullYear(), x.getMonth())));
  }
  return x;
}

// Datum formatieren, z. B. fmtD(d) → "1. Nov. 2026"
const fmtD = (d, opts) => d ? d.toLocaleDateString("de-DE", opts || { day: "numeric", month: "short", year: "numeric" }) : "–";
const fmtShort = d => fmtD(d, { weekday: "short", day: "numeric", month: "short" });
const fmtLong = d => fmtD(d, { weekday: "long", day: "numeric", month: "long" });

// "heute", "morgen", "in 5 Tagen", "seit 3 Tagen" …
function relDays(n) {
  if (n === 0) return "heute"; if (n === 1) return "morgen"; if (n === -1) return "seit gestern";
  if (n < 0) return "seit " + (-n) + " Tagen";
  if (n < 14) return "in " + n + " Tagen";
  if (n < 60) return "in " + Math.round(n / 7) + " Wochen";
  if (n < 730) return "in " + Math.round(n / 30.4) + " Monaten";
  return "in " + Math.round(n / 365) + " Jahren";
}
// Erinnerung in Worten: 0 → "am Tag", 7 → "1 Woche vorher"
function reminderLabel(n) {
  n = Number(n);
  if (n === 0) return "am Tag";
  if (n === 1) return "1 Tag vorher";
  if (n % 365 === 0) return (n / 365) + (n === 365 ? " Jahr" : " Jahre") + " vorher";
  if (n % 30 === 0) return (n / 30) + (n === 30 ? " Monat" : " Monate") + " vorher";
  if (n % 7 === 0) return (n / 7) + (n === 7 ? " Woche" : " Wochen") + " vorher";
  return n + " Tage vorher";
}
const plural = (n, unit) => n + " " + UNITS[unit][Number(n) === 1 ? 0 : 1];

/* ---------- Zahlen & Geld ---------- */
const num = v => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : n; };
const fmtN = n => Number(n).toLocaleString("de-DE", { maximumFractionDigits: 1 });
const fmtE = n => Number(n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/* ---------- Links ---------- */
const normUrl = u => !u ? "" : /^https?:\/\//i.test(u) ? u : "https://" + u;
const hostOf = u => { try { return new URL(normUrl(u)).hostname.replace(/^www\./, ""); } catch (e) { return u; } };

/* ---------- Sonstiges ---------- */
const by = key => (a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);   // zum Sortieren
const clone = x => JSON.parse(JSON.stringify(x));
const linesOf = text => String(text || "").split("\n").map(s => s.trim()).filter(Boolean);

// CSV-Text aus Zeilen bauen (Semikolon, damit Excel in Deutschland es direkt versteht)
function toCsv(rows) {
  return "﻿" + rows.map(r => r.map(v => { const s = String(v == null ? "" : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(";")).join("\r\n");
}
