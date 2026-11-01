/* =====================================================================
   01-config.js – Einstellungen & Vorlagen
   Hier stehen nur Daten (keine Logik). Wenn du neue Symbole, Bereichs-
   arten, Vorlagen oder Dokumentarten willst, ergänze sie hier.
   ===================================================================== */


// Farben für Bereiche (Name → Farbwert)
const COLORS = {
  blau: "#3B7DD8", gruen: "#3E9B4F", gelb: "#D18A1A", rosa: "#D2557A", lila: "#7B61D1",
  petrol: "#1F9A94", orange: "#E0662E", grau: "#64748B", rot: "#D14343", braun: "#9A6B45"
};

// Akzentfarben der Oberfläche: [hell, dunkel]
const ACCENTS = {
  petrol: ["#0B6E78", "#4CC0C8"], blau: ["#2563C9", "#7FB0F5"], lila: ["#6A4FC9", "#B5A3F5"],
  gruen: ["#2F7D3F", "#7FD08E"], orange: ["#C2541B", "#F2A06E"], rosa: ["#B83A63", "#F08FB0"]
};

// Symbole (Material Symbols), sortiert nach Gruppen: [name, Suchwörter]
const ICON_GROUPS = [
  ["Fahrzeuge", [["directions_car","auto pkw"],["electric_car","elektroauto"],["two_wheeler","motorrad"],["electric_moped","roller"],["pedal_bike","fahrrad"],["electric_bike","ebike"],["electric_scooter","escooter"],["local_shipping","lkw transporter"],["directions_bus","bus"],["agriculture","traktor"],["rv_hookup","wohnwagen anhänger"],["directions_boat","boot"],["local_gas_station","tanken"],["ev_station","laden"],["oil_barrel","öl"],["tire_repair","reifen"],["car_repair","werkstatt"],["local_car_wash","waschanlage"],["minor_crash","unfall"]]],
  ["Geräte & Technik", [["local_laundry_service","waschmaschine"],["dishwasher_gen","spülmaschine"],["kitchen","kühlschrank"],["microwave","mikrowelle"],["oven_gen","backofen"],["cooking","herd kochfeld"],["coffee_maker","kaffeemaschine"],["blender","mixer"],["kettle","wasserkocher"],["iron","bügeleisen"],["vacuum","staubsauger"],["air_purifier_gen","luftreiniger"],["water_heater","boiler"],["hvac","klimaanlage"],["heat_pump","wärmepumpe"],["thermostat","heizung"],["mode_fan","ventilator"],["filter_alt","filter"],["water_full","trinkwasser"],["detector_smoke","rauchmelder"],["tv","fernseher"],["router","router wlan"],["print","drucker"],["laptop","laptop"],["desktop_windows","pc computer"],["tablet","tablet"],["smartphone","handy"],["watch","uhr smartwatch"],["headphones","kopfhörer"],["speaker","lautsprecher"],["sports_esports","konsole"],["photo_camera","kamera"],["videocam","überwachungskamera"],["keyboard","tastatur"],["hard_drive","festplatte"],["cable","kabel"],["power","steckdose strom"],["battery_charging_full","akku"],["light","lampe"],["lightbulb","glühbirne"],["solar_power","solar"],["electric_meter","stromzähler"],["gas_meter","gaszähler"],["water_drop","wasser"],["scale","waage"]]],
  ["Haus & Garten", [["home","haus wohnung"],["garage","garage"],["door_front","tür"],["window","fenster"],["bathtub","bad"],["shower","dusche"],["bed","bett"],["chair","möbel"],["roofing","dach"],["fence","zaun"],["plumbing","sanitär"],["hardware","werkzeug"],["build","reparatur"],["construction","wartung"],["handyman","handwerk"],["format_paint","streichen"],["cleaning_services","putzen"],["delete","müll"],["recycling","recycling"],["local_fire_department","feuerlöscher"],["key","schlüssel"],["potted_plant","zimmerpflanze"],["local_florist","blume"],["yard","garten"],["grass","rasen"],["park","baum"],["forest","hecke"],["compost","kompost dünger"],["pool","pool"]]],
  ["Tiere", [["pets","hund katze haustier"],["flutter_dash","vogel"],["set_meal","fisch aquarium"],["cruelty_free","kaninchen hase"],["egg","hühner"],["bug_report","insekt"]]],
  ["Gesundheit", [["stethoscope","arzt"],["medical_services","medizin"],["vaccines","impfung"],["dentistry","zahnarzt"],["visibility","augen"],["medication","medikament"],["monitor_heart","herz"],["fitness_center","sport"],["self_improvement","yoga"],["spa","wellness"],["content_cut","friseur"]]],
  ["Menschen", [["cake","geburtstag"],["celebration","feier"],["redeem","geschenk"],["favorite","liebe"],["group","freunde"],["person","person"],["family_restroom","familie"],["child_care","kind"]]],
  ["Schule & Arbeit", [["school","schule"],["edit_note","klausur"],["quiz","test"],["assignment","hausaufgabe"],["history_edu","aufsatz"],["science","chemie"],["calculate","mathe"],["translate","sprache"],["menu_book","buch"],["backpack","ranzen"],["work","arbeit"],["business_center","büro"]]],
  ["Geld & Papiere", [["badge","ausweis"],["id_card","führerschein"],["description","dokument"],["contract","vertrag"],["gavel","amt recht"],["receipt_long","beleg rechnung"],["payments","geld"],["savings","sparen"],["account_balance","bank"],["credit_card","karte"],["subscriptions","abo"],["shield","versicherung"],["lock","passwort"],["wifi","internet"]]],
  ["Sonstiges", [["flight","reise"],["luggage","koffer"],["beach_access","urlaub"],["camping","camping"],["restaurant","essen"],["shopping_cart","einkaufen"],["inventory_2","kiste vorrat"],["music_note","musik"],["star","stern"],["calendar_month","kalender"],["event","termin"],["schedule","uhr"],["task_alt","aufgabe"],["ac_unit","winter"],["wb_sunny","sommer"],["label","sonstiges"]]]
];

