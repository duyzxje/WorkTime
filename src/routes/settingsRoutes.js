const express = require('express');
const { getSettings, updateShiftRegistration, getPublicShiftRegistration } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all settings (admin only)
router.get('/', protect, admin, getSettings);

// Update shift registration settings (admin only)
router.put('/shift-registration', protect, admin, updateShiftRegistration);

module.exports = router;

// Public route for FE to read window info
router.get('/public/shift-registration', getPublicShiftRegistration);


