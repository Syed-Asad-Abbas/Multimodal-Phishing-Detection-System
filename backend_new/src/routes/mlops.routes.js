const express = require('express');
const router = express.Router();
const mlopsController = require('../controllers/mlops.controller');
const auth = require('../middlewares/auth');

// Require ADMIN
router.use(auth('ADMIN'));

router.post('/retrain', mlopsController.triggerRetraining);
router.get('/health', mlopsController.getPipelineHealth);
router.get('/history', mlopsController.getRetrainingHistory);

module.exports = router;