// Feldtypen für eigene Felder in Bereichen
const FIELD_TYPES = { text: "Text", zahl: "Zahl", datum: "Datum", notiz: "Notiz", link: "Link" };

// Arten von Wiederholungen bei Aufgaben
const TASK_KINDS = {
  einmalig:   { label: "Einmalig",        hint: "Ein festes Datum, z. B. Klausur, Arzttermin oder Frist" },
  intervall:  { label: "Regelmäßig",      hint: "Wiederholt sich nach dem Erledigen, z. B. alle 3 Monate" },
  wochentage: { label: "Wochentage",      hint: "An festen Wochentagen, z. B. jeden Montag und Donnerstag" },
  monatlich:  { label: "Monatlich am …",  hint: "Jeden Monat am gleichen Tag, z. B. am 1. oder am Monatsletzten" },
  jaehrlich:  { label: "Jährlich",        hint: "Jedes Jahr am gleichen Datum, z. B. Geburtstag" },
  zaehler:    { label: "Nach Zählerstand",hint: "Nach Kilometern, Stunden o. Ä., optional zusätzlich nach Zeit" }
};
const UNITS = { d: ["Tag", "Tage"], w: ["Woche", "Wochen"], m: ["Monat", "Monate"], y: ["Jahr", "Jahre"] };
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WINTER = [11, 12, 1, 2];        // Monate, die als Winter zählen

// Wählbare Erinnerungen (Tage vorher)
const REMINDER_CHOICES = [0, 1, 2, 3, 7, 14, 30, 60, 90, 180, 365];
const PRIOS = [["0", "Normal"], ["1", "Wichtig"], ["2", "Kritisch"]];
// Wie wird erinnert?
const NOTIFY_MODES = { push: "Benachrichtigung", alarm: "Wecker (mit Ton)", none: "Keine Benachrichtigung" };

// Arten von Logbuch-Einträgen (Wartungsheft)
const LOGKINDS = {
  wartung: ["Wartung", "build"], teil: ["Teil gewechselt", "settings"], reparatur: ["Reparatur", "handyman"],
  pruefung: ["Prüfung / Termin", "fact_check"], kauf: ["Kauf / Zubehör", "shopping_bag"],
  tierarzt: ["Tierarzt", "pets"], arzt: ["Arzt", "stethoscope"], sonst: ["Sonstiges", "edit_note"]
};

