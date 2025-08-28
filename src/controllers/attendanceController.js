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

        // Check if user already has an active check-in for today (sử dụng múi giờ Việt Nam)
        const nowUtc = new Date();
        const vietnamTime = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000)); // Thêm 7 giờ

        // Tính đầu ngày và cuối ngày theo múi giờ Việt Nam
        const startOfDay = new Date(vietnamTime);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(vietnamTime);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('Vietnam time for check-in search:', vietnamTime);
        console.log('Start of day (VN):', startOfDay);
        console.log('End of day (VN):', endOfDay);

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

        // Kiểm tra vị trí GPS
        if (!isValid) {
            // Nếu vị trí không hợp lệ thì không lưu vào database
            return res.status(400).json({
                message: 'Vị trí check-in không hợp lệ. Bạn cần ở trong phạm vi văn phòng để check-in.',
                isValid: false,
                userCoordinates: userCoordinates,
                officeCoordinates: office.coordinates,
                officeRadius: office.radius
            });
        }

        // Điều chỉnh giờ cho múi giờ Việt Nam (+7)
        const checkInTimeUtc = new Date();
        const checkInTimeVietnam = new Date(checkInTimeUtc.getTime() + (7 * 60 * 60 * 1000)); // Thêm 7 giờ
        console.log('Current UTC time:', checkInTimeUtc);
        console.log('Vietnam time (+7):', checkInTimeVietnam);

        // Chỉ lưu vào DB khi vị trí hợp lệ
        const attendance = await Attendance.create({
            user: userId,
            checkInTime: checkInTimeVietnam,
            checkInLocation: {
                type: 'Point',
                coordinates: userCoordinates,
            },
            isValid: true, // Luôn true vì chỉ lưu khi hợp lệ
            officeId: officeId,
            notes,
        });

        res.status(201).json({
            message: 'Check-in thành công',
            attendance,
            isValid: true,
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

        // Thời gian hiện tại theo múi giờ Việt Nam
        const nowUtc = new Date();
        const vietnamTime = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000)); // Thêm 7 giờ

        console.log('Vietnam time for checkout:', vietnamTime);

        // Tìm kiếm ca làm việc đang mở (chưa checkout) gần nhất của user
        // Không giới hạn ngày - hỗ trợ làm việc qua đêm/qua ngày
        const attendance = await Attendance.findOne({
            user: userId,
            status: 'checked-in',
        }).sort({ checkInTime: -1 }); // Lấy check-in gần đây nhất

        if (!attendance) {
            return res.status(404).json({ message: 'Không tìm thấy ca làm việc đang mở nào. Vui lòng check-in trước.' });
        }

        // Kiểm tra xem có phải ca làm việc quá 24h hay không 
        const checkInTime = new Date(attendance.checkInTime);
        const hoursDiff = (vietnamTime - checkInTime) / (1000 * 60 * 60);

        console.log(`Hours between check-in and check-out: ${hoursDiff}`);

        if (hoursDiff > 24) {
            console.log('Warning: Shift duration exceeds 24 hours');
            // Vẫn cho phép checkout nhưng ghi log cảnh báo
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

        // Nếu vị trí không hợp lệ thì không cho phép check-out
        if (!isValid) {
            return res.status(400).json({
                message: 'Vị trí check-out không hợp lệ. Bạn cần ở trong phạm vi văn phòng để check-out.',
                isValid: false,
                userCoordinates: userCoordinates,
                officeCoordinates: office.coordinates,
                officeRadius: office.radius
            });
        }

        // Điều chỉnh giờ cho múi giờ Việt Nam (+7)
        const checkOutTimeUtc = new Date();
        const checkOutTimeVietnam = new Date(checkOutTimeUtc.getTime() + (7 * 60 * 60 * 1000)); // Thêm 7 giờ
        console.log('Current UTC time (checkout):', checkOutTimeUtc);
        console.log('Vietnam time (+7) (checkout):', checkOutTimeVietnam);

        // Tính thời gian làm việc (phút)
        const checkInTime = new Date(attendance.checkInTime);
        const checkOutTime = checkOutTimeVietnam;
        const workDurationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));

        // Cập nhật thông tin check-out
        attendance.checkOutTime = checkOutTime;
        attendance.checkOutLocation.coordinates = userCoordinates;
        attendance.status = 'checked-out';
        attendance.workDuration = workDurationMinutes;
        attendance.isValid = true; // Luôn true vì chỉ lưu khi hợp lệ

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
            message: 'Check-out thành công',
            attendance,
            isValid: true,
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
        const { startDate, endDate, month, year } = req.query;

        console.log('Request params:', req.params); // Debug
        console.log('Request query:', req.query); // Debug
        console.log('User ID:', userId); // Debug

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        const query = { user: userId };

        // Xử lý lọc theo tháng và năm nếu được cung cấp
        if (month && year) {
            console.log(`Filtering by month/year: ${month}/${year}`);
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            // Validate month and year
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return res.status(400).json({ message: 'Invalid month. Month must be between 1 and 12.' });
            }

            if (isNaN(yearNum)) {
                return res.status(400).json({ message: 'Invalid year format.' });
            }

            // Tính ngày đầu và cuối của tháng (UTC+7 Vietnam timezone)
            const startOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1, -7, 0, 0)); // -7 hours to get Vietnam timezone
            const endOfMonth = new Date(Date.UTC(yearNum, monthNum, 0, 16, 59, 59)); // Last day of month at 23:59:59 Vietnam time

            console.log(`Start of month: ${startOfMonth.toISOString()}`);
            console.log(`End of month: ${endOfMonth.toISOString()}`);

            query.checkInTime = {
                $gte: startOfMonth,
                $lte: endOfMonth,
            };
        }
        // Nếu không có month/year nhưng có startDate và endDate
        else if (startDate && endDate) {
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

            // Định dạng thời gian check-in/check-out thân thiện (đã được lưu theo múi giờ VN)
            if (attendance.checkInTime) {
                const checkInDate = new Date(attendance.checkInTime);
                attendance.checkInTimeFormatted = checkInDate.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh'
                });
                attendance.checkInDateFormatted = checkInDate.toLocaleDateString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh'
                });
            }

            if (attendance.checkOutTime) {
                const checkOutDate = new Date(attendance.checkOutTime);
                attendance.checkOutTimeFormatted = checkOutDate.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh'
                });
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
        const { startDate, endDate, userId, month, year } = req.query;

        const query = {};

        // Add user filter if provided
        if (userId) {
            query.user = userId;
        }

        // Xử lý lọc theo tháng và năm nếu được cung cấp
        if (month && year) {
            console.log(`Admin filtering by month/year: ${month}/${year}`);
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);

            // Validate month and year
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return res.status(400).json({ message: 'Invalid month. Month must be between 1 and 12.' });
            }

            if (isNaN(yearNum)) {
                return res.status(400).json({ message: 'Invalid year format.' });
            }

            // Tính ngày đầu và cuối của tháng (UTC+7 Vietnam timezone)
            const startOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1, -7, 0, 0)); // -7 hours to get Vietnam timezone
            const endOfMonth = new Date(Date.UTC(yearNum, monthNum, 0, 16, 59, 59)); // Last day of month at 23:59:59 Vietnam time

            console.log(`Start of month: ${startOfMonth.toISOString()}`);
            console.log(`End of month: ${endOfMonth.toISOString()}`);

            query.checkInTime = {
                $gte: startOfMonth,
                $lte: endOfMonth,
            };
        }
        // Add date range if provided
        else if (startDate && endDate) {
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

// @desc    Get attendance summary by month for a user
// @route   GET /api/attendance/:userId/summary
// @access  Public
const getAttendanceSummary = async (req, res) => {
    try {
        const { userId } = req.params;
        const { month, year } = req.query;

        console.log(`Generating attendance summary for userId: ${userId}, month: ${month}, year: ${year}`);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Valid user ID is required' });
        }

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        // Validate month and year
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ message: 'Invalid month. Month must be between 1 and 12.' });
        }

        if (isNaN(yearNum)) {
            return res.status(400).json({ message: 'Invalid year format.' });
        }

        // Tính ngày đầu và cuối của tháng (UTC+7 Vietnam timezone)
        const startOfMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1, -7, 0, 0)); // -7 hours to get Vietnam timezone
        const endOfMonth = new Date(Date.UTC(yearNum, monthNum, 0, 16, 59, 59)); // Last day of month at 23:59:59 Vietnam time

        console.log(`Start of month: ${startOfMonth.toISOString()}`);
        console.log(`End of month: ${endOfMonth.toISOString()}`);

        // Lấy tất cả các bản ghi chấm công trong tháng
        const attendanceRecords = await Attendance.find({
            user: userId,
            checkInTime: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            }
        }).sort('checkInTime');

        // Tính toán thống kê
        let totalDaysWorked = 0;
        let totalWorkMinutes = 0;
        let earliestCheckIn = null;
        let latestCheckOut = null;
        let incompleteRecords = 0; // Số lần không checkout

        // Phân tích thông tin từng ngày trong tháng
        const dailyRecords = [];

        // Tạo bảng dữ liệu cho từng ngày trong tháng
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(yearNum, monthNum - 1, day, -7, 0, 0));
            const nextDate = new Date(Date.UTC(yearNum, monthNum - 1, day, 16, 59, 59));

            // Tìm các bản ghi trong ngày này
            const dayRecords = attendanceRecords.filter(record => {
                const recordDate = new Date(record.checkInTime);
                return recordDate >= currentDate && recordDate <= nextDate;
            });

            if (dayRecords.length > 0) {
                totalDaysWorked++;

                // Thông tin chi tiết của ngày
                const dayData = {
                    date: currentDate.toISOString().split('T')[0],
                    dayOfWeek: currentDate.getDay(), // 0 = Chủ nhật, 1 = Thứ hai, ...
                    records: dayRecords.map(record => {
                        const recordObj = record.toObject();

                        // Định dạng giờ check-in/check-out
                        if (recordObj.checkInTime) {
                            recordObj.checkInTimeFormatted = new Date(recordObj.checkInTime)
                                .toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'Asia/Ho_Chi_Minh'
                                });
                        }

                        if (recordObj.checkOutTime) {
                            recordObj.checkOutTimeFormatted = new Date(recordObj.checkOutTime)
                                .toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'Asia/Ho_Chi_Minh'
                                });

                            // Cập nhật thời gian làm việc
                            if (recordObj.workDuration) {
                                totalWorkMinutes += recordObj.workDuration;

                                // Format thời gian làm việc
                                const hours = Math.floor(recordObj.workDuration / 60);
                                const minutes = recordObj.workDuration % 60;
                                recordObj.workTimeFormatted = `${hours}h${minutes}m`;
                            }
                        } else {
                            // Nếu không có check-out
                            incompleteRecords++;
                        }

                        // Theo dõi thời gian check-in sớm nhất và check-out muộn nhất
                        if (!earliestCheckIn || new Date(recordObj.checkInTime) < new Date(earliestCheckIn)) {
                            earliestCheckIn = recordObj.checkInTime;
                        }

                        if (recordObj.checkOutTime && (!latestCheckOut || new Date(recordObj.checkOutTime) > new Date(latestCheckOut))) {
                            latestCheckOut = recordObj.checkOutTime;
                        }

                        return {
                            id: recordObj._id,
                            checkInTime: recordObj.checkInTime,
                            checkInTimeFormatted: recordObj.checkInTimeFormatted,
                            checkOutTime: recordObj.checkOutTime,
                            checkOutTimeFormatted: recordObj.checkOutTimeFormatted || 'Chưa check-out',
                            status: recordObj.status,
                            workDuration: recordObj.workDuration || 0,
                            workTimeFormatted: recordObj.workTimeFormatted || '0h0m',
                            notes: recordObj.notes || ''
                        };
                    })
                };

                dailyRecords.push(dayData);
            }
        }

        // Tính tổng thời gian làm việc
        const totalHours = Math.floor(totalWorkMinutes / 60);
        const totalMinutes = totalWorkMinutes % 60;

        // Tạo kết quả thống kê
        const summary = {
            userId,
            month: monthNum,
            year: yearNum,
            totalDaysWorked,
            totalWorkDuration: {
                minutes: totalWorkMinutes,
                formatted: `${totalHours}h${totalMinutes}m`
            },
            averageWorkDurationPerDay: totalDaysWorked > 0 ? {
                minutes: Math.round(totalWorkMinutes / totalDaysWorked),
                formatted: `${Math.floor(totalWorkMinutes / totalDaysWorked / 60)}h${totalWorkMinutes / totalDaysWorked % 60}m`
            } : {
                minutes: 0,
                formatted: '0h0m'
            },
            earliestCheckIn: earliestCheckIn ? {
                time: earliestCheckIn,
                formatted: new Date(earliestCheckIn).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh'
                })
            } : null,
            latestCheckOut: latestCheckOut ? {
                time: latestCheckOut,
                formatted: new Date(latestCheckOut).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh'
                })
            } : null,
            incompleteRecords,
            dailyRecords
        };

        res.json(summary);
    } catch (error) {
        console.error('Error in getAttendanceSummary:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

module.exports = {
    checkIn,
    checkOut,
    getAttendanceHistory,
    getAllAttendance,
    manualCheckOut,
    createManualRecord,
    getAttendanceSummary
};