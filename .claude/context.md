# Kontext für diesen Chat

Ich arbeite an meiner persönlichen Homepage **markus-schwarz.cc** — selbst gehostet auf
einem Raspberry Pi. Antworte bitte auf Deutsch, sei direkt und pragmatisch.

## Was die Seite macht

Persönliche Homepage mit drei Hauptbereichen:
- **Blog** (Admin-only, TipTap-Rich-Editor mit Bild-Upload)
- **Rezepte-Archiv** (strukturierte Zutaten mit Portions-Skalierung, Schritt-für-Schritt,
  Bilder-Galerie, Tag-Filter)
- **Einkaufsliste** (geteilt im Haushalt, mit Frequent-Items und History)

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
- Tailwind CSS 3.4 + `@tailwindcss/typography`
- TipTap 3 (Rich-Editor: Image, Link, Placeholder, TextAlign, Underline, StarterKit)
- DOMPurify für HTML-Sanitization
- ESLint 10 + typescript-eslint

**E2E** — Playwright 1.59 (TypeScript), separates Projekt unter `e2e/`

**Infrastruktur**
- Docker Compose (3 Services: backend, frontend, db) + dedizierte Volumes
  `postgres_data`, `user_uploads`
- Backend baut aus `./backend/Dockerfile` (non-root user `app`, Port 8000)
- Frontend baut aus `./frontend` mit Build-Arg `VITE_API_URL=https://api.markus-schwarz.cc`,
  serviert über Nginx im Container auf Port 80
- DB nur intern erreichbar (Container-Netzwerk, kein Port-Mapping)
- Backend hat IPv6 disabled via sysctl
- **Nginx Proxy Manager** als Reverse Proxy (separates Compose-Setup unter
  `~/nginx-proxy-manager/`)
- **Cloudflare Tunnel** (`cloudflared` als systemd-Service) — kein Port-Forwarding, keine
  öffentliche IP
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

- Frontend: `https://markus-schwarz.cc` → Cloudflare Tunnel → NPM → Frontend-Container :80
- Backend: `https://api.markus-schwarz.cc` → Cloudflare Tunnel → NPM → Backend-Container :8000
- SSH: nur lokal/LAN

## Konventionen & Workflows

- **Commits**: Conventional Commits (`feat:`, `fix:`, `deps(backend):`, `deps(frontend):`,
  `deps(ci):`, `chore:`, `docs:`, `test:`, `refactor:`)
- **Branching**: arbeite direkt auf `main` (Solo-Projekt); für größere Features ggf.
  `feature/<name>`-Branches
- **Dependabot** aktiv für backend, frontend, ci
- **CI**: GitHub Actions — Backend-Tests + E2E-Tests + Codecov, müssen grün sein
- **Migrations**: Alembic — bei Schema-Änderungen immer Migration generieren, niemals
  Tabellen direkt ändern
- **Secrets**: ausschließlich in `.env` (nicht committed). `.env.example` als Template
  pflegen, wenn neue Env-Vars dazukommen
- **Lizenz**: GPLv3

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

## Aktuelle Aufgabe

<!-- HIER pro Chat ausfüllen: -->
**Branch**: `main`
**Was ich machen will**: …

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
