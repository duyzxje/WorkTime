/**
 * Calculate distance between two coordinates in meters
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {Number} Distance in meters
 */
const calculateDistance = (coord1, coord2) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    // Radius of the Earth in meters
    const R = 6371000;

    // Convert degrees to radians
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    // Haversine formula
    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
};

/**
 * Check if coordinates are within a certain radius of a point
 * @param {Array} userCoord - [longitude, latitude] of user
 * @param {Array} officeCoord - [longitude, latitude] of office
 * @param {Number} maxDistance - Maximum allowed distance in meters
 * @returns {Boolean} True if within allowed distance
 */
const isWithinRadius = (userCoord, officeCoord, maxDistance = 100) => {
    const distance = calculateDistance(userCoord, officeCoord);
    return distance <= maxDistance;
};

module.exports = {
    calculateDistance,
    isWithinRadius,
};
