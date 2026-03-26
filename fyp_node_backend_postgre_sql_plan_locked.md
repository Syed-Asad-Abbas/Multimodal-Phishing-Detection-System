# FYP Node Backend + PostgreSQL Plan (Locked)

**Project:** Multimodal Phishing Detection System

**This document is the single source of truth (SSOT)** for building the **Node.js + Express backend** and **PostgreSQL database** for:
- **User Portal** (end users)
- **Admin Portal** (admins)

The ML inference + SHAP + screenshot + LLM explanation already exists in a **separate ML backend**.
Node backend acts as an **orchestrator + product backend** (auth, history, analytics, reviews, admin).

---

## 0) Scope Lock

### In-Scope Features (Must Ship)
1. User signup/login using any email provider
2. Email verification
3. 2FA via email magic link/token
4. Password reset via email
5. URL scan request from frontend → Node → ML backend
6. Store scan history per user
7. Store and show: prediction, confidence, SHAP values, explanation, screenshot (if any)
8. User review submission + user review history
9. Admin login
10. Admin account creation **only by logged-in admin**
11. Admin user management (activate/deactivate, view)
12. Admin review management (CRUD + approve/reject)
13. Testimonials publishing from approved reviews
14. Store malicious URL IP observations for world-map plotting
15. Admin dashboard analytics (benign/phishing %, user counts, model metrics, pipeline health)
16. Trigger model retraining (Node → ML backend) + logs

### Out-of-Scope (Explicit)
- Multiple admin roles (only `ADMIN`)
- Automatic masking of testimonial identity

---

## 1) Architecture (High-Level)

### Services
- **Frontend**
  - User Portal
  - Admin Portal
- **Node Backend (NEW)**
  - Auth + Users + Admin + Reviews/Testimonials + Analytics + Orchestration
- **ML Backend (EXISTING)**
  - Predicts phishing/benign and returns artifacts

### Data Flow (Scan)
1) User submits URL → Node API `POST /api/scans`
2) Node validates URL, creates `core.scans` record (status=PENDING)
3) Node calls ML backend `/scan` endpoint
4) ML returns: label, scores, SHAP list, explanation text, screenshot (optional), ip metadata (optional)
5) Node stores:
   - `core.scan_results` (1:1)
   - `core.scan_shap_values` (1:M)
   - `core.scan_explanations` (0..1)
   - `core.scan_screenshots` (0..1)
   - `core.malicious_ip_observations` (0..1)
6) Node sets scan status=COMPLETED and returns response to frontend

---

## 2) Single Database Strategy (Required)

**We use ONE PostgreSQL database** (e.g., `phishguard_db`).
To avoid crowding, we use logical separation via **schemas**:

- `auth`  → auth, tokens, sessions
- `core`  → scans, results, shap, explanations, screenshots, reviews, testimonials, ip observations
- `admin` → audit logs
- `analytics` → daily aggregates, model metrics
- `mlops` → pipeline health logs, retraining jobs

---

## 3) ERD (Entity Groups)

### auth.users (USER + ADMIN)
- PK `user_id` (UUID)
- unique `email`
- `role` ENUM('USER','ADMIN')
- `password_hash`, `is_email_verified`, `is_active`
- timestamps + `last_login_at`

### auth.user_sessions
- refresh token hash, ip, user agent, expiry

### auth.email_verification_tokens
- token hash, expiry, used_at

### auth.two_factor_tokens
- magic-link token hash, expiry, used_at

### auth.password_reset_tokens (NEW)
- reset token hash, expiry, used_at

### core.scans (soft delete enabled)
- PK `scan_id` (UUID)
- FK `user_id`
- submitted_url, normalized_url
- request_ip, status
- `ml_request_id` (optional)
- **soft delete:** is_deleted, deleted_at, deleted_by

### core.scan_results (1:1 with scans)
- final_label, final_score
- url/dom/visual scores
- fusion_method

### core.scan_shap_values (1:M)
- modality ENUM('URL','DOM','VISUAL','FUSION')
- feature_name, shap_value, feature_value

### core.scan_explanations (0..1)
- explanation_text, model_version

### core.scan_screenshots (0..1)
- screenshot_url/path + metadata

### core.malicious_ip_observations (0..1)
- ip_address inet + geo fields

### core.reviews (1:M per user)
- rating 1–5, review_text
- status ENUM('PENDING','APPROVED','REJECTED')
- approved_by, approved_at

### core.testimonials (0..1 per review)
- editable display_name, display_text
- is_published + published_by

### admin.audit_logs
- admin_id, action, target_type, target_id, metadata
- must log: CREATE_ADMIN, APPROVE_REVIEW, REJECT_REVIEW, PUBLISH_TESTIMONIAL, DELETE_SCAN, etc.

