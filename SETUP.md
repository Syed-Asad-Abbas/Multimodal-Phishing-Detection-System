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
