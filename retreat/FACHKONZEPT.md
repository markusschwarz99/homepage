# Teamretreat-App 2026 – Fachkonzept (statische Variante, ohne Backend)

> Stand der Daten: Export der Live-App `rp.markus-schwarz.cc` vom 01.10.2026.
> Enthält echte Teilnehmer-Daten (bewusst veröffentlicht) – nach dem Retreat entfernen.
> Persönliche Zugangs-Tokens der Live-App sind bewusst **nicht** enthalten.

## 1. Zweck & Rahmen

- Begleit-App für das Teamretreat **„Teamretreat 2026“**, **Teneriffa Süd · Amarilla Golf**,
  **So 18.10. – Fr 23.10.2026** (Unterkunft: Fairways Club).
- Zielgruppe: 24 Teilnehmende, primär am Handy (iOS/Android), sekundär Desktop.
- Kurzlebig: wird nur rund um das Retreat genutzt, danach abgebaut.
- Sprache der Oberfläche: Deutsch, gendergerechte Formen mit Doppelpunkt (Fahrer:in, Teilnehmende).
- Fragen, die die App beantwortet:
  - Was ist **jetzt**, was kommt **als Nächstes**?
  - Wie sieht das **Programm** pro Tag aus – für **mich** bzw. für **alle**?
  - In welchem **Apartment** wohne ich, mit wem?
  - In welchem **Auto** fahre ich, wer fährt?
  - Wo ist ein Ort (Adresse, Google Maps, Telefon)?
  - Wie bekomme ich einen Termin in **meinen Kalender** (Outlook / .ics)?

## 2. Architektur-Vorgabe: kein Backend

- Reine **statische Web-App** (HTML/JS/CSS), z.B. auf jedem Static-Hosting auslieferbar.
- Alle Daten liegen in **einer Datendatei** (`data.json`, Struktur siehe Anhang A) bzw. sind
  in den Build eingebettet. Es gibt **keine API, keine Datenbank, keine Server-Logik**.
- **Änderungen** (Programm, Zuteilung Auto/Zimmer) passieren durch Pflege der Datendatei und
  erneutes Ausliefern – nicht in der App. Die Konsistenzregeln aus Abschnitt 7 gelten dann als
  Regeln für die Datenpflege (idealerweise per Validierungs-Skript/Build-Check geprüft).
- Optional: die App lädt `data.json` beim Öffnen und alle 60 s sowie beim Zurückkehren in den
  Tab (`visibilitychange`) neu, damit nachgeschobene Änderungen ohne Neuinstallation ankommen.
  Schlägt das Laden fehl, bleiben die zuletzt geladenen Daten stehen (offline-tauglich).
- Alles, was die Live-App ohnehin schon **clientseitig** macht, bleibt unverändert:
  Jetzt/Als-Nächstes-Logik, Zeitzonen-Umrechnung, „Mein Kalender“-Filter, Kalender-Layout,
  Outlook-Link und .ics-Download.

### Wegfallende Funktionen gegenüber der Live-App

| Live-App (mit Backend) | Statische Variante |
|---|---|
| Persönlicher Link `?k=<geheimer Token>`, Server prüft Token | Personenwahl über `?p=<person-key>` bzw. Auswahl-Screen (siehe 3) – **kein Zugriffsschutz** |
| Orga legt Termine an / bearbeitet / löscht (Sheet im Kalender) | entfällt → Datendatei pflegen |
| Orga teilt Autos/Rollen/Apartments zu (Tab „Einstellungen“) | entfällt → Datendatei pflegen; alle sehen den read-only Tab „Info“ |
| Orga vergibt/entzieht Orga-Rechte | entfällt (`is_orga` nur noch informativ, z.B. Hinweis „Du bist in der Orga“) |
| Server-Validierung (Plätze, Fahrer:in, URLs …) | Build-/Pflege-Check gegen die Regeln aus Abschnitt 7 |

### Offene Entscheidung: Datenschutz
Ohne Backend stecken **alle Namen, Zimmer- und Autozuteilungen in der ausgelieferten Datei** –
jede Person mit der URL kann sie lesen. Optionen: (a) akzeptieren, URL nur intern teilen,
`noindex`; (b) Hosting hinter einem Zugangsschutz (z.B. Cloudflare Access, Basic Auth);
(c) Namen in der Datei auf Vorname + Initial kürzen.

## 3. Identifikation („Wer bin ich?“)

- Die App braucht eine **aktuelle Person**, um „Mein Kalender“, „Ich“ und Hervorhebungen zu zeigen.
- Persönlicher Link: `https://<host>/?p=<person-key>` (Keys siehe Teilnehmerliste).
  Der Key wird im `localStorage` (`retreat_person`) gemerkt.
- **Key bleibt in der URL** (nach jedem Tab-Wechsel wieder anhängen): iOS „Zum Home-Bildschirm“
  speichert die aktuelle URL, und die Home-Bildschirm-App hat einen eigenen, leeren localStorage.
- Ohne gültigen Key: Start-Screen „Teamretreat 2026 – Bitte öffne die App über deinen persönlichen
  Link. Den bekommst du von der Orga.“ – alternativ (Vorschlag für die statische Variante) eine
  Auswahl-Liste „Wer bist du?“ mit allen Namen.
- Fallback, wenn localStorage nicht verfügbar ist (privater Modus): Wert nur im Speicher halten.

## 4. Fachliches Datenmodell

### Eckdaten (`info`)
| Feld | Bedeutung |
|---|---|
| `title` | Titel der App/des Retreats (Kopfzeile) |
| `location` | Ort (Kopfzeile, hinter dem Titel) |
| `accommodation` | Ort-ID der Unterkunft (wird bei „Mein Apartment“ verlinkt) |
| `core_hours` | Kernzeit (Anzeige „Gut zu wissen“) |
| `note` | allgemeiner Hinweis (Fußzeile „Gut zu wissen“) |

### Orte (`places`)
`id`, `name`, `address?`, `phone?`, `distance?` (Freitext, z.B. „~350 m“), `url?`.
Maps-Link eines Orts: `url`, falls gesetzt, sonst
`https://www.google.com/maps/search/?api=1&query=<name>, <address | "Teneriffa">` (URL-codiert).
Telefonnummern als `tel:`-Link.

### Personen (`people`)
`key`, `first_name`, `last_name`, `display_name?` (Rufname), `is_orga`, `car?` + `car_role?`,
`apartment?`. Reihenfolge der Liste = Sortierung.
- **Anzeigename**: `(display_name ?? first_name) + " " + last_name`; Begrüßung nur mit Rufname/Vorname.
- In Auswahllisten/Orga-Listen alphabetisch nach Anzeigename (deutsche Sortierung).

### Autos (`cars`)
`key`, `name`, `kind` (`car` = Mietauto | `taxi` = Abholung/Taxi), `seats`.
Rollen im Auto: `driver` = **Fahrer:in**, `co_driver` = **Zweitfahrer:in**, `passenger` = **Mitfahrend**.

### Apartments (`apartments`)
`key`, `number?`, `name`, `rooms_label?` (z.B. „2 Schlafzimmer“), `capacity` (Plätze).
Anzeige-Titel: `number` und `name` kombiniert (z.B. „428 · Daniela“).

