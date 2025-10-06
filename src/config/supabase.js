const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Orders endpoints will fail until configured.');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
    auth: { persistSession: false }
});

module.exports = { supabase };


