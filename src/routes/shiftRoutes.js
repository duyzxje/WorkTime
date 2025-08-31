const express = require('express');
const { getAllShifts, getUserShifts, toggleShift, deleteUserShift, deleteOwnShift } = require('../controllers/shiftController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/shifts
// @desc    Get all shift registrations for the week
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

// @route   DELETE /api/shifts/own/:day
// @desc    Delete all shifts for the current user on a specific day
// @access  Private
router.delete('/own/:day', protect, deleteOwnShift);

// @route   DELETE /api/shifts/user/:userId/day/:day
// @desc    Delete all shifts for a specific user on a specific day (admin only)
// @access  Private/Admin
router.delete('/user/:userId/day/:day', protect, admin, deleteUserShift);

module.exports = router;