// Dokumentarten: [Name, Symbol, Erneuern alle X Jahre (0 = keine Vorgabe), Farbe]
const DOCTYPES = {
  ausweis: ["Personalausweis","badge",10,"blau"], pass: ["Reisepass","flight",10,"lila"],
  fs: ["Führerschein","id_card",15,"petrol"], lkw: ["LKW-Führerschein (C/CE)","local_shipping",5,"orange"],
  bus: ["Bus-Führerschein (D)","directions_bus",5,"orange"], fahrerkarte: ["Fahrerkarte","credit_card",5,"orange"],
  bkf: ["Berufskraftfahrer-Weiterbildung (95)","school",5,"gelb"], gesund: ["Gesundheitskarte","medical_services",0,"rosa"],
  impf: ["Impfpass","vaccines",0,"rosa"], versich: ["Versicherung","shield",0,"blau"], vertrag: ["Vertrag","contract",0,"lila"],
  zert: ["Zertifikat / Schein","workspace_premium",0,"gelb"], zeugnis: ["Zeugnis","school",0,"gruen"],
  fzpapiere: ["Fahrzeugpapiere","directions_car",0,"blau"], tier: ["Heimtierausweis","pets",0,"braun"],
  jagd: ["Jagd- / Angelschein","phishing",0,"gruen"], sonst: ["Sonstiges","description",0,"grau"]
};

/* ---------------------------------------------------------------------
   Zusatz-Listen pro Eintrag ("Module"). Jedes Modul ist eine Tabelle
   mit festen Spalten. Typen: text, number, money, date, check, url.
   --------------------------------------------------------------------- */
const MODULES = {
  tanken:    { label: "Tankbuch", icon: "local_gas_station", add: "Tanken eintragen", fields: [
               { k: "d", label: "Datum", type: "date", req: true }, { k: "km", label: "Kilometerstand", type: "number" },
               { k: "liter", label: "Liter", type: "number" }, { k: "total", label: "Betrag (€)", type: "money" },
               { k: "full", label: "Vollgetankt", type: "check", def: true }, { k: "station", label: "Tankstelle", type: "text" } ] },
  teile:     { label: "Meine Teile", icon: "settings", add: "Teil hinzufügen", fields: [
               { k: "name", label: "Teil", type: "text", req: true, ph: "z. B. Ölfilter" }, { k: "brand", label: "Marke", type: "text" },
               { k: "partno", label: "Artikelnummer", type: "text" }, { k: "link", label: "Nachkauf-Link", type: "url" }, { k: "note", label: "Notiz", type: "text" } ] },
  reifen:    { label: "Reifensätze", icon: "tire_repair", add: "Reifensatz hinzufügen", fields: [
               { k: "name", label: "Bezeichnung", type: "text", req: true, ph: "z. B. Winterreifen" }, { k: "size", label: "Größe", type: "text", ph: "205/55 R16 91H" },
               { k: "dot", label: "DOT (Herstellwoche)", type: "text", ph: "z. B. 2423" }, { k: "tread", label: "Profiltiefe (mm)", type: "number" },
               { k: "place", label: "Lagerort", type: "text" }, { k: "mounted", label: "Gerade montiert", type: "check" } ] },
  verbrauch: { label: "Verbrauchsmaterial", icon: "inventory_2", add: "Material hinzufügen", fields: [
               { k: "name", label: "Material", type: "text", req: true, ph: "z. B. Filterkartusche" }, { k: "stock", label: "Vorrat (Stück)", type: "number" },
               { k: "partno", label: "Artikelnummer", type: "text" }, { k: "link", label: "Nachkauf-Link", type: "url" } ] },
  gewicht:   { label: "Gewicht", icon: "monitor_weight", add: "Gewicht eintragen", fields: [
               { k: "d", label: "Datum", type: "date", req: true }, { k: "kg", label: "Gewicht (kg)", type: "number", req: true } ] },
  geschenke: { label: "Geschenkideen", icon: "redeem", add: "Idee hinzufügen", fields: [
               { k: "idea", label: "Idee", type: "text", req: true }, { k: "price", label: "Preis (€)", type: "money" },
               { k: "link", label: "Link", type: "url" }, { k: "done", label: "Schon verschenkt", type: "check" } ] },
  noten:     { label: "Noten", icon: "grading", add: "Note eintragen", fields: [
               { k: "d", label: "Datum", type: "date", req: true }, { k: "what", label: "Was", type: "text", ph: "z. B. Klausur Analysis" },
               { k: "grade", label: "Note", type: "number", req: true } ] }
};

