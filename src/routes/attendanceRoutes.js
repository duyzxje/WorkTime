const express = require('express');
const {
    checkIn,
    checkOut,
    getAttendanceHistory,
    getAllAttendance,
    manualCheckOut,
    createManualRecord,
    getUsersForManualAttendance,
    getAttendanceSummary,
    getMonthlyAttendanceSummary,
    updateAttendanceRecord,
    deleteAttendanceRecord
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.post('/manual-checkout', manualCheckOut);
router.get('/:userId', getAttendanceHistory);
router.get('/:userId/summary', getAttendanceSummary);

// Admin only routes
router.get('/all', protect, admin, getAllAttendance);
router.get('/users-for-manual', protect, admin, getUsersForManualAttendance);
router.post('/manual-record', protect, admin, createManualRecord);

// New admin attendance management routes
router.get('/admin/monthly-summary', protect, admin, getMonthlyAttendanceSummary);
router.put('/admin/:attendanceId', protect, admin, updateAttendanceRecord);
router.delete('/admin/:attendanceId', protect, admin, deleteAttendanceRecord);

module.exports = router;