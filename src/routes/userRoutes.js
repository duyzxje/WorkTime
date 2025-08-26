const express = require('express');
const {
    registerUser,
    loginUser,
    getUserProfile,
    getUsers,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Register a new user
router.post('/', registerUser);

// Login user
router.post('/login', loginUser);

// Get user profile
router.get('/profile', protect, getUserProfile);

// Get all users (admin only)
router.get('/', protect, admin, getUsers);

module.exports = router;
