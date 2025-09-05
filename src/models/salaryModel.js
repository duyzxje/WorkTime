const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 0
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    totalHours: {
        type: Number,
        default: 0
    },
    totalSalary: {
        type: Number,
        default: 0
    },
    dailyRecords: [{
        date: {
            type: Date,
            required: true
        },
        workHours: {
            type: Number,
            default: 0
        },
        dailySalary: {
            type: Number,
            default: 0
        },
        checkInTime: Date,
        checkOutTime: Date,
        isValid: Boolean,
        notes: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index để tối ưu query
salarySchema.index({ userId: 1, month: 1, year: 1 });
salarySchema.index({ month: 1, year: 1 });

module.exports = mongoose.model('Salary', salarySchema);
