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
        }
    },
    {
        timestamps: true
    }
);

// Create a compound unique index to prevent duplicate entries for the same day in a week
liveSchema.index({ weekStartDate: 1, day: 1 }, { unique: true });

const Live = mongoose.model('Live', liveSchema);

module.exports = Live;
