# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multimodal phishing detection system with four independent services:
- **Backend** — Node.js/Express REST API (`/backend_new`)
- **User Frontend** — React/Vite consumer dashboard (`/Frontend/user-frontend`)
- **Admin Frontend** — React/Vite admin dashboard (`/Frontend/admin-frontend`)
- **ML Service** — Python/Flask inference server (`/fyp_multimodal_model`)

## Commands

### Backend (`/backend_new`)
```bash
npm install
npx prisma generate          # After schema changes
npx prisma db push           # Sync schema to database
npm run dev                  # Dev server with nodemon on port 5000
npm start                    # Production server
```

### User Frontend (`/Frontend/user-frontend`)
```bash
npm install
npm run dev                  # Vite dev server
npm run build
npm run lint
```

### Admin Frontend (`/Frontend/admin-frontend`)
```bash
npm install
npm run dev                  # Vite dev server
npm run build
npm run lint
```

### ML Service (`/fyp_multimodal_model`)
```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py                # Flask server on port 5001

# Model training (run independently, in this order)
python train_url_production.py --config config.json
python train_dom_doc2vec_lgbm.py
python train_visual_resnet.py
python train_fusion_model.py --config config.json

# ML service tests
python test_full_pipeline.py
python test_live_urls.py --benign
python test_phishing_feed.py
```

## Architecture

### Data Flow
```
Browser → React Frontend → Backend API (port 5000) → PostgreSQL
                                    ↓
                           ML Service (port 5001)
                           ├─ URL feature extraction
                           ├─ Webpage fetch + screenshot (Selenium/undetected_chromedriver)
                           ├─ DOM extraction (BeautifulSoup)
                           ├─ 3 independent model inferences
                           ├─ Fusion ensemble prediction
                           ├─ SHAP explanations
                           └─ Gemini LLM natural language explanation
```

### Backend Structure
- **Routes**: `/src/routes/` — mounted at `/api/auth`, `/api/scan`, `/api/reviews`, `/api/admin`, `/api/admin/mlops`
- **Controllers/Services**: standard Express MVC under `/src/`
- **Database**: Prisma ORM with PostgreSQL; schema defined in `/backend_new/prisma/schema.prisma`
  - `auth` schema — users, sessions, verification/2FA/reset tokens
  - `core` schema — scans, results, SHAP values, screenshots, IPs, reviews
  - `admin` schema — audit logs
  - `analytics` schema — daily scan stats, model metrics
  - `mlops` schema — pipeline health, retraining jobs
- **Auth middleware** (`src/middlewares/auth.js`): `auth(roles=[])` — blocks without token; pass `'ADMIN'` to restrict to admins. Scan routes use an inline `softAuth` that sets `req.user` when a token is present but never blocks.
- **JWT**: access tokens (15 min) + refresh tokens (7 days); email 2FA OTP; Google OAuth via `google-auth-library`
- **Email**: `services/email.service.js` sends mail; `services/cron.service.js` batches outbound emails (verification, 2FA, password reset) to avoid SMTP hammering
- **ML fallback**: `services/ml.service.js` catches `ECONNREFUSED` and returns mock data so the backend can be developed independently of the running ML service
- **Rate limiting**: 100 req / 15 min per IP (express-rate-limit)

### ML Service Modalities
Three independent classifiers are fused into a single ensemble prediction:
| Modality | Model | Input |
|----------|-------|-------|
| URL | LightGBM (`url_lgbm_production.joblib`) | Extracted URL features |
| DOM | Doc2Vec + LightGBM (`dom_doc2vec_lgbm.joblib`) | HTML structure tokens |
| Visual | ResNet50 CNN — fine-tuned, 2-class softmax output (p_visual). No Doc2Vec. (`visual_resnet50.pt`) | Webpage screenshot |
| Fusion | LightGBM (`fusion_lgbm.joblib`) | Outputs of above 3 |

All models live in `/fyp_multimodal_model/models/`. When a modality fails at inference time, it returns `-1.0` as a sentinel (the fusion model treats this as "missing"). Core inference entry point is `inference_complete.py:predict_complete_pipeline()`; `inference_pipeline.py` contains the lower-level per-modality fetch+predict logic. SHAP + Gemini explanations are in `explain_prediction.py`.

`webpage_fetcher.py` uses `undetected_chromedriver` + `selenium_stealth` to evade bot detection. Screenshots are saved to the OS temp dir and served at `/screenshots/<filename>` by the Flask app.

### Frontend Architecture
Both frontends use the same stack: React 19, Vite, Tailwind CSS v4, Radix UI, react-router-dom v7, axios.

**User frontend** (`/Frontend/user-frontend`):
- Auth state lives in `App.jsx` as local `useState` backed by `localStorage` — no context provider
- Routes: `/` (landing), `/login`, `/signup`, `/dashboard/*` (protected), `/working` (public)
- Dashboard is a nested layout (`DashboardLayout`) with child routes: `scan`, `history`, `reviews`, `profile`

**Admin frontend** (`/Frontend/admin-frontend`):
- Auth state is managed via `src/context/AuthContext.jsx` (`useAuth()` hook)
- Pages: `Overview`, `Analytics`, `ThreatMap`, `Reviews`, `Retraining`, `SystemHealth`, `Users`
- All admin API calls require `ADMIN` role JWT; the backend enforces this via `auth('ADMIN')`

API calls go through service modules in `src/services/`; all requests target `VITE_API_BASE_URL`.

## Environment Variables

**Backend** (`/backend_new/.env`):
```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/multimodal_phishing_detection_system
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
ML_API_BASE_URL=http://localhost:5001
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

**User Frontend** (`/Frontend/user-frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

**Admin Frontend** (`/Frontend/admin-frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:5000/api
```

**ML Service** (`/fyp_multimodal_model/.env`):
```
GEMINI_API_KEY=
```

## Key Reference Documents

- `/SETUP.md` — full setup guide for all 4 services
- `/CLAUDE_FIXES.md` — ordered list of ML pipeline bug fixes (F1–F12) with verification commands; read this before touching any ML code
- `/fyp_multimodal_model/API_CONTRACT.md` — ML service API specification
- `/fyp_multimodal_model/README.md` — ML component setup details
- `/erd.uml` — entity relationship diagram
- `/diagram.md` — authentication flow sequence diagram
