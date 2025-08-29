const mongoose = require('mongoose');
const connectBankingDB = require('../config/bankingDb');

// This will be initialized when the model is first accessed
let bankingConnection;
let Transaction;

const transactionSchema = new mongoose.Schema(
    {
        taiKhoanNhan: {
            type: String,
        },
        taiKhoanChuyen: {
            type: String,
        },
        tenNguoiChuyen: {
            type: String,
        },
        nganHangChuyen: {
            type: String,
        },
        loaiGiaoDich: {
            type: String,
        },
        maGiaoDich: {
            type: String,
        },
        ngayGioGiaoDich: {
            type: Date,
        },
        soTien: {
            type: String,
        },
        soTienNumber: {
            type: Number,
        },
        phiGiaoDich: {
            type: String,
        },
        phiGiaoDichNumber: {
            type: Number,
        },
        noiDungGiaoDich: {
            type: String,
        },
        emailId: {
            type: String,
        },
        historyId: {
            type: String,
        },
        processedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Function to initialize the model
const initializeModel = async () => {
    if (!bankingConnection) {
        bankingConnection = await connectBankingDB();
        Transaction = bankingConnection.model('Transaction', transactionSchema, 'transactions');
    }
    return Transaction;
};

module.exports = {
    initializeModel
};
