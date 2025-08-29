const TransactionModel = require('../models/transactionModel');

// @desc    Get all transactions with pagination
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
    try {
        // Initialize the transaction model
        const Transaction = await TransactionModel.initializeModel();

        const {
            page = 1,
            limit = 10,
            sortField = 'ngayGioGiaoDich',
            sortOrder = -1,
            search = ''
        } = req.query;

        // Convert page and limit to numbers
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        // Calculate skip value for pagination
        const skip = (pageNumber - 1) * limitNumber;

        // Build query
        let query = {};

        // Add search functionality if search parameter is provided
        if (search) {
            query = {
                $or: [
                    { taiKhoanNhan: { $regex: search, $options: 'i' } },
                    { taiKhoanChuyen: { $regex: search, $options: 'i' } },
                    { tenNguoiChuyen: { $regex: search, $options: 'i' } },
                    { maGiaoDich: { $regex: search, $options: 'i' } },
                    { noiDungGiaoDich: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Build sort object
        const sort = {};
        sort[sortField] = sortOrder;

        // Fetch transactions with pagination and sorting
        const transactions = await Transaction.find(query)
            .sort(sort)
            .limit(limitNumber)
            .skip(skip);

        // Count total documents for pagination info
        const totalTransactions = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total: totalTransactions,
                    page: pageNumber,
                    limit: limitNumber,
                    pages: Math.ceil(totalTransactions / limitNumber)
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
    try {
        // Initialize the transaction model
        const Transaction = await TransactionModel.initializeModel();
        const transaction = await Transaction.findById(req.params.id);

        if (transaction) {
            res.json({
                success: true,
                data: transaction
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
const getTransactionStats = async (req, res) => {
    try {
        // Initialize the transaction model
        const Transaction = await TransactionModel.initializeModel();
        // Get total number of transactions
        const totalCount = await Transaction.countDocuments();

        // Get sum of all transaction amounts
        const totalAmountResult = await Transaction.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$soTienNumber' }
                }
            }
        ]);
        const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

        // Get transactions grouped by transaction type
        const transactionsByType = await Transaction.aggregate([
            {
                $group: {
                    _id: '$loaiGiaoDich',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Get transactions per day for the last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const transactionsPerDay = await Transaction.aggregate([
            {
                $match: {
                    ngayGioGiaoDich: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$ngayGioGiaoDich' },
                        month: { $month: '$ngayGioGiaoDich' },
                        day: { $dayOfMonth: '$ngayGioGiaoDich' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$soTienNumber' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalCount,
                totalAmount,
                transactionsByType,
                transactionsPerDay
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

module.exports = {
    getTransactions,
    getTransactionById,
    getTransactionStats
};
