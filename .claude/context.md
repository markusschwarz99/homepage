# Kontext für diesen Chat

Ich arbeite an meiner persönlichen Homepage **markus-schwarz.cc** — selbst gehostet auf
einem Raspberry Pi. Antworte bitte auf Deutsch, sei direkt und pragmatisch.

## Was die Seite macht

Persönliche Homepage mit vier Hauptbereichen:
- **Blog** (Admin-only, TipTap-Rich-Editor mit Bild-Upload)
- **Rezepte-Archiv** (strukturierte Zutaten mit Portions-Skalierung, Schritt-für-Schritt,
  Bilder-Galerie, Tag-Filter)
- **Einkaufsliste** (geteilt im Haushalt, mit Frequent-Items und History)
- **Saisonkalender** (zeigt regional/saisonal verfügbare Lebensmittel,
  Verwaltung unter `/admin/saisonkalender`, Backend-Router `seasonal.py`)
- **Impostor-Spiel** (öffentlich unter `/impostor`, kein Login nötig — Setup,
  Tap-and-Hold-Reveal, Auflösung. Kategorien & Wörter sind DB-backed,
  Verwaltung unter `/admin/impostor`, Backend-Router `impostor.py`,
  Tabellen `impostor_categories` + `impostor_words`)

Vier Rollen: **Guest / Member / Household / Admin**.
Auth via Email-Verifizierung, JWT, Password-Reset per Mail.

## Hardware & OS

- Raspberry Pi 5 Model B Rev 1.1, 16 GB RAM, 469 GB Disk (4% belegt)
- Ubuntu 25.10 (Questing Quokka), Kernel 6.17, aarch64
- Kein Swap konfiguriert

## Tech-Stack

**Backend** — Python 3.12 (im Container), FastAPI + Uvicorn
- SQLAlchemy + Alembic (Migrations)
- PostgreSQL 16
- JWT via `python-jose` + `bcrypt` ≥ 5
- Resend für Mailversand
- SlowAPI für Rate Limiting
- Pillow für Bildverarbeitung
- pytest + Codecov

**Frontend** — Node 22, React 19 + TypeScript 6 + Vite 8
- React Router 7
- Tailwind CSS 4.x + `@tailwindcss/postcss` + `@tailwindcss/typography`
  (CSS-first config: `@theme`-Block und `@plugin`-Direktiven in
  `frontend/src/index.css`, KEINE `tailwind.config.js` mehr).
  Mindest-Browser: Safari ≥16.4, Chrome ≥111, Firefox ≥128
  (CSS Cascade Layers, `@property`, `color-mix()`). `autoprefixer` ist
  raus — v4 macht das intern.
- TipTap 3 (Rich-Editor: Image, Link, Placeholder, TextAlign, Underline, StarterKit)
- DOMPurify für HTML-Sanitization
- ESLint 10 + typescript-eslint

**E2E** — Playwright 1.59 (TypeScript), separates Projekt unter `e2e/`

**Infrastruktur**
- Docker Compose (3 Services: backend, frontend, db) + dedizierte Volumes
  `postgres_data`, `user_uploads`
- Backend baut aus `./backend/Dockerfile` (non-root user `app`, Port 8000)
- Backend startet via `entrypoint.sh`: erst `alembic upgrade head`, dann Uvicorn.
  Schema-Source-of-Truth ist Alembic, NICHT `Base.metadata.create_all`
- Frontend baut aus `./frontend` mit Build-Arg `VITE_API_URL=https://api.markus-schwarz.cc`,
  serviert über Nginx im Container auf Port 80
- DB nur intern erreichbar (Container-Netzwerk, kein Port-Mapping)
- Backend hat IPv6 disabled via sysctl
- **Cloudflare Tunnel** (`cloudflared` als systemd-Service, Token-Mode) zeigt direkt
  auf die Container — kein Reverse Proxy dazwischen, kein Port-Forwarding, keine
  öffentliche IP. Public Hostnames werden im Cloudflare Zero Trust Dashboard
  konfiguriert, KEINE lokale `config.yml`. Token steht im systemd-Override unter
  `/etc/systemd/system/cloudflared.service.d/override.conf`. **Wichtig:** Bei
  Debugging niemals `systemctl status cloudflared` ohne `| head` ausführen — der
  Output zeigt die volle Command-Line inkl. Token. Stattdessen
  `systemctl is-active cloudflared` und `journalctl -u cloudflared` nutzen.
- **Portainer** auf Port 9000 für Container-Verwaltung

## Projekt-Struktur

Repo: `https://github.com/markusschwarz99/homepage` (Default-Branch: `main`)
Lokal: `/home/markus/homepage`

