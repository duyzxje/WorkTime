const express = require('express');
const {
    registerUser,
    getUserProfile,
    getUsers,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/users
// @desc    Register a new user
// @access  Private/Admin
router.post('/', protect, admin, registerUser);

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', protect, admin, getUsers);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/users/:userId
// @desc    Update user information
// @access  Private/Admin
router.put('/:userId', protect, admin, updateUser);

// @route   DELETE /api/users/:userId
// @desc    Delete a user
// @access  Private/Admin
router.delete('/:userId', protect, admin, deleteUser);

module.exports = router;