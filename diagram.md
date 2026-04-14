sequenceDiagram
    participant C as Client (Browser)
    participant N as Node.js API
    participant DB as PostgreSQL
    participant G as Google OAuth
    participant E as Email (Cron)

    Note over C,E: === Standard Register/Login ===
    C->>N: POST /api/auth/register {name, email, password}
    N->>DB: Create User (unverified)
    N->>DB: Create EmailVerificationToken
    N->>DB: Insert QueuedJob (send_verify_email)
    E->>DB: Poll QueuedJob every 1 min
    E-->>C: Send verification email
    C->>N: GET /api/auth/verify-email?token=xxx
    N->>DB: Mark user.is_verified = true

    C->>N: POST /api/auth/login {email, password}
    alt 2FA disabled
        N->>DB: Create UserSession (refresh token hash)
        N-->>C: accessToken (15m) + refreshToken (7d)
    else 2FA enabled
        N->>DB: Create TwoFactorToken
        N->>DB: Insert QueuedJob (send_2fa_otp_email)
        N-->>C: {requires2FA: true, userId}
        C->>N: POST /api/auth/2fa/verify {userId, token}
        N->>DB: Validate & delete TwoFactorToken
        N->>DB: Create UserSession
        N-->>C: accessToken + refreshToken
    end

    Note over C,E: === Token Refresh ===
    C->>N: POST /api/auth/refresh-token {refreshToken}
    N->>DB: Find UserSession by token hash
    N-->>C: New accessToken

    Note over C,E: === Google OAuth ===
    C->>G: Google Sign-In (idToken)
    C->>N: POST /api/auth/google {idToken}
    N->>G: verifyIdToken()
    N->>DB: Upsert User (google_id, is_verified=true)
    N->>DB: Create UserSession
    N-->>C: accessToken + refreshToken

    Note over C,E: === Password Reset ===
    C->>N: POST /api/auth/forgot-password {email}
    N->>DB: Create PasswordResetToken
    N->>DB: Insert QueuedJob (send_forgot_pass_otp_email)
    E-->>C: OTP email
    C->>N: POST /api/auth/reset-password {token, newPassword}
    N->>DB: Update password_hash