/* ---------------------------------------------------------------------
   Bereichsarten. Sie bestimmen Standard-Felder, Module, Zähler und
   Aufgaben-Vorlagen (werden bei neuen Einträgen vorgeschlagen).
   Vorlage-Kurzform: [Titel, Art, Werte]
   --------------------------------------------------------------------- */
const TPL = (title, kind, p) => Object.assign({ title, kind }, p || {});
const KINDS = {
  allgemein: { label: "Allgemein", icon: "label", color: "grau", fields: [], modules: [], templates: [], reminders: [1] },
  fahrzeug:  { label: "Fahrzeuge", icon: "directions_car", color: "blau", counter: { label: "Kilometerstand", unit: "km" },
    fields: [["Kennzeichen","text"],["Modell","text"],["FIN","text"],["HSN / TSN","text"],["Erstzulassung","datum"],["Ölsorte","text"],["Reifendruck","text"]],
    modules: ["tanken","teile","reifen"], reminders: [14, 3],
    templates: [ TPL("Ölwechsel","zaehler",{counterEvery:15000,every:1,unit:"y"}), TPL("Inspektion","intervall",{every:1,unit:"y"}),
      TPL("HU / TÜV","intervall",{every:2,unit:"y",reminders:[30,7]}), TPL("Bremsflüssigkeit wechseln","intervall",{every:2,unit:"y"}),
      TPL("Winterreifen montieren","jaehrlich",{date:"2000-10-15"}), TPL("Sommerreifen montieren","jaehrlich",{date:"2000-04-15"}),
      TPL("Kilometerstand eintragen","monatlich",{mday:1,reminders:[0]}) ] },
  geraet:    { label: "Geräte & Technik", icon: "kitchen", color: "gelb", fields: [["Hersteller","text"],["Modell","text"],["Raum","text"],["Anleitung","link"]],
    modules: ["verbrauch","teile"], reminders: [3], templates: [ TPL("Wartung / Reinigung","intervall",{every:6,unit:"m"}) ] },
  haus:      { label: "Haus & Wohnung", icon: "home", color: "braun", fields: [["Raum / Ort","text"],["Hersteller","text"]], modules: ["verbrauch"], reminders: [7],
    templates: [] },
  zaehler:   { label: "Zählerstände", icon: "electric_meter", color: "gelb", counter: { label: "Zählerstand", unit: "" }, fields: [["Zählernummer","text"],["Anbieter","text"]], modules: [], reminders: [0],
    templates: [ TPL("Zählerstand ablesen","monatlich",{mday:1}) ] },
  pflanze:   { label: "Pflanzen", icon: "potted_plant", color: "gruen", fields: [["Art","text"],["Standort","text"],["Licht","text"],["Dünger","text"]], modules: [], reminders: [0],
    templates: [ TPL("Gießen","intervall",{every:7,unit:"d",winterEvery:14}), TPL("Düngen","intervall",{every:2,unit:"w",pause:[11,12,1,2]}),
      TPL("Blätter abwischen","intervall",{every:1,unit:"m"}), TPL("Umtopfen","jaehrlich",{date:"2000-03-15",reminders:[7]}) ] },
  garten:    { label: "Garten", icon: "yard", color: "gruen", fields: [["Ort","text"],["Pflanzen","notiz"]], modules: [], reminders: [1],
    templates: [ TPL("Rasen mähen","intervall",{every:1,unit:"w",pause:[11,12,1,2,3]}), TPL("Rasen düngen","intervall",{every:3,unit:"m",pause:[11,12,1,2]}),
      TPL("Vertikutieren","jaehrlich",{date:"2000-04-15"}), TPL("Hecke in Form schneiden (nur leichter Schnitt)","jaehrlich",{date:"2000-06-24",note:"Starker Rückschnitt nur von Oktober bis Februar erlaubt (Vogelschutz)."}),
      TPL("Außenwasserhahn absperren","jaehrlich",{date:"2000-10-31"}), TPL("Kübelpflanzen reinholen","jaehrlich",{date:"2000-10-15"}), TPL("Kübelpflanzen rausstellen","jaehrlich",{date:"2000-05-15",note:"Nach den Eisheiligen"}) ] },
  tier:      { label: "Haustiere", icon: "pets", color: "braun", birthday: true, fields: [["Tierart","text"],["Rasse","text"],["Chipnummer","text"],["Futter","text"],["Versicherung","text"]],
    modules: ["gewicht"], reminders: [7, 1],
    templates: [ TPL("Impfung auffrischen","intervall",{every:1,unit:"y",reminders:[14,3]}), TPL("Entwurmung","intervall",{every:3,unit:"m"}),
      TPL("Floh- und Zeckenschutz","intervall",{every:1,unit:"m",pause:[12,1,2]}), TPL("Gesundheitscheck beim Tierarzt","intervall",{every:1,unit:"y"}),
      TPL("Krallen / Fell pflegen","intervall",{every:4,unit:"w"}) ] },
  person:    { label: "Menschen", icon: "cake", color: "lila", birthday: true, fields: [["Beziehung","text"],["Telefon","text"],["Adresse","text"]], modules: ["geschenke"], reminders: [14, 1, 0],
    templates: [] },
  schule:    { label: "Schule & Lernen", icon: "school", color: "orange", fields: [["Lehrer/in","text"],["Raum","text"]], modules: ["noten"], reminders: [7, 3, 1], templates: [] },
  vertrag:   { label: "Verträge & Abos", icon: "contract", color: "lila", contract: true, fields: [["Anbieter","text"],["Kundennummer","text"],["Vertragsnummer","text"]], modules: [], reminders: [30, 7], templates: [] },
  gesundheit:{ label: "Gesundheit", icon: "stethoscope", color: "rosa", fields: [["Praxis","text"],["Telefon","text"]], modules: [], reminders: [14, 1], templates: [] },
  putzplan:  { label: "Putzplan", icon: "cleaning_services", color: "petrol", fields: [["Raum","text"]], modules: [], reminders: [0],
    templates: [ TPL("Staubsaugen","intervall",{every:1,unit:"w"}), TPL("Wischen","intervall",{every:2,unit:"w"}), TPL("Gründlich putzen","intervall",{every:1,unit:"m"}) ] }
};

