const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getOrders,
    getOrder,
    getOrderItemsOnly,
    patchOrderStatus,
    deleteOrderHandler,
    bulkDeleteHandler,
    createFromComments
} = require('../controllers/orderController');

// Read endpoints can be protected or public; keeping protected consistent with others
router.get('/', protect, getOrders);
router.get('/:orderId', protect, getOrder);
router.get('/:orderId/items', protect, getOrderItemsOnly);

router.patch('/:orderId/status', protect, admin, patchOrderStatus);
router.delete('/:orderId', protect, admin, deleteOrderHandler);
router.post('/bulk-delete', protect, admin, bulkDeleteHandler);
router.post('/from-comments', protect, admin, createFromComments);

module.exports = router;


