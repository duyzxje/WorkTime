const mongoose = require('mongoose');

// Define the schema for individual shift registrations
const shiftSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
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
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Create a compound unique index to prevent duplicate shift entries
shiftSchema.index({ userId: 1, weekStartDate: 1, day: 1 }, { unique: true });

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
