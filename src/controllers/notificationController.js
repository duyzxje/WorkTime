const Notification = require('../models/notificationModel');

// Tạo thông báo mới (Admin)
const createNotification = async (req, res) => {
    try {
        const { title, content, type, userId, expiresAt } = req.body;

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title và content là bắt buộc'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID là bắt buộc'
            });
        }

        // Tạo thông báo
        const notification = await Notification.createNotification({
            title,
            content,
            type: type || 'info',
            userId,
            expiresAt: expiresAt || null
        });

        res.status(201).json({
            success: true,
            message: 'Tạo thông báo thành công',
            data: notification
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thông báo',
            error: error.message
        });
    }
};

// Lấy tất cả thông báo của user
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { includeExpired = false } = req.query;

        const notifications = await Notification.findByUserId(userId, includeExpired === 'true');

        res.json({
            success: true,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting user notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông báo',
            error: error.message
        });
    }
};

// Lấy thông báo chưa đọc
const getUnreadNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const notifications = await Notification.findUnreadByUserId(userId);

        res.json({
            success: true,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting unread notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông báo chưa đọc',
            error: error.message
        });
    }
};

// Lấy thông báo gần đây (chưa đọc)
const getRecentNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 5 } = req.query;

        const notifications = await Notification.findRecentUnread(userId, parseInt(limit));

        res.json({
            success: true,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting recent notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông báo gần đây',
            error: error.message
        });
    }
};

// Đánh dấu thông báo đã đọc
const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }

        // Kiểm tra quyền truy cập
        if (notification.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập thông báo này'
            });
        }

        await notification.markAsRead();

        res.json({
            success: true,
            message: 'Đánh dấu thông báo đã đọc thành công',
            data: notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đánh dấu thông báo',
            error: error.message
        });
    }
};

// Đánh dấu tất cả thông báo đã đọc
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const affectedRows = await Notification.markAllAsReadByUserId(userId);

        res.json({
            success: true,
            message: `Đánh dấu ${affectedRows} thông báo đã đọc thành công`,
            affectedRows
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đánh dấu tất cả thông báo',
            error: error.message
        });
    }
};

// Đếm số thông báo chưa đọc
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await Notification.countUnreadByUserId(userId);

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đếm thông báo chưa đọc',
            error: error.message
        });
    }
};

// Cập nhật thông báo (Admin)
const updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, type, expiresAt } = req.body;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }

        await notification.updateNotification({
            title,
            content,
            type,
            expiresAt
        });

        res.json({
            success: true,
            message: 'Cập nhật thông báo thành công',
            data: notification
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thông báo',
            error: error.message
        });
    }
};

// Xóa thông báo (Admin)
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }

        await notification.deleteNotification();

        res.json({
            success: true,
            message: 'Xóa thông báo thành công'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thông báo',
            error: error.message
        });
    }
};

// Lấy tất cả thông báo (Admin)
const getAllNotifications = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const notifications = await Notification.findAll(parseInt(limit), parseInt(offset));

        res.json({
            success: true,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting all notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy tất cả thông báo',
            error: error.message
        });
    }
};

// Xóa thông báo đã hết hạn (Admin)
const deleteExpiredNotifications = async (req, res) => {
    try {
        const affectedRows = await Notification.deleteExpired();

        res.json({
            success: true,
            message: `Xóa ${affectedRows} thông báo đã hết hạn thành công`,
            affectedRows
        });
    } catch (error) {
        console.error('Error deleting expired notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thông báo hết hạn',
            error: error.message
        });
    }
};

module.exports = {
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
};
