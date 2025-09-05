const Salary = require('../models/salaryModel');
const Attendance = require('../models/attendanceModel');
const User = require('../models/userModel');

/**
 * Tự động tính lương cho một nhân viên trong tháng cụ thể
 * @param {string} userId - ID của nhân viên
 * @param {number} month - Tháng (1-12)
 * @param {number} year - Năm
 * @param {number} hourlyRate - Mức lương theo giờ (optional, sẽ lấy từ user nếu không cung cấp)
 */
const calculateMonthlySalary = async (userId, month, year, hourlyRate = null) => {
    try {
        console.log(`[Auto Salary] Calculating salary for user ${userId}, month ${month}/${year}`);

        // Lấy thông tin user nếu chưa có hourlyRate
        let user;
        if (!hourlyRate) {
            user = await User.findById(userId);
            if (!user) {
                console.error(`[Auto Salary] User not found: ${userId}`);
                return null;
            }
            hourlyRate = user.hourlyRate;
        }

        // Tính date range cho tháng
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Lấy tất cả attendance records đã hoàn thành trong tháng
        const attendanceRecords = await Attendance.find({
            user: userId,
            checkInTime: { $gte: startDate, $lte: endDate },
            status: 'checked-out'
        }).sort('checkInTime');

        // Tính toán daily records
        const dailyRecords = [];
        let totalHours = 0;
        let totalSalary = 0;

        attendanceRecords.forEach(record => {
            const workHours = record.workDuration ? record.workDuration / 60 : 0; // Convert minutes to hours
            const dailySalary = workHours * hourlyRate;

            dailyRecords.push({
                date: record.checkInTime,
                workHours: Math.round(workHours * 100) / 100,
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

        // Tạo hoặc cập nhật salary record
        const salaryData = {
            userId,
            hourlyRate,
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
            console.log(`[Auto Salary] Updated existing salary record for user ${userId}, month ${month}/${year}`);
        } else {
            salaryRecord = await Salary.create(salaryData);
            console.log(`[Auto Salary] Created new salary record for user ${userId}, month ${month}/${year}`);
        }

        return salaryRecord;
    } catch (error) {
        console.error(`[Auto Salary] Error calculating salary for user ${userId}, month ${month}/${year}:`, error);
        return null;
    }
};

/**
 * Tự động tính lương khi có checkout mới
 * @param {Object} attendanceRecord - Bản ghi attendance vừa checkout
 */
const handleNewCheckout = async (attendanceRecord) => {
    try {
        if (!attendanceRecord || !attendanceRecord.user || !attendanceRecord.checkInTime) {
            console.error('[Auto Salary] Invalid attendance record for checkout');
            return;
        }

        const userId = attendanceRecord.user.toString();
        const checkInDate = new Date(attendanceRecord.checkInTime);
        const month = checkInDate.getMonth() + 1; // getMonth() returns 0-11
        const year = checkInDate.getFullYear();

        console.log(`[Auto Salary] New checkout detected for user ${userId}, month ${month}/${year}`);

        // Tính lương cho tháng đó
        const salaryRecord = await calculateMonthlySalary(userId, month, year);

        if (salaryRecord) {
            console.log(`[Auto Salary] Successfully calculated salary: ${salaryRecord.totalSalary}đ for ${salaryRecord.totalHours}h`);
        }
    } catch (error) {
        console.error('[Auto Salary] Error handling new checkout:', error);
    }
};

/**
 * Tự động tính lại lương khi thay đổi mức lương
 * @param {string} userId - ID của nhân viên
 * @param {number} newHourlyRate - Mức lương mới
 * @param {number} fromMonth - Tháng bắt đầu áp dụng (optional)
 * @param {number} fromYear - Năm bắt đầu áp dụng (optional)
 */
const handleSalaryRateChange = async (userId, newHourlyRate, fromMonth = null, fromYear = null) => {
    try {
        console.log(`[Auto Salary] Hourly rate changed for user ${userId} to ${newHourlyRate}đ/h`);

        // Nếu không chỉ định tháng/năm, tính lại từ tháng hiện tại
        if (!fromMonth || !fromYear) {
            const now = new Date();
            fromMonth = now.getMonth() + 1;
            fromYear = now.getFullYear();
        }

        // Tính lại lương cho tháng hiện tại và các tháng sau
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Tính lại từ tháng được chỉ định đến tháng hiện tại
        for (let year = fromYear; year <= currentYear; year++) {
            const startMonth = (year === fromYear) ? fromMonth : 1;
            const endMonth = (year === currentYear) ? currentMonth : 12;

            for (let month = startMonth; month <= endMonth; month++) {
                const salaryRecord = await calculateMonthlySalary(userId, month, year, newHourlyRate);
                if (salaryRecord) {
                    console.log(`[Auto Salary] Recalculated salary for ${month}/${year}: ${salaryRecord.totalSalary}đ`);
                }
            }
        }
    } catch (error) {
        console.error('[Auto Salary] Error handling salary rate change:', error);
    }
};

/**
 * Tính lại lương cho tất cả nhân viên trong tháng cụ thể
 * @param {number} month - Tháng
 * @param {number} year - Năm
 */
const recalculateAllSalariesForMonth = async (month, year) => {
    try {
        console.log(`[Auto Salary] Recalculating all salaries for ${month}/${year}`);

        // Lấy tất cả users (trừ admin)
        const users = await User.find({ role: { $ne: 'admin' } }).select('_id hourlyRate');

        for (const user of users) {
            const salaryRecord = await calculateMonthlySalary(user._id, month, year, user.hourlyRate);
            if (salaryRecord) {
                console.log(`[Auto Salary] Recalculated for user ${user._id}: ${salaryRecord.totalSalary}đ`);
            }
        }

        console.log(`[Auto Salary] Completed recalculating all salaries for ${month}/${year}`);
    } catch (error) {
        console.error('[Auto Salary] Error recalculating all salaries:', error);
    }
};

module.exports = {
    calculateMonthlySalary,
    handleNewCheckout,
    handleSalaryRateChange,
    recalculateAllSalariesForMonth
};
