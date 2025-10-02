const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const { handleSalaryRateChange } = require('../services/autoSalaryService');

// @desc    Register a new user
// @route   POST /api/users
// @access  Private/Admin
const registerUser = async (req, res) => {
    try {
        const { username, name, email, password, role } = req.body;

        // Validate required fields
        if (!username || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, name, email, and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate role if provided
        if (role && !['admin', 'staff', 'viewer'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be admin, staff, or viewer'
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: userExists.email === email ? 'Email already exists' : 'Username already exists'
            });
        }

        const user = await User.create({
            username,
            name,
            email,
            password,
            role: role || 'staff',
        });

        if (user) {
            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    },
                    message: 'Đã tạo người dùng mới thành công'
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid user data'
            });
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                data: {
                    token: generateToken(user._id),
                    user: {
                        id: user._id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                success: true,
                data: {
                    id: user._id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    hourlyRate: user.hourlyRate
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');

        const formattedUsers = users.map(user => ({
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            hourlyRate: user.hourlyRate
        }));

        res.json({
            success: true,
            data: {
                users: formattedUsers
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Update user information
// @route   PUT /api/users/:userId
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, role, password, hourlyRate } = req.body;

        // Validate userId format
        if (!userId || !require('mongoose').Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate role if provided
        if (role && !['admin', 'staff', 'viewer'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be admin, staff, or viewer'
            });
        }

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Update fields if provided in request
        if (name) user.name = name;
        if (role) user.role = role;
        if (email) user.email = email;
        if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;

        // Only update password if provided
        if (password) {
            user.password = password;
        }

        const updatedUser = await user.save();

        // Tự động tính lại lương nếu có thay đổi mức lương
        if (hourlyRate !== undefined && hourlyRate !== user.hourlyRate) {
            handleSalaryRateChange(userId, hourlyRate);
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: updatedUser._id,
                    username: updatedUser.username,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    hourlyRate: updatedUser.hourlyRate
                },
                message: 'Đã cập nhật thông tin người dùng thành công'
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Delete a user
// @route   DELETE /api/users/:userId
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate userId format
        if (!userId || !require('mongoose').Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting the last admin user
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể xóa admin cuối cùng trong hệ thống'
                });
            }
        }

        // Delete the user using deleteOne instead of deprecated remove()
        const deleteResult = await User.deleteOne({ _id: userId });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found or already deleted'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa người dùng thành công',
            data: {
                deletedUserId: userId,
                deletedUserName: user.name
            }
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

// @desc    Get total employees count
// @route   GET /api/users/count
// @access  Private/Admin
const getTotalEmployees = async (req, res) => {
    try {
        // Đếm tổng nhân viên loại trừ admin
        const totalCount = await User.countDocuments({ role: { $ne: 'admin' } });

        res.json({
            success: true,
            data: {
                totalEmployees: totalCount
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get currently working employees (checked in but not checked out)
// @route   GET /api/users/currently-working
// @access  Private/Admin
const getCurrentlyWorkingEmployees = async (req, res) => {
    try {
        const Attendance = require('../models/attendanceModel');

        // Find all users who are currently checked in (status: 'checked-in') and not admin
        const currentlyWorking = await Attendance.find({ status: 'checked-in' })
            .populate({
                path: 'user',
                select: 'name username email role hourlyRate',
                match: { role: { $ne: 'admin' } }
            })
            .sort('-checkInTime');

        // Format the response - filter out null users (admin users)
        const workingEmployees = currentlyWorking
            .filter(attendance => attendance.user !== null) // Loại bỏ admin users
            .map(attendance => ({
                userId: attendance.user._id,
                name: attendance.user.name,
                username: attendance.user.username,
                email: attendance.user.email,
                role: attendance.user.role,
                hourlyRate: attendance.user.hourlyRate,
                checkInTime: attendance.checkInTime,
                // Raw datetime values returned as-is
                officeId: attendance.officeId,
                notes: attendance.notes
            }));

        res.json({
            success: true,
            data: {
                currentlyWorking: workingEmployees,
                count: workingEmployees.length
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:userId
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: user._id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                hourlyRate: user.hourlyRate,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Error getting user by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: ' + error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getTotalEmployees,
    getCurrentlyWorkingEmployees
};
