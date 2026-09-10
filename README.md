# DataPilot AI

An enterprise-grade data analytics platform that lets you upload datasets, automatically profile and understand them, and ask natural-language questions to an AI copilot. Built for privacy-first teams with dynamic PII masking, full data governance settings, and a polished Material Design 3 interface.

![DataPilot AI](src/assets/hero.png)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend (FastAPI)](#backend-fastapi-recommended)
  - [Backend (Express)](#backend-express-alternative)
  - [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Pages & Routes](#pages--routes)
- [Design System](#design-system)
- [Interactive Background (DotGrid)](#interactive-background-dotgrid)
- [License](#license)

---

## Overview

DataPilot AI is a full-stack data intelligence dashboard built as a single-page application (SPA). It ingests tabular data (CSV, Excel, SQLite), generates rich column-level profiles with health scores, and provides a conversational AI copilot that answers questions about your data in plain English — returning SQL, charts, and analysis.

The app was designed with a **privacy-first** approach: dynamic PII masking is applied client-side before any data previews are rendered, and a dedicated workspace governance page controls masking rules, role-based access, and integrity policies.

---

## Features

### Data Ingestion
- Drag-and-drop upload for tabular files (CSV, Excel, SQLite) via `multer` / FastAPI `UploadFile`.
- Automatic type inference, per-column statistics, missingness detection, and schema extraction powered by `pandas`.
- Recent uploads list and per-dataset detail modal with **Schema** and **Preview** tabs.

### Data Profiling
- Data dictionary (column types, stats, distributions).
- Missingness matrix with empty-value highlighting.
- Schema optimization recommendations.
- Dataset health score computed from data-quality issues and missing ratios.

### AI Copilot
- Natural-language questions about your workspace and datasets.
- Dynamic LLM provider: **Google Gemini 2.0 Flash** or **OpenAI (`gpt-4o-mini`)**.
- Conversations, message history, and per-user persistence.
- Direct rule-based answers for health/missingness/column questions, falling back to a hosted LLM with a workspace-aware context prompt.

### Governance & Settings
- 5-tab settings panel: **General, Privacy, Integrity, Team, Integrations**.
- Privacy: PII masking toggles (SSN, email, payments, geo) via `src/utils/mask.js`.
- Integrity: confidence threshold and ZDR (zero-data-retention) mode.
- Team: invite/remove workspace members.
- Integrations: API keys and webhooks management.

### Auth & Security
- JWT-based authentication (`python-jose` on FastAPI, `jsonwebtoken` on Express).
- Passwords hashed with `bcrypt`.
- All APIs (except `health`, `register`, `login`) require a bearer token.

### UI / UX
- React 19 + Material Design 3 color token system with **light and dark themes**.
- Responsive layout: sidebar (desktop) + slide-in drawer (mobile).
- Animated **interactive dot-grid background** on every page (GSAP).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| **State** | React Context (`SettingsContext`) + custom `useTheme` hook |
| **Primary Backend** | Python FastAPI + pandas (data analysis), SQLite |
| **Alternative Backend** | Node.js Express + better-sqlite3 |
| **Database** | SQLite (`datapilot.db`) |
| **Auth** | JWT + bcrypt |
| **AI** | Google Gemini 2.0 Flash / OpenAI `gpt-4o-mini` |
| **Animations** | GSAP (core + InertiaPlugin) |
| **Linting** | Oxlint |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          React SPA (Vite dev/build)         │
│  pages → src/api/*  (fetch wrapper)         │
└──────────────────────┬──────────────────────┘
                       │  auto-discovery: probes /api/health
                       │  1. VITE_API_URL or Render deploy
                       │  2. http://localhost:8000
              ┌────────┴─────────┐
              │                  │
     ┌────────▼─────────┐ ┌─────▼───────────┐
     │  app/  FastAPI   │ │ backend/ Express│
     │  (Python/pandas) │ │ (Node/SQLite)   │
     └────────┬─────────┘ └─────┬───────────┘
              │                  │
              └──────┬───────────┘
                     ▼
                 SQLite (datapilot.db)
```

The frontend does **not** hard-code a single backend. `src/api/index.js` probes candidate base URLs in order (`VITE_API_URL` → deployed Render URL → `localhost:8000`) and caches the first healthy one. You can run either backend; the Express server runs on port `3001`, FastAPI on `8000`.

---

## Project Structure

```
DataPilot AI/
├── index.html                 # Vite SPA entry (mounts #root)
├── vite.config.js             # Vite + React + Tailwind plugin
├── package.json               # Frontend deps & scripts
├── src/
│   ├── main.jsx               # StrictMode > SettingsProvider > Router
│   ├── App.jsx                # Route definitions (all nested under Layout)
│   ├── index.css              # Tailwind v4 + Material Design 3 theme (light/dark)
│   ├── components/
│   │   ├── Layout.jsx         # Sidebar + header + <Outlet /> + DotGrid bg
│   │   ├── DotGrid.jsx        # Interactive animated dot-grid (React Bits)
│   │   └── DotGrid.css
│   ├── pages/
│   │   ├── Landing.jsx        # Hero, feature showcase, ROI calculator
│   │   ├── Upload.jsx         # File upload drop zone + recent uploads
│   │   ├── Datasets.jsx       # Dataset grid + detail modal
│   │   ├── Profiling.jsx      # Data dictionary, missingness, optimization
│   │   ├── Copilot.jsx        # AI chat + conversations sidebar
│   │   └── Settings.jsx       # 5-tab governance panel
│   ├── api/                   # Backend API layer (auto-discovery)
│   ├── context/SettingsContext.jsx
│   ├── hooks/useTheme.js
│   └── utils/mask.js          # Client-side PII masking
├── app/                       # Python FastAPI backend
│   ├── main.py                # All routes (auth, datasets, profiles, copilot, settings)
│   ├── analyzer.py            # pandas-based file analysis + rule answers
│   ├── auth.py                # JWT + bcrypt
│   ├── models.py              # Pydantic models
│   └── database.py            # SQLite init
├── backend/                   # Node.js Express backend (alternative)
│   ├── server.js              # Express on :3001
│   ├── routes/                # auth, datasets, profiles, copilot, settings
│   ├── middleware/auth.js
│   ├── database/              # schema + seed
│   └── uploads/
├── uploads/                   # Uploaded file storage (git-ignored)
└── datapilot.db               # SQLite database (git-ignored)
```

---

## Getting Started

> Requires **Node.js 18+** and optionally **Python 3.10+**.

### Backend (FastAPI — recommended)

```bash
cd app
python -m pip install fastapi uvicorn "python-jose[cryptography]" bcrypt pandas numpy python-multipart
uvicorn main:app --host 0.0.0.0 --port 8000
```

> The project root is added to `sys.path` (`app/main.py` sets `UPLOAD_DIR` relative to it), so the app expects to be launched as `uvicorn main:app` from inside `app/` (or `uvicorn app.main:app` from the project root).

### Backend (Express — alternative)

```bash
cd backend
npm install
npm run dev          # starts on http://localhost:3001
npm run seed         # optional: seed the database
```

### Frontend

```bash
npm install
npm run dev          # starts Vite dev server
npm run build        # production build
npm run lint         # oxlint checks
```

Open the URL printed by Vite (default `http://localhost:5173`). The frontend auto-detects a running backend via `/api/health` — no manual URL config needed.

---

## Environment Variables

### Frontend (`VITE_` prefixed, copied to `.env.local` or Vite config)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Optional. Overrides the first backend probe (e.g. a deployed Render URL). |

### Backend (Express — `backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port. |
| `JWT_SECRET` | `datapilot-dev-secret-key-change-in-production` | Secret used to sign JWT tokens. **Change in production.** |
| `NODE_ENV` | `development` | Runtime mode. |

### FastAPI backend

| Variable | Default | Description |
|----------|---------|-------------|
| JWT secret / LLM keys | hard-coded dev defaults | `app/auth.py` uses `datapilot-dev-secret-change-in-production`. OpenAI/Gemini API keys are stored **per-user** in workspace settings (Settings → Integrations) and used at request time. |

> **Security note:** Never deploy with the default JWT secrets. Both backends ship dev defaults explicitly marked `-change-in-production`. The FastAPI JWT secret is currently hard-coded in `app/auth.py`.

---

## API Overview

All endpoints are prefixed with `/api` and (except `health`, `register`, `login`) require a `Bearer` token.

| Area | Endpoints |
|------|-----------|
| **Health** | `GET /api/health` |
| **Auth** | `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` |
| **Stats** | `GET /api/stats/overview` |
| **Datasets** | `GET/POST /api/datasets` · `POST /api/datasets/upload` · `GET/PUT/DELETE /api/datasets/{id}` · `GET /api/datasets/{id}/rows` |
| **Profiling** | `GET/POST /api/profiles/dataset/{id}` · `DELETE /api/profiles/{id}` · `DELETE /api/profiles/dataset/{id}` |
| **Copilot** | `GET/POST /api/copilot/conversations` · `GET/POST /api/copilot/conversations/{id}/messages` · `DELETE /api/copilot/conversations/{id}` |
| **Settings** | `GET/PUT /api/settings/workspace` · `GET/POST/DELETE /api/settings/team` · `GET/POST/DELETE /api/settings/api-keys` · `GET/POST/DELETE /api/settings/webhooks` |

Interactive docs are available at `/docs` (Swagger) when running FastAPI.

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, module showcase, ROI calculator, CTA. |
| `/upload` | Upload | Drag-and-drop upload, recent uploads list. |
| `/datasets` | Datasets | Dataset grid + detail modal (schema & preview tabs). |
| `/profiling` | Profiling | Data dictionary, missingness matrix, schema optimization. |
| `/copilot` | DataPilot AI | AI chat interface with conversations sidebar. |
| `/settings` | Settings | General, Privacy, Integrity, Team, Integrations tabs. |

All routes render inside the shared `Layout`, which provides the sidebar, header, theme toggle, and the animated background.

---

## Design System

Material Design 3–inspired token system defined in `src/index.css` via Tailwind v4 `@theme inline`:

- **Core tokens:** `surface-*`, `primary-*`, `secondary-*`, `tertiary-*`, `status-*`, `error-*`, `border-*`, `on-*`, `outline-*`.
- **Theming:** full light + dark palettes toggled by adding/removing the `.dark` class on `<html>` (see `src/hooks/useTheme.js`, persisted in `localStorage`).
- **Fonts:** Inter (body) + Plus Jakarta Sans (headings `font-display`).
- **Icons:** Google Material Symbols Outlined (via CDN).

---

## Interactive Background (DotGrid)

Every page renders an **interactive dot-grid background** (`src/components/DotGrid.jsx`) adapted from [React Bits](https://reactbits.dev/). Built with **GSAP + InertiaPlugin** on a single `<canvas>`:

- **Hover inertia:** dots scatter away from fast-moving cursors with physics-based resistance.
- **Click shockwave:** clicking radiates a ripple that pushes nearby dots outward.
- **Theme-aware colors:** uses `--c-primary` values for light (`#00288E`) and dark (`#B8C4FF`) modes.
- Fixed, full-viewport layer with `pointer-events: none` (below all app UI) and ~40% opacity so content stays readable.

Tunable via props: `dotSize`, `gap`, `baseColor`, `activeColor`, `proximity`, `speedTrigger`, `shockRadius`, `shockStrength`, `maxSpeed`, `resistance`, `returnDuration`.

---

## License

Private project. All rights reserved.