```
homepage/
├── backend/                  # FastAPI-App
│   ├── main.py               # App-Entry
│   ├── auth.py               # JWT + Password-Hashing
│   ├── database.py           # SQLAlchemy-Setup
│   ├── models.py             # ORM-Modelle
│   ├── email_service.py      # Resend-Integration
│   ├── rate_limit.py         # SlowAPI-Config
│   ├── upload_utils.py       # Bild-Uploads
│   ├── routers/              # API-Endpoints
│   ├── tests/                # pytest
│   ├── seed_test_data.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/                 # React + Vite
├── e2e/                      # Playwright-Tests
├── scripts/
│   └── backup-db.sh          # DB-Backup-Skript
├── backups/                  # DB-Backup-Output
├── .github/                  # CI-Workflows (Backend-Tests, E2E, Dependabot)
├── docker-compose.yml
└── .env.example
```

## Externer Zugriff

- Frontend: `https://markus-schwarz.cc` → Cloudflare Tunnel → Frontend-Container :80
- Backend: `https://api.markus-schwarz.cc` → Cloudflare Tunnel → Backend-Container :8000
- SSH: nur lokal/LAN

## Konventionen & Workflows

- **Commits**: Conventional Commits (`feat:`, `fix:`, `deps(backend):`, `deps(frontend):`,
  `deps(ci):`, `chore:`, `docs:`, `test:`, `refactor:`)
- **Branching**: für jede nicht-triviale Änderung (Code, Schema, Config,
  Dependencies) ein `feature/<name>`-Branch + PR + grüne CI vor Merge.
  Hintergrund: siehe Abschnitt "Prod-Deploy-Disziplin". Triviale Änderungen
  (README, Kommentare, Primer-Updates, `.env.example`) dürfen direkt auf `main`.
- **Dependabot** aktiv für backend, frontend, ci
- **CI**: GitHub Actions — Backend-Tests + E2E-Tests + Codecov, müssen grün sein.
  Workflows triggern nur auf `push` zu `main` und auf `pull_request` mit Target
  `main` — Pushes auf Feature-Branches lösen die CI **nicht** aus, erst der PR
  startet die Checks.
- **Migrations**: Alembic — bei Schema-Änderungen immer `alembic revision --autogenerate
  -m "..."` im Backend-Container generieren, dann `docker cp` ins Repo (Backend hat
  keinen Volume-Mount). Migrations laufen automatisch beim Container-Start via
  `entrypoint.sh`. Test-DB in `conftest.py` nutzt weiterhin `Base.metadata.create_all`
  für SQLite-In-Memory — unabhängig von Alembic.
  **Stolperfalle bei `docker cp`**: NIEMALS `docker cp $(ls -t .../versions/ | head -1)`
  o.ä. nutzen, um die "neueste" Migration zu greifen — `__pycache__/` wird beim
  Generieren modifiziert und steht dann oben. Stattdessen den vollen Filename aus dem
  `alembic revision`-Output rauslesen und explizit per Name kopieren:
  `docker cp homepage-backend-1:/app/alembic/versions/<revid>_<slug>.py
  ~/homepage/backend/alembic/versions/<revid>_<slug>.py`.
  **Stolperfalle bei `--autogenerate`**: Der Backend-Container hat keinen
  Volume-Mount aufs Repo, sieht also Code-Änderungen in `models.py` erst nach
  einem `docker compose build`. Wer `alembic revision --autogenerate` gegen den
  laufenden Prod-Container ausführt OHNE vorher rebuildet zu haben, vergleicht
  alt-vs-alt und bekommt eine leere Migration mit `pass`-Body zurück. Optionen:
  (a) Models-Patch per `docker cp` in den Container vorschieben — riskant, weil
  SQLAlchemy ab dem Moment die neue Spalte in jedes SELECT rendert; (b) im
  Test-Stack (`homepage-backend-test`-Image) bauen und dort autogenerieren;
  (c) bei trivialen Änderungen (1–2 `add_column`s) Migration manuell schreiben
  und Revision-ID + `down_revision` aus einer leer generierten Migration
  übernehmen.
- **Secrets**: ausschließlich in `.env` (nicht committed). `.env.example` als Template
  pflegen, wenn neue Env-Vars dazukommen
- **Lizenz**: GPLv3

## Wie du mit mir arbeitest

Ich führe Bash-Befehle selbst auf dem Pi aus — du hast keinen direkten Zugriff
auf das System. Daher:

- **Liefere mir alle Befehle, die ich ausführen muss, um eine Aufgabe zu erledigen.**
  Auch wenn der Befehl trivial wirkt — schreib ihn explizit hin, damit ich nichts
  selbst zusammenbauen muss.
- **Format**: Code-Block mit `bash`, ein Befehl pro Zeile. Bei mehreren Schritten
  klar nummerieren oder mit Kommentaren (`# Schritt 1: ...`) trennen.
- **Wenn du Output brauchst, um weiterzumachen** (z.B. Logs, Statusmeldung,
  Fehlertext, Inhalt einer Datei): sag das explizit am Ende und liste die Befehle,
  deren Output ich dir reinkopieren soll.
- **Bei destruktiven oder nicht-trivialen Befehlen**: kurz erklären was passiert,
  bevor ich es ausführe — kein "trust me, run this".
