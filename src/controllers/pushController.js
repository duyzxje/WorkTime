const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscriptionModel');

// Cấu hình web-push (chỉ khi có VAPID keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@worktime.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('Web Push VAPID keys configured');
} else {
    console.warn('VAPID keys not configured. Web Push notifications will be disabled.');
}

// Đăng ký push subscription
const subscribeToPush = async (req, res) => {
    try {
        // Kiểm tra VAPID keys
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            return res.status(503).json({
                success: false,
                message: 'Push notifications not available - VAPID keys not configured'
            });
        }

        const { subscription, userAgent } = req.body;
        const userId = req.user.id;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Subscription data is required'
            });
        }

        // Kiểm tra xem subscription đã tồn tại chưa
        const existingSubscription = await PushSubscription.findByEndpoint(subscription.endpoint);

        if (existingSubscription) {
            // Cập nhật subscription hiện tại
            existingSubscription.userId = userId;
            existingSubscription.keys = subscription.keys;
            existingSubscription.userAgent = userAgent || '';
            existingSubscription.isActive = true;
            existingSubscription.lastUsed = new Date();

            await existingSubscription.save();

            return res.json({
                success: true,
                message: 'Push subscription updated successfully',
                data: existingSubscription
            });
        }

        // Tạo subscription mới
        const newSubscription = await PushSubscription.createSubscription({
            userId: userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userAgent: userAgent || '',
            isActive: true,
            lastUsed: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Push subscription created successfully',
            data: newSubscription
        });
    } catch (error) {
        console.error('Error subscribing to push:', error);
        res.status(500).json({
            success: false,
            message: 'Error subscribing to push notifications',
            error: error.message
        });
    }
};

// Hủy đăng ký push subscription
const unsubscribeFromPush = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;

        if (!endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Endpoint is required'
            });
        }

        // Tìm và deactivate subscription
        const subscription = await PushSubscription.findByEndpoint(endpoint);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        // Kiểm tra quyền truy cập
        if (subscription.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await subscription.deactivate();

        res.json({
            success: true,
            message: 'Push subscription deactivated successfully'
        });
    } catch (error) {
        console.error('Error unsubscribing from push:', error);
        res.status(500).json({
            success: false,
            message: 'Error unsubscribing from push notifications',
            error: error.message
        });
    }
};

// Lấy VAPID public key
const getVapidPublicKey = async (req, res) => {
    try {
        const publicKey = process.env.VAPID_PUBLIC_KEY;

        if (!publicKey) {
            return res.status(503).json({
                success: false,
                message: 'Push notifications not available - VAPID keys not configured'
            });
        }

        res.json({
            success: true,
            publicKey: publicKey
        });
    } catch (error) {
        console.error('Error getting VAPID public key:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting VAPID public key',
            error: error.message
        });
    }
};

// Gửi push notification tới user cụ thể
const sendPushToUser = async (userId, notification) => {
    try {
        // Kiểm tra VAPID keys
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.log('VAPID keys not configured. Skipping push notification.');
            return { sent: 0, failed: 0 };
        }

        const subscriptions = await PushSubscription.findByUserId(userId);

        if (subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return { sent: 0, failed: 0 };
        }

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.content,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `notification-${notification._id}`,
            data: {
                url: '/notifications',
                notificationId: notification._id,
                type: notification.type
            },
            actions: [
                {
                    action: 'view',
                    title: 'Xem',
                    icon: '/icon-view.png'
                },
                {
                    action: 'dismiss',
                    title: 'Đóng',
                    icon: '/icon-dismiss.png'
                }
            ]
        });

        let sent = 0;
        let failed = 0;

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(
                    subscription.toWebPushFormat(),
                    payload
                );
                await subscription.updateLastUsed();
                sent++;
            } catch (error) {
                console.error(`Failed to send push to subscription ${subscription._id}:`, error);

                // Nếu subscription không hợp lệ, deactivate nó
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await subscription.deactivate();
                }
                failed++;
            }
        }

        return { sent, failed };
    } catch (error) {
        console.error('Error sending push to user:', error);
        throw error;
    }
};

