const mongoose = require('mongoose');

// Define the schema for live event schedules
const liveSchema = mongoose.Schema(
    {
        weekStartDate: {
            type: Date,
            required: true
        },
        day: {
            type: Number,
            required: true,
            min: 1,
            max: 7
        },
        morning: {
            type: Boolean,
            default: false
        },
        noon: {
            type: Boolean,
            default: false
        },
        afternoon: {
            type: Boolean,
            default: false
        },
        evening: {
            type: Boolean,
            default: false
        },
        off: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Pre-save middleware to automatically calculate 'off' field
liveSchema.pre('save', function (next) {
    try {
        // off = true khi tất cả các ca khác đều false
        // off = false khi có ít nhất 1 ca khác là true
        this.off = !(this.morning || this.noon || this.afternoon || this.evening);
        console.log('Pre-save middleware: calculated off =', this.off, 'for shifts:', {
            morning: this.morning,
            noon: this.noon,
            afternoon: this.afternoon,
            evening: this.evening
        });
        next();
    } catch (error) {
        console.error('Error in pre-save middleware:', error);
        next(error);
    }
});

// Create a compound unique index to prevent duplicate entries for the same day in a week
liveSchema.index({ weekStartDate: 1, day: 1 }, { unique: true });

const Live = mongoose.model('Live', liveSchema);

module.exports = Live;
