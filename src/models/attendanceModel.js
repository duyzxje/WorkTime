const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        checkInTime: {
            type: Date,
            required: true,
        },
        checkOutTime: {
            type: Date,
            default: null,
        },
        checkInLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        checkOutLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
        },
        status: {
            type: String,
            enum: ['checked-in', 'checked-out'],
            default: 'checked-in',
        },
        isValid: {
            type: Boolean,
            default: true,
        },
        officeId: {
            type: String,
            default: 'main',
        },
        workDuration: {
            type: Number, // Thời gian làm việc tính bằng phút
            default: 0,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Create index for geolocation queries
attendanceSchema.index({ checkInLocation: '2dsphere' });
attendanceSchema.index({ checkOutLocation: '2dsphere' });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
