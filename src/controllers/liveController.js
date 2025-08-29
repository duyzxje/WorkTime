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

        // Initialize schedule with "off" for all days
        const schedule = {};
        for (let i = 1; i <= 7; i++) {
            schedule[i] = "off";
        }

        // Update with actual live events
        liveEvents.forEach(event => {
            schedule[event.day] = event.shiftType;
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
        const { day, shiftType, weekStartDate } = req.body;

        if (!day || !shiftType || !weekStartDate) {
            return res.status(400).json({
                success: false,
                message: 'Day, shift type, and week start date are required'
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

        if (liveEvent) {
            liveEvent.shiftType = shiftType;
        } else {
            liveEvent = new Live({
                day,
                shiftType,
                weekStartDate: startDate
            });
        }

        await liveEvent.save();

        // Get all live events for this week
        const allLiveEvents = await Live.find({
            weekStartDate: startDate
        });

        // Initialize schedule with "off" for all days
        const schedule = {};
        for (let i = 1; i <= 7; i++) {
            schedule[i] = "off";
        }

        // Update with actual live events
        allLiveEvents.forEach(event => {
            schedule[event.day] = event.shiftType;
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

        res.json({
            success: true,
            data: {
                schedule,
                weekStartDate: weekStartDate,
                weekEndDate: endDate.toISOString().split('T')[0],
                message: `Đã cập nhật buổi Live ${dayMap[day]} thành ${shiftTypeMap[shiftType]}`
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
