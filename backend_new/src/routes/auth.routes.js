const authController = require('../controllers/auth.controller');
const express = require('express');
const auth = require('../middlewares/auth');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.get('/verify-email', authController.verifyEmail);
router.post('/2fa/verify', authController.verify2FA);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/google', authController.googleAuth);
router.post('/2fa/toggle', auth(), authController.toggle2FA);

module.exports = router;
