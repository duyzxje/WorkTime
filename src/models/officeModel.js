const mongoose = require('mongoose');

const officeSchema = mongoose.Schema(
    {
        officeId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [String], // [longitude, latitude]
                required: true,
            },
        },
        radius: {
            type: Number,
            required: true,
            default: 200, // Default radius in meters
        },
        address: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Create geospatial index
officeSchema.index({ location: '2dsphere' });

const Office = mongoose.model('Office', officeSchema);

module.exports = Office;
