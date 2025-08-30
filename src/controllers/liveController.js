const Live = require('../models/liveModel');

// Helper function to get the week's end date
const getWeekEndDate = (weekStartDate) => {
    const endDate = new Date(weekStartDate);
    endDate.setDate(endDate.getDate() + 6); // 6 days after start = end of week
    return endDate;
};

// @desc    Get live events for the week
// @route   GET /api/live?weekStartDate=YYYY-MM-DD
// @access  Private
const getLiveEvents = async (req, res) => {
    try {
        const { weekStartDate } = req.query;

        if (!weekStartDate) {
            return res.status(400).json({
                success: false,
                message: 'Week start date is required'
            });
        }

        // Parse and validate date
        const startDate = new Date(weekStartDate);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const endDate = getWeekEndDate(startDate);

        // Get live events for this week
        const liveEvents = await Live.find({
            weekStartDate: startDate
        });

        // Initialize schedule with empty arrays for all days
        const schedule = {};
        for (let i = 1; i <= 7; i++) {
            schedule[i] = [];
        }

        // Update with actual live events
        liveEvents.forEach(event => {
            const shifts = [];
            if (event.morning) shifts.push('morning');
            if (event.noon) shifts.push('noon');
            if (event.afternoon) shifts.push('afternoon');
            if (event.evening) shifts.push('evening');
            if (event.off) shifts.push('off');

            schedule[event.day] = shifts;
        });

        res.json({
            success: true,
            data: {
                schedule,
                weekStartDate: weekStartDate,
                weekEndDate: endDate.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Update live event for a day
// @route   POST /api/live/update
// @access  Private/Admin
const updateLiveEvent = async (req, res) => {
    try {
        console.log('=== UPDATE LIVE EVENT REQUEST ===');
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers);
        console.log('Content-Type:', req.headers['content-type']);

        const { day, shiftType, weekStartDate, action } = req.body;

        console.log('Extracted values:', { day, shiftType, weekStartDate, action });
        console.log('Type of day:', typeof day);
        console.log('Type of shiftType:', typeof shiftType);
        console.log('Type of weekStartDate:', typeof weekStartDate);
        console.log('Type of action:', typeof action);

        if (!day || !shiftType || !weekStartDate || !action) {
            console.log('Missing required fields');
            console.log('day exists:', !!day);
            console.log('shiftType exists:', !!shiftType);
            console.log('weekStartDate exists:', !!weekStartDate);
            console.log('action exists:', !!action);

            return res.status(400).json({
                success: false,
                message: 'Day, shift type, week start date, and action are required',
                received: { day, shiftType, weekStartDate, action }
            });
        }

        if (day < 1 || day > 7) {
            return res.status(400).json({
                success: false,
                message: 'Day must be between 1 and 7'
            });
        }

        const validShiftTypes = ['morning', 'noon', 'afternoon', 'evening', 'off'];
        if (!validShiftTypes.includes(shiftType)) {
            return res.status(400).json({
                success: false,
                message: 'Shift type must be morning, noon, afternoon, evening, or off'
            });
        }

        const validActions = ['add', 'remove'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be add or remove'
            });
        }

        // Parse and validate date
        const startDate = new Date(weekStartDate);
        if (isNaN(startDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Find or create live event for this day and week
        let liveEvent = await Live.findOne({
            day,
            weekStartDate: startDate
        });

        if (!liveEvent) {
            // Create a new live event with all shifts set to false
            liveEvent = new Live({
                day,
                weekStartDate: startDate,
                morning: false,
                noon: false,
                afternoon: false,
                evening: false
            });
        }

        // Update the specified shift type based on action
        if (action === 'add') {
            if (shiftType === 'off') {
                // Khi thêm ca 'off', set tất cả ca khác về false
                liveEvent.morning = false;
                liveEvent.noon = false;
                liveEvent.afternoon = false;
                liveEvent.evening = false;
            } else {
                // Khi thêm ca khác, set ca đó về true
                liveEvent[shiftType] = true;
            }
        } else if (action === 'remove') {
            if (shiftType === 'off') {
                // Khi hủy ca 'off', không làm gì cả (vì off được tính tự động)
                return res.status(400).json({
                    success: false,
                    message: 'Không thể hủy ca off. Hãy thêm ít nhất một ca làm việc.'
                });
            } else {
                // Khi hủy ca khác, set ca đó về false
                liveEvent[shiftType] = false;
            }
        }

        console.log('About to save live event:', liveEvent);

        try {
            await liveEvent.save();
            console.log('Live event saved successfully');
        } catch (saveError) {
            console.error('Error saving live event:', saveError);
            return res.status(500).json({
                success: false,
                message: 'Error saving live event',
                error: saveError.message
            });
        }

        // Get all live events for this week
        const allLiveEvents = await Live.find({
            weekStartDate: startDate
        });

        // Initialize schedule with empty arrays for all days
        const schedule = {};
        for (let i = 1; i <= 7; i++) {
            schedule[i] = [];
        }

        // Update with actual live events
        allLiveEvents.forEach(event => {
            const shifts = [];
            if (event.morning) shifts.push('morning');
            if (event.noon) shifts.push('noon');
            if (event.afternoon) shifts.push('afternoon');
            if (event.evening) shifts.push('evening');
            if (event.off) shifts.push('off');

            schedule[event.day] = shifts;
        });

        const shiftTypeMap = {
            morning: 'Sáng',
            noon: 'Trưa',
            afternoon: 'Chiều',
            evening: 'Tối',
            off: 'Nghỉ'
        };

        const dayMap = {
            1: 'Thứ 2',
            2: 'Thứ 3',
            3: 'Thứ 4',
            4: 'Thứ 5',
            5: 'Thứ 6',
            6: 'Thứ 7',
            7: 'Chủ nhật'
        };

        const endDate = getWeekEndDate(startDate);

        // Determine the action message
        const actionText = action === 'add' ? 'thêm' : 'hủy';
        const shiftText = shiftTypeMap[shiftType];

        res.json({
            success: true,
            data: {
                schedule,
                weekStartDate: weekStartDate,
                weekEndDate: endDate.toISOString().split('T')[0],
                message: `Đã ${actionText} ca ${shiftText} cho ${dayMap[day]}`
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

module.exports = {
    getLiveEvents,
    updateLiveEvent
};
