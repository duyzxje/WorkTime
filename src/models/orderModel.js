const { getPgPoolAsync } = require('../config/db');

const ORDER_STATUSES = ['chua_rep', 'giu_don', 'di_don', 'gap', 'hoan_thanh', 'warning'];
const STATUS_ORDER = ['gap', 'di_don', 'chua_rep', 'giu_don', 'warning', 'hoan_thanh'];

function normalizeStatus(status) {
    if (!status) return null;
    const s = String(status).trim();
    return ORDER_STATUSES.includes(s) ? s : null;
}

function parseStatusesParam(statusParam) {
    if (!statusParam) return [];
    return String(statusParam)
        .split(',')
        .map((x) => x.trim())
        .map(normalizeStatus)
        .filter(Boolean);
}

function getByField(by) {
    return by === 'live_date' ? 'live_date' : 'created_at';
}

async function listOrders({ start, end, page = 1, limit = 20, search, status, by }) {
    const pool = await getPgPoolAsync();
    const client = await pool.connect();
    try {
        const byField = getByField(by);
        const statuses = parseStatusesParam(status);

        const where = [];
        const params = [];
        let idx = 1;

        if (start) { where.push(`${byField} >= $${idx++}`); params.push(start); }
        if (end) { where.push(`${byField} <= $${idx++}`); params.push(end); }
        if (search) {
            where.push(`(customer_username ILIKE $${idx} OR CAST(id AS TEXT) ILIKE $${idx})`);
            params.push(`%${search}%`);
            idx++;
        }
        if (statuses.length > 0) {
            where.push(`status = ANY($${idx++})`);
            params.push(statuses);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*)::int AS total FROM orders ${whereSql}`;
        const totalRes = await client.query(countSql, params);
        const total = totalRes.rows[0]?.total || 0;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        const dataSql = `
            SELECT id, customer_username, total_amount, status, live_date, created_at
            FROM orders
            ${whereSql}
            ORDER BY ${byField} DESC
            LIMIT ${limitNum} OFFSET ${offset}
        `;
        const dataRes = await client.query(dataSql, params);

        // statusCounts for fixed set
        const counts = await Promise.all(
            STATUS_ORDER.map(async (st) => {
                const whereForStatus = whereSql
                    ? `${whereSql} AND status = $${params.length + 1}`
                    : `WHERE status = $${params.length + 1}`;
                const cRes = await client.query(
                    `SELECT COUNT(*)::int AS count FROM orders ${whereForStatus}`,
                    [...params, st]
                );
                return { status: st, count: cRes.rows[0]?.count || 0 };
            })
        );

        return { data: dataRes.rows, statusCounts: counts, page: pageNum, limit: limitNum, total };
    } finally {
        client.release();
    }
}

async function getOrderById(orderId) {
    const pool = await getPgPoolAsync();
    const { rows } = await pool.query(
        'SELECT id, customer_username, total_amount, status, live_date, created_at FROM orders WHERE id = $1',
        [orderId]
    );
    return rows[0] || null;
}

async function getOrderItems(orderId) {
    const pool = await getPgPoolAsync();
    const { rows } = await pool.query(
        'SELECT id, order_id, product_name, content, quantity, price, unit_price, created_at FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
        [orderId]
    );
    return rows;
}

async function updateOrderStatus(orderId, status) {
    const pool = await getPgPoolAsync();
    const s = normalizeStatus(status);
    if (!s) return null;
    const { rows } = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status',
        [s, orderId]
    );
    return rows[0] || null;
}

async function deleteOrder(orderId) {
    const pool = await getPgPoolAsync();
    const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    return rowCount > 0;
}

async function bulkDeleteOrders(ids) {
    const pool = getPgPool();
    const client = await pool.connect();
    const results = [];
    try {
        await client.query('BEGIN');
        for (const id of ids) {
            try {
                const res = await client.query('DELETE FROM orders WHERE id = $1', [id]);
                results.push({ orderId: id, success: res.rowCount > 0, message: res.rowCount ? undefined : 'Not found' });
            } catch (e) {
                results.push({ orderId: id, success: false, message: e.message });
            }
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
    return results;
}

module.exports = {
    ORDER_STATUSES,
    STATUS_ORDER,
    listOrders,
    getOrderById,
    getOrderItems,
    updateOrderStatus,
    deleteOrder,
    bulkDeleteOrders
};


