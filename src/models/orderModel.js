const { supabase } = require('../config/supabase');

const VALID_STATUSES = ['chua_rep', 'giu_don', 'di_don', 'gap', 'hoan_thanh', 'warning'];
const STATUS_ORDER = ['gap', 'di_don', 'chua_rep', 'giu_don', 'warning', 'hoan_thanh'];

async function listOrders({ start, end, search, statusList, page = 1, limit = 20 }) {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const rangeEnd = offset + Math.max(1, Number(limit)) - 1;

    let base = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

    if (search && String(search).trim() !== '') {
        const q = `%${search}%`;
        // Search on orders.customer_username OR exists order_items with product_name/content matching
        base = base.or(
            `customer_username.ilike.${q},id.in.(select order_id from order_items where product_name.ilike.${q} or content.ilike.${q})`
        );
    }

    if (statusList && statusList.length > 0) {
        const valid = statusList.filter(s => VALID_STATUSES.includes(s));
        if (valid.length > 0) {
            base = base.in('status', valid);
        }
    }

    const dataQuery = base.range(offset, rangeEnd);
    const { data, error, count } = await dataQuery;
    if (error) throw error;

    return { data, total: count || 0 };
}

async function getStatusCounts({ start, end, search }) {
    // We compute counts per status with same time + search filters, but without status filter itself
    const counts = {};
    for (const st of STATUS_ORDER) counts[st] = 0;

    let base = supabase
        .from('orders')
        .select('status')
        .gte('created_at', start)
        .lte('created_at', end);

    if (search && String(search).trim() !== '') {
        const q = `%${search}%`;
        base = base.or(
            `customer_username.ilike.${q},id.in.(select order_id from order_items where product_name.ilike.${q} or content.ilike.${q})`
        );
    }

    const { data, error } = await base;
    if (error) throw error;

    for (const row of data || []) {
        if (counts[row.status] === undefined) counts[row.status] = 0;
        counts[row.status] += 1;
    }

    return STATUS_ORDER.map(status => ({ status, count: counts[status] || 0 }));
}

async function getOrderById(orderId) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
    if (error) throw error;
    return data;
}

async function getItemsByOrderId(orderId) {
    const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function updateOrderStatus(orderId, status) {
    if (!VALID_STATUSES.includes(status)) {
        const err = new Error('Invalid status');
        err.statusCode = 400;
        throw err;
    }
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select('id,status')
        .single();
    if (error) throw error;
    return data;
}

async function deleteOrder(orderId) {
    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
    if (error) throw error;
    return true;
}

async function bulkDeleteOrders(ids) {
    const results = [];
    for (const id of ids) {
        try {
            await deleteOrder(id);
            results.push({ orderId: id, success: true });
        } catch (e) {
            results.push({ orderId: id, success: false, message: e.message });
        }
    }
    return results;
}

async function findOrderFromCommentsLookup(username, liveDate) {
    let query = supabase
        .from('orders')
        .select('*')
        .eq('customer_username', username)
        .eq('live_date', liveDate)
        .order('created_at', { ascending: false })
        .limit(1);

    const { data, error } = await query;
    if (error) throw error;
    return (data && data[0]) || null;
}

// Create new order with items
async function createOrderWithItems({ customerUsername, liveDate, items, note = '' }) {
    const now = new Date().toISOString();

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.line_total || 0), 0);

    // Insert order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            customer_username: customerUsername,
            live_date: liveDate,
            total_amount: totalAmount,
            note,
            status: 'chua_rep',
            created_at: now,
            updated_at: now
        })
        .select('id, customer_username, total_amount, live_date')
        .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = items.map(item => ({
        order_id: order.id,
        content: item.content,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
        created_at: now
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) throw itemsError;

    return { order, itemsCount: items.length };
}

// Add items to existing order
async function addItemsToOrder(orderId, items) {
    const now = new Date().toISOString();

    // Get current order
    const { data: order, error: getOrderError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .eq('id', orderId)
        .single();

    if (getOrderError) throw getOrderError;

    // Insert new items
    const orderItems = items.map(item => ({
        order_id: orderId,
        content: item.content,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
        created_at: now
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) throw itemsError;

    // Update total amount
    const newTotal = order.total_amount + items.reduce((sum, item) => sum + item.line_total, 0);

    const { error: updateError } = await supabase
        .from('orders')
        .update({ total_amount: newTotal, updated_at: now })
        .eq('id', orderId);

    if (updateError) throw updateError;

    return { oldTotal: order.total_amount, newTotal, itemsCount: items.length };
}

// Get total revenue for a time range
async function getTotalRevenue({ start, end, search, statusList }) {
    let base = supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', start)
        .lte('created_at', end);

    if (search && String(search).trim() !== '') {
        const q = `%${search}%`;
        base = base.or(
            `customer_username.ilike.${q},id.in.(select order_id from order_items where product_name.ilike.${q} or content.ilike.${q})`
        );
    }

    if (statusList && statusList.length > 0) {
        const valid = statusList.filter(s => VALID_STATUSES.includes(s));
        if (valid.length > 0) {
            base = base.in('status', valid);
        }
    }

    const { data, error } = await base;
    if (error) throw error;

    const totalRevenue = (data || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);
    return totalRevenue;
}

module.exports = {
    VALID_STATUSES,
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
    addItemsToOrder,
    getTotalRevenue
};


