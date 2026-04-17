const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controller');
const auth = require('../middlewares/auth');

// All scan routes now require full authentication because there is no concept of a guest.
router.post('/submit', auth(), scanController.submitScan);
router.get('/dashboard', auth(), scanController.getDashboardStats);
router.get('/history', auth(), scanController.getHistory);
router.get('/:id', auth(), scanController.getScanById);

module.exports = router;

