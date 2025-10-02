const Salary = require('../models/salaryModel');
const Attendance = require('../models/attendanceModel');
const User = require('../models/userModel');
const ExcelJS = require('exceljs');
const { handleSalaryRateChange, updateSalaryForSpecificMonth, recalculateAllSalariesForMonth } = require('../services/autoSalaryService');

// @desc    Calculate salary for a user in a specific month
// @route   POST /api/salary/calculate
// @access  Private/Admin
const calculateSalary = async (req, res) => {
    try {
        const { userId, month, year } = req.body;

        if (!userId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'User ID, month, and year are required'
            });
        }

        // Validate month and year
        if (month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Month must be between 1 and 12'
            });
        }

        // Get user information
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Get attendance records for the month
        const attendanceRecords = await Attendance.find({
            user: userId,
            checkInTime: { $gte: startDate, $lte: endDate },
            status: 'checked-out' // Only completed shifts
        }).sort('checkInTime');

        // Calculate daily records
        const dailyRecords = [];
        let totalHours = 0;
        let totalSalary = 0;

        attendanceRecords.forEach(record => {
            const workHours = record.workDuration ? record.workDuration / 60 : 0; // Convert minutes to hours
            const dailySalary = workHours * user.hourlyRate;

            dailyRecords.push({
                date: record.checkInTime,
                workHours: Math.round(workHours * 100) / 100, // Round to 2 decimal places
                dailySalary: Math.round(dailySalary),
                checkInTime: record.checkInTime,
                checkOutTime: record.checkOutTime,
                isValid: record.isValid,
                notes: record.notes
            });

            totalHours += workHours;
            totalSalary += dailySalary;
        });

        // Round totals
        totalHours = Math.round(totalHours * 100) / 100;
        totalSalary = Math.round(totalSalary);

        // Create or update salary record
        const salaryData = {
            userId,
            hourlyRate: user.hourlyRate,
            month,
            year,
            totalHours,
            totalSalary,
            dailyRecords
        };

        const existingSalary = await Salary.findOne({ userId, month, year });
        let salaryRecord;

        if (existingSalary) {
            salaryRecord = await Salary.findByIdAndUpdate(
                existingSalary._id,
                salaryData,
                { new: true }
            );
        } else {
            salaryRecord = await Salary.create(salaryData);
        }

        res.json({
            success: true,
            message: `Tính lương thành công cho ${user.name} - ${month}/${year}`,
            data: {
                salary: salaryRecord,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    hourlyRate: user.hourlyRate
                },
                summary: {
                    month,
                    year,
                    totalHours,
                    totalSalary,
                    dailyRecordsCount: dailyRecords.length,
                    averageHoursPerDay: dailyRecords.length > 0 ? Math.round((totalHours / dailyRecords.length) * 100) / 100 : 0,
                    averageSalaryPerDay: dailyRecords.length > 0 ? Math.round(totalSalary / dailyRecords.length) : 0
                },
                dailyRecords: dailyRecords.map(record => ({
                    date: record.date,
                    checkInTime: record.checkInTime,
                    checkOutTime: record.checkOutTime,
                    workHours: record.workHours,
                    dailySalary: record.dailySalary,
                    isValid: record.isValid,
                    notes: record.notes || ''
                }))
            }
        });
    } catch (error) {
        console.error('Error in calculateSalary:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Get salary history for a user
// @route   GET /api/salary/user/:userId
// @access  Private/Admin
const getUserSalaryHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { year } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Build query
        const query = { userId };
        if (year) {
            query.year = parseInt(year);
        }

        const salaryRecords = await Salary.find(query)
            .populate('userId', 'name username email')
            .sort({ year: -1, month: -1 });

        res.json({
            success: true,
            data: {
                salaryHistory: salaryRecords,
                count: salaryRecords.length
            }
        });
    } catch (error) {
        console.error('Error in getUserSalaryHistory:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Get all salaries for a specific month
// @route   GET /api/salary/monthly
// @access  Private/Admin
const getMonthlySalaries = async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required'
            });
        }

        const salaryRecords = await Salary.find({ month: parseInt(month), year: parseInt(year) })
            .populate('userId', 'name username email')
            .sort({ 'userId.name': 1 });

        // Calculate totals
        const totalHours = salaryRecords.reduce((sum, record) => sum + record.totalHours, 0);
        const totalSalary = salaryRecords.reduce((sum, record) => sum + record.totalSalary, 0);

        res.json({
            success: true,
            data: {
                month: parseInt(month),
                year: parseInt(year),
                salaries: salaryRecords,
                summary: {
                    totalEmployees: salaryRecords.length,
                    totalHours: Math.round(totalHours * 100) / 100,
                    totalSalary: Math.round(totalSalary)
                }
            }
        });
    } catch (error) {
        console.error('Error in getMonthlySalaries:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Export salary report to Excel
// @route   GET /api/salary/export/:userId/:month/:year
// @access  Private/Admin
const exportSalaryToExcel = async (req, res) => {
    try {
        const { userId, month, year } = req.params;

        // Get salary data
        const salaryRecord = await Salary.findOne({
            userId,
            month: parseInt(month),
            year: parseInt(year)
        }).populate('userId', 'name username email');

        if (!salaryRecord) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }

        // Create workbook
        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Daily History
        const dailySheet = workbook.addWorksheet('Lịch sử chấm công');
        dailySheet.columns = [
            { header: 'Ngày', key: 'date', width: 15 },
            { header: 'Thứ', key: 'dayOfWeek', width: 10 },
            { header: 'Giờ vào', key: 'checkInTime', width: 15 },
            { header: 'Giờ ra', key: 'checkOutTime', width: 15 },
            { header: 'Số giờ làm', key: 'workHours', width: 15 },
            { header: 'Lương ngày', key: 'dailySalary', width: 15 },
            { header: 'Hợp lệ', key: 'isValid', width: 10 },
            { header: 'Ghi chú', key: 'notes', width: 20 }
        ];

        // Add data to daily sheet
        salaryRecord.dailyRecords.forEach(record => {
            const date = new Date(record.date);
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

            dailySheet.addRow({
                date: date.toISOString().split('T')[0],
                dayOfWeek: dayNames[date.getDay()],
                checkInTime: record.checkInTime || '',
                checkOutTime: record.checkOutTime || '',
                workHours: record.workHours,
                dailySalary: record.dailySalary + 'đ',
                isValid: record.isValid ? 'Có' : 'Không',
                notes: record.notes || ''
            });
        });

        // Style the header
        dailySheet.getRow(1).font = { bold: true };
        dailySheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Sheet 2: Summary
        const summarySheet = workbook.addWorksheet('Tổng kết');
        summarySheet.columns = [
            { header: 'Thông tin', key: 'info', width: 25 },
            { header: 'Giá trị', key: 'value', width: 25 }
        ];

        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];

        summarySheet.addRows([
            { info: 'Tên nhân viên', value: salaryRecord.userId.name },
            { info: 'Tháng', value: `${monthNames[month - 1]} ${year}` },
            { info: 'Mức lương/giờ', value: salaryRecord.hourlyRate + 'đ' },
            { info: 'Tổng số ngày làm', value: salaryRecord.dailyRecords.length },
            { info: 'Tổng số giờ làm', value: salaryRecord.totalHours + ' giờ' },
            { info: 'Tổng lương', value: salaryRecord.totalSalary + 'đ' }
        ]);

        // Style the summary sheet
        summarySheet.getRow(1).font = { bold: true };
        summarySheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        // Tạo tên file với tên nhân viên (loại bỏ dấu và khoảng trắng)
        const cleanName = salaryRecord.userId.name
            .toLowerCase()
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
            .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
            .replace(/[ìíịỉĩ]/g, 'i')
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
            .replace(/[ùúụủũưừứựửữ]/g, 'u')
            .replace(/[ỳýỵỷỹ]/g, 'y')
            .replace(/đ/g, 'd')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        res.setHeader('Content-Disposition', `attachment; filename="luong_${cleanName}_thang${month}_${year}.xlsx"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error in exportSalaryToExcel:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Update user hourly rate
// @route   PUT /api/salary/rate/:userId
// @access  Private/Admin
const updateHourlyRate = async (req, res) => {
    try {
        const { userId } = req.params;
        const { hourlyRate } = req.body;

        if (!hourlyRate || hourlyRate < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid hourly rate is required'
            });
        }

        // Lấy user hiện tại để so sánh mức lương
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { hourlyRate },
            { new: true }
        ).select('name username email hourlyRate');

        // Tự động tính lại lương nếu có thay đổi mức lương
        if (currentUser.hourlyRate !== hourlyRate) {
            handleSalaryRateChange(userId, hourlyRate);
        }

        res.json({
            success: true,
            data: {
                user,
                message: 'Hourly rate updated successfully'
            }
        });
    } catch (error) {
        console.error('Error in updateHourlyRate:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Get users available for salary calculation
// @route   GET /api/salary/users
// @access  Private/Admin
const getUsersForSalary = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } })
            .select('_id name username email hourlyRate')
            .sort('name');

        res.json({
            success: true,
            data: {
                users,
                count: users.length
            }
        });
    } catch (error) {
        console.error('Error in getUsersForSalary:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Recalculate all salaries for a specific month
// @route   POST /api/salary/recalculate-month
// @access  Private/Admin
const recalculateMonth = async (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Month and year are required'
            });
        }

        if (month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Month must be between 1 and 12'
            });
        }

        // Recalculate all salaries for the month
        await recalculateAllSalariesForMonth(month, year);

        res.json({
            success: true,
            message: `Đã tính lại lương cho tất cả nhân viên trong tháng ${month}/${year}`,
            data: {
                month,
                year
            }
        });
    } catch (error) {
        console.error('Error in recalculateMonth:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Update salary for a specific month with new hourly rate
// @route   PUT /api/salary/update-month
// @access  Private/Admin
const updateSalaryForMonth = async (req, res) => {
    try {
        const { userId, month, year, hourlyRate } = req.body;

        if (!userId || !month || !year || !hourlyRate) {
            return res.status(400).json({
                success: false,
                message: 'User ID, month, year, and hourly rate are required'
            });
        }

        if (month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: 'Month must be between 1 and 12'
            });
        }

        if (hourlyRate < 0) {
            return res.status(400).json({
                success: false,
                message: 'Hourly rate must be positive'
            });
        }

        // Kiểm tra user tồn tại
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Cập nhật lương cho tháng cụ thể
        const salaryRecord = await updateSalaryForSpecificMonth(userId, month, year, hourlyRate);

        if (!salaryRecord) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update salary for the specified month'
            });
        }

        res.json({
            success: true,
            message: `Đã cập nhật lương cho ${user.name} - tháng ${month}/${year}`,
            data: {
                salary: salaryRecord,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email
                },
                summary: {
                    month,
                    year,
                    // monthName removed
                    hourlyRate,
                    totalHours: salaryRecord.totalHours,
                    totalSalary: salaryRecord.totalSalary,
                    dailyRecordsCount: salaryRecord.dailyRecords.length
                }
            }
        });
    } catch (error) {
        console.error('Error in updateSalaryForMonth:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

module.exports = {
    calculateSalary,
    getUserSalaryHistory,
    getMonthlySalaries,
    exportSalaryToExcel,
    updateHourlyRate,
    getUsersForSalary,
    recalculateMonth,
    updateSalaryForMonth
};
