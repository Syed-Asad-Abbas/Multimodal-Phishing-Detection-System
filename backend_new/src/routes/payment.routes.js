const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const auth = require('../middlewares/auth');

// Checkout session endpoint requires user authentication
router.post('/checkout-session', auth(), paymentController.createCheckoutSession);

// Webhook endpoint receives events from Stripe directly (unauthenticated, handles verification via signatures)
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
