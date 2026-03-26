# Backend Rebuild Blueprint: Multimodal Phishing Detection System

## 1. Functional Overview

### **User Side (Client-Facing)**
The user interface is designed for public access (guests) and registered users who want persistent history and features.
*   **Authentication**: Users can sign up, log in, verify their email, and enable 2FA for account security.
*   **Phishing Scanner**: The core feature. Users submit a URL to be scanned.
    *   **Guest**: Can scan a URL and see results immediately.
    *   **Logged-In**: Scans are saved to their personal history.
*   **Scan Results**: Detailed breakdown of why a site is effectively benign or malicious (Probability score, SHAP values, LLM explanation).
*   **Reviews**: Users can write reviews about the system. They can also view their own past reviews.
*   **Public Testimonials**: Users can view approved testimonials from other users.

### **Admin Panel (Management-Facing)**
A restricted area for system administrators to monitor and manage the platform.
*   **Dashboard & Analytics**: View global statistics (Total scans, Phishing vs Benign count) and a map of malicious IP locations.
*   **User Management**: View all registered users and create new admin accounts.
*   **Content Moderation**: View user-submitted reviews and approve/reject them for public display (Testimonials).
*   **Scan Management**: Ability to soft-delete inappropriate or erroneous scan records.
*   **MLOps Dashboard**: Monitor the health of the ML pipeline, view retraining history, and manually trigger model retraining.

---

## 2. API Endpoint Map

### **Authentication (`/auth`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Create a new user account. |
| `POST` | `/auth/login` | Authenticate user & issue tokens. |
| `POST` | `/auth/refresh-token` | Issue new access token using a valid refresh token. |
| `POST` | `/auth/verify-email` | Verify user's email address via token. |
| `POST` | `/auth/2fa/verify` | Verify 2FA OTP for setup or login. |
| `POST` | `/auth/forgot-password` | Initiate password reset flow (send email). |
| `POST` | `/auth/reset-password` | Complete password reset with new password. |
| `POST` | `/auth/logout` | Invalidate current session/refresh token. |

### **Scanning Core (`/scan`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/scan/submit` | Submit a URL for scanning (Public/Private). |
| `GET` | `/scan/history` | Get list of past scans for logged-in user. |
| `GET` | `/scan/:id` | Get detailed report of a specific scan. |

### **Admin Management (`/admin`)**
*Requires `ADMIN` Role*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/admin/create-admin` | Create a new administrator account. |
| `GET` | `/admin/dashboard/stats` | Retrieve global system statistics. |
| `GET` | `/admin/dashboard/map` | Get data for Malicious IP Geolocation Map. |
| `GET` | `/admin/users` | List all registered users. |
| `DELETE` | `/admin/scans/:id` | Soft-delete a scan record. |

### **Reviews & Testimonials (`/review`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/review/testimonials` | **Public**: Get list of approved reviews. |
| `POST` | `/review/` | **User**: Submit a new review. |
| `GET` | `/review/my` | **User**: Get my past reviews. |
| `GET` | `/review/admin/all` | **Admin**: Get all reviews (Pending/Approved/Rejected). |
| `PUT` | `/review/admin/:id/status`| **Admin**: Approve or Reject a review. |

### **MLOps Control (`/mlops`)**
*Requires `ADMIN` Role*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/mlops/retrain` | Trigger a new model retraining job. |
| `GET` | `/mlops/health` | Get status of ML services. |
| `GET` | `/mlops/history` | Get history of retraining jobs. |

---

## 3. The 'What' and 'Why' (Technical Logic)

### **Authentication**
*   **`POST /auth/login`**
    *   **Action**: Validates credentials.
    *   **Logic**: Finds user by email -> Compares `password_hash` using `bcrypt` -> Generates `accessToken` (short-lived) and `refreshToken` (long-lived, stored in DB).
    *   **Necessity**: Securely identifies the user and maintains session state.

*   **`POST /auth/register`**
    *   **Action**: create a `User` entry.
    *   **Logic**: Hashes password -> Creates User -> Generates `EmailVerificationToken` -> Sends email.
    *   **Necessity**: Onboards users while ensuring email validity.

### **Scanning**
*   **`POST /scan/submit`**
    *   **Action**: Accepts a URL.
    *   **Logic**: Checks for cached result -> If new, invokes Python/ML Service -> Saves `Scan` & `ScanResult` to DB -> If user logged in, links `user_id`.
    *   **Necessity**: The entry point for the application's core value.

*   **`GET /scan/:id`**
    *   **Action**: Retrieves all data for a specific scan.
    *   **Logic**: Joins `Scan` table with `ScanResult`, `ScanShapValue`, `ScanExplanation`, and `MaliciousIpObservation`.
    *   **Necessity**: Frontend needs this holistic view to render the "Report Card".

### **Admin Dashboard**
*   **`GET /admin/dashboard/map`**
    *   **Action**: Returns GeoJSON or list of coords for malicious IPs.
    *   **Logic**: Queries `MaliciousIpObservation` table -> aggregates data.
    *   **Necessity**: Visualizes the global threat landscape for the admin.

---

## 4. Database Relationships (Prisma Schema)

The database is normalized and uses PostgreSQL schemas (`auth`, `core`, `admin`, `analytics`, `mlops`) for logical separation.

1.  **Users (`users`)**:
    *   **1-to-Many** with `scans`: Users have scan history.
    *   **1-to-Many** with `reviews`: Users write reviews.
    *   **1-to-Many** with `user_sessions`, `email_verification_tokens`, etc. (Auth management).

2.  **Scans (`scans`)**:
    *   **1-to-1** with `scan_results`: Separation of metadata (URL, date) from heavy ML output.
    *   **1-to-1** with `malicious_ip_observations`: Geographic data for the scanned server.

3.  **Scan Results (`scan_results`)**:
    *   **1-to-Many** with `scan_shap_values`: Stores feature importance for explainability.
    *   **1-to-1** with `scan_explanations`: Textual explanation from LLM.

4.  **Reviews (`reviews`)**:
    *   **1-to-1** with `testimonials`: A review only becomes a displayed testimonial if approved.

---

## 5. Security Standards

To ensure a robust and secure backend, the following standards are mandatory:

1.  **Authentication**:
    *   **JWT (JSON Web Tokens)**: Do not store sensitive data in tokens. Use short expirations (e.g., 15 mins) for Access Tokens and longer for Refresh Tokens.
    *   **Rotation**: Refresh tokens must differ on every use (or strictly tracked) to prevent replay attacks.

2.  **Authorization (RBAC)**:
    *   Middleware `auth('ADMIN')` must check `user.role === 'ADMIN'` before allowing access to `/admin/*` or `/mlops/*`.
    *   Users can only access their *own* data (e.g., `GET /scan/history` filters by `req.user.id`).

3.  **Data Validation**:
    *   **Input Sanitization**: Use `Joi` or `Zod` to validate all incoming request bodies (email format, URL format, password strength).
    *   **No Raw SQL**: Uses Prisma ORM to prevent SQL Injection.

4.  **Pipeline Security**:
    *   The `scan/submit` endpoint must handle rate limiting to prevent DoS attacks on the ML pipeline.
    *   Scan results containing HTML/Screenshots must be sanitized to prevent XSS when displayed on the frontend.
