#!/usr/bin/env bash
# Lädt die zwei fremden Bibliotheken in www/vendor (werden nicht im Projekt gespeichert)
set -e
mkdir -p www/vendor
curl -fsSL https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js -o www/vendor/supabase.js
curl -fsSL https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js -o www/vendor/qrcode.js
echo "Bibliotheken geladen"
