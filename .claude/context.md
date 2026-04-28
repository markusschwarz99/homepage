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
- **Branching**: arbeite direkt auf `main` (Solo-Projekt); für größere Features ggf.
  `feature/<name>`-Branches
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

## Typische Aufgaben & wie ich Hilfe brauche

**Bugs / Debugging** — Wenn Logs hilfreich wären, frag nach:
`docker compose logs -f backend` / `docker compose logs -f frontend`. Bei DB-Fragen:
`docker compose exec db psql -U $POSTGRES_USER $POSTGRES_DB`.

**Neue Features** — Schlage Code vor, der zum bestehenden Stil passt
(FastAPI-Router-Pattern, React-Function-Components mit Hooks, Tailwind-Klassen).
Wenn DB-Schema betroffen ist: Alembic-Migration mitliefern.

**Code-Review / Refactoring** — Achte auf Sicherheits-Aspekte (JWT-Handling,
Input-Validation, SQL-Injection, XSS via DOMPurify), Lesbarkeit, Performance auf einem Pi 5.

**Deployment / DevOps** — Compose-Änderungen, Dockerfile-Optimierungen, NPM-Konfiguration,
Cloudflare-Tunnel, Backup-Strategie, Logs/Monitoring. Berücksichtige ARM64.

**DB-Queries / Schema** — Postgres 16, SQLAlchemy ORM. Bei `ALTER TABLE` o.ä. → immer
über Alembic-Migration. Vor Migrations Backup-Erinnerung.

**Konfigurierbare Texte / Site-Settings** — Editierbare Texte (z.B. Homepage-Intro)
liegen in der Tabelle `site_settings` (Key/Value, Plain-Text). Für neue editierbare
Felder: Key zur `ALLOWED_KEYS`-Whitelist in `backend/routers/settings.py` ergänzen,
im Frontend `getSetting('<key>')` aus `api/settings.ts` mit Fallback verwenden,
Admin-UI in `pages/AdminSettings.tsx` erweitern.

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
- **CORS allow_methods**: Backend erlaubt nur `GET, POST, PATCH, DELETE, OPTIONS`
  (siehe `backend/main.py`). Niemals `PUT` für neue Endpoints — Update-Konvention im
  Repo ist **PATCH** (siehe `routers/tags.py`, `routers/settings.py`). Wenn `PUT`
  wirklich nötig wird, muss `allow_methods` erweitert werden.
- Bei Schema-Änderungen IMMER vorher prüfen ob die Migration auch auf einer frischen
  DB läuft (E2E-Tests bauen DB von 0 auf). Lokal gegen einen Wegwerf-Postgres testen
  bevor pushen. Eine Migration die auf Prod funktioniert weil bestehende Tabellen da
  sind, kann auf frischer DB scheitern.

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
