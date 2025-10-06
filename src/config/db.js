const mongoose = require('mongoose');
const { Pool } = require('pg');
const dns = require('dns');
const { URL } = require('url');
require('dotenv').config();

// Existing Mongo connection (kept for current features)
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// New Postgres pool for Orders using DATABASE_URL
let pgPool;
let pgInitPromise;

const getPgPool = () => {
    // Keep sync version for legacy callers; may not enforce IPv4 in all hosts
    if (!pgPool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) console.warn('DATABASE_URL is not set.');
        pgPool = new Pool({
            connectionString,
            lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
            ssl: { rejectUnauthorized: false }
        });
    }
    return pgPool;
};

const getPgPoolAsync = async () => {
    if (pgPool) return pgPool;
    if (!pgInitPromise) {
        pgInitPromise = (async () => {
            const connectionString = process.env.DATABASE_URL;
            if (!connectionString) {
                console.warn('DATABASE_URL is not set.');
            }
            try {
                const url = new URL(connectionString);
                const host = url.hostname;
                const port = parseInt(url.port || '5432', 10);
                const database = url.pathname.replace('/', '') || 'postgres';
                const user = decodeURIComponent(url.username || 'postgres');
                const password = decodeURIComponent(url.password || '');
                // Resolve A record (IPv4)
                const { address: ipv4 } = await dns.promises.lookup(host, { family: 4 });
                pgPool = new Pool({
                    host: ipv4,
                    port,
                    database,
                    user,
                    password,
                    ssl: { rejectUnauthorized: false },
                    // Extra safety
                    lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
                    connectionTimeoutMillis: 5000
                });
                return pgPool;
            } catch (e) {
                console.warn('Falling back to connectionString pool due to DNS IPv4 resolution error:', e.message);
                pgPool = new Pool({
                    connectionString,
                    lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 5000
                });
                return pgPool;
            }
        })();
    }
    return pgInitPromise;
};

module.exports = connectDB;
module.exports.getPgPool = getPgPool;
module.exports.getPgPoolAsync = getPgPoolAsync;
