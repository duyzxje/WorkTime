const express = require('express');
const {
    getDailyReport,
    getMonthlyReport
} = require('../controllers/reportController');

const router = express.Router();

// Lấy báo cáo theo ngày của người dùng
router.get('/daily/:userId', getDailyReport);

// Lấy báo cáo theo tháng của người dùng
router.get('/monthly/:userId', getMonthlyReport);

module.exports = router;
