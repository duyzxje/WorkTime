const express = require('express');
const router = express.Router();
const {
    subscribeToPush,
    unsubscribeFromPush,
    getVapidPublicKey,
    testPushNotification,
    getPushStats,
    cleanupInactiveSubscriptions
} = require('../controllers/pushController');
const { protect, admin } = require('../middleware/authMiddleware');

// User routes (cần authentication)
router.post('/subscribe', protect, subscribeToPush);
router.post('/unsubscribe', protect, unsubscribeFromPush);
router.get('/vapid-key', protect, getVapidPublicKey);
router.post('/test', protect, testPushNotification);

// Admin routes (cần authentication + admin role)
router.get('/stats', protect, admin, getPushStats);
router.post('/cleanup', protect, admin, cleanupInactiveSubscriptions);

module.exports = router;