### Termine (`events`)
| Feld | Bedeutung |
|---|---|
| `start`, `end` | lokale **Teneriffa-Zeit** ohne Offset, Format `YYYY-MM-DDTHH:MM`; `end > start` |
| `title` | 1–200 Zeichen |
| `category` | `meal` Mahlzeit · `work` Arbeitsblock · `activity` Aktivität · `travel` Transfer |
| `place?` | Ort-ID aus `places` |
| `note?` | max. 500 Zeichen; heißt bei Aktivitäten „Beschreibung“, sonst „Notiz“ |
| `maps_url?`, `url?` | nur `http(s)://` (Schutz vor `javascript:`-Links) |
| `coordinator?` | Person-Key (Koordination) |
| `participants` | Liste von Person-Keys (leer = niemand eingetragen) |

- Es gibt **keine eigenen Bereiche** für Aktivitäten oder Orte – **alles läuft über den Kalender**.
  Aktivitäten sind Termine mit `category = activity`; Ort-Infos stehen im Termin-Detail.
- Jede Kategorie darf alle optionalen Felder haben; die Oberfläche zeigt **nur Befülltes**.
- Termine dürfen über Mitternacht gehen (Ende am Folgetag).

## 5. Zeit & Zeitzonen

- Gespeichert/gepflegt wird **Ortszeit Teneriffa** (`Atlantic/Canary`, im Oktober WEST = UTC+1,
  1 h hinter Österreich). Vergleiche laufen direkt auf den Strings (ISO sortiert lexikalisch).
- **„Jetzt“** = aktuelle Uhrzeit in Teneriffa, unabhängig von der Gerätezeitzone; Aktualisierung alle 30 s.
- Überall zusätzlich **Österreich-Zeit** (`Europe/Vienna`), Kürzel „TFS“ / „AT“.
  Umrechnung über `Intl` (sommerzeitsicher – am 25.10. endet die Sommerzeit).
- Tag-Format: „Mo 19.10.“ (Wochentag-Kürzel So/Mo/Di/Mi/Do/Fr/Sa).
- Abstandsformat: „in 25 Min“, „in 2 Std 5 Min“, „in 2 Std“, „in 1 Tag“, „in 3 Tagen“.
- Debug-Hilfe: `?now=2026-10-19T10:15` überschreibt die Uhrzeit (pro Browser-Tab, sessionStorage),
  `?now=` (leer) hebt das wieder auf.

## 6. Bildschirme

Navigation: mobil Tab-Leiste unten, Desktop Segment-Leiste in der Kopfzeile.
Kopfzeile: „Teamretreat 2026 · Teneriffa Süd · Amarilla Golf“. Großer Seitentitel = Tab-Name.
Tabs: **Heute**, **Kalender**, **Ich**, **Info**.

### 6.1 Umschalter „Mein Kalender | Alle“ (Heute + Kalender)
Gemerkt pro Gerät (`localStorage` `retreat_scope`, Default „Mein Kalender“).
Regel **„Bin ich dabei?“** für einen Termin:
1. Ich koordiniere ihn oder bin als Teilnehmer:in eingetragen → **ja**.
2. Es sind Teilnehmende eingetragen, ich nicht → **nein**.
3. Niemand eingetragen: Arbeitsblock, Mahlzeit, Transfer → **ja (für alle)**; Aktivität → **nein (für niemanden)**.

Hinweistext Kalender: „Mein Kalender: Arbeitsblöcke, Mahlzeiten und Transfers für alle, Aktivitäten nur
wo du eingetragen bist.“ bzw. „Alle Termine. Linke Zeitspalte Teneriffa, rechte Österreich.“

### 6.2 Heute
- **Jetzt-Kachel** (Hauptfarbe): Kopf „JETZT“ + aktuelle Uhrzeit „HH:MM TFS · HH:MM AT“. Inhalt je Phase
  (berechnet auf den gefilterten Terminen):
  - *vor dem ersten Termin*: „Es geht los in …“
  - *nach dem Ende des letzten Termins*: „Retreat vorbei – danke fürs Dabeisein!“
  - *währenddessen*: alle laufenden Termine (`start ≤ jetzt < end`) mit Titel, „bis HH:MM · Ort“;
    keiner läuft → „Gerade nichts geplant“.
- **Als Nächstes**: erster Termin mit `start > jetzt`: Titel, Abstand („in …“), Zeit, Ort;
  bei anderem Tag mit Tagesangabe davor. Farbbalken in Kategoriefarbe.
- **Wochenleiste** mit allen Retreat-Tagen (Tage = alle Tage, an denen Termine beginnen); heutiger Tag markiert.
  Vorauswahl: heute, sonst erster Tag (vor dem Retreat) bzw. letzter Tag (danach).
- **Tagesliste**: je Termin Start (fett), Ende, „AT HH:MM“, Kategoriebalken, Titel, Ort, Notiz (2 Zeilen).
  Vergangene Termine abgeblendet, laufende mit Badge „JETZT“. Leer: „Keine Termine.“
  Fußzeile: „Zeiten in Teneriffa-Zeit, „AT“ = Österreich.“
- Tippen auf einen Termin öffnet das **Termin-Detail**.
- Desktop: links Jetzt/Als Nächstes (mitlaufend), rechts Wochenleiste + Tagesliste.

### 6.3 Kalender
- Zeitraster mit **zwei Zeitachsen** (links TFS schwarz, rechts AT grau), 1 Stunde = feste Höhe.
- Sichtbarer Stundenbereich: mindestens 07–22 Uhr, erweitert auf früheste/späteste Uhrzeit **aller**
  Termine (Termine über Mitternacht enden optisch um 24:00). Tage und Raster immer aus allen Terminen,
  damit beim Umschalten Mein/Alle nichts springt.
- Mobil: **ein Tag** + Wochenleiste; **Wischen** links/rechts wechselt den Tag (weit genug = > ¼ Breite
  oder schnell genug = > 30 px bei > 0,4 px/ms; am ersten/letzten Tag Gummiband-Effekt).
  Desktop: **alle Tage** nebeneinander.
- Spaltenkopf: Wochentag + Datumszahl, heute als blauer Kreis. Blaue **Jetzt-Linie** am heutigen Tag.
- **Überlappende Termine** teilen sich die Breite: Gruppen sich überschneidender Termine, jeder Termin
  bekommt die erste freie Spur (Sortierung: Start aufsteigend, bei gleichem Start längerer zuerst).
- Terminblock: Kategorie-Tönung + Farbbalken, Titel (bei parallelen Terminen bis 3 Zeilen umbrechen),
  ab ausreichender Höhe Uhrzeit + „AT HH:MM“, bei noch mehr Höhe der Ort. Mindesthöhe für kurze Termine.
  Vergangene Termine abgeblendet. Tooltip: „Titel · HH:MM–HH:MM Teneriffa / HH:MM–HH:MM Österreich“.
- Tippen öffnet das Termin-Detail.

