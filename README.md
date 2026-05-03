# markus-schwarz.cc

[![Backend Tests](https://github.com/markusschwarz99/homepage/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/markusschwarz99/homepage/actions/workflows/backend-tests.yml)
[![E2E Tests](https://github.com/markusschwarz99/homepage/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/markusschwarz99/homepage/actions/workflows/e2e-tests.yml)
[![codecov](https://codecov.io/gh/markusschwarz99/homepage/branch/main/graph/badge.svg)](https://codecov.io/gh/markusschwarz99/homepage)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)


Persönliche Homepage mit Rezepte-Archiv, geteilter Einkaufsliste für den
Haushalt, Saisonkalender, Impostor-Spiel und privatem Fototagebuch.
Läuft self-hosted auf einem Raspberry Pi hinter einem Cloudflare Tunnel.

## Features

- **Rezepte**: Strukturierte Zutaten mit Portions-Skalierung,
  Schritt-für-Schritt-Anleitungen, Bilder-Galerie, Kommentare,
  Tag-basiertes Filtern.
- **Einkaufsliste**: Geteilt im Haushalt, mit Frequent-Items und History.
- **Saisonkalender**: Welches Obst/Gemüse hat regional, aus Lager oder als
  Import gerade Saison. Pro Item bis zu drei Verfügbarkeits-Typen pro
  Monat. Verwaltung im Admin-Bereich.
- **Impostor-Spiel**: Öffentlich erreichbar, ohne Login. Setup,
  Tap-and-Hold-Reveal, Auflösung. Kategorien & Wörter sind in der DB,
  Verwaltung im Admin-Bereich.
- **Fototagebuch** (Admin-only): Mehrere Einträge pro Tag mit
  optionalem Text und beliebig vielen Bildern. Liste oder Kalender,
  Drag-and-Drop-Reorder, Bild-Captions, Lightbox.
- **Rollen**: Guest / Member / Household / Admin
- **Auth**: Email-Verifizierung, JWT, Password-Reset per Mail
- **Admin-Bereich**: User-Verwaltung, Tag-Verwaltung,
  Saisonkalender-Verwaltung, Impostor-Verwaltung, Site-Settings.

## Tech Stack

**Backend**
- Python 3.12, FastAPI + SQLAlchemy + Alembic
- PostgreSQL 16
- JWT-Auth (python-jose + bcrypt)
- Pillow (Bildverarbeitung, WebP)
- Resend (Mailversand)
- SlowAPI (Rate Limiting)
- pytest + Codecov

**Frontend**
- React 19 + TypeScript + Vite
- React Router 7
- Tailwind CSS 4 (CSS-first config in `frontend/src/index.css`)
- TipTap 3 Editor (Rezept-Beschreibungen)
- @dnd-kit (Drag-and-Drop für Bild-Reorder)
- DOMPurify (HTML-Sanitization)

**E2E**
- Playwright (TypeScript)

**Infrastructure**
- Docker Compose (backend / frontend / db)
- Nginx (serves Frontend)
- Cloudflare Tunnel (Public-Zugriff ohne offene Ports)
- Portainer (Container-Verwaltung auf Port 9000)

## Setup

### Voraussetzungen

- Docker + Docker Compose
- Domain mit DNS-Zugriff (für Email + Cloudflare Tunnel)
- [Resend](https://resend.com) Account + verifizierte Sender-Domain

### 1. Repository klonen

```bash
git clone https://github.com/markusschwarz99/homepage.git
cd homepage
```

### 2. Environment-Dateien erstellen

**Backend:**

```bash
cp .env.example .env
nano .env   # Werte ausfüllen
```

**Frontend:**

```bash
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production   # VITE_API_URL setzen
```

**JWT-Secret generieren:**

```bash
openssl rand -hex 48
```

### 3. Container bauen + starten

```bash
docker compose up -d --build
```

Beim ersten Start werden die Datenbank-Migrations automatisch über
`alembic upgrade head` im `entrypoint.sh` des Backend-Containers ausgeführt.

### 4. Admin-User anlegen

Registriere dich zunächst ganz normal per Frontend, bestätige die Email.
Dann direkt in der Datenbank die Rolle auf `admin` setzen:

```bash
source .env
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "UPDATE users SET role = 'admin' WHERE email = 'deine@email.com';"
```

## Projektstruktur

```
homepage/
  backend/
    routers/                # API-Endpoints (auth, recipes, recipe_comments,
                            # tags, shopping, seasonal, impostor, diary,
                            # settings, admin)
    alembic/versions/       # DB-Migrations
    tests/                  # pytest
    scripts/                # Maintenance-Skripte
    models.py               # SQLAlchemy-Models
    auth.py                 # JWT + Auth-Guards
                            # (require_member / require_household / require_admin)
    database.py             # DB-Connection
    upload_utils.py         # Bild-Uploads (mit/ohne Resize+Thumb)
    email_service.py
    main.py                 # FastAPI-Entrypoint
  frontend/
    src/
      pages/                # Routen-Komponenten
      components/           # Wiederverwendbare UI
      api/                  # API-Wrapper pro Domain
      hooks/
      lib/
      types/
    package.json
  e2e/                      # Playwright-Tests
  scripts/
    backup-db.sh            # DB-Backup-Skript
  docker-compose.yml
  docker-compose.test.yml   # Separater Test-Stack
```

## Rollen-Modell

| Rolle                                | Rezepte | Saisonkalender | Einkaufsliste | Impostor | Fototagebuch | Admin |
|--------------------------------------|:-------:|:--------------:|:-------------:|:--------:|:------------:|:-----:|
| `guest` (default nach Registrierung) |    -    |        -       |       -       |     +    |       -      |   -   |
| `member`                             |    +    |        +       |       -       |     +    |       -      |   -   |
| `household`                          |    +    |        +       |       +       |     +    |       -      |   -   |
| `admin`                              |    +    |        +       |       +       |     +    |       +      |   +   |

Impostor ist komplett öffentlich, kein Login nötig. Neue Registrierungen
landen automatisch auf `guest` und müssen vom Admin freigegeben werden.

## Tests

**Backend (pytest, gegen SQLite-In-Memory):**

```bash
docker compose -f docker-compose.test.yml up -d --build backend-test
docker compose -f docker-compose.test.yml exec -T backend-test pip install -r requirements-dev.txt
docker compose -f docker-compose.test.yml exec -T backend-test python -m pytest --no-cov
docker compose -f docker-compose.test.yml down -v
```

**E2E (Playwright):** siehe [`e2e/README.md`](e2e/README.md).

## Lizenz

GPL-3.0 – siehe [LICENSE](LICENSE).
