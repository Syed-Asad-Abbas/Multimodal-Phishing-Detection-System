const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middlewares/auth');

// All routes here require ADMIN role
router.use(auth('ADMIN'));

router.post('/create-admin', adminController.createAdmin);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/analytics', adminController.getAnalytics);
router.get('/dashboard/map', adminController.getMaliciousIpMap);
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/scans/:id', adminController.softDeleteScan);

module.exports = router;
