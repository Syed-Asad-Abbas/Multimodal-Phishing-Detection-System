# Multimodal Phishing Detection System — Setup Guide

This guide explains how to set up, install, and run all components of the system locally.
The project is split into four primary components:

1. **Backend** — Node.js / Express / PostgreSQL (Prisma ORM)
2. **User Frontend** — React 19 / Vite 7
3. **Admin Frontend** — React 19 / Vite 7
4. **ML Service** — Python / Flask

---

## 1. Prerequisites

Ensure the following are installed on your machine:

| Tool | Minimum Version |
|---|---|
| Node.js | v18+ |
| npm | v9+ |
| PostgreSQL | v14+ (running instance) |
| Python | v3.10+ |
| Git | Any recent version |

---

## 2. Backend Setup (`backend_new/`)

The backend is a **Node.js + Express** API using **Prisma 5.10** as the ORM against a **PostgreSQL** database.

### Key Dependencies

| Package | Version |
|---|---|
| express | ^5.2.1 |
| @prisma/client | 5.10.0 |
| jsonwebtoken | ^9.0.3 |
| bcrypt | ^6.0.0 |
| dotenv | ^17.2.3 |
| axios | ^1.13.4 |
| cors | ^2.8.6 |
| helmet | ^8.1.0 |
| express-rate-limit | ^8.2.1 |
| joi | ^18.0.2 |
| google-auth-library | ^10.6.2 |
| nodemailer | ^8.0.5 |
| node-cron | ^4.2.1 |
| morgan | ^1.10.1 |
| winston | ^3.19.0 |
| pg | ^8.17.2 |
| cookie-parser | ^1.4.7 |

### Dev Dependencies

| Package | Version |
|---|---|
| nodemon | ^3.1.11 |
| prisma | 5.10.0 |
| eslint | ^9.39.2 |
| prettier | ^3.8.1 |

### Steps

```bash
cd backend_new
npm install
```

**Create a `.env` file** in `backend_new/`:

```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/phishguard_db"
JWT_SECRET="your_jwt_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"
GOOGLE_CLIENT_ID="your_google_client_id"
ML_SERVICE_URL="http://localhost:8000"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your_email@example.com"
SMTP_PASS="your_smtp_password"
```

**Setup the database:**

```bash
npx prisma generate
npx prisma db push
```

**Start the server:**

```bash
npm run dev
# Runs on http://localhost:5000
```

---

## 3. User Frontend Setup (`Frontend/user-frontend/`)

Built with **React 19** + **Vite 7** + **TailwindCSS 4**. Designed for end-users scanning URLs.

### Key Dependencies

| Package | Version |
|---|---|
| react / react-dom | ^19.2.4 |
| vite | ^7.3.1 |
| tailwindcss | ^4.1.18 |
| react-router-dom | ^7.13.0 |
| axios | ^1.13.6 |
| lucide-react | ^0.563.0 |
| motion | ^12.33.0 |
| recharts | ^3.7.0 |
| react-hook-form | ^7.71.1 |
| sonner | ^2.0.7 |
| cobe | ^0.6.5 |
| cmdk | ^1.1.1 |
| embla-carousel-react | ^8.6.0 |
| input-otp | ^1.4.2 |
| next-themes | ^0.4.6 |
| @tailwindcss/vite | ^4.1.18 |
| All @radix-ui/* primitives | ^1.x / ^2.x |

### Steps

```bash
cd Frontend/user-frontend
npm install
```

**Create a `.env` file** in `Frontend/user-frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID="your_google_client_id"
```

**Start the dev server:**

```bash
npm run dev
# Runs on http://localhost:5173
```

---

## 4. Admin Frontend Setup (`Frontend/admin-frontend/`)

Built with **React 19** + **Vite 7** + **TailwindCSS 4**. Designed for admin management panels, maps, and analytics.

### Key Dependencies (additional to user-frontend)

| Package | Version |
|---|---|
| react / react-dom | ^19.2.4 |
| vite | ^7.3.1 |
| tailwindcss | ^4.1.18 |
| leaflet | ^1.9.4 |
| react-leaflet | ^5.0.0 |
| react-globe.gl | ^2.37.0 |
| three | ^0.183.2 |
| d3-geo | ^3.1.1 |
| topojson-client | ^3.1.0 |
| recharts | ^3.7.0 |
| motion | ^12.33.0 |
| axios | ^1.13.6 |
| lucide-react | ^0.563.0 |
| All @radix-ui/* primitives | ^1.x / ^2.x |

### Steps

```bash
cd Frontend/admin-frontend
npm install
```

**Create a `.env` file** in `Frontend/admin-frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID="your_google_client_id"
```

**Start the dev server:**

```bash
npm run dev
# Runs on http://localhost:5174
```

---

## 5. ML Service Setup (`fyp_multimodal_model/`)

The ML pipeline handles multimodal phishing detection using **ResNet50** (visual), **Doc2Vec** (DOM), and **LightGBM** (fusion), served via a **Flask** API.

### Python Dependencies (`requirements.txt`)

| Package | Purpose |
|---|---|
| flask | REST API server |
| torch / torchvision | Deep learning (ResNet50 visual model) |
| lightgbm | Gradient boosting fusion classifier |
| gensim | Doc2Vec DOM embeddings |
| shap | Explainable AI feature attribution |
| scikit-learn | Preprocessing & metrics |
| selenium | Headless browser for screenshot capture |
| webdriver-manager | Auto ChromeDriver management |
| beautifulsoup4 | HTML/DOM parsing |
| Pillow | Image processing |
| google-generativeai | Gemini LLM explanation generation |
| pandas / numpy | Data manipulation |
| joblib | Model serialization |
| tqdm | Progress bars |
| requests | HTTP calls |
| python-dotenv | Environment variable loading |

### Steps

```bash
cd fyp_multimodal_model

# Create and activate a virtual environment
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Mac / Linux
source .venv/bin/activate

# Install all Python packages
pip install -r requirements.txt
```

**Create a `.env` file** in `fyp_multimodal_model/`:

```env
GEMINI_API_KEY="your_gemini_api_key"
```

**Start the Flask server:**

```bash
python app.py
# Runs on http://localhost:8000
```

---

## 6. Running the Full System Locally

Open **4 separate terminals** and run each service concurrently:

```bash
# Terminal 1 — Backend API
cd backend_new && npm run dev

# Terminal 2 — User Frontend
cd Frontend/user-frontend && npm run dev

# Terminal 3 — Admin Frontend
cd Frontend/admin-frontend && npm run dev

# Terminal 4 — ML Service (activate venv first)
cd fyp_multimodal_model && .\.venv\Scripts\Activate.ps1 && python app.py
```

### Default Service URLs

| Service | URL |
|---|---|
| Backend API | http://localhost:5000 |
| User Frontend | http://localhost:5173 |
| Admin Frontend | http://localhost:5174 |
| ML Flask Service | http://localhost:8000 |

---

> **Note:** Ensure PostgreSQL is running and `DATABASE_URL` is correctly configured before starting the backend. The ML service must be running for scan results to be generated.
