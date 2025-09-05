const express = require('express');
const router = express.Router();
const {
    calculateSalary,
    getUserSalaryHistory,
    getMonthlySalaries,
    exportSalaryToExcel,
    updateHourlyRate,
    getUsersForSalary,
    recalculateMonth,
    updateSalaryForMonth
} = require('../controllers/salaryController');
const { protect, admin } = require('../middleware/authMiddleware');

// @route   POST /api/salary/calculate
// @desc    Calculate salary for a user in a specific month
// @access  Private/Admin
router.post('/calculate', protect, admin, calculateSalary);

// @route   GET /api/salary/user/:userId
// @desc    Get salary history for a user
// @access  Private/Admin
router.get('/user/:userId', protect, admin, getUserSalaryHistory);

// @route   GET /api/salary/monthly
// @desc    Get all salaries for a specific month
// @access  Private/Admin
router.get('/monthly', protect, admin, getMonthlySalaries);

// @route   GET /api/salary/export/:userId/:month/:year
// @desc    Export salary report to Excel
// @access  Private/Admin
router.get('/export/:userId/:month/:year', protect, admin, exportSalaryToExcel);

// @route   PUT /api/salary/rate/:userId
// @desc    Update user hourly rate
// @access  Private/Admin
router.put('/rate/:userId', protect, admin, updateHourlyRate);

// @route   GET /api/salary/users
// @desc    Get users available for salary calculation
// @access  Private/Admin
router.get('/users', protect, admin, getUsersForSalary);

// @route   POST /api/salary/recalculate-month
// @desc    Recalculate all salaries for a specific month
// @access  Private/Admin
router.post('/recalculate-month', protect, admin, recalculateMonth);

// @route   PUT /api/salary/update-month
// @desc    Update salary for a specific month with new hourly rate
// @access  Private/Admin
router.put('/update-month', protect, admin, updateSalaryForMonth);

module.exports = router;