- **Auch File-Edits als Befehle**: Wenn Code/Config geändert werden muss, gib
  konkrete Bash-Befehle (`cat > ... << 'EOF'`, `sed -i`, `python3 << 'PYEOF'`),
  niemals nur "füge folgende Zeile in Datei X ein". Bei größeren Files das
  ganze File via Heredoc neu schreiben — sed/awk nur für punktuelle Änderungen.
- **Bei `python3`-File-Patches mit `text.replace()`**: IMMER vorher prüfen ob
  das `old`-Pattern auch wirklich matcht (z.B. via
  `if text.count(old) != 1: raise SystemExit(...)`). `text.replace()` gibt den
  Original-String zurück wenn nichts matcht — ohne Fehler. Stolperfalle 1:
  unsichtbare Whitespace-Diffs (Leerzeilen, Tabs vs Spaces) lassen den Match
  still scheitern. Stolperfalle 2: Pattern matcht MEHRFACH (z.B.
  `name = Column(String(100), nullable=False, unique=True, index=True)` ist
  generisch genug, dass es bei mehreren Models gleichzeitig matcht). Lösung:
  Pattern immer mit umliegendem Klassen-/Funktions-Header als Anker bauen,
  z.B. die Klassendefinition + 1–2 Zeilen drumherum mitnehmen, nicht nur die
  Ziel-Zeile alleine. Nach jedem Patch zur Verifikation `grep` oder `git diff`
  ausführen, BEVOR committed wird. Vor `git commit` immer `git status` zur
  Kontrolle: wenn die erwartete Datei NICHT als modified auftaucht, ist der
  Patch nicht durchgegangen.
  **Stolperfalle 3: Quote-Konflikt zwischen Heredoc und Python-Triple-Strings.**
  Wenn der Replacement-String Double-Quotes enthält (typisch bei TSX/JSX,
  z.B. `to="/account"`), KEINE Python-Triple-Double-Quotes im
  `python3 << 'PYEOF'`-Heredoc verwenden — die Mischung aus Heredoc-Lexer
  und Python-Stringparser führt zu `SyntaxError: unterminated string literal`.
  Stattdessen: (a) Python-Triple-Single-Quote-Strings (Double-Quotes dürfen
  problemlos enthalten sein, solange der Text selbst kein dreifaches Single-Quote
  enthält), (b) String-Konkatenation mit normalen `"..."`-Strings über
  mehrere Zeilen, oder (c) den Replacement-Text in eine temporäre Datei via
  `cat > /tmp/x.txt << 'TEXTEOF' ... TEXTEOF` schreiben und im Python-Patch
  per `Path('/tmp/x.txt').read_text()` einlesen — diese Variante hat keinerlei
  Quote-Konflikte und funktioniert auch dann noch, wenn der Text selbst
  `'''` enthält.

- **Plattform-Hinweis**: Mein lokaler Rechner ist **Windows mit PowerShell**, der
  Pi ist **Ubuntu/bash**. Wenn ein Befehl von Windows aus laufen soll (z.B. `scp`,
  `ssh`), gib die PowerShell-Variante; wenn er auf dem Pi läuft, gib bash. Wenn
  unklar, frag.
- **Pfade**: Projekt-Root auf dem Pi ist immer `/home/markus/homepage`. Befehle
  wenn möglich mit absolutem Pfad oder mit explizitem `cd ~/homepage` davor.
- **Container-Files**: Backend hat KEINEN Volume-Mount aufs Repo. Code-Änderungen
  in `backend/` werden erst nach `docker compose build backend` im Container sichtbar.
  Files die im Container generiert werden (z.B. neue Alembic-Migrations) müssen mit
  `docker cp homepage-backend-1:/app/<pfad> ~/homepage/backend/<pfad>` ins Repo geholt
  werden.

