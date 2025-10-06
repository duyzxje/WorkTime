const {
    ORDER_STATUSES,
    STATUS_ORDER,
    listOrders,
    getOrderById,
    getOrderItems,
    updateOrderStatus,
    deleteOrder,
    bulkDeleteOrders
} = require('../models/orderModel');

function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

const getOrders = async (req, res) => {
    try {
        const { start, end, page, limit, search, status, by } = req.query;
        const startIso = parseDate(start);
        const endIso = parseDate(end);

        const result = await listOrders({ start: startIso, end: endIso, page, limit, search, status, by });
        // Ensure fixed status order with zeros
        const countsByStatus = new Map(result.statusCounts.map(c => [c.status, c.count]));
        const statusCounts = STATUS_ORDER.map(st => ({ status: st, count: countsByStatus.get(st) || 0 }));

        res.json({
            data: result.data,
            statusCounts,
            page: result.page,
            limit: result.limit,
            total: result.total
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const getOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await getOrderById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Not found' });
        const items = await getOrderItems(orderId);
        res.json({ order, items });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const getOrderItemsOnly = async (req, res) => {
    try {
        const { orderId } = req.params;
        const items = await getOrderItems(orderId);
        res.json({ data: items });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const patchOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body || {};
        if (!ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const updated = await updateOrderStatus(orderId, status);
        if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, orderId: updated.id, status: updated.status });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const deleteOrderHandler = async (req, res) => {
    try {
        const { orderId } = req.params;
        const ok = await deleteOrder(orderId);
        if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

const bulkDeleteHandler = async (req, res) => {
    try {
        const { ids } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
        }
        const results = await bulkDeleteOrders(ids);
        res.json(results);
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

// Placeholder for from-comments; implementation depends on data source
const createFromComments = async (req, res) => {
    try {
        const { username, liveDate } = req.body || {};
        if (!username) return res.status(400).json({ success: false, message: 'username is required' });
        // Not implemented: requires comment parsing source; return stub
        res.json({ success: true, order_id: 0, total: 0, items: [] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    getOrders,
    getOrder,
    getOrderItemsOnly,
    patchOrderStatus,
    deleteOrderHandler,
    bulkDeleteHandler,
    createFromComments
};


