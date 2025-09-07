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

// Public: Get shift registration window info (sanitized)
const getPublicShiftRegistration = async (req, res) => {
    try {
        const settings = await Settings.findOne({});
        const sr = settings && settings.shiftRegistration ? settings.shiftRegistration : null;

        // Compute next week's Monday (tuần sau)
        const now = new Date();
        const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfWeek = current.getDay();
        const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;
        const nextWeekStart = new Date(current);
        nextWeekStart.setDate(current.getDate() + daysUntilNextMonday);
        nextWeekStart.setHours(0, 0, 0, 0);

        let windowStartAt = null;
        let windowEndAt = null;
        if (sr && sr.enabled) {
            const ws = new Date(nextWeekStart);
            ws.setDate(ws.getDate() + sr.windowStartOffsetDays);
            ws.setHours((sr.startTime && sr.startTime.hour) || 0, (sr.startTime && sr.startTime.minute) || 0, 0, 0);
            windowStartAt = ws.toISOString();

            const we = new Date(nextWeekStart);
            we.setDate(we.getDate() + sr.windowEndOffsetDays);
            we.setHours((sr.endTime && sr.endTime.hour) || 23, (sr.endTime && sr.endTime.minute) || 59, 59, 999);
            windowEndAt = we.toISOString();
        }

        return res.json({
            success: true,
            data: {
                enabled: !!(sr && sr.enabled),
                windowStartOffsetDays: sr ? sr.windowStartOffsetDays : -3,
                windowEndOffsetDays: sr ? sr.windowEndOffsetDays : -2,
                startTime: sr ? sr.startTime : { hour: 0, minute: 0 },
                endTime: sr ? sr.endTime : { hour: 23, minute: 59 },
                nextWeekStartDate: nextWeekStart.toISOString().split('T')[0],
                windowStartAt,
                windowEndAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports.getPublicShiftRegistration = getPublicShiftRegistration;


