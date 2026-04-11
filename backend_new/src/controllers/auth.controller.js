const { prisma } = require('../config/database');
const { hashPassword, verifyPassword, hashToken } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const validation = require('../validations/auth.validation');
const logger = require('../config/logger');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res, next) => {
    try {
        const { error } = validation.register.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: hashedPassword,
                // Optional: Defaults to false, so 2FA is off initially
            },
        });

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';

        await prisma.emailVerificationToken.create({
            data: {
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });

        logger.info(`[Email Verify] User: ${email}, Link: ${apiBaseUrl}/api/auth/verify-email?token=${token}`);

        res.status(201).json({
            message: 'User registered successfully. Please verify your email.',
            userId: user.id,
            debugToken: process.env.NODE_ENV === 'development' ? token : undefined
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { error } = validation.login.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Block Google-only users from password login
        if (user.provider === 'google' && !user.password_hash) {
            return res.status(400).json({ message: 'This account uses Google Sign-In. Please log in with Google.' });
        }

        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 2FA Logic
        if (user.is_2fa_enabled) {
            const otp = crypto.randomInt(100000, 999999).toString();
            const tokenHash = hashToken(otp);

            // Clean old tokens
            await prisma.twoFactorToken.deleteMany({ where: { user_id: user.id } });

            await prisma.twoFactorToken.create({
                data: {
                    user_id: user.id,
                    token_hash: tokenHash,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
                },
            });

            await prisma.queuedJob.create({
                data: {
                    job_type: 'send_2fa_otp_email',
                    payload: JSON.stringify({
                        email: user.email,
                        code: otp,
                        subject: 'Your 2FA Login OTP'
                    })
                }
            });

            logger.info(`[2FA OTP] User: ${email}, Code queued for email`);

            return res.json({
                message: '2FA required. OTP sent to email.',
                requires2FA: true,
                userId: user.id,
                debugOTP: process.env.NODE_ENV === 'development' ? otp : undefined
            });
        }

        // Proceed to Login
        await completeLogin(user, req, res);

    } catch (error) {
        next(error);
    }
};

const completeLogin = async (user, req, res) => {
    // Update Last Login
    await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
    });

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    // Store Refresh Token
    await prisma.userSession.create({
        data: {
            user_id: user.id,
            refresh_token_hash: refreshTokenHash,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
        },
    });

    res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            is_verified: user.is_verified,
            is_2fa_enabled: user.is_2fa_enabled,
            provider: user.provider
        },
    });
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;
        const tokenVal = token || req.body.token;

        if (!tokenVal) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const tokenHash = hashToken(tokenVal);

        const record = await prisma.emailVerificationToken.findFirst({
            where: { token_hash: tokenHash },
        });

        if (!record) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        if (new Date() > record.expires_at) {
            return res.status(400).json({ message: 'Token expired' });
        }

        await prisma.user.update({
            where: { id: record.user_id },
            data: { is_verified: true },
        });

        await prisma.emailVerificationToken.delete({
            where: { id: record.id },
        });

        res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        next(error);
    }
};

exports.verify2FA = async (req, res, next) => {
    try {
        const { error } = validation.verify2FA.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { userId, token } = req.body;
        const tokenHash = hashToken(token);

        const record = await prisma.twoFactorToken.findFirst({
            where: { user_id: userId, token_hash: tokenHash },
        });

        if (!record) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        if (new Date() > record.expires_at) {
            await prisma.twoFactorToken.delete({ where: { id: record.id } });
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Success
        await prisma.twoFactorToken.delete({ where: { id: record.id } });

        const user = await prisma.user.findUnique({ where: { id: userId } });

        await completeLogin(user, req, res);

    } catch (error) {
        next(error);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const { error } = validation.forgotPassword.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Do not reveal user existence
            return res.json({ message: 'If account exists, password reset email executed.' });
        }

        // Block Google-only users from password reset
        if (user.provider === 'google' && !user.password_hash) {
            return res.status(400).json({ message: 'This account uses Google Sign-In. Password reset is not available.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const tokenHash = hashToken(otp);

        await prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } });

        await prisma.passwordResetToken.create({
            data: {
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
            }
        });

        await prisma.queuedJob.create({
            data: {
                job_type: 'send_forgot_pass_otp_email',
                payload: JSON.stringify({
                    email: user.email,
                    code: otp,
                    subject: 'Reset your password'
                })
            }
        });

        logger.info(`[Reset Password] User: ${email}, OTP generated and queued for email`);

        res.json({
            message: 'If account exists, password reset email executed.',
            debugToken: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const { error } = validation.resetPassword.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { token, newPassword } = req.body;
        const tokenHash = hashToken(token);

        const record = await prisma.passwordResetToken.findFirst({
            where: { token_hash: tokenHash }
        });

        if (!record || new Date() > record.expires_at) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: record.user_id },
            data: { password_hash: hashedPassword }
        });

        await prisma.passwordResetToken.delete({ where: { id: record.id } });

        res.json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        next(error);
    }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token required' });
        }

        const tokenHash = hashToken(refreshToken);

        const session = await prisma.userSession.findFirst({
            where: { refresh_token_hash: tokenHash },
            include: { user: true },
        });

        if (!session) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        if (new Date() > session.expires_at) {
            await prisma.userSession.delete({ where: { id: session.id } });
            return res.status(403).json({ message: 'Session expired' });
        }

        const newAccessToken = generateAccessToken(session.user);

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const tokenHash = hashToken(refreshToken);
            await prisma.userSession.deleteMany({
                where: { refresh_token_hash: tokenHash },
            });
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

exports.toggle2FA = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { is_2fa_enabled } = req.body;

        if (typeof is_2fa_enabled !== 'boolean') {
            return res.status(400).json({ message: 'is_2fa_enabled must be a boolean' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { is_2fa_enabled }
        });

        res.json({
            message: `Two-Factor Authentication has been ${is_2fa_enabled ? 'enabled' : 'disabled'}.`,
            is_2fa_enabled: user.is_2fa_enabled
        });
    } catch (error) {
        next(error);
    }
};

exports.googleAuth = async (req, res, next) => {
    try {
        const { error } = validation.googleAuth.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { idToken } = req.body;

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, email_verified } = payload;

        if (!email) {
            return res.status(400).json({ message: 'Google account does not have an email.' });
        }

        // Check if user already exists by email
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // User exists — link Google ID if not already linked
            if (!user.google_id) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        google_id: googleId,
                        provider: user.provider === 'local' ? 'local+google' : user.provider,
                        is_verified: true,
                    }
                });
            }
        } else {
            // New user — create account with Google
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || null,
                    google_id: googleId,
                    provider: 'google',
                    is_verified: true,
                    // No password for Google-only users
                }
            });
            logger.info(`[Google Auth] New user created: ${email}`);
        }

        // Complete login (issue JWT tokens)
        await completeLogin(user, req, res);

    } catch (error) {
        logger.error(`[Google Auth] Error: ${error.message}`);
        if (error.message.includes('Token used too late') || error.message.includes('Invalid token')) {
            return res.status(401).json({ message: 'Invalid or expired Google token. Please try again.' });
        }
        next(error);
    }
};