### 6.4 Termin-Detail (Sheet)
Mobil von unten einfahrendes Sheet (nach unten wegwischbar: > 120 px oder > 20 px bei > 0,5 px/ms),
Desktop als Dialog. Kopf: „Schließen“ + Kategorie-Name.
Inhalte (nur Befülltes):
- Titel, Kategorie-Chip
- **Zeit**: Tag, Teneriffa „HH:MM–HH:MM Uhr“ (hervorgehoben), Österreich
- **Ort**: Name als Maps-Link, Adresse, Telefon (`tel:`)
- **Beschreibung** (Aktivität) bzw. **Notiz** – Zeilenumbrüche erhalten
- **Koordination**: Name, ggf. „(du)“
- **Teilnehmende (n)**: Namen, eigene Zeile hervorgehoben; sind **alle** Personen eingetragen → nur „Alle“
- **Links**: Google-Maps-Link (`maps_url`), „Weitere Infos“ (`url`) – neuer Tab, `noopener noreferrer`
- **Kalender**:
  - „Zu Outlook hinzufügen“: `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=…&startdt=…&enddt=…&body=…&location=…`
    (Zeiten als UTC `YYYY-MM-DDTHH:MM:00Z`; body = Notiz, url, maps_url mit Leerzeile getrennt;
    location = „Ortsname, Adresse“). Fußzeile: „Outlook öffnet sich im Browser mit deinem
    Microsoft-365-Konto. Für andere Kalender die .ics-Datei nehmen.“
  - „Kalenderdatei (.ics)“: Download, RFC 5545 – `VCALENDAR` 2.0, `PRODID:-//Teamretreat//Termine//DE`,
    `METHOD:PUBLISH`, ein `VEVENT` mit `UID:retreat-event-<id>@<host>`, `DTSTAMP`, `DTSTART`/`DTEND` in UTC
    (`…Z`), `SUMMARY`, optional `DESCRIPTION`, `LOCATION`, `URL`; Text-Escaping von `\ ; , Zeilenumbruch`,
    Zeilen auf 75 Byte gefaltet, CRLF. Dateiname = Titel als Slug (ä→ae, ö→oe, ü→ue, ß→ss), Fallback `termin.ics`.
  - In der statischen Variante braucht jeder Termin eine **stabile ID** (z.B. Index oder fester Schlüssel),
    damit die .ics-UID bei erneutem Import gleich bleibt.

### 6.5 Ich
- „Hallo <Rufname>!“; bei Orga-Personen Hinweis, dass sie in der Orga sind.
- **Mein Apartment**: Nummer + Name (fett), Zimmer-Info; Mitbewohnende (oder „Du wohnst allein.“);
  Unterkunft als Maps-Link mit Adresse. Ohne Zuteilung: „Noch kein Apartment zugeteilt.“
- **Mein Auto**: Autoname, eigene Rolle („Du: Fahrer:in“, nur bei `car`); weitere Insassen nach Rolle
  sortiert (Fahrer:in → Zweitfahrer:in → Mitfahrend), Rolle nur bei Fahrer:in/Zweitfahrer:in angezeigt.
  Ohne Zuteilung: „Noch keinem Auto zugeteilt.“
- **Gut zu wissen**: Kernzeit, Hinweis (nur wenn befüllt).

### 6.6 Info (read-only, für alle)
Umschalter **Autos | Zimmer**.
- **Autos**: je Auto eine Gruppe mit Titel, Zähler „x/5 Plätze“ (Taxi: „x Personen“), Insassen nach Rolle
  sortiert, Rolle bei Fahrer:in/Zweitfahrer:in. Auto ohne Fahrer:in → Warnung „⚠︎ Keine Fahrer:in“.
  Leeres Auto: „Niemand“. Personen ohne Auto in Gruppe „Nicht zugeteilt“.
- **Zimmer**: je Apartment Titel „Nummer · Name“, Zähler „x/y Plätze“ (Überbelegung mit „⚠︎“ hervorgehoben),
  Zimmer-Info als Fußzeile, Bewohnende; leer: „Frei“. Personen ohne Apartment in „Nicht zugeteilt“.
- Die eigene Person ist jeweils hervorgehoben.

## 7. Konsistenzregeln (für die Datenpflege)

1. Alle Referenzen müssen existieren: Ort-IDs (Termine, Unterkunft), Auto-/Apartment-Keys, Person-Keys
   (Koordination, Teilnehmende).
2. Termin: `end > start`, Format `YYYY-MM-DDTHH:MM`, Titel 1–200 Zeichen, Notiz ≤ 500 Zeichen,
   Links nur `http://` / `https://`.
3. Mietauto (`car`): höchstens **eine Fahrer:in** und **eine Zweitfahrer:in**; Insassen ≤ `seats`.
4. Taxi (`taxi`): nur Rolle **Mitfahrend**.
5. Person mit Auto ohne Rollenangabe → Mitfahrend; Person ohne Auto → keine Rolle.
6. Apartment: Bewohnende ≤ `capacity`.
7. Mindestens eine Person mit `is_orga = true` (nur relevant, falls Orga-Funktionen zurückkommen).
8. Koordinierende Person zählt im „Mein Kalender“ automatisch als dabei, muss also nicht zusätzlich
   unter Teilnehmenden stehen.

## 8. Gestaltung

- iOS-Anmutung: „inset grouped lists“ (weiße, abgerundete Gruppen auf getöntem Hintergrund),
  Segment-Umschalter, Sheets, durchscheinende Kopf-/Tab-Leiste, Safe-Area-Abstände.
- Schrift: Systemschrift (`-apple-system`, SF Pro, system-ui, Segoe UI, Roboto).
- Farbpalette (ausschließlich diese Farben):

| Name | Hex | Abstufungen 75 / 50 / 25 | Verwendung |
|---|---|---|---|
| Royal Blue | `#002EB1` | `#4062C5` / `#8097D8` / `#BFCBEC` | Hauptakzent, Jetzt-Kachel, Kategorie Arbeitsblock, Theme-Color |
| Green | `#19B874` | `#53CA97` / `#8CDCBA` / `#C6EDDC` | Kategorie Mahlzeit |
| Light Green | `#63F185` | `#8AF5A4` / `#B1F8C2` / `#D8FCE1` | Kategorie Aktivität (nur Fläche mit schwarzem Text) |
| Accent Blue | `#1464F4` | `#4F8BF7` / `#8AB2FA` / `#C4D8FC` | Links |
| Grey | `#556D73` | `#809296` / `#AAB6B9` / `#D5DBDC` | Sekundärtext, Kategorie Transfer, Linien |
| Canvas | Grey-25 zu 42 % auf Weiß | – | Seitenhintergrund |

- Kategorien: Balken in Vollfarbe, Fläche/Chip in der 25-%-Stufe
  (Mahlzeit Green, Arbeitsblock Royal Blue, Aktivität Light Green, Transfer Grey).
- Icons: lucide (Heute `CalendarClock`, Kalender `CalendarDays`, Ich `UserRound`, Info `Info`).
- `<meta name="robots" content="noindex, nofollow">`, `referrer: no-referrer`.

## 9. Auffälligkeiten im aktuellen Datenstand

- **„Welcome, Hausregeln & Retreat-Kick-off“** (So 18.10.) ist eine *Aktivität ohne Teilnehmende* →
  erscheint laut Regel 6.1 bei **niemandem** in „Mein Kalender“. Entweder Kategorie ändern
  (z.B. Arbeitsblock) oder alle eintragen.
