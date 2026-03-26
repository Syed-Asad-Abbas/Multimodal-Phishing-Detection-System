# Backend Refactoring and Stabilization Action Plan

## Phase 1: Backend Analysis
**Objective:** Comprehensive review of the technical landscape to identify debts and architectural weaknesses.

### 1.1 Codebase Audit
- [ ] **Dependency Review**: Analyze `package.json` for unused or outdated packages (e.g., `bcryptjs` is strict maintenance mode, consider `bcrypt` or `argon2`).
- [ ] **Code Quality Check**: Run a linter/static analysis tool (ESLint) to find inconsistencies and potential bugs in `controllers/` and `utils/`.
- [ ] **Architecture Review**: Evaluate the current `server.js` monolithic structure vs. potential modular improvements.

### 1.2 Performance & Security Assessment
- [ ] **Security Scan**: Audit for common vulnerabilities (e.g., rigid CORS, rate limiting implementation in `middlewares/`).
- [ ] **Performance Baseline**: distinct routes profiling (specifically `scanRoutes`).

## Phase 2: Database Migration (MongoDB → PostgreSQL)
**Objective:** Transition to a relational schema for better data integrity and querying capabilities.

### 2.1 Schema Design
- [ ] **User Table**: Design `users` table mirroring `User.js` (id, email, password_hash, role, created_at).
- [ ] **Scan Results Table**: Design `scan_results` table mirroring `ScanResult.js`.
    - `features` and `shap_values` columns should use `JSONB` data type for flexibility.
- [ ] **Relationships**: Define foreign keys (e.g., `scan_results.user_id` -> `users.id`).

### 2.2 Migration Execution
- [ ] **ORM Setup**: Install and configure `Sequelize` or `TypeORM` (or raw `pg`).
- [ ] **Migration Scripts**: Create scripts to export data from MongoDB and import to PostgreSQL, handling data type conversions (ObjectId to UUID/Integer).
- [ ] **Dual-Write (Optional)**: Implement if zero-downtime is critical, otherwise plan a maintenance window.

### 2.3 Verification
- [ ] **Data Integrity Check**: Verify row counts and data fidelity between Mongo collections and Postgres tables.

## Phase 3: Fault Detection
**Objective:** Identify instability sources before they cause production failures.

### 3.1 Route Auditing
- [ ] **Endpoint Verification**: Test every endpoint in `routes/` (auth, scan, admin) with valid and invalid payloads.
- [ ] **Error Handling**: Verify that `server.js` global error handler catches async errors correctly from all controllers.

### 3.2 Service Integration Check
- [ ] **ML Service Connectivity**: Verify `process.env.ML_API_BASE_URL` connectivity and fallback behavior.
- [ ] **Environment Config**: Validate `.env` loading and extensive checks for required variables.

## Phase 4: Issue Resolution
**Objective:** Systematically fix identified bugs and stabilize the system.

### 4.1 Critical Fixes
- [ ] **Connection Stability**: Resolve any recurrent connection dropping (likely handled by moving to stable Postgres drivers).
- [ ] **Broken Routes**: Fix any endpoints identified as failing in Phase 3.

### 4.2 Code Improvements
- [ ] **Refactor Controllers**: Move logic out of route definitions if present and into pure controllers.
- [ ] **Standardize Responses**: Ensure all API responses follow a strict `{ status, data, error }` envelope format.

## Phase 5: API Restructuring
**Objective:** Modularize the system for scalability and maintainability.

### 5.1 Domain Separation
- [ ] **Data API**: Create dedicated service layer for database interactions (repositories).
- [ ] **Business Logic API**: Isolate complex logic (e.g., phishing detection rules) from HTTP transport layer.
- [ ] **Admin/Auxiliary API**: Separate admin-specific routes into their own sub-app or distinct service module.

### 5.2 Standardization
- [ ] **REST Implementation**: Enforce strict REST verbs (GET, POST, PUT, DELETE) and resource naming.
- [ ] **Versioning**: Implement URL versioning (e.g., `/api/v1/scan`) to future-proof changes.
- [ ] **Documentation**: Generate Swagger/OpenAPI documentation for the new API structure.
