const Joi = require('joi');

const register = Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});

const login = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const verifyEmail = Joi.object({
    token: Joi.string().required(),
});

const refreshToken = Joi.object({
    refreshToken: Joi.string().required(),
});

const verify2FA = Joi.object({
    userId: Joi.string().uuid().required(),
    token: Joi.string().length(6).required(), // Assuming 6 digit OTP/Token
});

const forgotPassword = Joi.object({
    email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
    token: Joi.string().length(6).required(),
    newPassword: Joi.string().min(8).required(),
});

const googleAuth = Joi.object({
    idToken: Joi.string().required(),
});

module.exports = {
    register,
    login,
    verifyEmail,
    refreshToken,
    verify2FA,
    forgotPassword,
    resetPassword,
    googleAuth,
};
