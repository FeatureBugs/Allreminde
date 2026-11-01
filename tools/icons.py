"""
icons.py – erstellt die Symbol-Schrift für Allreminde.

Sucht in www/js/*.js und www/index.html nach Symbol-Namen (z. B. "directions_car"),
schneidet aus der großen Material-Symbols-Schrift nur diese Symbole heraus
und schreibt:
  www/fonts/symbols.woff   – kleine Schriftdatei (nur benutzte Symbole)
  www/js/00-icons.js       – Liste Name → Zeichen

Aufruf (einmalig: pip install fonttools):
  python3 tools/icons.py PFAD/zu/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf
Die Schrift gibt es unter github.com/google/material-design-icons (Ordner variablefont).
"""
import re, sys, json
from pathlib import Path
from fontTools import subset

root = Path(__file__).resolve().parent.parent
codepoints = {}
for line in (root / "tools" / "icons.codepoints").read_text().splitlines():
    name, cp = line.split()
    codepoints[name] = cp

source = (root / "www" / "index.html").read_text(encoding="utf-8")
for js in (root / "www" / "js").glob("*.js"):
    if js.name != "00-icons.js":
        source += js.read_text(encoding="utf-8")
used = sorted({w for w in re.findall(r"[a-z][a-z0-9_]+", source) if w in codepoints})

(root / "www" / "js" / "00-icons.js").write_text(
    "/* 00-icons.js – automatisch erzeugt von tools/icons.py. Nicht von Hand ändern. */\n"
    "const ICON_CP = " + json.dumps({n: codepoints[n] for n in used}, separators=(",", ":")) + ";\n",
    encoding="utf-8")

font = sys.argv[1] if len(sys.argv) > 1 else str(root / "tools" / "MaterialSymbolsRounded.ttf")
out = root / "www" / "fonts" / "symbols.woff"
out.parent.mkdir(exist_ok=True)
subset.main([font, "--unicodes=" + ",".join("U+" + codepoints[n] for n in used),
             "--layout-features=", "--flavor=woff", "--no-hinting",
             "--output-file=" + str(out)])
print(f"{len(used)} Symbole, Schrift: {out.stat().st_size // 1024} KB")
