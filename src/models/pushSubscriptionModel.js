const mongoose = require('mongoose');

const pushSubscriptionSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        endpoint: {
            type: String,
            required: true
        },
        keys: {
            p256dh: {
                type: String,
                required: true
            },
            auth: {
                type: String,
                required: true
            }
        },
        userAgent: {
            type: String,
            default: ''
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastUsed: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Index for better query performance
pushSubscriptionSchema.index({ userId: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });

// Static methods
pushSubscriptionSchema.statics.createSubscription = async function (subscriptionData) {
    try {
        const subscription = await this.create(subscriptionData);
        return subscription;
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.findByUserId = async function (userId) {
    try {
        return await this.find({
            userId: userId,
            isActive: true
        }).sort({ lastUsed: -1 });
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.findByEndpoint = async function (endpoint) {
    try {
        return await this.findOne({
            endpoint: endpoint,
            isActive: true
        });
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.updateLastUsed = async function (subscriptionId) {
    try {
        return await this.findByIdAndUpdate(
            subscriptionId,
            { lastUsed: new Date() },
            { new: true }
        );
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.deactivateSubscription = async function (subscriptionId) {
    try {
        return await this.findByIdAndUpdate(
            subscriptionId,
            { isActive: false },
            { new: true }
        );
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.deactivateByEndpoint = async function (endpoint) {
    try {
        return await this.updateMany(
            { endpoint: endpoint },
            { isActive: false }
        );
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.cleanupInactiveSubscriptions = async function (daysOld = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.updateMany(
            {
                lastUsed: { $lt: cutoffDate },
                isActive: true
            },
            {
                isActive: false
            }
        );

        return result.modifiedCount;
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.statics.getAllActiveSubscriptions = async function () {
    try {
        return await this.find({
            isActive: true
        }).populate('userId', 'name email');
    } catch (error) {
        throw error;
    }
};

// Instance methods
pushSubscriptionSchema.methods.updateLastUsed = async function () {
    try {
        this.lastUsed = new Date();
        return await this.save();
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.methods.deactivate = async function () {
    try {
        this.isActive = false;
        return await this.save();
    } catch (error) {
        throw error;
    }
};

pushSubscriptionSchema.methods.toWebPushFormat = function () {
    return {
        endpoint: this.endpoint,
        keys: {
            p256dh: this.keys.p256dh,
            auth: this.keys.auth
        }
    };
};

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = PushSubscription;
