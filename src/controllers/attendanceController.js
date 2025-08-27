const Attendance = require('../models/attendanceModel');
const Office = require('../models/officeModel');
const { isWithinRadius } = require('../utils/geoUtils');
const { officeLocations } = require('../config/locations'); // Giữ lại để tương thích ngược
const mongoose = require('mongoose');

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Public
const checkIn = async (req, res) => {
    try {
        const { userId, longitude, latitude, officeId = 'main', notes } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!longitude || !latitude) {
            return res.status(400).json({ message: 'GPS coordinates are required' });
        }

        // Check if user already has an active check-in for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const existingAttendance = await Attendance.findOne({
            user: userId,
            checkInTime: { $gte: startOfDay, $lte: endOfDay },
            status: 'checked-in',
        });

        if (existingAttendance) {
            return res.status(400).json({
                message: 'You already have an active check-in for today',
                attendance: existingAttendance,
            });
        }

        // Verify the GPS location
        const userCoordinates = [parseFloat(longitude), parseFloat(latitude)];

        // Tìm văn phòng từ database
        let officeFromDB = await Office.findOne({ officeId: officeId });
        let office;

        if (officeFromDB) {
            // Sử dụng dữ liệu từ database
            office = {
                name: officeFromDB.name,
                coordinates: officeFromDB.location.coordinates,
                radius: officeFromDB.radius
            };
        } else {
            // Fallback sử dụng dữ liệu từ config file
            office = officeLocations[officeId];

            if (!office) {
                return res.status(400).json({ message: 'Invalid office location' });
            }
        }

        const isValid = isWithinRadius(
            userCoordinates,
            office.coordinates,
            office.radius
        );

        // Không trả về lỗi, thay vào đó ghi lại thông tin và đánh dấu là không hợp lệ
        // Thông báo cho người dùng trong response  

        // Create attendance record
        const attendance = await Attendance.create({
            user: userId,
            checkInTime: new Date(),
            checkInLocation: {
                type: 'Point',
                coordinates: userCoordinates,
            },
            isValid: isValid, // Lưu trạng thái hợp lệ dựa trên vị trí
            officeId: officeId,
            notes,
        });

        res.status(201).json({
            message: isValid ? 'Check-in thành công' : 'Vị trí check-in không hợp lệ. Dữ liệu đã được ghi lại nhưng sẽ được đánh dấu là không hợp lệ.',
            attendance,
            isValid: isValid,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Check out
// @route   POST /api/attendance/checkout
// @access  Public
const checkOut = async (req, res) => {
    try {
        const { userId, longitude, latitude, notes } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!longitude || !latitude) {
            return res.status(400).json({ message: 'GPS coordinates are required' });
        }

        // Find active check-in for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findOne({
            user: userId,
            checkInTime: { $gte: startOfDay, $lte: endOfDay },
            status: 'checked-in',
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No active check-in found for today' });
        }

        // Update the attendance record with check-out
        const userCoordinates = [parseFloat(longitude), parseFloat(latitude)];

        // Lấy thông tin văn phòng từ attendance record
        const officeId = attendance.officeId || 'main';

        // Tìm văn phòng từ database
        let officeFromDB = await Office.findOne({ officeId: officeId });
        let office;

        if (officeFromDB) {
            // Sử dụng dữ liệu từ database
            office = {
                name: officeFromDB.name,
                coordinates: officeFromDB.location.coordinates,
                radius: officeFromDB.radius
            };
        } else {
            // Fallback sử dụng dữ liệu từ config file
            office = officeLocations[officeId];

            if (!office) {
                return res.status(400).json({ message: 'Invalid office location' });
            }
        }

        // Kiểm tra vị trí checkout
        const isValid = isWithinRadius(
            userCoordinates,
            office.coordinates,
            office.radius
        );

        // Tính thời gian làm việc (phút)
        const checkInTime = new Date(attendance.checkInTime);
        const checkOutTime = new Date();
        const workDurationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));

        attendance.checkOutTime = checkOutTime;
        attendance.checkOutLocation.coordinates = userCoordinates;
        attendance.status = 'checked-out';
        attendance.workDuration = workDurationMinutes;
        // Nếu check-in đã không hợp lệ thì giữ nguyên trạng thái không hợp lệ
        // Nếu không, cập nhật theo kết quả kiểm tra vị trí check-out
        attendance.isValid = attendance.isValid === false ? false : isValid;

        if (notes) {
            attendance.notes = attendance.notes
                ? `${attendance.notes}\nCheck-out: ${notes}`
                : `Check-out: ${notes}`;
        }

        await attendance.save();

        // Tính thời gian làm việc theo format giờ:phút
        const hours = Math.floor(workDurationMinutes / 60);
        const minutes = workDurationMinutes % 60;
        const workTimeFormatted = `${hours}h${minutes}m`;

        res.json({
            message: isValid ? 'Check-out thành công' : 'Vị trí check-out không hợp lệ. Dữ liệu đã được ghi lại nhưng sẽ được đánh dấu là không hợp lệ.',
            attendance,
            isValid: isValid,
            workDuration: workDurationMinutes,
            workTimeFormatted: workTimeFormatted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user's attendance history
// @route   GET /api/attendance/:userId
// @access  Public
const getAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        console.log('Request params:', req.params); // Debug
        console.log('User ID:', userId); // Debug

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        const query = { user: userId };

        // Add date range ONLY if BOTH startDate AND endDate are provided
        if (startDate && endDate) {
            console.log(`Filtering by date range: ${startDate} to ${endDate}`);
            query.checkInTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        } else {
            console.log('No date filters applied - returning all records');
        }

        console.log('Database query:', JSON.stringify(query)); // Debug

        // Lấy dữ liệu chấm công
        const attendanceRecords = await Attendance.find(query).sort('-checkInTime');

        console.log(`Found ${attendanceRecords.length} records`); // Debug

        // Tính toán thông tin bổ sung cho mỗi bản ghi
        const enrichedAttendance = attendanceRecords.map(record => {
            const attendance = record.toObject();

            // Tính thời gian làm việc theo format giờ:phút nếu có check-out
            if (attendance.status === 'checked-out' && attendance.workDuration) {
                const hours = Math.floor(attendance.workDuration / 60);
                const minutes = attendance.workDuration % 60;
                attendance.workTimeFormatted = `${hours}h${minutes}m`;
            }

            // Định dạng thời gian check-in/check-out thân thiện
            if (attendance.checkInTime) {
                attendance.checkInTimeFormatted = new Date(attendance.checkInTime)
                    .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                attendance.checkInDateFormatted = new Date(attendance.checkInTime)
                    .toLocaleDateString('vi-VN');
            }

            if (attendance.checkOutTime) {
                attendance.checkOutTimeFormatted = new Date(attendance.checkOutTime)
                    .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            }

            return attendance;
        });

        const result = {
            userId,
            count: enrichedAttendance.length,
            attendance: enrichedAttendance
        };

        console.log('Sending response:', JSON.stringify(result).substring(0, 200) + '...'); // Debug

        res.json(result);
    } catch (error) {
        console.error('Error in getAttendanceHistory:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Get attendance for all users (admin only)
// @route   GET /api/attendance/all
// @access  Private/Admin
const getAllAttendance = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;

        const query = {};

        // Add user filter if provided
        if (userId) {
            query.user = userId;
        }

        // Add date range if provided
        if (startDate && endDate) {
            query.checkInTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendance = await Attendance.find(query)
            .populate('user', 'name email')
            .sort('-checkInTime');

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Xử lý quên check-out ngày hôm trước
// @route   POST /api/attendance/manual-checkout
// @access  Public
const manualCheckOut = async (req, res) => {
    try {
        const { userId, date, notes } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        // Tìm check-in còn mở trong ngày được chỉ định
        const checkInDate = new Date(date);
        const startOfDay = new Date(checkInDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(checkInDate);
        endOfDay.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findOne({
            user: userId,
            checkInTime: { $gte: startOfDay, $lte: endOfDay },
            status: 'checked-in',
        });

        if (!attendance) {
            return res.status(404).json({
                message: 'Không tìm thấy check-in nào cần được đóng cho ngày này'
            });
        }

        // Đặt thời gian check-out là cuối ngày
        const checkOutTime = new Date(endOfDay);

        // Tính thời gian làm việc (phút)
        const checkInTime = new Date(attendance.checkInTime);
        const workDurationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));

        attendance.checkOutTime = checkOutTime;
        attendance.status = 'checked-out';
        attendance.workDuration = workDurationMinutes;

        if (notes) {
            attendance.notes = attendance.notes
                ? `${attendance.notes}\nManual check-out: ${notes}`
                : `Manual check-out: ${notes}`;
        } else {
            attendance.notes = attendance.notes
                ? `${attendance.notes}\nManual check-out: Quên check-out`
                : `Manual check-out: Quên check-out`;
        }

        await attendance.save();

        // Tính thời gian làm việc theo format giờ:phút
        const hours = Math.floor(workDurationMinutes / 60);
        const minutes = workDurationMinutes % 60;
        const workTimeFormatted = `${hours}h${minutes}m`;

        res.json({
            message: 'Manual check-out thành công',
            attendance,
            workDuration: workDurationMinutes,
            workTimeFormatted: workTimeFormatted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Đăng ký check-in/check-out thủ công (admin)
// @route   POST /api/attendance/manual-record
// @access  Private/Admin
const createManualRecord = async (req, res) => {
    try {
        const {
            userId,
            date,
            checkInTime,
            checkOutTime,
            officeId = 'main',
            notes
        } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!date || !checkInTime) {
            return res.status(400).json({ message: 'Date and check-in time are required' });
        }

        // Tạo đối tượng Date từ chuỗi ngày và giờ
        const baseDate = new Date(date);

        // Xử lý check-in time
        const [checkInHours, checkInMinutes] = checkInTime.split(':');
        const checkInDateTime = new Date(baseDate);
        checkInDateTime.setHours(
            parseInt(checkInHours),
            parseInt(checkInMinutes),
            0, 0
        );

        // Tạo đối tượng attendance
        const attendanceData = {
            user: userId,
            checkInTime: checkInDateTime,
            checkInLocation: {
                type: 'Point',
                coordinates: [0, 0], // Vị trí mặc định
            },
            officeId,
            isValid: true, // Mặc định là hợp lệ với bản ghi thủ công
            notes: notes ? `Manual record: ${notes}` : 'Manual record',
        };

        // Xử lý check-out time nếu có
        if (checkOutTime) {
            const [checkOutHours, checkOutMinutes] = checkOutTime.split(':');
            const checkOutDateTime = new Date(baseDate);
            checkOutDateTime.setHours(
                parseInt(checkOutHours),
                parseInt(checkOutMinutes),
                0, 0
            );

            // Tính thời gian làm việc
            const workDurationMinutes = Math.round(
                (checkOutDateTime - checkInDateTime) / (1000 * 60)
            );

            // Cập nhật thông tin check-out
            attendanceData.checkOutTime = checkOutDateTime;
            attendanceData.status = 'checked-out';
            attendanceData.workDuration = workDurationMinutes;
            attendanceData.checkOutLocation = {
                type: 'Point',
                coordinates: [0, 0], // Vị trí mặc định
            };
        }

        // Tạo bản ghi mới
        const attendance = await Attendance.create(attendanceData);

        res.status(201).json({
            message: 'Đã tạo bản ghi chấm công thủ công thành công',
            attendance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    checkIn,
    checkOut,
    getAttendanceHistory,
    getAllAttendance,
    manualCheckOut,
    createManualRecord
};