- Die Wahl-Aktivitäten (Padel 1/2, Kajak, Strand La Tejita, Bananenplantage) haben noch **keine
  Teilnehmenden** – sichtbar nur unter „Alle“. Eine Anmeldung durch die Teilnehmenden selbst gibt es
  weder in der Live-App noch (ohne Backend) in der statischen Variante; Eintragung über die Datendatei.
- Das Taxi (`Abholung/Taxi`) hat 10 Plätze, die Platzgrenze greift aber nur bei Mietautos.

## 10. Aktuelle Daten

### 10.1 Eckdaten

| Feld | Wert |
|---|---|
| `title` | Teamretreat 2026 |
| `location` | Teneriffa Süd · Amarilla Golf |
| `accommodation` | fairways |
| `core_hours` | 07:00–18:00 |
| `note` | Kanaren = WEST (UTC+1 im Oktober, 1 h hinter MESZ). Alle Zeiten sind Ortszeit. |

### 10.2 Orte (13)

| ID | Name | Adresse | Telefon | Entfernung |
|---|---|---|---|---|
| `fairways` | Fairways Club | Av. María Ángeles Ascanio Cullen, 38639 Amarilla Golf | – | Unterkunft |
| `tonys` | Tonys Cafe Bar | Fairways Club, Av. María Ángeles Ascanio Cullen, 38639 Amarilla Golf | +34 641 23 60 01 | 0 km |
| `papitas` | Papita's Comfort Food | Golf del Sur, Teneriffa | – | – |
| `19th` | The 19th Hole Tenerife | Av. María Ángeles Ascanio Cullen, Amarilla Golf | +34 621 19 10 96 | ~350 m |
| `roca-negra` | Roca Negra | Golf del Sur, Teneriffa | – | – |
| `corale` | Coralé Restaurant | Edf. Agua Maria 5, Local 3b, Golf del Sur | +34 659 20 26 64 | ~800 m |
| `el-tejado` | El Tejado | Teneriffa | – | – |
| `la-mesa` | La Mesa Restaurant | Fairways Club, Av. María Ángeles Ascanio Cullen, 38639 Amarilla Golf | +34 922 737 090 | 0 km |
| `casa-club` | Amarilla Golf Casa Club | C. de María de los Ángeles Ascanio Cullen s/n, Amarilla Golf | +34 922 73 03 19 | ~850 m |
| `airport` | Flughafen Teneriffa Süd (TFS) | Aeropuerto Tenerife Sur | – | – |
| `los-cristianos` | Playa de Los Cristianos | Los Cristianos, Teneriffa | – | – |
| `la-tejita` | Playa La Tejita | El Médano, Teneriffa | – | – |
| `santa-cruz` | Santa Cruz de Tenerife | Santa Cruz de Tenerife | – | – |

### 10.3 Teilnehmende (24)

| Key | Name | Orga | Auto | Rolle | Apartment |
|---|---|---|---|---|---|
| `julia-eder` | Julia Eder |  | Auto 2 | Fahrer:in | 433 Raphaela |
| `simon-kroissmayr` | Simon Kroissmayr |  | Auto 3 | Fahrer:in | 513 Laura |
| `matthias-schmidtmayr` | Matthias Schmidtmayr |  | Auto 4 | Fahrer:in | 724 Anna |
| `david-hasmuller` | David Hasmüller |  | Auto 1 | Fahrer:in | 513 Laura |
| `markus-schwarz` | Markus Schwarz | ja | Auto 5 | Fahrer:in | 513 Laura |
| `christoph-bettig` | Christoph Bettig |  | Auto 1 | Mitfahrend | 724 Anna |
| `dragomirka-pepic` | Drago Pepic (Dragomirka) |  | Auto 1 | Mitfahrend | 433 Raphaela |
| `amela-kadric` | Amela Kadric |  | Auto 5 | Mitfahrend | 428 Daniela |
| `katharina-olkis` | Katharina Olkis |  | Auto 1 | Mitfahrend | 428 Daniela |
| `michael-ahrer` | Michael Ahrer |  | Auto 2 | Mitfahrend | 429 Santiago |
| `matthias-ettl` | Matthias Ettl |  | Auto 2 | Mitfahrend | 740 Sophie |
| `florian-ebner` | Florian Ebner |  | Auto 5 | Mitfahrend | 513 Laura |
| `manuel-eichbauer` | Manuel Eichbauer |  | Auto 3 | Zweitfahrer:in | 429 Santiago |
| `selma-gwozdz` | Selma Gwozdz |  | Auto 3 | Mitfahrend | 428 Daniela |
| `moritz-neuwirth` | Moritz Neuwirth |  | Auto 3 | Mitfahrend | 429 Santiago |
| `katharina-zechmeister` | Kathi Zechmeister (Katharina) |  | Auto 4 | Mitfahrend | 428 Daniela |
| `andreas-viehhauser` | Andreas Viehhauser |  | Abholung/Taxi | Mitfahrend | 740 Sophie |
| `ivan-samardzic` | Ivan Samardzic |  | Abholung/Taxi | Mitfahrend | Fairways-Studio |
| `julia-luger` | Julia Luger |  | Auto 2 | Zweitfahrer:in | 433 Raphaela |
| `alexandra-tomasitz` | Alexandra Tomasitz |  | Auto 4 | Mitfahrend | 433 Raphaela |
| `raphaele-rosener` | Raphaele Rösener |  | Auto 5 | Mitfahrend | 429 Santiago |
| `dimitrij-tokar` | Dimitrij Tokar |  | Abholung/Taxi | Mitfahrend | 724 Anna |
| `bita-mirzaei` | Bita Mirzaei |  | Auto 6 | Fahrer:in | 115 Ella |
| `tobias-pastaschek` | Tobias Pastaschek |  | Abholung/Taxi | Mitfahrend | 724 Anna |

### 10.4 Autos (7)

| Auto | Art | Plätze | Belegung | Fahrer:in | Zweitfahrer:in | Mitfahrend |
|---|---|---|---|---|---|---|
| Auto 1 (`auto-1`) | Mietauto | 5 | 4 | David Hasmüller | – | Christoph Bettig, Drago Pepic, Katharina Olkis |
| Auto 2 (`auto-2`) | Mietauto | 5 | 4 | Julia Eder | Julia Luger | Michael Ahrer, Matthias Ettl |
| Auto 3 (`auto-3`) | Mietauto | 5 | 4 | Simon Kroissmayr | Manuel Eichbauer | Selma Gwozdz, Moritz Neuwirth |
| Auto 4 (`auto-4`) | Mietauto | 5 | 3 | Matthias Schmidtmayr | – | Kathi Zechmeister, Alexandra Tomasitz |
| Auto 5 (`auto-5`) | Mietauto | 5 | 4 | Markus Schwarz | – | Amela Kadric, Florian Ebner, Raphaele Rösener |
| Auto 6 (`auto-6`) | Mietauto | 5 | 1 | Bita Mirzaei | – | – |
| Abholung/Taxi (`taxi`) | Taxi | 10 | 4 | – | – | Andreas Viehhauser, Ivan Samardzic, Dimitrij Tokar, Tobias Pastaschek |

### 10.5 Apartments (8)

