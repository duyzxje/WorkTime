const express = require('express');
const {
    createOffice,
    getOffices,
    getOfficeById,
    updateOffice,
    deleteOffice,
} = require('../controllers/officeController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all offices
router.get('/', getOffices);

// Get office by ID
router.get('/:id', getOfficeById);

// Admin routes (protected)
router.post('/', protect, admin, createOffice);
router.put('/:id', protect, admin, updateOffice);
router.delete('/:id', protect, admin, deleteOffice);

module.exports = router;
