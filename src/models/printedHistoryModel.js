const { supabase } = require('../config/supabase');

/**
 * Parse price from comment_text
 * Examples: "200" -> 200000, "t150" -> 150000, "xanh 100" -> 100000
 * Only 2+ digit numbers are valid, otherwise return 0
 */
function parsePrice(commentText) {
    if (!commentText) return 0;

    // Extract all sequences of digits
    const matches = String(commentText).match(/\d+/g);
    if (!matches || matches.length === 0) return 0;

    // Get the first number sequence with 2+ digits
    for (const match of matches) {
        if (match.length >= 2) {
            return parseInt(match) * 1000; // Convert to VND
        }
    }

    return 0;
}

/**
 * Get printed_history records within time range that are not yet in any order
 */
async function getAvailablePrintedHistory(startTime, endTime) {
    // Get all printed_history in range
    const { data: printedData, error: printedError } = await supabase
        .from('printed_history')
        .select('*')
        .gte('printed_at', startTime)
        .lte('printed_at', endTime)
        .order('printed_at', { ascending: true });

    if (printedError) throw printedError;

    // Get all comment_ids that are already in order_items
    const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('content');

    if (itemsError) throw itemsError;

    const usedCommentIds = new Set((orderItemsData || []).map(item => item.content));

    // Filter out already used printed records
    const availablePrinted = (printedData || []).filter(
        record => !usedCommentIds.has(record.comment_id)
    );

    return availablePrinted;
}

/**
 * Get all orders that have ANY items with comment_ids matching the provided list
 */
async function getOrdersWithCommentIds(commentIds) {
    if (!commentIds || commentIds.length === 0) return [];

    const { data, error } = await supabase
        .from('order_items')
        .select('order_id, content')
        .in('content', commentIds);

    if (error) throw error;

    const orderIds = [...new Set((data || []).map(item => item.order_id))];

    if (orderIds.length === 0) return [];

    const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, customer_username, live_date')
        .in('id', orderIds);

    if (ordersError) throw ordersError;

    return ordersData || [];
}

/**
 * Check if an order will be split by the time range
 * Returns true if the order has items OUTSIDE the range
 */
async function checkOrderSplit(orderId, startTime, endTime) {
    // Get all items of this order
    const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('content')
        .eq('order_id', orderId);

    if (error) throw error;

    if (!orderItems || orderItems.length === 0) return false;

    const commentIds = orderItems.map(item => item.content);

    // Get printed_history for these comment_ids
    const { data: printedHistory, error: phError } = await supabase
        .from('printed_history')
        .select('printed_at')
        .in('comment_id', commentIds);

    if (phError) throw phError;

    // Check if any printed_at is outside the range
    const hasOutsideRange = (printedHistory || []).some(
        record => record.printed_at < startTime || record.printed_at > endTime
    );

    return hasOutsideRange;
}

/**
 * Get all items of an order
 */
async function getOrderItems(orderId) {
    const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

    if (error) throw error;

    return data || [];
}

/**
 * Check if ALL items of an order are within time range
 */
async function checkOrderFullyInRange(orderId, startTime, endTime) {
    const items = await getOrderItems(orderId);

    if (items.length === 0) return false;

    const commentIds = items.map(item => item.content);

    const { data: printedHistory, error } = await supabase
        .from('printed_history')
        .select('printed_at')
        .in('comment_id', commentIds);

    if (error) throw error;

    if (!printedHistory || printedHistory.length !== items.length) return false;

    // Check if ALL printed_at are within range
    const allInRange = printedHistory.every(
        record => record.printed_at >= startTime && record.printed_at <= endTime
    );

    return allInRange;
}

module.exports = {
    parsePrice,
    getAvailablePrintedHistory,
    getOrdersWithCommentIds,
    checkOrderSplit,
    getOrderItems,
    checkOrderFullyInRange
};
