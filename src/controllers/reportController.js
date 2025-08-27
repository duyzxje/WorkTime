const Attendance = require('../models/attendanceModel');
const mongoose = require('mongoose');

// @desc    Lấy báo cáo tổng hợp theo ngày của một người dùng
// @route   GET /api/reports/daily/:userId
// @access  Public
const getDailyReport = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        // Xác định khoảng thời gian
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate) : new Date();

        // Đảm bảo end date là cuối ngày
        end.setHours(23, 59, 59, 999);

        // Lấy dữ liệu chấm công
        const attendances = await Attendance.find({
            user: userId,
            checkInTime: { $gte: start, $lte: end }
        }).sort('checkInTime');

        // Tính toán số liệu thống kê
        const totalDays = attendances.length;
        const validDays = attendances.filter(a => a.isValid).length;
        const invalidDays = totalDays - validDays;

        // Tính tổng thời gian làm việc (phút)
        let totalWorkMinutes = 0;
        attendances.forEach(a => {
            if (a.status === 'checked-out' && a.workDuration) {
                totalWorkMinutes += a.workDuration;
            }
        });

        // Chuyển đổi thành giờ:phút
        const totalWorkHours = Math.floor(totalWorkMinutes / 60);
        const remainingMinutes = totalWorkMinutes % 60;

        // Tạo dữ liệu theo ngày
        const dailyData = attendances.map(a => {
            const date = new Date(a.checkInTime).toISOString().split('T')[0];
            const checkInTime = a.checkInTime;
            const checkOutTime = a.checkOutTime || null;
            const duration = a.workDuration || 0;
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;

            return {
                date,
                checkInTime,
                checkOutTime,
                isValid: a.isValid,
                workDuration: duration,
                formattedDuration: `${hours}h${minutes}m`,
                status: a.status
            };
        });

        res.json({
            userId,
            summary: {
                period: {
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0],
                },
                totalDays,
                validDays,
                invalidDays,
                totalWorkTime: {
                    minutes: totalWorkMinutes,
                    formatted: `${totalWorkHours}h${remainingMinutes}m`
                },
                averageDaily: totalDays > 0 ? Math.round(totalWorkMinutes / totalDays) : 0
            },
            dailyData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Lấy báo cáo tổng hợp theo tháng của một người dùng
// @route   GET /api/reports/monthly/:userId
// @access  Public
const getMonthlyReport = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year } = req.query;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        // Xác định năm báo cáo
        const reportYear = year ? parseInt(year) : new Date().getFullYear();

        // Tạo mảng dữ liệu tháng
        const monthlyData = [];

        for (let month = 0; month < 12; month++) {
            // Tính ngày đầu và cuối tháng
            const startOfMonth = new Date(reportYear, month, 1);
            const endOfMonth = new Date(reportYear, month + 1, 0, 23, 59, 59, 999);

            // Lấy dữ liệu chấm công trong tháng
            const attendances = await Attendance.find({
                user: userId,
                checkInTime: { $gte: startOfMonth, $lte: endOfMonth }
            });

            // Tính số ngày làm việc trong tháng
            const totalDays = attendances.length;
            const validDays = attendances.filter(a => a.isValid).length;

            // Tính tổng thời gian làm việc
            let totalWorkMinutes = 0;
            attendances.forEach(a => {
                if (a.status === 'checked-out' && a.workDuration) {
                    totalWorkMinutes += a.workDuration;
                }
            });

            // Chuyển đổi thành giờ
            const totalWorkHours = Math.floor(totalWorkMinutes / 60);
            const remainingMinutes = totalWorkMinutes % 60;

            // Thêm dữ liệu tháng vào kết quả
            monthlyData.push({
                month: month + 1,
                monthName: new Date(reportYear, month, 1).toLocaleString('default', { month: 'long' }),
                totalDays,
                validDays,
                invalidDays: totalDays - validDays,
                totalWorkTime: {
                    minutes: totalWorkMinutes,
                    formatted: `${totalWorkHours}h${remainingMinutes}m`
                },
                averageDaily: totalDays > 0 ? Math.round(totalWorkMinutes / totalDays) : 0
            });
        }

        res.json({
            userId,
            year: reportYear,
            monthlyData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getDailyReport,
    getMonthlyReport
};
