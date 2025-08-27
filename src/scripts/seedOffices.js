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

        // Debug: In ra giá trị tọa độ
        console.log('Office coordinates:', JSON.stringify(officeLocations.main.coordinates));
        console.log('Types:', typeof officeLocations.main.coordinates[0], typeof officeLocations.main.coordinates[1]);

        // Tạo mảng các văn phòng từ config
        const offices = [];

        for (const key of Object.keys(officeLocations)) {
            // Chắc chắn tọa độ là số
            const longitude = Number(officeLocations[key].coordinates[0]);
            const latitude = Number(officeLocations[key].coordinates[1]);

            console.log(`Office ${key} coordinates:`, longitude, latitude);

            offices.push({
                officeId: key,
                name: officeLocations[key].name,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                radius: Number(officeLocations[key].radius),
                address: `Address for ${officeLocations[key].name}`,
                isActive: true
            });
        }

        // Debug: In ra đối tượng văn phòng
        console.log('Office object:', JSON.stringify(offices[0].location));

        // Lưu các văn phòng vào database
        const createdOffices = await Office.insertMany(offices);
        console.log(`${createdOffices.length} offices have been added to the database`);

        // Kiểm tra xem dữ liệu đã được lưu chính xác chưa
        const savedOffices = await Office.find({});
        console.log('Saved office data:', JSON.stringify(savedOffices));

        // Đóng kết nối
        mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error(`Error seeding data: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
};

// Chạy hàm khởi tạo
seedOffices();