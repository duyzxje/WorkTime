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

        // Tính date range cho tháng theo UTC chuẩn
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

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
                hourlyRate: hourlyRate,
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
        const existingSalary = await Salary.findOne({ userId, month, year });
        let salaryRecord;

        if (existingSalary) {
            // Giữ lại các giá trị bonus, deduction và finalSalary hiện có
            const salaryData = {
                userId,
                hourlyRate,
                month,
                year,
                totalHours,
                totalSalary,
                dailyRecords,
                bonus: existingSalary.bonus || 0,
                bonusReason: existingSalary.bonusReason || '',
                deduction: existingSalary.deduction || 0,
                deductionReason: existingSalary.deductionReason || '',
                finalSalary: totalSalary + (existingSalary.bonus || 0) - (existingSalary.deduction || 0)
            };

            salaryRecord = await Salary.findByIdAndUpdate(
                existingSalary._id,
                salaryData,
                { new: true }
            );
            console.log(`[Auto Salary] Updated existing salary record for user ${userId}, month ${month}/${year}`);
        } else {
            const salaryData = {
                userId,
                hourlyRate,
                month,
                year,
                totalHours,
                totalSalary,
                dailyRecords,
                bonus: 0,
                bonusReason: '',
                deduction: 0,
                deductionReason: '',
                finalSalary: totalSalary
            };

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
 * Cập nhật lương cho tháng cụ thể (không tự động khi thay đổi mức lương chung)
 * @param {string} userId - ID của nhân viên
 * @param {number} month - Tháng
 * @param {number} year - Năm
 * @param {number} newHourlyRate - Mức lương mới cho tháng đó
 */
const updateSalaryForSpecificMonth = async (userId, month, year, newHourlyRate) => {
    try {
        console.log(`[Auto Salary] Updating salary for user ${userId}, month ${month}/${year} with rate ${newHourlyRate}đ/h`);

        const salaryRecord = await calculateMonthlySalary(userId, month, year, newHourlyRate);
        if (salaryRecord) {
            console.log(`[Auto Salary] Updated salary for ${month}/${year}: ${salaryRecord.totalSalary}đ`);
            return salaryRecord;
        }
        return null;
    } catch (error) {
        console.error('[Auto Salary] Error updating salary for specific month:', error);
        return null;
    }
};

/**
 * Lưu ý: Không tự động tính lại lương khi thay đổi mức lương chung
 * Chỉ tính lương mới khi có checkout mới
 */
const handleSalaryRateChange = async (userId, newHourlyRate) => {
    try {
        console.log(`[Auto Salary] Hourly rate changed for user ${userId} to ${newHourlyRate}đ/h - No automatic recalculation`);
        console.log(`[Auto Salary] New checkouts will use the new rate: ${newHourlyRate}đ/h`);
        // Không tự động tính lại lương cũ
        // Chỉ áp dụng mức lương mới cho các checkout mới
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
    updateSalaryForSpecificMonth,
    recalculateAllSalariesForMonth
};
