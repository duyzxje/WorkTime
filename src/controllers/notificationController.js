const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const NotificationSocketService = require('../services/notificationSocketService');
const { sendPushToUser, sendPushToUsers, sendPushToAllUsers } = require('./pushController');

// Tạo thông báo mới (Admin)
const createNotification = async (req, res) => {
    try {
        const { title, content, type, userId, userIds, sendToAll, expiresAt } = req.body;

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title và content là bắt buộc'
            });
        }

        // Nếu gửi tới tất cả user
        if (sendToAll) {
            const notificationService = require('../services/notificationService');
            const notifications = await notificationService.createNotificationForAllUsers({
                title,
                content,
                type: type || 'info',
                expiresAt: expiresAt || null
            });

            // Emit WebSocket event
            const io = req.app.get('io');
            if (io) {
                const socketService = new NotificationSocketService(io);
                socketService.sendNotificationToAllUsers({
                    title,
                    content,
                    type: type || 'info',
                    expiresAt: expiresAt || null
                });
            }

            // Gửi push notification
            try {
                const pushResult = await sendPushToAllUsers({
                    _id: 'bulk-' + Date.now(),
                    title,
                    content,
                    type: type || 'info'
                });
                console.log(`Push notifications sent: ${pushResult.sent}, failed: ${pushResult.failed}`);
            } catch (pushError) {
                console.error('Error sending push notifications:', pushError);
            }

            return res.status(201).json({
                success: true,
                message: `Tạo thông báo thành công cho ${notifications.length} user`,
                data: notifications,
                count: notifications.length
            });
        }

        // Nếu gửi tới nhiều user cụ thể
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            const notificationService = require('../services/notificationService');
            const notifications = await notificationService.createBulkNotifications({
                title,
                content,
                type: type || 'info',
                expiresAt: expiresAt || null
            }, userIds);

            // Emit WebSocket event
            const io = req.app.get('io');
            if (io) {
                const socketService = new NotificationSocketService(io);
                socketService.sendNotificationToUsers(userIds, {
                    title,
                    content,
                    type: type || 'info',
                    expiresAt: expiresAt || null
                });
            }

            // Gửi push notification
            try {
                const pushResult = await sendPushToUsers(userIds, {
                    _id: 'bulk-' + Date.now(),
                    title,
                    content,
                    type: type || 'info'
                });
                console.log(`Push notifications sent: ${pushResult.sent}, failed: ${pushResult.failed}`);
            } catch (pushError) {
                console.error('Error sending push notifications:', pushError);
            }

            return res.status(201).json({
                success: true,
                message: `Tạo thông báo thành công cho ${notifications.length} user`,
                data: notifications,
                count: notifications.length
            });
        }

        // Nếu gửi tới 1 user cụ thể
        if (userId) {
            const notification = await Notification.createNotification({
                title,
                content,
                type: type || 'info',
                userId,
                expiresAt: expiresAt || null
            });

            // Emit WebSocket event
            const io = req.app.get('io');
            if (io) {
                const socketService = new NotificationSocketService(io);
                socketService.sendNotificationToUser(userId, notification);
            }

            // Gửi push notification
            try {
                const pushResult = await sendPushToUser(userId, notification);
                console.log(`Push notification sent: ${pushResult.sent}, failed: ${pushResult.failed}`);
            } catch (pushError) {
                console.error('Error sending push notification:', pushError);
            }

            return res.status(201).json({
                success: true,
                message: 'Tạo thông báo thành công',
                data: notification,
                count: 1
            });
        }

        // Nếu không có userId, userIds, hoặc sendToAll
        return res.status(400).json({
            success: false,
            message: 'Phải chỉ định userId, userIds, hoặc sendToAll'
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

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            const socketService = new NotificationSocketService(io);
            socketService.notifyNotificationRead(userId, notification._id);

            // Cập nhật số lượng thông báo chưa đọc
            const unreadCount = await Notification.countUnreadByUserId(userId);
            socketService.updateUnreadCount(userId, unreadCount);
        }

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

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            const socketService = new NotificationSocketService(io);
            socketService.notifyAllNotificationsRead(userId, affectedRows);
            socketService.updateUnreadCount(userId, 0);
        }

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

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            const socketService = new NotificationSocketService(io);
            socketService.notifyNotificationUpdated(notification.userId.toString(), notification);
        }

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

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            const socketService = new NotificationSocketService(io);
            socketService.notifyNotificationDeleted(notification.userId.toString(), notification._id);
        }

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

// Lấy danh sách user để admin chọn (Admin)
const getUsersForNotification = async (req, res) => {
    try {
        const { role, search } = req.query;

        let query = {};

        // Filter theo role nếu có
        if (role) {
            query.role = role;
        }

        // Search theo tên hoặc username nếu có
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('_id name username email role')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error getting users for notification:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách user',
            error: error.message
        });
    }
};

// Tạo thông báo theo role (Admin)
const createNotificationByRole = async (req, res) => {
    try {
        const { title, content, type, role, expiresAt } = req.body;

        // Validation
        if (!title || !content || !role) {
            return res.status(400).json({
                success: false,
                message: 'Title, content và role là bắt buộc'
            });
        }

        const notificationService = require('../services/notificationService');
        const notifications = await notificationService.createNotificationForRole({
            title,
            content,
            type: type || 'info',
            expiresAt: expiresAt || null
        }, role);

        res.status(201).json({
            success: true,
            message: `Tạo thông báo thành công cho ${notifications.length} user có role ${role}`,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error creating notification by role:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thông báo theo role',
            error: error.message
        });
    }
};

// Tạo thông báo với template (Admin)
const createNotificationFromTemplate = async (req, res) => {
    try {
        const { templateName, userIds, sendToAll, variables } = req.body;

        // Validation
        if (!templateName) {
            return res.status(400).json({
                success: false,
                message: 'Template name là bắt buộc'
            });
        }

        const notificationService = require('../services/notificationService');
        let notifications = [];

        if (sendToAll) {
            // Lấy tất cả user
            const users = await User.find({}, '_id');
            const userIds = users.map(user => user._id.toString());

            for (const userId of userIds) {
                const notification = await notificationService.createFromTemplate(
                    templateName,
                    userId,
                    variables || {}
                );
                notifications.push(notification);
            }
        } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            for (const userId of userIds) {
                const notification = await notificationService.createFromTemplate(
                    templateName,
                    userId,
                    variables || {}
                );
                notifications.push(notification);
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Phải chỉ định userIds hoặc sendToAll'
            });
        }

        res.status(201).json({
            success: true,
            message: `Tạo thông báo từ template thành công cho ${notifications.length} user`,
            data: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Error creating notification from template:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thông báo từ template',
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
    deleteExpiredNotifications,
    getUsersForNotification,
    createNotificationByRole,
    createNotificationFromTemplate
};