| Nr. | Name | Zimmer | Plätze | Belegung | Bewohnende |
|---|---|---|---|---|---|
| 115 | Ella (`115`) | 1 Schlafzimmer | 2 | 1 | Bita Mirzaei |
| 428 | Daniela (`428`) | 2 Schlafzimmer | 4 | 4 | Amela Kadric, Katharina Olkis, Selma Gwozdz, Kathi Zechmeister |
| 429 | Santiago (`429`) | 2 Schlafzimmer | 4 | 4 | Michael Ahrer, Manuel Eichbauer, Moritz Neuwirth, Raphaele Rösener |
| 433 | Raphaela (`433`) | 2 Schlafzimmer | 4 | 4 | Julia Eder, Drago Pepic, Julia Luger, Alexandra Tomasitz |
| 513 | Laura (`513`) | 2 Schlafzimmer | 4 | 4 | Simon Kroissmayr, David Hasmüller, Markus Schwarz, Florian Ebner |
| 724 | Anna (`724`) | 2 Schlafzimmer | 4 | 4 | Matthias Schmidtmayr, Christoph Bettig, Dimitrij Tokar, Tobias Pastaschek |
| 740 | Sophie (`740`) | Studio | 2 | 2 | Matthias Ettl, Andreas Viehhauser |
| – | Fairways-Studio (`fairways-studio`) | Studio | 1 | 1 | Ivan Samardzic |

### 10.6 Programm (39 Termine)

Zeiten in Teneriffa-Ortszeit (Österreich = +1 h). „#“ = stabile Termin-ID für die statische Variante.


#### So 18.10.

| # | Zeit | Kategorie | Titel | Ort | Notiz | Koordination | Teilnehmende | Links |
|---|---|---|---|---|---|---|---|---|
| 1 | 14:20–15:00 | Transfer | Ankunft & Transfer zur Unterkunft | Flughafen Teneriffa Süd (TFS) | Ankünfte 14:20 | – | – | – |
| 2 | 15:00–17:00 | Aktivität | Welcome, Hausregeln & Retreat-Kick-off | Fairways Club | – | – | – | – |
| 3 | 19:00–22:00 | Mahlzeit | Abendessen | Tonys Cafe Bar | – | – | – | – |

#### Mo 19.10.