/* ---------------------------------------------------------------------
   Startpakete für den Einrichtungs-Assistenten. Jedes Paket legt einen
   Bereich an und optional Einträge (mit eigenen Aufgaben).
   --------------------------------------------------------------------- */
const STARTER = [
  { id: "auto", label: "Auto / Fahrzeug", kind: "fahrzeug", name: "Fahrzeuge", items: [{ name: "Mein Auto", useTemplates: true }] },
  { id: "geraete", label: "Geräte & Technik", kind: "geraet", name: "Geräte & Technik", items: [
      { name: "Waschmaschine", tasks: [TPL("Pflegewaschgang 90 °C","intervall",{every:1,unit:"m"}), TPL("Flusensieb reinigen","intervall",{every:3,unit:"m"})] },
      { name: "Spülmaschine", tasks: [TPL("Filter reinigen","intervall",{every:1,unit:"m"}), TPL("Salz & Klarspüler prüfen","intervall",{every:1,unit:"m"})] },
      { name: "Kaffeemaschine", tasks: [TPL("Entkalken","intervall",{every:2,unit:"m"})] } ] },
  { id: "haus", label: "Haus & Wohnung", kind: "haus", name: "Haus & Wohnung", items: [
      { name: "Rauchmelder", tasks: [TPL("Rauchmelder testen","intervall",{every:1,unit:"y"})] },
      { name: "Heizung", tasks: [TPL("Heizkörper entlüften","jaehrlich",{date:"2000-10-01"}), TPL("Heizungswartung","intervall",{every:1,unit:"y"})] },
      { name: "Dunstabzug", tasks: [TPL("Fettfilter reinigen","intervall",{every:2,unit:"m"})] } ] },
  { id: "zaehler", label: "Zählerstände (Strom, Wasser, Gas)", kind: "zaehler", name: "Zählerstände", items: [{ name: "Strom", unit: "kWh", useTemplates: true }, { name: "Wasser", unit: "m³", useTemplates: true }] },
  { id: "pflanzen", label: "Pflanzen", kind: "pflanze", name: "Pflanzen", items: [] },
  { id: "garten", label: "Garten", kind: "garten", name: "Garten", items: [{ name: "Garten allgemein", useTemplates: true }] },
  { id: "tiere", label: "Haustiere", kind: "tier", name: "Haustiere", items: [] },
  { id: "menschen", label: "Geburtstage & Menschen", kind: "person", name: "Menschen", items: [] },
  { id: "schule", label: "Schule & Lernen", kind: "schule", name: "Schule & Lernen", items: [] },
  { id: "vertraege", label: "Verträge & Abos", kind: "vertrag", name: "Verträge & Abos", items: [] },
  { id: "gesundheit", label: "Gesundheit & Vorsorge", kind: "gesundheit", name: "Gesundheit", items: [
      { name: "Zahnarzt", tasks: [TPL("Kontrolle (Bonusheft)","intervall",{every:6,unit:"m"}), TPL("Professionelle Zahnreinigung","intervall",{every:1,unit:"y"})] },
      { name: "Hausarzt", tasks: [TPL("Check-up (ab 35 alle 3 Jahre)","intervall",{every:3,unit:"y"})] },
      { name: "Impfungen", tasks: [TPL("Tetanus / Diphtherie auffrischen","intervall",{every:10,unit:"y",reminders:[60]})] } ] },
  { id: "putzen", label: "Putzplan", kind: "putzplan", name: "Putzplan", items: [{ name: "Bad", useTemplates: true }, { name: "Küche", useTemplates: true }] }
];

