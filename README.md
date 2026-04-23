# markus-schwarz.cc

Persönliche Homepage mit Blog, Rezepte-Archiv und geteilter Einkaufsliste für den Haushalt. Läuft self-hosted auf einem Raspberry Pi hinter einem Cloudflare Tunnel.

## Features

- **Blog** (Admin-only): Beiträge mit TipTap-Rich-Editor, Bild-Upload
- **Rezepte**: Strukturierte Zutaten mit Portions-Skalierung, Schritt-für-Schritt-Anleitungen, Bilder-Galerie, Tag-basiertes Filtern
- **Einkaufsliste**: Geteilt im Haushalt, mit Frequent-Items und History
- **Rollen**: Guest / Member / Household / Admin
- **Auth**: Email-Verifizierung, JWT, Password-Reset per Mail
- **Admin-Bereich**: User-Verwaltung, Tag-Verwaltung

## Tech Stack

**Backend**
- FastAPI + SQLAlchemy + Alembic
- PostgreSQL 16
- JWT-Auth (python-jose + bcrypt)
- Resend (Mailversand)
- SlowAPI (Rate Limiting)

**Frontend**
- React 19 + TypeScript + Vite
- React Router 7
- Tailwind CSS
- TipTap Editor

**Infrastructure**
- Docker Compose
- Nginx (serves Frontend)
- Cloudflare Tunnel (Public-Zugriff ohne offene Ports)

## Setup

### Voraussetzungen
- Docker + Docker Compose
- Domain mit DNS-Zugriff (für Email + Cloudflare Tunnel)
- [Resend](https://resend.com) Account + verifizierte Sender-Domain

### 1. Repository klonen
\`\`\`bash
git clone https://github.com/DEIN-USERNAME/DEIN-REPO.git
cd DEIN-REPO
\`\`\`

### 2. Environment-Dateien erstellen
\`\`\`bash
# Backend
cp .env.example .env
nano .env   # Werte ausfüllen

# Frontend
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production   # VITE_API_URL setzen
\`\`\`

JWT-Secret generieren:
\`\`\`bash
openssl rand -hex 48
\`\`\`

### 3. Container bauen + starten
\`\`\`bash
docker compose up -d --build
\`\`\`

Beim ersten Start werden die Datenbank-Tabellen automatisch angelegt.

### 4. Admin-User anlegen
Registriere dich zunächst ganz normal per Frontend, bestätige die Email. Dann direkt in der Datenbank die Rolle auf \`admin\` setzen:

\`\`\`bash
source .env
docker compose exec db psql -U "\$POSTGRES_USER" -d "\$POSTGRES_DB" -c \\
  "UPDATE users SET role = 'admin' WHERE email = 'deine@email.com';"
\`\`\`

## Projektstruktur

\`\`\`
.
├── backend/
│   ├── routers/        # API-Endpoints (auth, blog, recipes, tags, shopping, admin)
│   ├── models.py       # SQLAlchemy-Models
│   ├── auth.py         # JWT + Auth-Guards (require_member / require_household / require_admin)
│   ├── database.py     # DB-Connection
│   ├── email_service.py
│   └── main.py         # FastAPI-Entrypoint
├── frontend/
│   ├── src/
│   │   ├── pages/      # Routen-Komponenten
│   │   ├── components/ # Wiederverwendbare UI
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
└── docker-compose.yml
\`\`\`

## Rollen-Modell

| Rolle | Blog | Rezepte | Einkaufsliste | Admin |
|-------|:----:|:-------:|:-------------:|:-----:|
| \`guest\` (default nach Registrierung) | ❌ | ❌ | ❌ | ❌ |
| \`member\` | ❌ | ✅ | ❌ | ❌ |
| \`household\` | ❌ | ✅ | ✅ | ❌ |
| \`admin\` | ✅ | ✅ | ✅ | ✅ |

Neue Registrierungen landen automatisch auf \`guest\` und müssen vom Admin freigegeben werden.

## Lizenz

GPL-3.0 – siehe [LICENSE](LICENSE).