- **Primer-Updates** liefere immer als Bash-Befehl (nicht als "ergänze
  Zeile X in Datei Y"). Die Datei liegt unter `~/homepage/.claude/context.md`.
  Format wie alle anderen File-Edits: `python3 << 'PYEOF'` für punktuelle
  Replaces, `cat > ... << 'EOF'` für komplette Abschnitte, `sed -i` für
  einfache Substitutionen. Ich committe selbst.

## Arbeitsweise vor dem Code

Diese Regeln sollen typische LLM-Coding-Fehler reduzieren (unnötige
Refactorings, halluzinierte Annahmen, Over-Engineering). Faustregel: bei
trivialen Aufgaben nach Augenmaß, bei nicht-trivialen strikt halten.

**Erst denken, dann coden.** Vor dem Schreiben von Code:

- Annahmen explizit machen. Wenn unklar, fragen — nicht raten.
- Wenn mehrere Interpretationen plausibel sind, alle nennen statt still
  eine zu wählen.
- Wenn eine simplere Lösung existiert, sie ansprechen — auch wenn ich
  nach der komplexeren gefragt habe. Pushback ist erwünscht.
- Wenn etwas verwirrt: stoppen, benennen, fragen. Verwirrung nicht
  überspielen.

**Simplicity first.** Minimum-Code der das Problem löst, nichts auf Vorrat:

- Keine Features über das hinaus, was gefragt war.
- Keine Abstraktionen für Single-Use-Code.
- Keine "Flexibilität"/"Konfigurierbarkeit", die nicht angefragt wurde.
- Kein Error-Handling für unmögliche Szenarien.
- Wenn 200 Zeilen geschrieben sind und 50 reichen würden: neu schreiben.

**Chirurgische Changes.** Nur anfassen was nötig ist:

- Keine "Verbesserungen" an angrenzendem Code, Kommentaren, Formatierung
  während der Aufgabe. Auch wenn der Stil stört: matchen, nicht ändern.
- Nicht refactoren, was nicht kaputt ist.
- Wenn unrelated Dead Code auffällt: erwähnen, nicht löschen.
- Beim Aufräumen von Imports/Variablen nur das entfernen, was DURCH die
  aktuelle Änderung verwaist ist — nicht was schon vorher tot war.
- Im Diff-Test: jede geänderte Zeile muss direkt zur Aufgabe rückverfolgbar
  sein.

Diese Regel ist im Repo besonders wichtig wegen der Drift-Stolperfallen
(siehe Abschnitte zu Alembic-Autogenerate und SQLAlchemy `unique=True` +
`index=True`): "Bonus-Statements" in Migrations sind ein direktes Symptom
für nicht-chirurgische Changes.

**Goal-driven, mit Verify-Schritten.** Aufgaben in überprüfbare Ziele übersetzen:

- "Validierung hinzufügen" → "Tests für invalid input schreiben, dann
  grün machen"
- "Bug fixen" → "Test schreiben, der den Bug reproduziert, dann grün machen"
- "X refactoren" → "Sicherstellen dass Tests vor und nach grün sind"

Bei mehrstufigen Aufgaben kurzen Plan vorab nennen, mit explizitem
Verify-Step pro Schritt — Format `1. <Schritt> → verify: <Check>`, eine
Zeile pro Schritt.

Klare Success-Criteria erlauben es mir (Markus), Schritt für Schritt zu
prüfen ohne dauernd nachzufragen. Schwammige Kriterien ("damit es geht")
führen zu Hin-und-Her.

---

## Typische Aufgaben & wie ich Hilfe brauche

**Bugs / Debugging** — Wenn Logs hilfreich wären, frag nach:
`docker compose logs -f backend` / `docker compose logs -f frontend`. Bei DB-Fragen:
`docker compose exec db psql -U $POSTGRES_USER $POSTGRES_DB`.

**Backend-Tests lokal laufen lassen**: dev-deps installieren mit
`docker compose exec -T backend pip install -r requirements-dev.txt`
(verschwinden bei nächstem Container-Restart, gewollt). Dann
`docker compose exec -T backend python -m pytest --no-cov` —
nicht `pytest` direkt, da installiert in `/home/app/.local/bin`
(nicht im PATH).

**Aber**: Sobald die Test-Änderung neue Felder/Tabellen voraussetzt, die in
`models.py` schon definiert sind aber in der Prod-DB noch nicht existieren
(z.B. nach lokalem Migrations-Patch, vor Pi-Deploy), DARF pytest nicht im
Prod-Backend laufen — SQLAlchemy würde die neue Spalte sofort in jedes SELECT
rendern und alle laufenden Endpoints mit 500ern killen. Stattdessen Test-Stack
verwenden: `docker compose -f docker-compose.test.yml up -d --build backend-test`,
dann `docker compose -f docker-compose.test.yml exec -T backend-test pip install
-r requirements-dev.txt && python -m pytest ... --no-cov`. Cleanup mit
`docker compose -f docker-compose.test.yml down -v`. pytest selbst braucht die
DB nicht (In-Memory-SQLite via `conftest.py`), aber das `homepage-backend-test`-
Image ist ein separates Tag und kollidiert nicht mit Prod.

**Standalone-Maintenance-Skripte** liegen unter `backend/scripts/`,
werden mit `docker compose exec -T backend python scripts/<name>.py`
ausgeführt. Beispiel: `scripts/refine_seasonal_data.py`. Skripte
sollten idempotent sein und einen `--dry-run`-Modus anbieten.

**Neue Features** — Schlage Code vor, der zum bestehenden Stil passt
(FastAPI-Router-Pattern, React-Function-Components mit Hooks, Tailwind-Klassen).
Wenn DB-Schema betroffen ist: Alembic-Migration mitliefern.

**Code-Review / Refactoring** — Achte auf Sicherheits-Aspekte (JWT-Handling,
Input-Validation, SQL-Injection, XSS via DOMPurify), Lesbarkeit, Performance auf einem Pi 5.

**Deployment / DevOps** — Compose-Änderungen, Dockerfile-Optimierungen, NPM-Konfiguration,
Cloudflare-Tunnel, Backup-Strategie, Logs/Monitoring. Berücksichtige ARM64.

**DB-Queries / Schema** — Postgres 16, SQLAlchemy ORM. Bei `ALTER TABLE` o.ä. → immer
über Alembic-Migration. Vor Migrations Backup-Erinnerung.

**UI-Feedback (Toasts)** — Für nutzer-sichtbares Feedback (Erfolg/Fehler bei
Aktionen) gibt es einen leichten in-house Toast-Provider unter
`frontend/src/components/Toast.tsx`. Verwendung: `const { show } = useToast();`
plus `show('Nachricht', 'success' | 'error' | 'info')`. Der `ToastProvider` wird
in `Layout.tsx` gemountet — neue Pages, die `Layout` verwenden, haben
automatisch Zugriff. Bewusste Entscheidung gegen externe Libraries
(react-hot-toast, sonner, react-toastify), um Bundle-Size niedrig zu halten.
Wenn das Feature später wächst (Stacking-Verhalten, Persistenz, Icons), kann
auf eine Library migriert werden — die `useToast()`-API ist API-kompatibel
genug.

**Konfigurierbare Texte / Site-Settings** — Editierbare Texte (z.B. Homepage-Intro)
liegen in der Tabelle `site_settings` (Key/Value, Plain-Text). Für neue editierbare
Felder: Key zur `ALLOWED_KEYS`-Whitelist in `backend/routers/settings.py` ergänzen,
im Frontend `getSetting('<key>')` aus `api/settings.ts` mit Fallback verwenden,
Admin-UI in `pages/AdminSettings.tsx` erweitern.

**Notifications** — Generische Tabelle `notifications` (siehe
`backend/models.py`: `Notification` + `NotificationType`-Enum,
JSON-Payload-Spalte). Jeder Typ hat ein eigenes Payload-Schema und einen
Frontend-Branch in `notificationText()`/`notificationLink()` in
`components/NotificationBell.tsx`. Ein neuer Notification-Typ erfordert:
(a) Enum-Wert in `NotificationType` + Migration für den Postgres-Enum-Wert,
(b) Trigger-Helper im jeweiligen Router (Vorbild:
`create_recipe_comment_notification` in `routers/notifications.py`),
(c) Hook im auslösenden Endpoint (Notification-Anlage IMMER in `try/except`
und mit `db.rollback()` im Fehlerfall, damit der Hauptfluss nicht blockiert),
(d) Frontend-TypeScript-Type für den neuen Payload, (e) Branches in
`notificationText()`/`notificationLink()`. Owner-Selbst-Aktionen lösen keine
Notification aus (Konvention: `recipient_id == actor_id` → return None).
Aktuelle Polling-Strategie: kein Polling — Unread-Count on-mount + nach
User-Interaktion (Glocke öffnen, Mark-Action). Bei zukünftigen Typen kann
das überdacht werden.

**Security-Hardening** — Rate Limiting, JWT-Lifetime, Bcrypt-Rounds, Upload-Validation,
CORS, Cloudflare-Konfig, Container-Hardening (read-only FS wo möglich, etc.).

## Was du *nicht* tun sollst

- Keine destruktiven Befehle vorschlagen (`DROP`, `TRUNCATE`, `rm -rf`,
  `docker volume rm`) ohne explizite Warnung und Backup-Hinweis
- Keine Secrets in Code/Configs hardcoden — immer `.env`
- Keine Container-Restarts/Rebuilds vorschlagen ohne den Befehl klar zu kennzeichnen
  (das geht aktuell nur lokal auf dem Pi)
- Keine Dependency-Major-Bumps "nebenbei" — die laufen über Dependabot-PRs
- Bei Änderungen, die Migration brauchen, niemals direkt `models.py` editieren ohne
  Alembic-Schritt mitzunennen
- **Tailwind-Theme-Änderungen**: Neue Custom-Farben/Fonts gehen in den
  `@theme {}`-Block in `frontend/src/index.css` (CSS-Variablen-Pattern
  `--color-{namespace}-{name}`, expandiert automatisch zu Utilities wie
  `bg-<name>`, `text-<name>`, `border-<name>`). NICHT mehr in eine
  `tailwind.config.js` — die existiert nicht mehr.
- **TypeScript noUnusedLocals**: Frontend-Build (`tsc -b && vite build`) ist
  strikt — ungenutzte Variablen, Funktionen oder Imports lassen den Build mit
  `error TS6133` failen. Beim Hinzufügen von Code: jede deklarierte Funktion
  muss tatsächlich aufgerufen werden, sonst raus damit. Gleiches gilt für
  ungenutzte Imports.
- **TS-Type-Union schrumpfen ohne alle `Record<…>`-Maps zu fixen**: Wenn ein
  Union-Type wie `'a' | 'b' | 'c'` auf `'a' | 'b'` reduziert wird, muss
  jede `Record<UnionType, …>`-Verwendung im ganzen Frontend durchgegangen
  werden — nicht nur die offensichtlichen Verwendungs-Stellen wie Filter
  oder Legenden. Sonst wirft `tsc -b --noEmit` ein `error TS2353: Object
  literal may only specify known properties`. Faustregel nach jeder
  Union-Schrumpfung: einmal `grep -rn "Record<TYPENAME"` über `frontend/src`
  und alle Treffer durchgehen. Frontend-TS-Check immer LOKAL vor PR-Push,
  nicht erst CI machen lassen — entweder über den Test-Stack, oder einmalig
  in einem `node:22-alpine`-Container mit Source-Mount: `docker run --rm -v
  "$(pwd)/frontend:/app" -w /app node:22-alpine sh -c "npm ci --silent &&
  npx tsc -b --noEmit"`.
- **Sortierbare Listen im Frontend (Drag-and-Drop-Konvention)**: Für sortierbare
  Child-Listen (z.B. Zutaten/Schritte im `RecipeForm`) wird `@dnd-kit/sortable`
  verwendet — nicht selbstgebaute Up/Down-Pfeil-Buttons. Setup: `PointerSensor`
  mit `activationConstraint: { distance: 5 }` (sonst feuert jeder Klick einen
  Drag) plus `KeyboardSensor` mit `sortableKeyboardCoordinates` (a11y). Pro
  sortierbarem Item ein Drag-Handle (`⋮⋮`) mit Klassen `cursor-grab
  active:cursor-grabbing touch-none select-none` — `touch-none` ist Pflicht,
  sonst scrollt iOS statt zu draggen. Items brauchen stabile IDs für
  `useSortable({ id })`: wenn die Daten clientseitig keine eigene ID haben
  (neu hinzugefügte Form-Rows), per `crypto.randomUUID()` ein `_uid`-Feld
  setzen — und dieses `_uid` **nicht** in den API-Payload aufnehmen. Die
  Reihenfolge im Backend kommt weiterhin aus dem Array-Index der gesendeten
  Liste (siehe `_replace_children` in `routers/recipes.py`), nicht aus einem
  expliziten `position`-Feld im Request.
- **`docker compose build` IST ein Prod-Deploy.** Der Standard-Compose-Stack
  ist gleichzeitig Prod. Jeder `docker compose build` (auch auf einem
  Feature-Branch!) überschreibt das `:latest`-Image, und das nächste
  `up -d` deployed sofort. Konsequenzen für Tests:
  - **Backend-pytest im Container**: NICHT mit `docker compose build backend
    && docker compose exec backend pytest` (= Prod-Deploy). Stattdessen
    `docker compose -f docker-compose.test.yml up -d --build backend-test`
    nutzen — separate Container, separate Ports, kein Prod-Impact. Container
    danach mit `docker compose -f docker-compose.test.yml down -v` wieder weg.
  - **Frontend-TS-Check**: gleiche Falle. Lokal über den Test-Stack bauen,
    nicht über den Prod-Stack.
  - **Schema-Migrations** sind besonders heikel: ein Build auf dem
    Feature-Branch lässt `entrypoint.sh` die neue Migration auch auf der
    Prod-DB durchlaufen. Das ist nicht trivial rückgängig zu machen.
- **"Neuester Eintrag"-Queries brauchen ID-Tiebreaker**: `order_by(<timestamp>.desc()).first()`
  ist non-deterministisch, sobald zwei Rows denselben Timestamp haben. Tritt in
  Tests reproduzierbar auf (zwei `client.post` direkt hintereinander → identischer
  `func.now()`-Wert), in Prod selten aber möglich. Konvention: bei "neuester"-
  Lookups immer `(<timestamp>.desc(), <table>.id.desc())` als Sort-Tuple, weil
  die Auto-Increment-ID monoton steigt und der Tiebreaker damit korrekt ist.
  Beispiel: `frequent_items.last`-Query in `routers/shopping.py`.
- **CORS allow_methods**: Backend erlaubt nur `GET, POST, PATCH, DELETE, OPTIONS`
  (siehe `backend/main.py`). Niemals `PUT` für neue Endpoints — Update-Konvention im
  Repo ist **PATCH** (siehe `routers/tags.py`, `routers/settings.py`). Wenn `PUT`
  wirklich nötig wird, muss `allow_methods` erweitert werden.
- **SQLAlchemy-Enums mit reserved-word-Workaround**: Wenn ein Python-Enum-Member
  einen Underscore-Suffix hat (z.B. `import_` mit value `"import"`, weil `import`
  reserved word ist), muss bei der Spalten-Definition `values_callable=lambda e:
  [m.value for m in e]` gesetzt werden. Sonst schreibt SQLAlchemy den
  Member-Namen (`import_`) und Postgres-Enums lehnen ab. Beispiel siehe
  `SeasonalAvailability` in `backend/models.py`.
- **Postgres-Enum-Werte (`ADD VALUE`) werden von Alembic-autogen NICHT erkannt**:
  Wenn ein neuer Wert zu einem bestehenden Postgres-Enum hinzugefügt wird (z.B.
  ein neuer `NotificationType`-Member im Python-Enum), sieht `alembic revision
  --autogenerate` den Diff einfach nicht — die generierte Migration enthält
  keine Enum-Änderung und schweigt darüber. Lösung: nach dem autogen den Schritt
  manuell ergänzen, idempotent für Re-Runs:
  `op.execute("ALTER TYPE <enum_name> ADD VALUE IF NOT EXISTS '<wert>'")`.
  In `downgrade()` lässt sich der Wert nicht sauber entfernen (Postgres
  unterstützt `DROP VALUE` nicht ohne Type-Recreate) — das ist OK, kommentieren
  und drinlassen. Beispiel siehe Migration `3dbd4892a161`.
- **SQLAlchemy `unique=True` + `index=True` an einer Column erzeugt ZWEI UNIQUE-Objekte**:
  einen automatischen `<table>_<col>_key` UNIQUE CONSTRAINT (von `unique=True`) UND
  einen `ix_<table>_<col>` UNIQUE INDEX (von `index=True` zusammen mit `unique=True`).
  Beides ist redundant. Folge: Alembic-Autogen markiert bei jeder neuen Migration den
  Constraint als "drop" weil das Model ihn nicht explizit definiert hat (Constraint-Drift).
  Faustregel: Im Model nur `index=True` + den Index-`unique=True`-Effekt nutzen, NICHT
  beides. Gut: `name = Column(String(100), nullable=False, index=True)` — der Index
  ist über `index=True` allein nicht unique, aber wenn Uniqueness gewünscht ist, dann
  entweder `UniqueConstraint(...)` in `__table_args__` ODER `Index(..., unique=True)`,
  nicht `unique=True` direkt am Column. Beispiel-Fix siehe Migration `adae80cc7b19`.
- **Alembic-Autogenerate kann Drift mitliefern, der nichts mit der aktuellen
  Änderung zu tun hat**: Wenn das DB-Schema in der Vergangenheit anders war
  als das aktuelle Model (Reste von alten `unique=True`/`index=True`-
  Definitionen), erzeugt `alembic revision --autogenerate` zusätzliche
  `op.drop_index(...)` / `op.create_index(...)`-Statements für Indizes, die
  mit dem eigentlichen Feature nichts zu tun haben. **Diese Bonus-Statements
  IMMER aus der Migration entfernen** — eine Migration namens
  `add_photo_diary_tables` darf nur Photo-Diary-Tabellen anlegen. Sonst (a)
  werden möglicherweise nützliche Indizes versehentlich gedroppt und (b)
  schlägt die Migration auf einer frischen DB fehl, weil dort der zu droppende
  Index gar nicht existiert. Den Drift entweder bewusst in einer separaten
  Migration adressieren, oder als TODO im Repo notieren.
- Bei Schema-Änderungen IMMER vorher prüfen ob die Migration auch auf einer frischen
  DB läuft (E2E-Tests bauen DB von 0 auf). Lokal gegen einen Wegwerf-Postgres testen
  bevor pushen. Eine Migration die auf Prod funktioniert weil bestehende Tabellen da
  sind, kann auf frischer DB scheitern.
- **Branch-Wechsel + Container-Rebuild**: Wenn auf einem Feature-Branch
  Migrations laufen und du dann zu `main` wechselst (PR noch nicht gemergt),
  läuft der nächste Container-Build mit altem Code gegen eine DB im neuen
  Stand. Symptom: `alembic upgrade head` failt mit `Can't locate revision
  identified by '<rev>'`, weil die Migration nur auf dem Feature-Branch
  existiert. Faustregel: **vor jedem `docker compose build` checken auf
  welchem Branch du bist** (`git branch --show-current`). Bei Inkonsistenz
  entweder zurück auf den Feature-Branch oder PR mergen, BEVOR rebuilt
  wird.

- **SQLite-In-Memory in pytest unterscheidet sich von Prod-Postgres**:
  - `ON DELETE CASCADE` und `ON DELETE SET NULL` werden in SQLite nicht
    automatisch durchgesetzt (FK-Pragma + ORM-Verhalten weichen ab). Tests, die
    Cascade-/SET-NULL-Verhalten prüfen, werden mit `@pytest.mark.skip` markiert
    und stattdessen via `docker-compose.test.yml` gegen frische Postgres
    verifiziert (Migration läuft auf leerer DB durch).
  - Boolean-Spalten brauchen NEBEN `server_default="false"` zusätzlich
    `default=False` (Python-seitig), sonst ist der Initialwert in SQLite-Tests
    nicht zuverlässig False. Beispiel siehe `RecipeComment.edited` in
    `models.py`.
- **Schnell-Iteration im laufenden Backend-Container** (für Tests, ohne
  Prod-Rebuild): Code-Änderungen direkt rüberkopieren mit
  `docker cp ~/homepage/backend/<datei> homepage-backend-1:/app/<datei>`,
  dann `docker compose exec -T backend python -m pytest <pfad> --no-cov`.
  Achtung: Der laufende Container ist Prod — die kopierten Files sind sofort
  live, bis der Container neu gebaut wird. Nur für additive/risikofreie
  Änderungen geeignet (neue Endpoints, Tests). Bei Änderungen an bestehenden
  Endpoints lieber den Test-Stack nutzen.
- **Frontend-API-Wrapper für Multipart-Uploads**: Der zentrale `api()`-Helper
  in `frontend/src/lib/api.ts` setzt `Content-Type: application/json`
  hardcoded. Für Multipart/Form-Data-Uploads muss der Browser die Boundary
  selbst setzen — also NICHT `api()` nutzen, sondern direkt `fetch()` mit
  `FormData`-Body und manuell den Auth-Header via `getToken()` setzen.
  Beispiel: `uploadImages()` in `frontend/src/api/diary.ts`.

## Prod-Deploy-Disziplin

**Wichtig zum Verständnis**: Es gibt KEIN Auto-Deploy. Ein `git push` auf `main`
deployed nichts. Code landet erst auf Prod, wenn ich auf dem Pi explizit
`git pull && docker compose build <service> && docker compose up -d <service>`
ausführe. Der Pi-Rebuild ist der einzige Deploy-Hebel.

Trotzdem gilt: **`main` muss jederzeit in deploy-bereitem Zustand sein.**
Hintergrund: Wenn ich auf dem Pi mal ohne genau hinzuschauen pulle und
rebuilde (oder falls ein Chat unterwegs abbricht und ich später nicht mehr
weiß, was Sache war), darf `main` mich nicht mit einem kaputten Backend,
Frontend oder einer kaputten Migration überraschen.

Daraus folgt:

- **Feature-Branch-Workflow für alles, was Backend, Frontend, DB oder
  Compose-Setup berührt.** Ablauf:
  1. `git checkout -b feature/<name>` — vom aktuellen `main` aus
  2. Code-Änderungen, lokale Tests
  3. Push: `git push -u origin feature/<name>`
  4. PR auf GitHub öffnen → CI muss grün werden (Backend-Tests + E2E)
  5. **Erst nach grüner CI mergen**, niemals "rot mergen und später fixen".
     Damit ist `main` immer deploy-bereit.
  6. Nach Merge: `git checkout main && git pull && git branch -d feature/<name>`
- **PR-Erstellung & Merge laufen über `gh` CLI**, nicht über den Browser. Beim
  Aufgeben von "PR öffnen" o.ä. liefere ich (Claude) immer den vollen
  `gh pr create ...` Befehl mit Title + Body als Heredoc, plus die Merge-
  Befehle (`gh pr merge --squash --delete-branch`). Squash-Merge ist Default,
  damit `main` eine flache Commit-History behält.
- **Pi-Deploy ist ein bewusster, separater Schritt** — kommt nach dem Merge,
  nicht automatisch. Reihenfolge auf dem Pi:
  `git pull && docker compose build <service> && docker compose up -d <service>`.
- **Bei Schema-Änderungen zusätzlich**: vor dem Pi-Deploy DB-Backup ziehen
  (`./scripts/backup-db.sh`), und die Migration vorher auf einer frischen DB
  testen (siehe Hinweis im "Was du *nicht* tun sollst"-Abschnitt zu
  Branch-Wechsel + Container-Rebuild).
- **Wenn ein Chat unterwegs abbricht** (Tokens leer, Verbindung weg): solange
  nichts auf `main` gemergt wurde, ist Prod sicher — der Pi läuft auf dem
  letzten gemergten Stand weiter. Der Feature-Branch kann im nächsten Chat
  weiterbearbeitet werden. Deshalb: **lieber zu früh committen und pushen**
  (auf den Feature-Branch) als zu spät — uncommittete Änderungen sind im
  Worst Case verloren.
- **Hotfixes** (Prod brennt, muss schnell raus): direkter `main`-Push ist OK,
  aber Backend-Tests vorher lokal grün gesehen haben.

Faustregel beim Aufgabenstart: *"Würde ich diese Änderung gerade auf Prod
ausrollen wollen, ohne sie vorher gesehen zu haben?"* Wenn nein → Feature-Branch.

## Aktuelle Aufgabe

<!-- HIER pro Chat ausfüllen: -->
**Branch**: 
**Was ich machen will**: 


## Am Ende dieses Chats

Bevor wir den Chat beenden, prüfe bitte aktiv, ob dieser Context-Primer aktualisiert
werden sollte. Erinnere mich am Ende des Chats explizit daran und schlage konkrete
Diffs vor, falls einer dieser Punkte zutrifft:

- Es wurde eine neue Dependency, ein neuer Service oder ein neues Tool hinzugefügt
  oder entfernt
- Eine bestehende Library/Service wurde ausgetauscht (z.B. Mailversand, DB, Auth)
- Eine neue Konvention wurde etabliert (Naming, Branching, Testing, Code-Style)
- Eine Architektur-Entscheidung wurde getroffen (neuer Endpoint-Pattern,
  Folder-Struktur, etc.)
- Ein Pfad, Port oder Hostname hat sich geändert
- Eine "Stolperfalle" ist aufgetaucht, die in zukünftigen Chats vermieden werden
  sollte (z.B. Missverständnisse, mehrfach erklärte Eigenheiten)

Wenn nichts davon zutrifft, sag das einfach kurz — kein Update nötig.

Format der Update-Vorschläge: konkreter Vorher/Nachher-Diff oder "ergänze unter
Abschnitt X folgende Zeile: …", damit ich es direkt mit `nano .claude/context.md`
übernehmen und committen kann.
