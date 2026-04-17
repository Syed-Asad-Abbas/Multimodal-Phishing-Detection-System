# Multimodal Phishing Detection System - Project Setup Guide

This guide explains how to set up, install, and run all components of the system locally. The project is split into four primary components:
1. **Backend Server** (Node.js/Express/PostgreSQL)
2. **User Frontend** (React/Vite)
3. **Admin Frontend** (React/Vite)
4. **Machine Learning Service** (Python)

---

## 1. Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** (Running instance)
- **Python** (v3.10 or higher)
- **Git**

---

## 2. Backend Server Setup (`backend_new/`)

The backend is a Node.js API with a PostgreSQL database connected via Prisma ORM.

### Steps:
1. **Navigate to the backend directory**:
   ```bash
   cd backend_new
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the `backend_new` directory. You will need variables such as (modify values accordingly):
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@localhost:5432/your_database_name"
   JWT_SECRET="your_jwt_secret"
   ```
4. **Setup Database**:
   Push the Prisma schema to your PostgreSQL database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *(Server typically runs on `http://localhost:5000` or whatever is defined in your PORT variable)*

---

## 3. Frontend Setup (`Frontend/`)

The frontend is divided into two separate React applications built with Vite: `user-frontend` and `admin-frontend`.

### A. User Frontend
1. **Navigate to the directory**:
   ```bash
   cd Frontend/user-frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the application**:
   ```bash
   npm run dev
   ```

### B. Admin Frontend
1. **Navigate to the directory**:
   ```bash
   cd Frontend/admin-frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the application**:
   ```bash
   npm run dev
   ```

---

## 4. Machine Learning Component (`fyp_multimodal_model/`)

The ML pipeline is responsible for multimodal phishing detection using Visual ResNet50 and DOM Doc2Vec features.

### Steps:
1. **Navigate to the ML directory**:
   ```bash
   cd fyp_multimodal_model
   ```
2. **Create a Python Virtual Environment**:
   ```bash
   python -m venv .venv
   ```
3. **Activate the Environment**:
   - **Windows PowerShell**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **Mac/Linux**:
     ```bash
     source .venv/bin/activate
     ```
4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Environment Configuration**:
   Create a `.env` file if required by the python scripts (e.g., API keys, model paths).
6. **Execution**:
   *(Run the relevant script, e.g., Flask server or background worker, as required by the backend pipeline.)*

---

## 5. Running the Full System Locally
For a full local development experience, you will need multiple terminal windows running simultaneously to serve all parts of the application:
1. **Terminal 1**: Database and Backend (`cd backend_new && npm run dev`)
2. **Terminal 2**: User Dashboard (`cd Frontend/user-frontend && npm run dev`)
3. **Terminal 3**: Admin Dashboard (`cd Frontend/admin-frontend && npm run dev`)
4. **Terminal 4**: ML Service (Active `.venv` and Python process running).

---

## 6. Dependency Notes

### Q6 — Express 5 & Rate Limiting

This project intentionally uses **Express 5** (now stable in 2026) for its native `async/await` Promise support and improved error propagation.

> **⚠️ Compatibility Note:** `express-rate-limit` **v8 is required** to ensure compatibility with the Express 5 middleware signature. Earlier versions of `express-rate-limit` (v6/v7) use a middleware API that is incompatible with Express 5's error handling chain and will throw at startup.

Install command:
```bash
npm install express@5 express-rate-limit@8
```

---

## 7. Production Deployment Notes

### Q10 — Admin Frontend Subdomain

In **production**, the Admin panel runs on a **separate subdomain**:

```
https://admin.example.com    ← Admin frontend (React/Vite)
https://example.com          ← User frontend (React/Vite)
https://api.example.com      ← Node.js API backend
```

**Why a separate subdomain?**
- Allows stricter **firewall rules** and **IP-whitelisting** for the admin interface specifically
- Prevents admin routes from being enumerated via the same origin as the public site
- Simplifies applying separate TLS certificates and WAF rules

**CORS configuration** — set the `CORS_ORIGIN` environment variable in `backend_new/.env` for production:
```env
CORS_ORIGIN=https://example.com,https://admin.example.com
```

### Q8 — Gemini API Key

The Python ML service (`fyp_multimodal_model/`) requires a valid `GEMINI_API_KEY` in its `.env` file. If missing, the server will **exit at startup** with a CRITICAL error.

```env
# fyp_multimodal_model/.env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Get your key at: https://aistudio.google.com/app/apikey

