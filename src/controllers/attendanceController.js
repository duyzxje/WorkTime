const Attendance = require('../models/attendanceModel');
const { isWithinRadius } = require('../utils/geoUtils');
const { officeLocations } = require('../config/locations');
const mongoose = require('mongoose');

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Public
const checkIn = async (req, res) => {
    try {
        const { userId, longitude, latitude, officeId = 'main', notes } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!longitude || !latitude) {
            return res.status(400).json({ message: 'GPS coordinates are required' });
        }

        // Check if user already has an active check-in for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingAttendance = await Attendance.findOne({
            user: userId,
            checkInTime: { $gte: startOfDay, $lte: endOfDay },
            status: 'checked-in',
        });

        if (existingAttendance) {
            return res.status(400).json({
                message: 'You already have an active check-in for today',
                attendance: existingAttendance,
            });
        }

        // Verify the GPS location
        const userCoordinates = [parseFloat(longitude), parseFloat(latitude)];
        const office = officeLocations[officeId];

        if (!office) {
            return res.status(400).json({ message: 'Invalid office location' });
        }

        const isValid = isWithinRadius(
            userCoordinates,
            office.coordinates,
            office.radius
        );

        if (!isValid) {
            return res.status(400).json({
                message: 'Check-in failed: You are not within the office location',
                currentLocation: userCoordinates,
                officeLocation: office.coordinates,
                maxDistance: office.radius,
            });
        }

        // Create attendance record
        const attendance = await Attendance.create({
            user: userId,
            checkInTime: new Date(),
            checkInLocation: {
                type: 'Point',
                coordinates: userCoordinates,
            },
            notes,
        });

        res.status(201).json({
            message: 'Check-in successful',
            attendance,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Check out
// @route   POST /api/attendance/checkout
// @access  Public
const checkOut = async (req, res) => {
    try {
        const { userId, longitude, latitude, notes } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!longitude || !latitude) {
            return res.status(400).json({ message: 'GPS coordinates are required' });
        }

        // Find active check-in for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findOne({
            user: userId,
            checkInTime: { $gte: startOfDay, $lte: endOfDay },
            status: 'checked-in',
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No active check-in found for today' });
        }

        // Update the attendance record with check-out
        const userCoordinates = [parseFloat(longitude), parseFloat(latitude)];

        attendance.checkOutTime = new Date();
        attendance.checkOutLocation.coordinates = userCoordinates;
        attendance.status = 'checked-out';

        if (notes) {
            attendance.notes = attendance.notes
                ? `${attendance.notes}\nCheck-out: ${notes}`
                : `Check-out: ${notes}`;
        }

        await attendance.save();

        res.json({
            message: 'Check-out successful',
            attendance,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user's attendance history
// @route   GET /api/attendance/:userId
// @access  Public
const getAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        const query = { user: userId };

        // Add date range if provided
        if (startDate && endDate) {
            query.checkInTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendance = await Attendance.find(query).sort('-checkInTime');

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get attendance for all users (admin only)
// @route   GET /api/attendance/all
// @access  Private/Admin
const getAllAttendance = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;

        const query = {};

        // Add user filter if provided
        if (userId) {
            query.user = userId;
        }

        // Add date range if provided
        if (startDate && endDate) {
            query.checkInTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendance = await Attendance.find(query)
            .populate('user', 'name email')
            .sort('-checkInTime');

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    checkIn,
    checkOut,
    getAttendanceHistory,
    getAllAttendance,
};