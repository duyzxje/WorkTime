const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// Chỉ sử dụng routes attendance vì authentication được xử lý ở frontend
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Default route
app.get('/', (req, res) => {
    res.send('WorkTime API is running');
});

// Health check route for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
