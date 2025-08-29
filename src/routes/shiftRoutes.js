const express = require('express');
const { getAllShifts, getUserShifts, toggleShift } = require('../controllers/shiftController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/shifts
// @desc    Get all shifts for the week
// @access  Private
router.get('/', protect, getAllShifts);

// @route   GET /api/shifts/user/:userId
// @desc    Get shifts for a specific user
// @access  Private
router.get('/user/:userId', protect, getUserShifts);

// @route   POST /api/shifts/toggle
// @desc    Toggle shift registration (register/unregister)
// @access  Private
router.post('/toggle', protect, toggleShift);

module.exports = router;