// Gửi push notification tới nhiều user
const sendPushToUsers = async (userIds, notification) => {
    try {
        // Kiểm tra VAPID keys
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.log('VAPID keys not configured. Skipping push notifications.');
            return { sent: 0, failed: 0 };
        }

        let totalSent = 0;
        let totalFailed = 0;

        for (const userId of userIds) {
            const result = await sendPushToUser(userId, notification);
            totalSent += result.sent;
            totalFailed += result.failed;
        }

        return { sent: totalSent, failed: totalFailed };
    } catch (error) {
        console.error('Error sending push to users:', error);
        throw error;
    }
};

// Gửi push notification tới tất cả user
const sendPushToAllUsers = async (notification) => {
    try {
        // Kiểm tra VAPID keys
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.log('VAPID keys not configured. Skipping push notifications.');
            return { sent: 0, failed: 0 };
        }

        const subscriptions = await PushSubscription.getAllActiveSubscriptions();

        if (subscriptions.length === 0) {
            console.log('No active push subscriptions found');
            return { sent: 0, failed: 0 };
        }

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.content,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `notification-${notification._id}`,
            data: {
                url: '/notifications',
                notificationId: notification._id,
                type: notification.type
            },
            actions: [
                {
                    action: 'view',
                    title: 'Xem',
                    icon: '/icon-view.png'
                },
                {
                    action: 'dismiss',
                    title: 'Đóng',
                    icon: '/icon-dismiss.png'
                }
            ]
        });

        let sent = 0;
        let failed = 0;

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(
                    subscription.toWebPushFormat(),
                    payload
                );
                await subscription.updateLastUsed();
                sent++;
            } catch (error) {
                console.error(`Failed to send push to subscription ${subscription._id}:`, error);

                // Nếu subscription không hợp lệ, deactivate nó
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await subscription.deactivate();
                }
                failed++;
            }
        }

        return { sent, failed };
    } catch (error) {
        console.error('Error sending push to all users:', error);
        throw error;
    }
};

// Test push notification (Admin only)
const testPushNotification = async (req, res) => {
    try {
        const { title, body } = req.body;
        const userId = req.user.id;

        const testNotification = {
            _id: 'test-' + Date.now(),
            title: title || 'Test Notification',
            content: body || 'This is a test push notification',
            type: 'info'
        };

        const result = await sendPushToUser(userId, testNotification);

        res.json({
            success: true,
            message: 'Test push notification sent',
            result: result
        });
    } catch (error) {
        console.error('Error sending test push:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending test push notification',
            error: error.message
        });
    }
};

// Lấy thống kê push subscriptions (Admin only)
const getPushStats = async (req, res) => {
    try {
        const totalSubscriptions = await PushSubscription.countDocuments({ isActive: true });
        const recentSubscriptions = await PushSubscription.countDocuments({
            isActive: true,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 ngày gần đây
        });

        res.json({
            success: true,
            data: {
                totalSubscriptions,
                recentSubscriptions
            }
        });
    } catch (error) {
        console.error('Error getting push stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting push statistics',
            error: error.message
        });
    }
};

// Cleanup inactive subscriptions (Admin only)
const cleanupInactiveSubscriptions = async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;

        const cleanedCount = await PushSubscription.cleanupInactiveSubscriptions(daysOld);

        res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} inactive subscriptions`,
            cleanedCount
        });
    } catch (error) {
        console.error('Error cleaning up subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Error cleaning up inactive subscriptions',
            error: error.message
        });
    }
};

module.exports = {
    subscribeToPush,
    unsubscribeFromPush,
    getVapidPublicKey,
    sendPushToUser,
    sendPushToUsers,
    sendPushToAllUsers,
    testPushNotification,
    getPushStats,
    cleanupInactiveSubscriptions
};
