# SSOT_FYP_Node_Postgres_Plan.md

**Project:** Multimodal Phishing Detection System (FYP)  
**Backend:** Node.js + Express + PostgreSQL (Prisma ORM)  
**Architecture:** Monolithic Node.js Backend serving REST APIs to User/Admin Portals, orchestrating calls to external ML Service.

---

## 1. Locked Scope (15 Tasks)
The following features are mandatory and define the project completion state:
1.  **User Signup/Login**: Support for email/password and potential OAuth structure (though email focus first).
2.  **2FA**: Email-based Two-Factor Authentication (magic link or token).
3.  **Scan History**: Users can view their past URL scans.
4.  **URL Scan Page**: Main interface to submit URLs. Node orchestrates request to ML backend.
5.  **SHAP Visuals**: Display SHAP values/charts per modality and feature from ML response.
6.  **User Reviews**: Users can submit reviews for the system.
7.  **Admin Testimonials**: Admin approves/edits reviews to publish as testimonials.
8.  **Admin Portal Login**: Dedicated login for administrators.
9.  **Malicious IP Map**: Store and serve IP data for global threat mapping.
10. **Dashboard Analytics**: Stats on benign/phishing rates, model accuracy, users growth, pipeline health.
11. **Retraining Trigger**: Admin can trigger model retraining (Node calls ML backend).
12. **Admin Creation**: Only existing admins can create new admin accounts.
13. **LLM Explanations**: Display natural language explanations from ML backend.
14. **Screenshots**: Display site screenshots captured by ML backend.
15. **Review Management**: Admin CRUD for reviews.

---

## 2. Architecture & Tech Stack
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: PostgreSQL (Single DB instance)
-   **ORM**: Prisma
-   **ML Service**: External Python/FastAPI service (existing). Node acts as a gateway/orchestrator.

### Logical Separation (Schemas)
To ensure organization within a *single* database, we use PostgreSQL schemas:
-   `auth`: Users, Sessions, tokens (2FA, verify, reset).
-   `core`: Main business logic (Scans, Results, Reviews, IPs).
-   `admin`: Audit logs, internal admin data.
-   `analytics`: Aggregated stats for dashboards.
-   `mlops`: Logs for pipeline health and retraining jobs.

---

## 3. Database Schema (ERD)

### Schema: `auth`
-   **users**: `id (UUID)`, `email`, `password_hash`, `role` (USER/ADMIN), `is_verified`, `created_at`, `updated_at`, `last_login`.
-   **user_sessions**: `id`, `user_id`, `refresh_token_hash`, `expires_at`, `created_at`, `ip_address`, `user_agent`.
-   **email_verification_tokens**: `id`, `user_id`, `token_hash`, `expires_at`.
-   **two_factor_tokens**: `id`, `user_id`, `token_hash`, `expires_at`.
-   **password_reset_tokens**: `id`, `user_id`, `token_hash`, `expires_at`.

### Schema: `core`
-   **scans**: `id (UUID)`, `user_id (nullable)`, `url`, `status` (PENDING, COMPLETED, FAILED), `created_at`, `is_deleted`, `deleted_at`, `deleted_by`.
-   **scan_results**: `id`, `scan_id`, `prediction` (Benign/Phishing), `confidence_score`, `phishing_probability`.
-   **scan_shap_values**: `id`, `scan_result_id`, `feature_name`, `shap_value`, `modality` (URL/DOM/Visual).
-   **scan_explanations**: `id`, `scan_result_id`, `llm_text` (Explanation).
-   **scan_screenshots**: `id`, `scan_result_id`, `image_url` or `base64_data`.
-   **malicious_ip_observations**: `id`, `scan_id`, `ip_address`, `geo_lat`, `geo_long`, `timestamp`.
-   **reviews**: `id`, `user_id`, `rating`, `comment`, `status` (PENDING, APPROVED, REJECTED), `created_at`.
-   **testimonials**: `id`, `review_id`, `published_at`, `display_text`.

### Schema: `admin`
-   **audit_logs**: `id`, `admin_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at`.

### Schema: `analytics`
-   **daily_scan_stats**: `date`, `total_scans`, `benign_count`, `phishing_count`, `unique_users`.
-   **model_metrics_daily**: `date`, `false_positive_rate`, `true_positive_rate`, `accuracy`.

