const { supabase } = require('../config/supabase');

/**
 * Customer fields in Supabase `customers` table:
 * - id (int8)
 * - username (text)
 * - name (text)
 * - phone (text)
 * - address (text)
 * - notes (text)
 * - marked_at (timestamptz)
 * - created_at (timestamptz)
 * - updated_at (timestamptz)
 */

async function listCustomers({ search = '', page = 1, limit = 20, markedOnly = false }) {
    const pageNum = Math.max(1, Number(page));
    const perPage = Math.max(1, Number(limit));
    const from = (pageNum - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

    if (markedOnly) {
        query = query.not('marked_at', 'is', null);
    }

    if (search && String(search).trim() !== '') {
        const q = `%${search}%`;
        // Search by username, name, phone, address
        query = query.or(
            `username.ilike.${q},name.ilike.${q},phone.ilike.${q},address.ilike.${q}`
        );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;
    return { data: data || [], total: count || 0, page: pageNum, limit: perPage };
}

async function getCustomerById(id) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function getCustomerByUsername(username) {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('username', username)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

async function createCustomer(payload) {
    const now = new Date().toISOString();
    const insertData = { ...payload, created_at: now, updated_at: now };
    const { data, error } = await supabase
        .from('customers')
        .insert(insertData)
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

async function updateCustomer(id, payload) {
    const { data, error } = await supabase
        .from('customers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

async function deleteCustomer(id) {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

async function setMarked(id, marked) {
    const value = marked ? new Date().toISOString() : null;
    const { data, error } = await supabase
        .from('customers')
        .update({ marked_at: value, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, marked_at')
        .single();
    if (error) throw error;
    return data;
}

module.exports = {
    listCustomers,
    getCustomerById,
    getCustomerByUsername,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setMarked
};