| # | Zeit | Kategorie | Titel | Ort | Notiz | Koordination | Teilnehmende | Links |
|---|---|---|---|---|---|---|---|---|
| 4 | 07:00–08:00 | Mahlzeit | Gemeinsames Frühstück | Papita's Comfort Food | – | – | – | – |
| 5 | 08:00–12:00 | Arbeitsblock | Arbeitsblock I (individuell) | – | – | – | – | – |
| 6 | 12:00–13:30 | Mahlzeit | Mittagessen (Menü) | The 19th Hole Tenerife | – | – | – | – |
| 7 | 13:30–15:00 | Arbeitsblock | Brownbag Session „KI-Anwendungsfälle“ | – | Arbeitsblock II · mit Matthias Ettl | – | – | – |
| 8 | 15:00–17:00 | Aktivität | Teamaktivität: Beachbar & Pubquiz | Roca Negra | – | Simon Kroissmayr | alle | [Maps](https://www.google.com/maps/search/?api=1&query=Roca%20Negra%2C%20Golf%20del%20Sur%2C%20Teneriffa) |
| 9 | 19:00–22:00 | Mahlzeit | Abendessen | Roca Negra | – | – | – | – |

#### Di 20.10.

| # | Zeit | Kategorie | Titel | Ort | Notiz | Koordination | Teilnehmende | Links |
|---|---|---|---|---|---|---|---|---|
| 10 | 07:00–08:00 | Mahlzeit | Frühstück in den Apartments | – | – | – | – | – |
| 11 | 08:00–12:00 | Arbeitsblock | Arbeitsblock I | – | – | – | – | – |
| 12 | 12:00–13:30 | Mahlzeit | Mittagessen (Menü) | Tonys Cafe Bar | – | – | – | – |
| 13 | 13:30–15:00 | Arbeitsblock | Hackathon | – | Arbeitsblock II · individuell oder in Gruppen | – | – | – |
| 14 | 15:00–17:00 | Aktivität | Padel Tennis 1 | – | 12 Plätze | – | – | – |
| 15 | 15:00–17:00 | Aktivität | Kajak & Schnorcheln mit Meeresschildkröten | – | 12 Plätze | – | – | [Maps](https://www.google.com/maps/search/?api=1&query=Playa%20de%20Los%20Cristianos%2C%20Los%20Cristianos%2C%20Teneriffa) [Info](https://www.getyourguide.com/de-de/teneriffa-l350/los-cristianos-kajak-schnorcheltour-mit-delfinen-und-schildkroten-t1323783/) |
| 16 | 17:00–18:00 | Transfer | Rückfahrt & Tagesabschluss | – | – | – | – | – |
| 17 | 19:00–22:00 | Mahlzeit | Abendessen | Coralé Restaurant | – | – | – | – |

#### Mi 21.10.

| # | Zeit | Kategorie | Titel | Ort | Notiz | Koordination | Teilnehmende | Links |
|---|---|---|---|---|---|---|---|---|
| 18 | 07:00–08:00 | Mahlzeit | Frühstück in den Apartments | – | – | – | – | – |
| 19 | 08:00–12:00 | Arbeitsblock | Arbeitsblock I | – | – | – | – | – |
| 20 | 12:00–13:30 | Mahlzeit | Mittagessen (Menü) | The 19th Hole Tenerife | – | – | – | – |
| 21 | 13:30–15:00 | Arbeitsblock | Vorstellung Hackathon-Ergebnisse | – | Arbeitsblock II | – | – | – |
| 22 | 15:00–17:00 | Aktivität | Padel Tennis 2 | – | 12 Plätze | – | – | – |
| 23 | 15:00–17:00 | Aktivität | Strand Playa La Tejita | – | 12 Plätze | – | – | [Maps](https://www.google.com/maps/search/?api=1&query=Playa%20La%20Tejita%2C%20El%20M%C3%A9dano%2C%20Teneriffa) |
| 24 | 15:00–17:00 | Aktivität | Bananenplantage | – | 8 Plätze | – | – | – |
| 25 | 17:00–18:00 | Transfer | Rückfahrt & Tagesabschluss | – | – | – | – | – |
| 26 | 19:00–22:00 | Mahlzeit | Abendessen | El Tejado | – | – | – | – |

#### Do 22.10.

| # | Zeit | Kategorie | Titel | Ort | Notiz | Koordination | Teilnehmende | Links |
|---|---|---|---|---|---|---|---|---|
| 27 | 07:00–08:00 | Mahlzeit | Frühstück in den Apartments | – | – | – | – | – |
| 28 | 08:00–12:00 | Arbeitsblock | Arbeitsblock I | – | – | – | – | – |
| 29 | 12:00–13:30 | Mahlzeit | Mittagessen (à la carte) | La Mesa Restaurant | – | – | – | – |
| 30 | 13:30–15:00 | Arbeitsblock | Arbeitsblock II | – | – | – | – | – |
| 31 | 15:00–17:00 | Aktivität | Schnitzeljagd in Santa Cruz | Santa Cruz de Tenerife | Gemeinsam | – | alle | [Maps](https://www.google.com/maps/search/?api=1&query=Santa%20Cruz%20de%20Tenerife%2C%20Santa%20Cruz%20de%20Tenerife) |
| 32 | 17:00–18:00 | Arbeitsblock | Rückfahrt, Retrospektive & Abschluss | – | – | – | – | – |
| 33 | 19:00–22:00 | Mahlzeit | Abendessen | Amarilla Golf Casa Club | – | – | – | – |

#### Fr 23.10.

| # | Zeit | Kategorie | Titel | Ort | Notiz | Koordination | Teilnehmende | Links |
|---|---|---|---|---|---|---|---|---|
| 34 | 07:00–08:00 | Mahlzeit | Gemeinsames Frühstück | Papita's Comfort Food | – | – | – | – |
| 35 | 09:00–11:00 | Transfer | Erste Transfers zum Flughafen | Flughafen Teneriffa Süd (TFS) | – | – | – | – |
| 36 | 11:00–12:00 | Transfer | Abreise-Welle · Lunch to go | – | – | – | – | – |
| 37 | 13:30–14:25 | Transfer | Transfer & Abflug 14:25 | Flughafen Teneriffa Süd (TFS) | – | – | – | – |
| 38 | 15:00–16:35 | Transfer | Transfer & Abflug 16:35 | Flughafen Teneriffa Süd (TFS) | – | – | – | – |
| 39 | 17:00–18:00 | Transfer | Letzte Abreisen · Retreat-Ende | – | – | – | – | – |

## Anhang A – `data.json` (vollständiger aktueller Datenstand)

Format für die statische Variante. Unterschiede zum Export der Live-App: keine Tokens, Termine mit `id`,
`participants: "alle"` steht für sämtliche Personen.

```json
{
  "info": {
    "title": "Teamretreat 2026",
    "location": "Teneriffa Süd · Amarilla Golf",
    "accommodation": "fairways",
    "core_hours": "07:00–18:00",
    "note": "Kanaren = WEST (UTC+1 im Oktober, 1 h hinter MESZ). Alle Zeiten sind Ortszeit."
  },
  "places": [
    {
      "id": "fairways",
      "name": "Fairways Club",
      "address": "Av. María Ángeles Ascanio Cullen, 38639 Amarilla Golf",
      "phone": null,
      "distance": "Unterkunft",
      "url": null
    },
    {
      "id": "tonys",
      "name": "Tonys Cafe Bar",
      "address": "Fairways Club, Av. María Ángeles Ascanio Cullen, 38639 Amarilla Golf",
      "phone": "+34 641 23 60 01",
      "distance": "0 km",
      "url": null
    },
    {
      "id": "papitas",
      "name": "Papita's Comfort Food",
      "address": "Golf del Sur, Teneriffa",
      "phone": null,
      "distance": null,
      "url": null
    },
    {
      "id": "19th",
      "name": "The 19th Hole Tenerife",
      "address": "Av. María Ángeles Ascanio Cullen, Amarilla Golf",
      "phone": "+34 621 19 10 96",
      "distance": "~350 m",
      "url": null
    },
    {
      "id": "roca-negra",
      "name": "Roca Negra",
      "address": "Golf del Sur, Teneriffa",
      "phone": null,
      "distance": null,
      "url": null
    },
    {
      "id": "corale",
      "name": "Coralé Restaurant",
      "address": "Edf. Agua Maria 5, Local 3b, Golf del Sur",
      "phone": "+34 659 20 26 64",
      "distance": "~800 m",
      "url": null
    },
    {
      "id": "el-tejado",
      "name": "El Tejado",
      "address": "Teneriffa",
      "phone": null,
      "distance": null,
      "url": null
    },
    {
      "id": "la-mesa",
      "name": "La Mesa Restaurant",
      "address": "Fairways Club, Av. María Ángeles Ascanio Cullen, 38639 Amarilla Golf",
      "phone": "+34 922 737 090",
      "distance": "0 km",
      "url": null
    },
    {
      "id": "casa-club",
      "name": "Amarilla Golf Casa Club",
      "address": "C. de María de los Ángeles Ascanio Cullen s/n, Amarilla Golf",
      "phone": "+34 922 73 03 19",
      "distance": "~850 m",
      "url": null
    },
    {
      "id": "airport",
      "name": "Flughafen Teneriffa Süd (TFS)",
      "address": "Aeropuerto Tenerife Sur",
      "phone": null,
      "distance": null,
      "url": null
    },
    {
      "id": "los-cristianos",
      "name": "Playa de Los Cristianos",
      "address": "Los Cristianos, Teneriffa",
      "phone": null,
      "distance": null,
      "url": null
    },
    {
      "id": "la-tejita",
      "name": "Playa La Tejita",
      "address": "El Médano, Teneriffa",
      "phone": null,
      "distance": null,
      "url": null
    },
    {
      "id": "santa-cruz",
      "name": "Santa Cruz de Tenerife",
      "address": "Santa Cruz de Tenerife",
      "phone": null,
      "distance": null,
      "url": null
    }
  ],
  "cars": [
    {
      "key": "auto-1",
      "name": "Auto 1",
      "kind": "car",
      "seats": 5
    },
    {
      "key": "auto-2",
      "name": "Auto 2",
      "kind": "car",
      "seats": 5
    },
    {
      "key": "auto-3",
      "name": "Auto 3",
      "kind": "car",
      "seats": 5
    },
    {
      "key": "auto-4",
      "name": "Auto 4",
      "kind": "car",
      "seats": 5
    },
    {
      "key": "auto-5",
      "name": "Auto 5",
      "kind": "car",
      "seats": 5
    },
    {
      "key": "auto-6",
      "name": "Auto 6",
      "kind": "car",
      "seats": 5
    },
    {
      "key": "taxi",
      "name": "Abholung/Taxi",
      "kind": "taxi",
      "seats": 10
    }
  ],
  "apartments": [
    {
      "key": "115",
      "number": "115",
      "name": "Ella",
      "rooms_label": "1 Schlafzimmer",
      "capacity": 2
    },
    {
      "key": "428",
      "number": "428",
      "name": "Daniela",
      "rooms_label": "2 Schlafzimmer",
      "capacity": 4
    },
    {
      "key": "429",
      "number": "429",
      "name": "Santiago",
      "rooms_label": "2 Schlafzimmer",
      "capacity": 4
    },
    {
      "key": "433",
      "number": "433",
      "name": "Raphaela",
      "rooms_label": "2 Schlafzimmer",
      "capacity": 4
    },
    {
      "key": "513",
      "number": "513",
      "name": "Laura",
      "rooms_label": "2 Schlafzimmer",
      "capacity": 4
    },
    {
      "key": "724",
      "number": "724",
      "name": "Anna",
      "rooms_label": "2 Schlafzimmer",
      "capacity": 4
    },
    {
      "key": "740",
      "number": "740",
      "name": "Sophie",
      "rooms_label": "Studio",
      "capacity": 2
    },
    {
      "key": "fairways-studio",
      "number": null,
      "name": "Fairways-Studio",
      "rooms_label": "Studio",
      "capacity": 1
    }
  ],
  "people": [
    {
      "key": "julia-eder",
      "first_name": "Julia",
      "last_name": "Eder",
      "display_name": null,
      "is_orga": false,
      "car": "auto-2",
      "car_role": "driver",
      "apartment": "433"
    },
    {
      "key": "simon-kroissmayr",
      "first_name": "Simon",
      "last_name": "Kroissmayr",
      "display_name": null,
      "is_orga": false,
      "car": "auto-3",
      "car_role": "driver",
      "apartment": "513"
    },
    {
      "key": "matthias-schmidtmayr",
      "first_name": "Matthias",
      "last_name": "Schmidtmayr",
      "display_name": null,
      "is_orga": false,
      "car": "auto-4",
      "car_role": "driver",
      "apartment": "724"
    },
    {
      "key": "david-hasmuller",
      "first_name": "David",
      "last_name": "Hasmüller",
      "display_name": null,
      "is_orga": false,
      "car": "auto-1",
      "car_role": "driver",
      "apartment": "513"
    },
    {
      "key": "markus-schwarz",
      "first_name": "Markus",
      "last_name": "Schwarz",
      "display_name": null,
      "is_orga": true,
      "car": "auto-5",
      "car_role": "driver",
      "apartment": "513"
    },
    {
      "key": "christoph-bettig",
      "first_name": "Christoph",
      "last_name": "Bettig",
      "display_name": null,
      "is_orga": false,
      "car": "auto-1",
      "car_role": "passenger",
      "apartment": "724"
    },
    {
      "key": "dragomirka-pepic",
      "first_name": "Dragomirka",
      "last_name": "Pepic",
      "display_name": "Drago",
      "is_orga": false,
      "car": "auto-1",
      "car_role": "passenger",
      "apartment": "433"
    },
    {
      "key": "amela-kadric",
      "first_name": "Amela",
      "last_name": "Kadric",
      "display_name": null,
      "is_orga": false,
      "car": "auto-5",
      "car_role": "passenger",
      "apartment": "428"
    },
    {
      "key": "katharina-olkis",
      "first_name": "Katharina",
      "last_name": "Olkis",
      "display_name": null,
      "is_orga": false,
      "car": "auto-1",
      "car_role": "passenger",
      "apartment": "428"
    },
    {
      "key": "michael-ahrer",
      "first_name": "Michael",
      "last_name": "Ahrer",
      "display_name": null,
      "is_orga": false,
      "car": "auto-2",
      "car_role": "passenger",
      "apartment": "429"
    },
    {
      "key": "matthias-ettl",
      "first_name": "Matthias",
      "last_name": "Ettl",
      "display_name": null,
      "is_orga": false,
      "car": "auto-2",
      "car_role": "passenger",
      "apartment": "740"
    },
    {
      "key": "florian-ebner",
      "first_name": "Florian",
      "last_name": "Ebner",
      "display_name": null,
      "is_orga": false,
      "car": "auto-5",
      "car_role": "passenger",
      "apartment": "513"
    },
    {
      "key": "manuel-eichbauer",
      "first_name": "Manuel",
      "last_name": "Eichbauer",
      "display_name": null,
      "is_orga": false,
      "car": "auto-3",
      "car_role": "co_driver",
      "apartment": "429"
    },
    {
      "key": "selma-gwozdz",
      "first_name": "Selma",
      "last_name": "Gwozdz",
      "display_name": null,
      "is_orga": false,
      "car": "auto-3",
      "car_role": "passenger",
      "apartment": "428"
    },
    {
      "key": "moritz-neuwirth",
      "first_name": "Moritz",
      "last_name": "Neuwirth",
      "display_name": null,
      "is_orga": false,
      "car": "auto-3",
      "car_role": "passenger",
      "apartment": "429"
    },
    {
      "key": "katharina-zechmeister",
      "first_name": "Katharina",
      "last_name": "Zechmeister",
      "display_name": "Kathi",
      "is_orga": false,
      "car": "auto-4",
      "car_role": "passenger",
      "apartment": "428"
    },
    {
      "key": "andreas-viehhauser",
      "first_name": "Andreas",
      "last_name": "Viehhauser",
      "display_name": null,
      "is_orga": false,
      "car": "taxi",
      "car_role": "passenger",
      "apartment": "740"
    },
    {
      "key": "ivan-samardzic",
      "first_name": "Ivan",
      "last_name": "Samardzic",
      "display_name": null,
      "is_orga": false,
      "car": "taxi",
      "car_role": "passenger",
      "apartment": "fairways-studio"
    },
    {
      "key": "julia-luger",
      "first_name": "Julia",
      "last_name": "Luger",
      "display_name": null,
      "is_orga": false,
      "car": "auto-2",
      "car_role": "co_driver",
      "apartment": "433"
    },
    {
      "key": "alexandra-tomasitz",
      "first_name": "Alexandra",
      "last_name": "Tomasitz",
      "display_name": null,
      "is_orga": false,
      "car": "auto-4",
      "car_role": "passenger",
      "apartment": "433"
    },
    {
      "key": "raphaele-rosener",
      "first_name": "Raphaele",
      "last_name": "Rösener",
      "display_name": null,
      "is_orga": false,
      "car": "auto-5",
      "car_role": "passenger",
      "apartment": "429"
    },
    {
      "key": "dimitrij-tokar",
      "first_name": "Dimitrij",
      "last_name": "Tokar",
      "display_name": null,
      "is_orga": false,
      "car": "taxi",
      "car_role": "passenger",
      "apartment": "724"
    },
    {
      "key": "bita-mirzaei",
      "first_name": "Bita",
      "last_name": "Mirzaei",
      "display_name": null,
      "is_orga": false,
      "car": "auto-6",
      "car_role": "driver",
      "apartment": "115"
    },
    {
      "key": "tobias-pastaschek",
      "first_name": "Tobias",
      "last_name": "Pastaschek",
      "display_name": null,
      "is_orga": false,
      "car": "taxi",
      "car_role": "passenger",
      "apartment": "724"
    }
  ],
  "events": [
    {
      "id": 1,
      "start": "2026-10-18T14:20",
      "end": "2026-10-18T15:00",
      "title": "Ankunft & Transfer zur Unterkunft",
      "category": "travel",
      "place": "airport",
      "note": "Ankünfte 14:20",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 2,
      "start": "2026-10-18T15:00",
      "end": "2026-10-18T17:00",
      "title": "Welcome, Hausregeln & Retreat-Kick-off",
      "category": "activity",
      "place": "fairways",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 3,
      "start": "2026-10-18T19:00",
      "end": "2026-10-18T22:00",
      "title": "Abendessen",
      "category": "meal",
      "place": "tonys",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 4,
      "start": "2026-10-19T07:00",
      "end": "2026-10-19T08:00",
      "title": "Gemeinsames Frühstück",
      "category": "meal",
      "place": "papitas",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 5,
      "start": "2026-10-19T08:00",
      "end": "2026-10-19T12:00",
      "title": "Arbeitsblock I (individuell)",
      "category": "work",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 6,
      "start": "2026-10-19T12:00",
      "end": "2026-10-19T13:30",
      "title": "Mittagessen (Menü)",
      "category": "meal",
      "place": "19th",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 7,
      "start": "2026-10-19T13:30",
      "end": "2026-10-19T15:00",
      "title": "Brownbag Session „KI-Anwendungsfälle“",
      "category": "work",
      "place": null,
      "note": "Arbeitsblock II · mit Matthias Ettl",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 8,
      "start": "2026-10-19T15:00",
      "end": "2026-10-19T17:00",
      "title": "Teamaktivität: Beachbar & Pubquiz",
      "category": "activity",
      "place": "roca-negra",
      "note": null,
      "maps_url": "https://www.google.com/maps/search/?api=1&query=Roca%20Negra%2C%20Golf%20del%20Sur%2C%20Teneriffa",
      "url": null,
      "coordinator": "simon-kroissmayr",
      "participants": "alle"
    },
    {
      "id": 9,
      "start": "2026-10-19T19:00",
      "end": "2026-10-19T22:00",
      "title": "Abendessen",
      "category": "meal",
      "place": "roca-negra",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 10,
      "start": "2026-10-20T07:00",
      "end": "2026-10-20T08:00",
      "title": "Frühstück in den Apartments",
      "category": "meal",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 11,
      "start": "2026-10-20T08:00",
      "end": "2026-10-20T12:00",
      "title": "Arbeitsblock I",
      "category": "work",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 12,
      "start": "2026-10-20T12:00",
      "end": "2026-10-20T13:30",
      "title": "Mittagessen (Menü)",
      "category": "meal",
      "place": "tonys",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 13,
      "start": "2026-10-20T13:30",
      "end": "2026-10-20T15:00",
      "title": "Hackathon",
      "category": "work",
      "place": null,
      "note": "Arbeitsblock II · individuell oder in Gruppen",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 14,
      "start": "2026-10-20T15:00",
      "end": "2026-10-20T17:00",
      "title": "Padel Tennis 1",
      "category": "activity",
      "place": null,
      "note": "12 Plätze",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 15,
      "start": "2026-10-20T15:00",
      "end": "2026-10-20T17:00",
      "title": "Kajak & Schnorcheln mit Meeresschildkröten",
      "category": "activity",
      "place": null,
      "note": "12 Plätze",
      "maps_url": "https://www.google.com/maps/search/?api=1&query=Playa%20de%20Los%20Cristianos%2C%20Los%20Cristianos%2C%20Teneriffa",
      "url": "https://www.getyourguide.com/de-de/teneriffa-l350/los-cristianos-kajak-schnorcheltour-mit-delfinen-und-schildkroten-t1323783/",
      "coordinator": null,
      "participants": []
    },
    {
      "id": 16,
      "start": "2026-10-20T17:00",
      "end": "2026-10-20T18:00",
      "title": "Rückfahrt & Tagesabschluss",
      "category": "travel",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 17,
      "start": "2026-10-20T19:00",
      "end": "2026-10-20T22:00",
      "title": "Abendessen",
      "category": "meal",
      "place": "corale",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 18,
      "start": "2026-10-21T07:00",
      "end": "2026-10-21T08:00",
      "title": "Frühstück in den Apartments",
      "category": "meal",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 19,
      "start": "2026-10-21T08:00",
      "end": "2026-10-21T12:00",
      "title": "Arbeitsblock I",
      "category": "work",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 20,
      "start": "2026-10-21T12:00",
      "end": "2026-10-21T13:30",
      "title": "Mittagessen (Menü)",
      "category": "meal",
      "place": "19th",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 21,
      "start": "2026-10-21T13:30",
      "end": "2026-10-21T15:00",
      "title": "Vorstellung Hackathon-Ergebnisse",
      "category": "work",
      "place": null,
      "note": "Arbeitsblock II",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 22,
      "start": "2026-10-21T15:00",
      "end": "2026-10-21T17:00",
      "title": "Padel Tennis 2",
      "category": "activity",
      "place": null,
      "note": "12 Plätze",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 23,
      "start": "2026-10-21T15:00",
      "end": "2026-10-21T17:00",
      "title": "Strand Playa La Tejita",
      "category": "activity",
      "place": null,
      "note": "12 Plätze",
      "maps_url": "https://www.google.com/maps/search/?api=1&query=Playa%20La%20Tejita%2C%20El%20M%C3%A9dano%2C%20Teneriffa",
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 24,
      "start": "2026-10-21T15:00",
      "end": "2026-10-21T17:00",
      "title": "Bananenplantage",
      "category": "activity",
      "place": null,
      "note": "8 Plätze",
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 25,
      "start": "2026-10-21T17:00",
      "end": "2026-10-21T18:00",
      "title": "Rückfahrt & Tagesabschluss",
      "category": "travel",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 26,
      "start": "2026-10-21T19:00",
      "end": "2026-10-21T22:00",
      "title": "Abendessen",
      "category": "meal",
      "place": "el-tejado",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 27,
      "start": "2026-10-22T07:00",
      "end": "2026-10-22T08:00",
      "title": "Frühstück in den Apartments",
      "category": "meal",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 28,
      "start": "2026-10-22T08:00",
      "end": "2026-10-22T12:00",
      "title": "Arbeitsblock I",
      "category": "work",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 29,
      "start": "2026-10-22T12:00",
      "end": "2026-10-22T13:30",
      "title": "Mittagessen (à la carte)",
      "category": "meal",
      "place": "la-mesa",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 30,
      "start": "2026-10-22T13:30",
      "end": "2026-10-22T15:00",
      "title": "Arbeitsblock II",
      "category": "work",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 31,
      "start": "2026-10-22T15:00",
      "end": "2026-10-22T17:00",
      "title": "Schnitzeljagd in Santa Cruz",
      "category": "activity",
      "place": "santa-cruz",
      "note": "Gemeinsam",
      "maps_url": "https://www.google.com/maps/search/?api=1&query=Santa%20Cruz%20de%20Tenerife%2C%20Santa%20Cruz%20de%20Tenerife",
      "url": null,
      "coordinator": null,
      "participants": "alle"
    },
    {
      "id": 32,
      "start": "2026-10-22T17:00",
      "end": "2026-10-22T18:00",
      "title": "Rückfahrt, Retrospektive & Abschluss",
      "category": "work",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 33,
      "start": "2026-10-22T19:00",
      "end": "2026-10-22T22:00",
      "title": "Abendessen",
      "category": "meal",
      "place": "casa-club",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 34,
      "start": "2026-10-23T07:00",
      "end": "2026-10-23T08:00",
      "title": "Gemeinsames Frühstück",
      "category": "meal",
      "place": "papitas",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 35,
      "start": "2026-10-23T09:00",
      "end": "2026-10-23T11:00",
      "title": "Erste Transfers zum Flughafen",
      "category": "travel",
      "place": "airport",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 36,
      "start": "2026-10-23T11:00",
      "end": "2026-10-23T12:00",
      "title": "Abreise-Welle · Lunch to go",
      "category": "travel",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 37,
      "start": "2026-10-23T13:30",
      "end": "2026-10-23T14:25",
      "title": "Transfer & Abflug 14:25",
      "category": "travel",
      "place": "airport",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 38,
      "start": "2026-10-23T15:00",
      "end": "2026-10-23T16:35",
      "title": "Transfer & Abflug 16:35",
      "category": "travel",
      "place": "airport",
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    },
    {
      "id": 39,
      "start": "2026-10-23T17:00",
      "end": "2026-10-23T18:00",
      "title": "Letzte Abreisen · Retreat-Ende",
      "category": "travel",
      "place": null,
      "note": null,
      "maps_url": null,
      "url": null,
      "coordinator": null,
      "participants": []
    }
  ]
}
```