### Schema: `mlops`
-   **pipeline_health_logs**: `id`, `service_name`, `status`, `latency_ms`, `error_details`, `timestamp`.
-   **retraining_jobs**: `id`, `triggered_by (admin_id)`, `start_time`, `end_time`, `status`, `metrics_summary`.

---

## 4. API Map

### Public / User
-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `POST /api/auth/verify-email`
-   `POST /api/auth/2fa/verify`
-   `POST /api/auth/forgot-password`
-   `POST /api/auth/reset-password`
-   `POST /api/scan/submit` (URL)
-   `GET /api/scan/history`
-   `GET /api/scan/:id` (Details + SHAP + Explanation)
-   `POST /api/reviews` (Submit review)

### Admin
-   `POST /api/admin/login`
-   `POST /api/admin/create-admin` (Restricted)
-   `GET /api/admin/reviews` (List all)
-   `PUT /api/admin/reviews/:id/status` (Approve/Reject)
-   `GET /api/admin/dashboard/stats` (Analytics)
-   `GET /api/admin/dashboard/map` (IPs)
-   `POST /api/admin/mlops/retrain`
-   `GET /api/admin/mlops/health`
-   `DELETE /api/admin/scans/:id` (Soft delete)

---

## 5. Scan Data Flow
1.  **User** submits URL via Client -> `POST /api/scan/submit`.
2.  **Node** creates `scans` record (Status: PENDING).
3.  **Node** calls ML Service (`POST /predict` on Python backend).
4.  **ML Service** analyzes and returns:
    -   `prediction` (Label), `confidence`, `shap_values` (Feature importance).
    -   `explanation` (LLM text), `screenshot` (Image), `ip_metadata`.
5.  **Node** persists data:
    -   Update `scans` status to COMPLETED.
    -   Save `scan_results`.
    -   Save `scan_shap_values`, `scan_explanations`, `scan_screenshots`.
    -   If malicious, save `malicious_ip_observations`.
6.  **Node** returns `scan_id` JSON to Client.
7.  **Client** calls `GET /api/scan/:id` to retrieve and display full report.

---

## 6. Security Requirements
-   **Passwords**: Bcrypt hashing (salt rounds >= 10).
-   **Tokens**: JWT for Access (short-lived), Random string (hashed) for Refresh (long-lived).
-   **RBAC**: Middleware to enforce `req.user.role === 'ADMIN'`.
-   **Rate Limiting**: `express-rate-limit` on Login (5/min) and Scan endpoints (to prevent abuse).
-   **Soft Delete**: Scans are never physically removed by admins, just marked `is_deleted`.
-   **Audit**: Critical admin actions (delete, approve, ban) logged to `admin.audit_logs`.

---

## 7. Implementation Phases

### Phase 1: Setup
-   Initialize Node.js + Express project.
-   Configure TypeScript/JavaScript, ESLint, Prettier.
-   Setup `winston` logging.
-   Setup Global Error Handler.
-   Connect PostgreSQL with Prisma.
-   **Deliverable**: Running server with DB connection.

### Phase 2: Auth Framework
-   Implement Users, Sessions, Tokens tables.
-   Register, Login, Email Verify, 2FA, Password Reset flows.
-   JWT middleware and Role guards.
-   **Deliverable**: Secure Auth API.

### Phase 3: Scans & ML Orchestration
-   Implement Core Scans tables.
-   `POST /scan/submit` -> Call ML Service -> Store Results/SHAP/Explanations.
-   `GET /scan/:id` and History.
-   **Deliverable**: Working scanning pipeline.

### Phase 4: Reviews & Testimonials
-   Reviews CRUD.
-   Admin Approval flow.
-   Public Testimonials endpoint.
-   **Deliverable**: Community features.

### Phase 5: Admin Dashboard
-   Analytics aggregation queries.
-   Malicious IP mapping API.
-   User management (User lists).
-   **Deliverable**: Admin insights.

### Phase 6: MLOps Integration
-   Pipeline health logging.
-   Retraining trigger wrapper.
-   **Deliverable**: System observability.

### Phase 7: Hardening
-   Pagination for lists.
-   Comprehensive audit logs.
-   Integration tests.
-   Security sweep (headers, rate limits validation).
-   **Deliverable**: Production-ready candidate.

---

## 8. Change Control
-   Any changes to this plan must be appended below with Date + Reason.
-   *Initial Version (Current Date)*: Locked for development.
