const express = require('express');
const dns = require('dns');
// Force IPv4 to avoid IPv6 ENETUNREACH in hosting environments without IPv6 egress
try { dns.setDefaultResultOrder('ipv4first'); } catch (_) { }
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/userModel');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/offices', require('./routes/officeRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/live', require('./routes/liveRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Socket.IO authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected with socket ID: ${socket.id}`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Join admin to admin room if they are admin
    if (socket.user.role === 'admin') {
        socket.join('admin_room');
    }

    // Handle notification events
    socket.on('join_notification_room', (data) => {
        if (data.room) {
            socket.join(data.room);
            console.log(`User ${socket.user.name} joined room: ${data.room}`);
        }
    });

    socket.on('leave_notification_room', (data) => {
        if (data.room) {
            socket.leave(data.room);
            console.log(`User ${socket.user.name} left room: ${data.room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.user.name} disconnected`);
    });
});

// Make io accessible to other modules
app.set('io', io);

// Default route
app.get('/', (req, res) => {
    res.send('WorkTime API is running');
});

// Health check route for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`WebSocket server is ready for connections`);
});
