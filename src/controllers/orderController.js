const {
    STATUS_ORDER,
    listOrders,
    getStatusCounts,
    getOrderById,
    getItemsByOrderId,
    updateOrderStatus,
    deleteOrder,
    bulkDeleteOrders,
    findOrderFromCommentsLookup,
    createOrderWithItems,
    addItemsToOrder
} = require('../models/orderModel');

const {
    parsePrice,
    getAvailablePrintedHistory,
    getOrdersWithCommentIds,
    checkOrderSplit,
    checkOrderFullyInRange
} = require('../models/printedHistoryModel');

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

// POST /orders/create-from-printed
const createFromPrinted = async (req, res) => {
    try {
        const { startTime, endTime } = req.body || {};

        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required (ISO datetime format)'
            });
        }

        // Step 1: Get available printed history in time range
        const availablePrinted = await getAvailablePrintedHistory(startTime, endTime);

        if (availablePrinted.length === 0) {
            return res.json({
                success: true,
                data: {
                    created: [],
                    updated: [],
                    summary: { totalOrders: 0, totalItems: 0, totalAmount: 0 }
                }
            });
        }

        // Step 2: Check for potential split orders
        const commentIds = availablePrinted.map(p => p.comment_id);
        const relatedOrders = await getOrdersWithCommentIds(commentIds);

        for (const order of relatedOrders) {
            const willSplit = await checkOrderSplit(order.id, startTime, endTime);
            if (willSplit) {
                return res.status(400).json({
                    success: false,
                    message: `Khoảng thời gian chọn sẽ chia cắt printed của đơn hàng #${order.id} (username: ${order.customer_username}). Vui lòng chọn khoảng thời gian phù hợp.`,
                    conflictOrder: {
                        orderId: order.id,
                        username: order.customer_username,
                        usernameConflict: true
                    }
                });
            }
        }

        // Step 3: Group printed by username
        const printedByUsername = {};
        for (const printed of availablePrinted) {
            if (!printedByUsername[printed.username]) {
                printedByUsername[printed.username] = [];
            }
            printedByUsername[printed.username].push(printed);
        }

        const created = [];
        const updated = [];
        let totalAmount = 0;
        let totalItemsCount = 0;

        // Step 4: Process each username
        for (const [username, printedList] of Object.entries(printedByUsername)) {
            const items = printedList.map(p => ({
                content: p.comment_text,
                unit_price: parsePrice(p.comment_text),
                quantity: 1,
                line_total: parsePrice(p.comment_text)
            }));

            totalItemsCount += items.length;
            const itemsTotal = items.reduce((sum, item) => sum + item.line_total, 0);
            totalAmount += itemsTotal;

            // Get first printed_at for live_date
            const firstPrinted = printedList[0];
            const liveDate = firstPrinted.printed_at.split('T')[0]; // Get date only

            // Check if there's an order that should be updated
            const existingOrders = await getOrdersWithCommentIds([printedList[0].comment_id]);
            let orderToUpdate = null;

            for (const order of existingOrders) {
                if (order.customer_username === username) {
                    const isFullyInRange = await checkOrderFullyInRange(order.id, startTime, endTime);
                    if (isFullyInRange) {
                        orderToUpdate = order;
                        break;
                    }
                }
            }

            if (orderToUpdate) {
                // Update existing order
                const result = await addItemsToOrder(orderToUpdate.id, items);
                updated.push({
                    orderId: orderToUpdate.id,
                    username,
                    itemsAdded: result.itemsCount,
                    oldTotal: result.oldTotal,
                    newTotal: result.newTotal
                });
            } else {
                // Create new order
                const result = await createOrderWithItems({
                    customerUsername: username,
                    liveDate,
                    items
                });

                created.push({
                    orderId: result.order.id,
                    username,
                    itemsAdded: result.itemsCount,
                    total: result.order.total_amount,
                    liveDate
                });
            }
        }

        return res.json({
            success: true,
            data: {
                created,
                updated,
                summary: {
                    totalOrders: created.length + updated.length,
                    totalItems: totalItemsCount,
                    totalAmount
                }
            }
        });

    } catch (error) {
        console.error('createFromPrinted error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /orders/preview-from-printed
const previewFromPrinted = async (req, res) => {
    try {
        const { startTime, endTime } = req.body || {};

        if (!startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'startTime and endTime are required (ISO datetime format)'
            });
        }

        // Step 1: Get available printed history in time range
        const availablePrinted = await getAvailablePrintedHistory(startTime, endTime);
        if (availablePrinted.length === 0) {
            return res.json({
                success: true,
                data: {
                    orders: [],
                    summary: { totalOrders: 0, totalItems: 0, totalAmount: 0 }
                }
            });
        }
        // Step 2: Check for potential split orders
        const commentIds = availablePrinted.map(p => p.comment_id);
        const relatedOrders = await getOrdersWithCommentIds(commentIds);
        for (const order of relatedOrders) {
            const willSplit = await checkOrderSplit(order.id, startTime, endTime);
            if (willSplit) {
                return res.status(400).json({
                    success: false,
                    message: `Khoảng thời gian chọn sẽ chia cắt printed của đơn hàng #${order.id} (username: ${order.customer_username}). Vui lòng chọn khoảng thời gian phù hợp.`,
                    conflictOrder: {
                        orderId: order.id,
                        username: order.customer_username,
                        usernameConflict: true
                    }
                });
            }
        }
        // Step 3: Group by username and prepare preview orders
        const printedByUsername = {};
        for (const printed of availablePrinted) {
            if (!printedByUsername[printed.username]) {
                printedByUsername[printed.username] = [];
            }
            printedByUsername[printed.username].push(printed);
        }
        let totalAmount = 0;
        let totalItemsCount = 0;
        const orders = [];
        for (const [username, printedList] of Object.entries(printedByUsername)) {
            const items = printedList.map(p => ({
                content: p.comment_text,
                unit_price: parsePrice(p.comment_text),
                quantity: 1,
                line_total: parsePrice(p.comment_text)
            }));
            const orderTotal = items.reduce((sum, item) => sum + item.line_total, 0);
            totalItemsCount += items.length;
            totalAmount += orderTotal;
            // Get first printed_at for live_date
            const firstPrinted = printedList[0];
            const liveDate = firstPrinted.printed_at.split('T')[0];
            orders.push({
                username,
                liveDate,
                items,
                total: orderTotal
            });
        }
        return res.json({
            success: true,
            data: {
                orders,
                summary: {
                    totalOrders: orders.length,
                    totalItems: totalItemsCount,
                    totalAmount
                }
            }
        });
    } catch (error) {
        console.error('previewFromPrinted error:', error);
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
    bulkDelete,
    createFromPrinted,
    previewFromPrinted
};


