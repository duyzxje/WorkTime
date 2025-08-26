const express = require('express');
const {
    checkIn,
    checkOut,
    getAttendanceHistory,
    getAllAttendance,
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Check in - không cần authentication middleware
router.post('/checkin', checkIn);

// Check out - không cần authentication middleware
router.post('/checkout', checkOut);

// Get user's attendance history - theo userId
router.get('/:userId', getAttendanceHistory);

// Get attendance for all users (vẫn giữ lại bảo vệ admin)
router.get('/all', protect, admin, getAllAttendance);

module.exports = router;