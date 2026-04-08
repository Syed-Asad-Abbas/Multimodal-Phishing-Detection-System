const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controller');
const auth = require('../middlewares/auth');

// Optional Auth for submission (Guest vs User)
// We need a middleware that checks token BUT doesn't block if missing, 
// just sets req.user.
// For now, I'll use a custom "optionalAuth" or just handle it in controller 
// if I attach `auth` generically.
// Let's create `optionalAuth` middleware later if needed. 
// For now, let's assume public submission is allowed without token, 
// BUT if headers has token, we want `req.user`.
// I will use `auth` for history, and no auth for submit/get by default 
// unless we want to track user. 
// To keep it simple: Submit is public. If user wants tracking, they send token.
// Middleware `auth` blocks if no token. I'll make a `softAuth` middleware.

const softAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }
        next();
    } catch (e) {
        next(); // Ignore error, just proceed as guest
    }
};

router.post('/submit', softAuth, scanController.submitScan);
router.get('/dashboard', auth(), scanController.getDashboardStats);
router.get('/history', auth(), scanController.getHistory);
router.get('/:id', softAuth, scanController.getScanById);

module.exports = router;
