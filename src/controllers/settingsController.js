const Settings = require('../models/settingsModel');

// Get current settings
const getSettings = async (req, res) => {
    try {
        const settings = await Settings.findOne({});
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Upsert shift registration settings
const updateShiftRegistration = async (req, res) => {
    try {
        const {
            enabled,
            windowStartOffsetDays,
            windowEndOffsetDays,
            startTime,
            endTime
        } = req.body || {};

        const update = {};
        update['shiftRegistration'] = {};
        if (typeof enabled === 'boolean') update.shiftRegistration.enabled = enabled;
        if (typeof windowStartOffsetDays === 'number') update.shiftRegistration.windowStartOffsetDays = windowStartOffsetDays;
        if (typeof windowEndOffsetDays === 'number') update.shiftRegistration.windowEndOffsetDays = windowEndOffsetDays;
        if (startTime && typeof startTime.hour === 'number') {
            update.shiftRegistration.startTime = {
                hour: Math.max(0, Math.min(23, startTime.hour)),
                minute: Math.max(0, Math.min(59, startTime.minute || 0))
            };
        }
        if (endTime && typeof endTime.hour === 'number') {
            update.shiftRegistration.endTime = {
                hour: Math.max(0, Math.min(23, endTime.hour)),
                minute: Math.max(0, Math.min(59, endTime.minute || 0))
            };
        }

        const settings = await Settings.findOneAndUpdate(
            {},
            { $set: update },
            { new: true, upsert: true }
        );

        return res.json({ success: true, data: settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getSettings, updateShiftRegistration };