### analytics.daily_scan_stats
- totals per day

### analytics.model_metrics_daily
- tp/fp/tn/fn + metrics per model per day

### mlops.pipeline_health_logs
- ml status UP/DOWN/DEGRADED + latency + error rate

### mlops.retraining_jobs
- triggered_by admin + model_scope + status + logs

---

## 4) API Contract (Node)

### Auth (User)
- `POST /api/auth/register`
- `GET  /api/auth/verify-email?token=...`
- `POST /api/auth/login`
- `POST /api/auth/2fa/request` (send magic link)
- `GET  /api/auth/2fa/verify?token=...`
- `POST /api/auth/logout`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`

### Scans (User)
- `POST /api/scans` (calls ML backend)
- `GET  /api/scans` (my history, paginated)
- `GET  /api/scans/:scanId` (details)

### Reviews (User)
- `POST /api/reviews`
- `GET  /api/reviews/me`

### Public (Landing)
- `GET /api/testimonials` (published only)

### Admin Auth
- `POST /api/admin/login`

### Admin: Accounts
- `POST /api/admin/create-admin` (ADMIN only)

### Admin: Users
- `GET  /api/admin/users`
- `PATCH /api/admin/users/:id` (activate/deactivate)

### Admin: Reviews/Testimonial Mgmt
- `GET    /api/admin/reviews`
- `PATCH  /api/admin/reviews/:id` (approve/reject/edit)
- `POST   /api/admin/testimonials` (create from approved)
- `PATCH  /api/admin/testimonials/:id` (edit/publish/unpublish)
- `DELETE /api/admin/testimonials/:id`

### Admin: Analytics
- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/scans-timeseries`
- `GET /api/admin/analytics/model-metrics`
- `GET /api/admin/analytics/pipeline-health`

### Admin: Malicious IP Map
- `GET /api/admin/malicious-ips` (geo points)

### Admin: Retraining
- `POST /api/admin/retrain` (calls ML backend)
- `GET  /api/admin/retrain/jobs`

### Admin: Scan Deletion
- `DELETE /api/admin/scans/:scanId` (soft delete + audit log)

---

## 5) ML Backend Integration (Node → ML)

Node treats ML as an external service.

### Required ML endpoints (assumed)
- `POST /scan` → returns prediction + artifacts
- `POST /retrain` → triggers retraining
- Optional: `/health` → pipeline checks

### Required returned payload fields
- `final_label`, `final_score`
- per-modality scores
- `shap_values[]` with (modality, feature_name, shap_value, feature_value?)
- `explanation_text`
- `screenshot_url` (optional)
- `malicious_ip` + geo (optional)

---

## 6) Security Requirements (Must)

- bcrypt hashing for passwords
- JWT access token + refresh tokens (stored hashed)
- Role-based guards (USER vs ADMIN)
- Rate limiting on login + scan submission
- Input validation + URL normalization
- Soft delete for scans; hard delete only via DB maintenance
- Audit log for all admin actions

---

## 7) Implementation Phases (Step-by-Step)

### Phase 1 — Project Setup
- Node + Express skeleton
- Env config, logging, error handler
- DB connection (Prisma/Sequelize/Knex) + migrations

### Phase 2 — Auth
- Register + email verify
- Login + sessions
- 2FA magic link
- Password reset

### Phase 3 — Scans + ML Orchestration
- Create scan, call ML, persist results
- History + detail endpoints
- Screenshot + explanation retrieval (same payload)

### Phase 4 — Reviews + Testimonials
- User review submission + listing
- Admin moderation + publish

### Phase 5 — Admin Dashboard
- Users management
- Analytics endpoints (aggregate queries)
- Malicious IP map endpoint

### Phase 6 — MLOps
- Pipeline health checks + logging
- Retraining trigger + job logs

### Phase 7 — Hardening
- Rate limiting
- Audit coverage
- Pagination
- Tests (unit + integration)

---

## 8) Acceptance Criteria (Done means)

- User can register, verify email, login, pass 2FA, reset password.
- User can submit URL and see stored result + SHAP + explanation + screenshot (if any).
- User can view scan history and detail view.
- User can submit reviews and see previous reviews.
- Admin can login, create another admin, manage users.
- Admin can approve/edit reviews and publish testimonials.
- Landing page can fetch published testimonials.
- Admin can view analytics, malicious IP map points, pipeline health.
- Admin can trigger retraining and see job logs.
- Admin can soft-delete scans, and the action is audit logged.

---

## 9) Change Control

Any change to scope must be explicitly appended here as:
- Change ID
- Description
- Reason
- Date
- Impacted tables/endpoints

(Do not implement changes without updating this section.)

