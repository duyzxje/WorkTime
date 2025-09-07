class NotificationSocketService {
    constructor(io) {
        this.io = io;
    }

    // Gửi thông báo mới tới user cụ thể
    sendNotificationToUser(userId, notification) {
        this.io.to(`user_${userId}`).emit('new_notification', {
            type: 'new_notification',
            data: notification,
            timestamp: new Date().toISOString()
        });
    }

    // Gửi thông báo mới tới nhiều user
    sendNotificationToUsers(userIds, notification) {
        userIds.forEach(userId => {
            this.sendNotificationToUser(userId, notification);
        });
    }

    // Gửi thông báo mới tới tất cả user
    sendNotificationToAllUsers(notification) {
        this.io.emit('new_notification', {
            type: 'new_notification',
            data: notification,
            timestamp: new Date().toISOString()
        });
    }

    // Gửi thông báo mới tới admin
    sendNotificationToAdmins(notification) {
        this.io.to('admin_room').emit('new_notification', {
            type: 'new_notification',
            data: notification,
            timestamp: new Date().toISOString()
        });
    }

    // Cập nhật số lượng thông báo chưa đọc
    updateUnreadCount(userId, count) {
        this.io.to(`user_${userId}`).emit('unread_count_update', {
            type: 'unread_count_update',
            data: { count },
            timestamp: new Date().toISOString()
        });
    }

    // Thông báo khi user đánh dấu đã đọc
    notifyNotificationRead(userId, notificationId) {
        this.io.to(`user_${userId}`).emit('notification_read', {
            type: 'notification_read',
            data: { notificationId },
            timestamp: new Date().toISOString()
        });
    }

    // Thông báo khi user đánh dấu tất cả đã đọc
    notifyAllNotificationsRead(userId, count) {
        this.io.to(`user_${userId}`).emit('all_notifications_read', {
            type: 'all_notifications_read',
            data: { count },
            timestamp: new Date().toISOString()
        });
    }

    // Thông báo khi admin cập nhật thông báo
    notifyNotificationUpdated(userId, notification) {
        this.io.to(`user_${userId}`).emit('notification_updated', {
            type: 'notification_updated',
            data: notification,
            timestamp: new Date().toISOString()
        });
    }

    // Thông báo khi admin xóa thông báo
    notifyNotificationDeleted(userId, notificationId) {
        this.io.to(`user_${userId}`).emit('notification_deleted', {
            type: 'notification_deleted',
            data: { notificationId },
            timestamp: new Date().toISOString()
        });
    }

    // Gửi thông báo hệ thống
    sendSystemNotification(message, type = 'info', targetUsers = null) {
        const systemNotification = {
            id: `system_${Date.now()}`,
            title: 'Thông báo hệ thống',
            content: message,
            type: type,
            isSystem: true,
            timestamp: new Date().toISOString()
        };

        if (targetUsers) {
            this.sendNotificationToUsers(targetUsers, systemNotification);
        } else {
            this.io.emit('system_notification', {
                type: 'system_notification',
                data: systemNotification,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Gửi thông báo trạng thái kết nối
    sendConnectionStatus(userId, status) {
        this.io.to(`user_${userId}`).emit('connection_status', {
            type: 'connection_status',
            data: { status },
            timestamp: new Date().toISOString()
        });
    }

    // Lấy danh sách user đang online
    getOnlineUsers() {
        const onlineUsers = [];
        this.io.sockets.sockets.forEach((socket) => {
            if (socket.user) {
                onlineUsers.push({
                    userId: socket.userId,
                    name: socket.user.name,
                    role: socket.user.role,
                    socketId: socket.id
                });
            }
        });
        return onlineUsers;
    }

    // Gửi thông báo tới user đang online
    sendToOnlineUsers(notification, excludeUsers = []) {
        const onlineUsers = this.getOnlineUsers();
        const targetUsers = onlineUsers.filter(user => !excludeUsers.includes(user.userId));

        targetUsers.forEach(user => {
            this.sendNotificationToUser(user.userId, notification);
        });
    }

    // Broadcast thông báo tới tất cả user đang online
    broadcastToOnlineUsers(event, data) {
        this.io.emit(event, {
            type: event,
            data: data,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = NotificationSocketService;
