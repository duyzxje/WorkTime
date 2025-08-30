const Shift = require('../models/shiftModel');
const User = require('../models/userModel');
const Live = require('../models/liveModel');
const mongoose = require('mongoose');

// Helper function to get the week's end date
const getWeekEndDate = (weekStartDate) => {
    const endDate = new Date(weekStartDate);
    endDate.setDate(endDate.getDate() + 6); // 6 days after start = end of week
    return endDate;
};

// @desc    Get all shift registrations for the week
// @route   GET /api/shifts?weekStartDate=YYYY-MM-DD
// @access  Private
const getAllShifts = async (req, res) => {
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

        // Get all shifts for this week
        const shifts = await Shift.find({
            weekStartDate: startDate
        }).populate('userId', 'username name');

        // Get all users except admin users
        const users = await User.find({ role: { $ne: 'admin' } }).select('_id username name');

        // Get live events for this week
        const liveEvents = await Live.find({
            weekStartDate: startDate
        });

        // Process data into required format
        const employeeData = [];
        const liveSchedule = {};

        // Initialize live schedule with empty arrays for all days
        for (let i = 1; i <= 7; i++) {
            liveSchedule[i] = [];
        }

        // Update with actual live events
        liveEvents.forEach(event => {
            const liveShifts = [];
            if (event.morning) liveShifts.push('morning');
            if (event.noon) liveShifts.push('noon');
            if (event.afternoon) liveShifts.push('afternoon');
            if (event.evening) liveShifts.push('evening');

            // If no shifts are selected, mark as "off"
            liveSchedule[event.day] = liveShifts.length > 0 ? liveShifts : ['off'];
        });

        // Process shift data for each user (excluding admins)
        users.forEach(user => {
            const userShifts = shifts.filter(
                shift => shift.userId._id.toString() === user._id.toString()
            );

            // Initialize shifts object with all days and all shift types set to false
            const shiftsObject = {};
            for (let day = 1; day <= 7; day++) {
                shiftsObject[day] = {
                    morning: false,
                    noon: false,
                    afternoon: false,
                    evening: false,
                    off: false
                };
            }

            // Update with actual registered shifts
            userShifts.forEach(shift => {
                shiftsObject[shift.day] = {
                    morning: shift.morning,
                    noon: shift.noon,
                    afternoon: shift.afternoon,
                    evening: shift.evening,
                    off: shift.off
                };
            });

            employeeData.push({
                userId: user._id,
                username: user.username,
                name: user.name,
                shifts: shiftsObject
            });
        });

        res.json({
            success: true,
            data: {
                employees: employeeData,
                liveEvents: liveSchedule,
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

// @desc    Get shift registrations for a specific user
// @route   GET /api/shifts/user/:userId?weekStartDate=YYYY-MM-DD
// @access  Private
const getUserShifts = async (req, res) => {
    try {
        const { userId } = req.params;
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

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get all shifts for this user in this week
        const shifts = await Shift.find({
            userId,
            weekStartDate: startDate
        });

        // Initialize shifts object with all days and all shift types set to false
        const shiftsObject = {};
        for (let day = 1; day <= 7; day++) {
            shiftsObject[day] = {
                morning: false,
                noon: false,
                afternoon: false,
                evening: false,
                off: false
            };
        }

        // Update with actual registered shifts
        shifts.forEach(shift => {
            shiftsObject[shift.day] = {
                morning: shift.morning,
                noon: shift.noon,
                afternoon: shift.afternoon,
                evening: shift.evening,
                off: shift.off
            };
        });

        res.json({
            success: true,
            data: {
                userId,
                username: user.name,
                shifts: shiftsObject,
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

// @desc    Toggle shift registration (register/unregister)
// @route   POST /api/shifts/toggle
// @access  Private
const toggleShift = async (req, res) => {
    try {
        const { userId, day, shiftType, weekStartDate } = req.body;

        if (!userId || !day || !shiftType || !weekStartDate) {
            return res.status(400).json({
                success: false,
                message: 'User ID, day, shift type, and week start date are required'
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

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find or create shift registration for this user, day, and week
        let shift = await Shift.findOne({
            userId,
            day,
            weekStartDate: startDate
        });

        if (!shift) {
            // Create a new shift registration with all shift types set to false
            shift = new Shift({
                userId,
                day,
                weekStartDate: startDate,
                morning: false,
                noon: false,
                afternoon: false,
                evening: false,
                off: false
            });
        }

        // Toggle the specified shift type
        shift[shiftType] = !shift[shiftType];

        await shift.save();

        // Determine action taken
        const action = shift[shiftType] ? 'Đã đăng ký' : 'Đã hủy';
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

        // Get all shifts for this user in this week
        const allShifts = await Shift.find({
            userId,
            weekStartDate: startDate
        });

        // Initialize shifts object with all days and all shift types set to false
        const shiftsObject = {};
        for (let d = 1; d <= 7; d++) {
            shiftsObject[d] = {
                morning: false,
                noon: false,
                afternoon: false,
                evening: false,
                off: false
            };
        }

        // Update with actual registered shifts
        allShifts.forEach(s => {
            shiftsObject[s.day] = {
                morning: s.morning,
                noon: s.noon,
                afternoon: s.afternoon,
                evening: s.evening,
                off: s.off
            };
        });

        res.json({
            success: true,
            data: {
                userId,
                username: user.name,
                shifts: shiftsObject,
                message: `${action} ca ${shiftTypeMap[shiftType]} ${dayMap[day]}`
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

// @desc    Delete all shifts for a specific user on a specific day
// @route   DELETE /api/shifts/user/:userId/day/:day
// @access  Private/Admin
const deleteUserShift = async (req, res) => {
    try {
        const { userId, day } = req.params;
        const { weekStartDate } = req.query;

        if (!weekStartDate) {
            return res.status(400).json({
                success: false,
                message: 'Week start date is required as query parameter'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        if (day < 1 || day > 7) {
            return res.status(400).json({
                success: false,
                message: 'Day must be between 1 and 7'
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

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find shift for this user, day and week
        const shift = await Shift.findOne({
            userId,
            day: parseInt(day),
            weekStartDate: startDate
        });

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'No shift found for this user, day and week'
            });
        }

        // Delete the shift
        await Shift.findByIdAndDelete(shift._id);

        // Get all remaining shifts for this user in this week
        const allShifts = await Shift.find({
            userId,
            weekStartDate: startDate
        });

        // Initialize shifts object with all days and all shift types set to false
        const shiftsObject = {};
        for (let d = 1; d <= 7; d++) {
            shiftsObject[d] = {
                morning: false,
                noon: false,
                afternoon: false,
                evening: false,
                off: false
            };
        }

        // Update with actual registered shifts
        allShifts.forEach(s => {
            shiftsObject[s.day] = {
                morning: s.morning,
                noon: s.noon,
                afternoon: s.afternoon,
                evening: s.evening,
                off: s.off
            };
        });

        const dayMap = {
            1: 'Thứ 2',
            2: 'Thứ 3',
            3: 'Thứ 4',
            4: 'Thứ 5',
            5: 'Thứ 6',
            6: 'Thứ 7',
            7: 'Chủ nhật'
        };

        res.json({
            success: true,
            data: {
                userId,
                username: user.name,
                shifts: shiftsObject,
                message: `Đã xóa lịch làm việc của ${user.name} cho ${dayMap[day]}`
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
    getAllShifts,
    getUserShifts,
    toggleShift,
    deleteUserShift
};
