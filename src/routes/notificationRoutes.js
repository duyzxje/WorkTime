const express = require('express');
const router = express.Router();
const {
    createNotification,
    getUserNotifications,
    getUnreadNotifications,
    getRecentNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadCount,
    updateNotification,
    deleteNotification,
    getAllNotifications,
    deleteExpiredNotifications
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

// User routes (cần authentication)
router.get('/user', protect, getUserNotifications);
router.get('/user/unread', protect, getUnreadNotifications);
router.get('/user/recent', protect, getRecentNotifications);
router.get('/user/count', protect, getUnreadCount);
router.put('/:id/read', protect, markNotificationAsRead);
router.put('/user/mark-all-read', protect, markAllNotificationsAsRead);

// Admin routes (cần authentication + admin role)
router.post('/', protect, admin, createNotification);
router.get('/admin/all', protect, admin, getAllNotifications);
router.put('/:id', protect, admin, updateNotification);
router.delete('/:id', protect, admin, deleteNotification);
router.delete('/admin/expired', protect, admin, deleteExpiredNotifications);

module.exports = router;
