require('dotenv').config();
const mongoose = require('mongoose');
const Office = require('../models/officeModel');
const { officeLocations } = require('../config/locations');
const connectDB = require('../config/db');

// Hàm để khởi tạo dữ liệu văn phòng từ file cấu hình
const seedOffices = async () => {
    try {
        // Kết nối database
        await connectDB();

        console.log('Connected to MongoDB');

        // Xóa dữ liệu văn phòng hiện tại nếu có
        await Office.deleteMany({});
        console.log('Deleted existing office data');

        // Tạo mảng các văn phòng từ config
        const offices = Object.keys(officeLocations).map(key => ({
            officeId: key,
            name: officeLocations[key].name,
            location: {
                type: 'Point',
                coordinates: officeLocations[key].coordinates,
            },
            radius: officeLocations[key].radius,
            address: `Address for ${officeLocations[key].name}`,
            isActive: true
        }));

        // Lưu các văn phòng vào database
        const createdOffices = await Office.insertMany(offices);
        console.log(`${createdOffices.length} offices have been added to the database`);

        // Đóng kết nối
        mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error(`Error seeding data: ${error.message}`);
        process.exit(1);
    }
};

// Chạy hàm khởi tạo
seedOffices();
