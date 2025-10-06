const mongoose = require('mongoose');
const { Pool } = require('pg');
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
const getPgPool = () => {
    if (!pgPool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.warn('DATABASE_URL is not set. Orders API will be disabled until provided.');
        }
        pgPool = new Pool({
            connectionString,
            ssl: connectionString && connectionString.includes('sslmode=require')
                ? { rejectUnauthorized: false }
                : { rejectUnauthorized: false }
        });
    }
    return pgPool;
};

module.exports = connectDB;
module.exports.getPgPool = getPgPool;
