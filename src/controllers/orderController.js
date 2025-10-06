const {
    STATUS_ORDER,
    listOrders,
    getStatusCounts,
    getOrderById,
    getItemsByOrderId,
    updateOrderStatus,
    deleteOrder,
    bulkDeleteOrders,
    findOrderFromCommentsLookup
} = require('../models/orderModel');

// GET /orders
const getOrders = async (req, res) => {
    try {
        const {
            start,
            end,
            page = '1',
            limit = '20',
            search = '',
            status = ''
        } = req.query;

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                message: 'start and end are required ISO datetime'
            });
        }

        const statusList = String(status)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const [listResult, counts] = await Promise.all([
            listOrders({ start, end, search, statusList, page, limit }),
            getStatusCounts({ start, end, search })
        ]);

        return res.json({
            data: listResult.data,
            statusCounts: counts,
            page: Number(page),
            limit: Number(limit),
            total: listResult.total
        });
    } catch (error) {
        console.error('getOrders error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /orders/:orderId
const getOrderDetail = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await getOrderById(orderId);
        const items = await getItemsByOrderId(orderId);
        return res.json({ order, items });
    } catch (error) {
        console.error('getOrderDetail error:', error);
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
};

// GET /orders/:orderId/items
const getOrderItems = async (req, res) => {
    try {
        const { orderId } = req.params;
        const items = await getItemsByOrderId(orderId);
        return res.json({ data: items });
    } catch (error) {
        console.error('getOrderItems error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /orders/:orderId/status
const patchOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body || {};
        const updated = await updateOrderStatus(orderId, status);
        return res.json({ success: true, orderId: updated.id, status: updated.status });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('patchOrderStatus error:', error);
        return res.status(statusCode).json({ success: false, message: error.message });
    }
};

// POST /orders/from-comments  (lookup)
const createOrdersFromComments = async (req, res) => {
    try {
        const { username, liveDate } = req.body || {};
        if (!username || !liveDate) {
            return res.status(400).json({ success: false, message: 'username and liveDate are required' });
        }
        const order = await findOrderFromCommentsLookup(username, liveDate);
        if (!order) {
            return res.json({ success: false, order_id: 0, total: 0, items: [], message: 'Order not found' });
        }
        const items = await getItemsByOrderId(order.id);
        return res.json({ success: true, order_id: order.id, total: order.total_amount, items });
    } catch (error) {
        console.error('createOrdersFromComments error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /orders/:orderId
const removeOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        await deleteOrder(orderId);
        return res.json({ success: true });
    } catch (error) {
        console.error('removeOrder error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /orders/bulk-delete
const bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
        }
        const results = await bulkDeleteOrders(ids);
        return res.json(results);
    } catch (error) {
        console.error('bulkDelete error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getOrders,
    getOrderDetail,
    getOrderItems,
    patchOrderStatus,
    createOrdersFromComments,
    removeOrder,
    bulkDelete
};


