const {
    listCustomers,
    getCustomerById,
    getCustomerByUsername,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setMarked
} = require('../models/customerModel');

// GET /customers
const getCustomers = async (req, res) => {
    try {
        const { page = '1', limit = '20', search = '', marked = '' } = req.query;
        const markedOnly = String(marked).toLowerCase() === 'true' || marked === '1';
        const result = await listCustomers({ page, limit, search, markedOnly });
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('getCustomers error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /customers/:id
const getCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await getCustomerById(id);
        return res.json({ success: true, data: customer });
    } catch (error) {
        console.error('getCustomer error:', error);
        return res.status(404).json({ success: false, message: 'Customer not found' });
    }
};

// GET /customers/by-username/:username
const getCustomerByName = async (req, res) => {
    try {
        const { username } = req.params;
        const customer = await getCustomerByUsername(username);
        if (!customer) return res.json({ success: false, data: null });
        return res.json({ success: true, data: customer });
    } catch (error) {
        console.error('getCustomerByName error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /customers
const createCustomerHandler = async (req, res) => {
    try {
        const { username, name, phone, address, notes } = req.body || {};
        if (!username || !name) {
            return res.status(400).json({ success: false, message: 'username and name are required' });
        }
        // If exists by username, update instead of duplicate
        const existing = await getCustomerByUsername(username);
        if (existing) {
            const updated = await updateCustomer(existing.id, { name, phone, address, notes });
            return res.json({ success: true, data: updated, upserted: true, action: 'updated' });
        }
        const created = await createCustomer({ username, name, phone, address, notes });
        return res.status(201).json({ success: true, data: created, upserted: false, action: 'created' });
    } catch (error) {
        console.error('createCustomer error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /customers/:id
const updateCustomerHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body || {};
        delete payload.id;
        delete payload.created_at;
        const updated = await updateCustomer(id, payload);
        return res.json({ success: true, data: updated });
    } catch (error) {
        console.error('updateCustomer error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /customers/:id/mark
const markCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { marked } = req.body || {};
        const target = await setMarked(id, Boolean(marked));
        return res.json({ success: true, id: target.id, marked_at: target.marked_at });
    } catch (error) {
        console.error('markCustomer error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /customers/:id
const removeCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteCustomer(id);
        return res.json({ success: true });
    } catch (error) {
        console.error('removeCustomer error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCustomers,
    getCustomer,
    getCustomerByName,
    createCustomerHandler,
    updateCustomerHandler,
    markCustomer,
    removeCustomer
};


