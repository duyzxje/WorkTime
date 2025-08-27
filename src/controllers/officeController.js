const Office = require('../models/officeModel');

// @desc    Create a new office location
// @route   POST /api/offices
// @access  Private/Admin
const createOffice = async (req, res) => {
    try {
        const { officeId, name, longitude, latitude, radius, address } = req.body;

        // Check if office already exists
        const officeExists = await Office.findOne({ officeId });

        if (officeExists) {
            return res.status(400).json({ message: 'Office ID already exists' });
        }

        const office = await Office.create({
            officeId,
            name,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            radius: radius || 200,
            address,
        });

        res.status(201).json(office);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all offices
// @route   GET /api/offices
// @access  Public
const getOffices = async (req, res) => {
    try {
        const offices = await Office.find({});
        res.json(offices);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get office by ID
// @route   GET /api/offices/:id
// @access  Public
const getOfficeById = async (req, res) => {
    try {
        const office = await Office.findOne({ officeId: req.params.id });

        if (!office) {
            return res.status(404).json({ message: 'Office not found' });
        }

        res.json(office);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update office
// @route   PUT /api/offices/:id
// @access  Private/Admin
const updateOffice = async (req, res) => {
    try {
        const { name, longitude, latitude, radius, address, isActive } = req.body;

        const office = await Office.findOne({ officeId: req.params.id });

        if (!office) {
            return res.status(404).json({ message: 'Office not found' });
        }

        office.name = name || office.name;
        office.address = address || office.address;
        office.radius = radius || office.radius;

        if (longitude && latitude) {
            office.location.coordinates = [parseFloat(longitude), parseFloat(latitude)];
        }

        if (isActive !== undefined) {
            office.isActive = isActive;
        }

        const updatedOffice = await office.save();
        res.json(updatedOffice);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete office
// @route   DELETE /api/offices/:id
// @access  Private/Admin
const deleteOffice = async (req, res) => {
    try {
        const office = await Office.findOne({ officeId: req.params.id });

        if (!office) {
            return res.status(404).json({ message: 'Office not found' });
        }

        await office.deleteOne();
        res.json({ message: 'Office removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createOffice,
    getOffices,
    getOfficeById,
    updateOffice,
    deleteOffice,
};
