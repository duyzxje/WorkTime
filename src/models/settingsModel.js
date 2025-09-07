const mongoose = require('mongoose');

const timeSchema = new mongoose.Schema(
    {
        hour: { type: Number, min: 0, max: 23, default: 0 },
        minute: { type: Number, min: 0, max: 59, default: 0 }
    },
    { _id: false }
);

const settingsSchema = new mongoose.Schema(
    {
        shiftRegistration: {
            enabled: { type: Boolean, default: true },
            // Offsets relative to the target week's start date (Monday 00:00)
            // Example defaults: Friday and Saturday before the week start
            windowStartOffsetDays: { type: Number, default: -3 },
            windowEndOffsetDays: { type: Number, default: -2 },
            startTime: { type: timeSchema, default: () => ({}) },
            endTime: { type: timeSchema, default: () => ({ hour: 23, minute: 59 }) }
        }
    },
    { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;


