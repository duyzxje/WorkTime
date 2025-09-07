const Notification = require('../models/notificationModel');
const mongoose = require('mongoose');
const cron = require('node-cron');

class NotificationService {
    constructor() {
        this.startCleanupJob();
    }

    // Tạo thông báo cho nhiều user
    async createBulkNotifications(notificationData, userIds) {
        try {
            const notifications = [];

            for (const userId of userIds) {
                const notification = await Notification.create({
                    ...notificationData,
                    userId
                });
                notifications.push(notification);
            }

            return notifications;
        } catch (error) {
            throw error;
        }
    }

    // Tạo thông báo cho tất cả user
    async createNotificationForAllUsers(notificationData) {
        try {
            // Lấy danh sách tất cả user từ database
            const User = require('../models/userModel');
            const users = await User.find({}, '_id');

            const userIds = users.map(user => user._id);
            return await this.createBulkNotifications(notificationData, userIds);
        } catch (error) {
            throw error;
        }
    }

    // Tạo thông báo cho user theo role
    async createNotificationForRole(notificationData, role) {
        try {
            const User = require('../models/userModel');
            const users = await User.find({ role: role }, '_id');

            const userIds = users.map(user => user._id);
            return await this.createBulkNotifications(notificationData, userIds);
        } catch (error) {
            throw error;
        }
    }

    // Tạo thông báo cho user theo office
    async createNotificationForOffice(notificationData, officeId) {
        try {
            const User = require('../models/userModel');
            const users = await User.find({ officeId: officeId }, '_id');

            const userIds = users.map(user => user._id);
            return await this.createBulkNotifications(notificationData, userIds);
        } catch (error) {
            throw error;
        }
    }

    // Tạo thông báo với thời gian hết hạn tự động
    async createNotificationWithExpiry(notificationData, expiryOptions) {
        try {
            let expiresAt = null;

            if (expiryOptions.type === 'hours') {
                const expiryDate = new Date();
                expiryDate.setHours(expiryDate.getHours() + expiryOptions.value);
                expiresAt = expiryDate;
            } else if (expiryOptions.type === 'days') {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + expiryOptions.value);
                expiresAt = expiryDate;
            } else if (expiryOptions.type === 'weeks') {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + (expiryOptions.value * 7));
                expiresAt = expiryDate;
            } else if (expiryOptions.type === 'custom') {
                expiresAt = new Date(expiryOptions.value);
            }

            return await Notification.createNotification({
                ...notificationData,
                expiresAt
            });
        } catch (error) {
            throw error;
        }
    }

    // Lấy thông báo với phân trang
    async getNotificationsWithPagination(userId, page = 1, limit = 10, includeExpired = false) {
        try {
            const offset = (page - 1) * limit;
            const notifications = await Notification.findByUserId(userId, includeExpired);

            const total = notifications.length;
            const paginatedNotifications = notifications.slice(offset, offset + limit);

            return {
                notifications: paginatedNotifications,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Tìm kiếm thông báo
    async searchNotifications(userId, searchTerm, type = null) {
        try {
            const query = {
                userId: userId,
                isActive: true,
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { content: { $regex: searchTerm, $options: 'i' } }
                ],
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            };

            if (type) {
                query.type = type;
            }

            return await Notification.find(query)
                .populate('userId', 'name username email')
                .sort({ createdAt: -1 });
        } catch (error) {
            throw error;
        }
    }

    // Thống kê thông báo
    async getNotificationStats(userId) {
        try {
            const stats = await Notification.aggregate([
                {
                    $match: {
                        userId: mongoose.Types.ObjectId(userId),
                        isActive: true,
                        $or: [
                            { expiresAt: null },
                            { expiresAt: { $gt: new Date() } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
                        read: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } },
                        info: { $sum: { $cond: [{ $eq: ['$type', 'info'] }, 1, 0] } },
                        warning: { $sum: { $cond: [{ $eq: ['$type', 'warning'] }, 1, 0] } },
                        success: { $sum: { $cond: [{ $eq: ['$type', 'success'] }, 1, 0] } },
                        error: { $sum: { $cond: [{ $eq: ['$type', 'error'] }, 1, 0] } }
                    }
                }
            ]);

            return stats[0] || { total: 0, unread: 0, read: 0, info: 0, warning: 0, success: 0, error: 0 };
        } catch (error) {
            throw error;
        }
    }

    // Xóa thông báo cũ (giữ lại n thông báo gần nhất)
    async cleanupOldNotifications(userId, keepCount = 100) {
        try {
            // Lấy ID của các thông báo cần giữ lại
            const keepNotifications = await Notification.find({
                userId: userId,
                isActive: true
            })
                .sort({ createdAt: -1 })
                .limit(keepCount)
                .select('_id');

            if (keepNotifications.length === 0) return 0;

            const keepIdList = keepNotifications.map(notif => notif._id);

            // Xóa các thông báo không nằm trong danh sách giữ lại
            const result = await Notification.updateMany(
                {
                    userId: userId,
                    isActive: true,
                    _id: { $nin: keepIdList }
                },
                {
                    $set: { isActive: false }
                }
            );

            return result.modifiedCount;
        } catch (error) {
            throw error;
        }
    }

    // Bắt đầu job tự động xóa thông báo hết hạn
    startCleanupJob() {
        // Chạy mỗi ngày lúc 2:00 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                console.log('Starting notification cleanup job...');
                const deletedCount = await Notification.deleteExpired();
                console.log(`Deleted ${deletedCount} expired notifications`);
            } catch (error) {
                console.error('Error in notification cleanup job:', error);
            }
        });

        console.log('Notification cleanup job scheduled');
    }

    // Dừng job cleanup
    stopCleanupJob() {
        cron.destroy();
    }

    // Tạo thông báo từ template
    async createFromTemplate(templateName, userId, variables = {}) {
        try {
            const templates = {
                welcome: {
                    title: 'Chào mừng bạn đến với hệ thống!',
                    content: `Xin chào ${variables.name || 'bạn'}! Chào mừng bạn đến với hệ thống quản lý thời gian làm việc.`,
                    type: 'success'
                },
                attendance_reminder: {
                    title: 'Nhắc nhở chấm công',
                    content: `Đừng quên chấm công ${variables.type || 'vào/ra'} lúc ${variables.time || 'hiện tại'} nhé!`,
                    type: 'info'
                },
                salary_update: {
                    title: 'Cập nhật lương',
                    content: `Lương tháng ${variables.month || 'này'} của bạn đã được cập nhật. Số tiền: ${variables.amount || 'N/A'}`,
                    type: 'success'
                },
                system_maintenance: {
                    title: 'Bảo trì hệ thống',
                    content: `Hệ thống sẽ được bảo trì từ ${variables.startTime || 'N/A'} đến ${variables.endTime || 'N/A'}. Vui lòng lưu công việc của bạn.`,
                    type: 'warning'
                }
            };

            const template = templates[templateName];
            if (!template) {
                throw new Error(`Template ${templateName} not found`);
            }

            return await Notification.createNotification({
                ...template,
                userId
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new NotificationService();
