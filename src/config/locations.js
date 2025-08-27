/**
 * Office locations with their coordinates [longitude, latitude]
 * Các tọa độ được định nghĩa theo format [longitude, latitude]
 * Đây là cấu hình mặc định sẽ được dùng để khởi tạo collection "office"
 */
const officeLocations = {
    main: {
        name: 'Main Office',
        coordinates: [Number(106.667976), Number(10.846469)], // [longitude, latitude] đảm bảo là số
        radius: Number(50), // Bán kính 50m
    },
    // Có thể thêm các vị trí văn phòng khác ở đây
};

module.exports = { officeLocations };