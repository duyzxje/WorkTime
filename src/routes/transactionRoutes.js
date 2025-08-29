const express = require('express');
const {
    getTransactions,
    getTransactionById,
    getTransactionStats
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all transactions with pagination and filtering
router.get('/', protect, getTransactions);

// Get transaction statistics
router.get('/stats', protect, getTransactionStats);

// Get transaction by ID
router.get('/:id', protect, getTransactionById);

module.exports = router;
