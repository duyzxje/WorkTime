/**
 * Office locations with their coordinates [longitude, latitude]
 * These would typically come from your database, but for simplicity
 * we're defining them here
 */
const officeLocations = {
    main: {
        name: 'Main Office',
        coordinates: [10.846469, 106.667976],
        radius: 50,
    },// Có thể thêm các vị trí văn phòng khác ở đây
};

module.exports = { officeLocations };