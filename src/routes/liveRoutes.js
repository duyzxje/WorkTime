const express = require('express');
const { getLiveEvents, updateLiveEvent, deleteLiveEvent } = require('../controllers/liveController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/live
// @desc    Get live events for the week
// @access  Private
router.get('/', protect, getLiveEvents);

// @route   POST /api/live/update
// @desc    Update live event for a day
// @access  Private/Admin
router.post('/update', protect, admin, updateLiveEvent);

// @route   DELETE /api/live/:day
// @desc    Delete live event for a specific day
// @access  Private/Admin
router.delete('/:day', protect, admin, deleteLiveEvent);

module.exports = router;
