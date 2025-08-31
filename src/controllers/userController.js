const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { username, name, email, password, role } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
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
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
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
            role: user.role
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
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields if provided in request
        if (req.body.name) user.name = req.body.name;
        if (req.body.role) user.role = req.body.role;
        if (req.body.email) user.email = req.body.email;

        // Only update password if provided
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            success: true,
            data: {
                user: {
                    id: updatedUser._id,
                    username: updatedUser.username,
                    name: updatedUser.name,
                    role: updatedUser.role
                },
                message: 'Đã cập nhật thông tin người dùng thành công'
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

// @desc    Delete a user
// @route   DELETE /api/users/:userId
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.remove();

        res.json({
            success: true,
            message: 'Đã xóa người dùng thành công'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get total employees count
// @route   GET /api/users/count
// @access  Private/Admin
const getTotalEmployees = async (req, res) => {
    try {
        const totalCount = await User.countDocuments({});

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

        // Find all users who are currently checked in (status: 'checked-in')
        const currentlyWorking = await Attendance.find({ status: 'checked-in' })
            .populate('user', 'name username email role')
            .sort('-checkInTime');

        // Format the response
        const workingEmployees = currentlyWorking.map(attendance => ({
            userId: attendance.user._id,
            name: attendance.user.name,
            username: attendance.user.username,
            email: attendance.user.email,
            role: attendance.user.role,
            checkInTime: attendance.checkInTime,
            checkInTimeFormatted: new Date(attendance.checkInTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh'
            }),
            checkInDateFormatted: new Date(attendance.checkInTime).toLocaleDateString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh'
            }),
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

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    getUsers,
    updateUser,
    deleteUser,
    getTotalEmployees,
    getCurrentlyWorkingEmployees
};
