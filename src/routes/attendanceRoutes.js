const express = require('express');
const {
    checkIn,
    checkOut,
    getAttendanceHistory,
    getAllAttendance,
    manualCheckOut,
    createManualRecord
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Check in - không cần authentication middleware
router.post('/checkin', checkIn);

// Check out - không cần authentication middleware
router.post('/checkout', checkOut);

// Manual check-out (quên check-out)
router.post('/manual-checkout', manualCheckOut);

// Create manual attendance record (admin only)
router.post('/manual-record', protect, admin, createManualRecord);

// Get attendance for all users (vẫn giữ lại bảo vệ admin)
router.get('/all', protect, admin, getAllAttendance);

// Get user's attendance history - theo userId (PHẢI ĐỂ Ở CUỐI CÙNG!)
router.get('/:userId', getAttendanceHistory);

module.exports = router;