// Abschnitte der Startseite (Reihenfolge und Sichtbarkeit sind einstellbar)
const SECTIONS = {
  today: "Heute", stats: "Überblick", fav: "Favoriten", next: "Als Nächstes", cats: "Bereiche",
  docs: "Dokumente & Links", birthdays: "Nächste Geburtstage", costs: "Kosten diesen Monat", shopping: "Einkaufsliste", shared: "Gemeinsam"
};
const DEFAULT_SECTIONS = ["today","stats","shared","fav","next","cats","docs","birthdays","costs","shopping"];
const SECTIONS_OFF_BY_DEFAULT = ["costs","shopping"];

// Navigation: [Route, Symbol, Name]. Erscheinen auch unten am Handy. "Dokumente" steht am PC zusätzlich in der Seitenleiste.
const NAV = [["start","home","Start"],["aufgaben","checklist","Aufgaben"],["bereiche","grid_view","Bereiche"],["gemeinsam","group","Gemeinsam"],["mehr","apps","Mehr"]];
const MORE_PAGES = [
  ["dokumente","folder_open","Dokumente","Ausweise, Verträge, Links"],
  ["kalender","calendar_month","Kalender","Monatsansicht aller Termine"], ["jahr","date_range","Jahresplaner","Was steht wann im Jahr an"],
  ["listen","checklist_rtl","Listen","Einkaufsliste, Verliehen, Gutscheine"], ["reisen","luggage","Reisen","Checklisten & Dokumenten-Check"],
  ["kontakte","contacts","Kontakte","Werkstatt, Ärzte, Handwerker"], ["kosten","payments","Kosten","Ausgaben, Abos & Tankbuch"],
  ["steuer","receipt_long","Steuer","Belege fürs Finanzamt sammeln"], ["daten","sync_alt","Import & Export","Kalender, Müllplan, Sicherung, CSV"],
  ["benachrichtigungen","notifications","Benachrichtigungen","Wecker, Uhrzeiten, Ruhezeiten"], ["konto","account_circle","Konto & Sync","PC und Handy verbinden"],
  ["papierkorb","delete","Papierkorb","Gelöschtes wiederherstellen"], ["profil","person","Profil & Einstellungen","Deine Daten und das Aussehen"]
];

// Standard-Checkliste für Reisen
const TRIP_CHECKLIST = ["Ausweis / Reisepass","Führerschein","Versicherungskarte","Ladekabel","Medikamente","Pflanzen versorgen lassen","Post / Briefkasten","Heizung runterdrehen","Fenster zu, Wasser ab","Müll rausbringen"];
