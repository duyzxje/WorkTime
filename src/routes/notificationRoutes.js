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
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// User routes (cần authentication)
router.get('/user', authenticateToken, getUserNotifications);
router.get('/user/unread', authenticateToken, getUnreadNotifications);
router.get('/user/recent', authenticateToken, getRecentNotifications);
router.get('/user/count', authenticateToken, getUnreadCount);
router.put('/:id/read', authenticateToken, markNotificationAsRead);
router.put('/user/mark-all-read', authenticateToken, markAllNotificationsAsRead);

// Admin routes (cần authentication + admin role)
router.post('/', authenticateToken, requireAdmin, createNotification);
router.get('/admin/all', authenticateToken, requireAdmin, getAllNotifications);
router.put('/:id', authenticateToken, requireAdmin, updateNotification);
router.delete('/:id', authenticateToken, requireAdmin, deleteNotification);
router.delete('/admin/expired', authenticateToken, requireAdmin, deleteExpiredNotifications);

module.exports = router;
