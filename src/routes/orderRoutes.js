const express = require('express');
const router = express.Router();

const {
    getOrders,
    getOrderDetail,
    getOrderItems,
    patchOrderStatus,
    createOrdersFromComments,
    removeOrder,
    bulkDelete,
    createFromPrinted,
    previewFromPrinted,
    createOrder
} = require('../controllers/orderController');

// No auth limits as requested

router.get('/', getOrders);
router.post('/', createOrder);
router.get('/:orderId', getOrderDetail);
router.get('/:orderId/items', getOrderItems);
router.patch('/:orderId/status', patchOrderStatus);
router.post('/from-comments', createOrdersFromComments);
router.post('/create-from-printed', createFromPrinted);
router.post('/preview-from-printed', previewFromPrinted);
router.delete('/:orderId', removeOrder);
router.post('/bulk-delete', bulkDelete);

module.exports = router;


