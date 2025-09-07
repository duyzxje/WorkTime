const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true,
            maxlength: [200, 'Title cannot be more than 200 characters']
        },
        content: {
            type: String,
            required: [true, 'Please add content'],
            trim: true,
            maxlength: [1000, 'Content cannot be more than 1000 characters']
        },
        type: {
            type: String,
            enum: ['info', 'warning', 'success', 'error'],
            default: 'info'
        },
        isRead: {
            type: Boolean,
            default: false
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        expiresAt: {
            type: Date,
            default: null
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Index for better query performance
notificationSchema.index({ userId: 1, isRead: 1, isActive: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ createdAt: -1 });

// Static methods
notificationSchema.statics.createNotification = async function (notificationData) {
    try {
        const notification = await this.create(notificationData);
        return await this.findById(notification._id).populate('userId', 'name username email');
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.findByUserId = async function (userId, includeExpired = false) {
    try {
        const query = {
            userId: userId,
            isActive: true
        };

        if (!includeExpired) {
            query.$or = [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ];
        }

        return await this.find(query)
            .populate('userId', 'name username email')
            .sort({ createdAt: -1 });
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.findUnreadByUserId = async function (userId) {
    try {
        return await this.find({
            userId: userId,
            isRead: false,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
            .populate('userId', 'name username email')
            .sort({ createdAt: -1 });
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.findRecentUnread = async function (userId, limit = 5) {
    try {
        return await this.find({
            userId: userId,
            isRead: false,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
            .populate('userId', 'name username email')
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.markAllAsReadByUserId = async function (userId) {
    try {
        const result = await this.updateMany(
            {
                userId: userId,
                isRead: false,
                isActive: true
            },
            {
                $set: { isRead: true }
            }
        );
        return result.modifiedCount;
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.deleteExpired = async function () {
    try {
        const result = await this.updateMany(
            {
                expiresAt: { $lte: new Date() },
                isActive: true
            },
            {
                $set: { isActive: false }
            }
        );
        return result.modifiedCount;
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.findAll = async function (limit = 50, offset = 0) {
    try {
        return await this.find({ isActive: true })
            .populate('userId', 'name username email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset);
    } catch (error) {
        throw error;
    }
};

notificationSchema.statics.countUnreadByUserId = async function (userId) {
    try {
        return await this.countDocuments({
            userId: userId,
            isRead: false,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });
    } catch (error) {
        throw error;
    }
};

// Instance methods
notificationSchema.methods.markAsRead = async function () {
    try {
        this.isRead = true;
        return await this.save();
    } catch (error) {
        throw error;
    }
};

notificationSchema.methods.updateNotification = async function (updateData) {
    try {
        const { title, content, type, expiresAt } = updateData;

        if (title !== undefined) this.title = title;
        if (content !== undefined) this.content = content;
        if (type !== undefined) this.type = type;
        if (expiresAt !== undefined) this.expiresAt = expiresAt;

        return await this.save();
    } catch (error) {
        throw error;
    }
};

notificationSchema.methods.deleteNotification = async function () {
    try {
        this.isActive = false;
        return await this.save();
    } catch (error) {
        throw error;
    }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
