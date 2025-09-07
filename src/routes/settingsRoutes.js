const express = require('express');
const { getSettings, updateShiftRegistration } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all settings (admin only)
router.get('/', protect, admin, getSettings);

// Update shift registration settings (admin only)
router.put('/shift-registration', protect, admin, updateShiftRegistration);

module.exports = router;


