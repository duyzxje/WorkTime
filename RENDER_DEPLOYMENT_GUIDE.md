# Render Deployment Guide

## Environment Variables cần thiết

Khi deploy lên Render, bạn cần cấu hình các environment variables sau:

### **Backend (Node.js service)**

1. **MONGODB_URI**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/worktime?retryWrites=true&w=majority
   ```

2. **JWT_SECRET**
   ```
   your-super-secret-jwt-key-here
   ```

3. **CLIENT_URL** (URL của frontend)
   ```
   https://your-frontend-app.onrender.com
   ```

4. **NODE_ENV**
   ```
   production
   ```

### **Frontend (Static Site hoặc Web Service)**

1. **REACT_APP_API_URL** (URL của backend)
   ```
   https://your-backend-app.onrender.com
   ```

## Cấu hình Render

### **1. Backend Service**

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: `Node`
- **Node Version**: `18.x` hoặc `20.x`

### **2. Frontend Service**

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build` (nếu dùng Create React App)
- **Environment**: `Static Site` hoặc `Web Service`

## WebSocket Configuration

### **Backend (server.js)**
```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### **Frontend**
```javascript
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL || 'https://your-backend-app.onrender.com', {
  auth: {
    token: userToken
  },
  transports: ['websocket', 'polling']
});
```

## CORS Configuration

### **Backend**
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
```

## Testing WebSocket Connection

### **1. Kiểm tra kết nối**
```javascript
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### **2. Test thông báo**
```javascript
// Gửi thông báo test từ admin
fetch('https://your-backend-app.onrender.com/api/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Test Notification',
    content: 'This is a test notification',
    type: 'info',
    sendToAll: true
  })
});
```

## Troubleshooting

### **1. WebSocket không kết nối được**

**Nguyên nhân có thể:**
- CORS configuration không đúng
- Environment variables chưa được set
- Firewall blocking WebSocket connections

**Giải pháp:**
```javascript
// Thêm transports fallback
const socket = io(process.env.REACT_APP_API_URL, {
  auth: { token: userToken },
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true
});
```

### **2. CORS Error**

**Giải pháp:**
```javascript
// Backend - cập nhật CORS
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'https://your-frontend-app.onrender.com',
    'http://localhost:3000' // cho development
  ],
  credentials: true
}));
```

### **3. Environment Variables**

**Kiểm tra trong Render Dashboard:**
1. Vào service settings
2. Environment tab
3. Đảm bảo tất cả variables đã được set

## Production Checklist

- [ ] MONGODB_URI đã được set
- [ ] JWT_SECRET đã được set (strong secret)
- [ ] CLIENT_URL đã được set (URL của frontend)
- [ ] REACT_APP_API_URL đã được set (URL của backend)
- [ ] CORS đã được cấu hình đúng
- [ ] WebSocket connection đã được test
- [ ] SSL certificate đã được enable (Render tự động)
- [ ] Database connection đã được test
- [ ] API endpoints đã được test

## Monitoring

### **1. Logs**
- Kiểm tra logs trong Render Dashboard
- Monitor WebSocket connections
- Check for CORS errors

### **2. Health Check**
```javascript
// Backend health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocket: io.engine.clientsCount
  });
});
```

### **3. WebSocket Status**
```javascript
// Monitor WebSocket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  console.log(`Total connections: ${io.engine.clientsCount}`);
});
```

## Performance Tips

1. **Enable gzip compression**
2. **Use Redis for session storage** (nếu cần)
3. **Monitor memory usage**
4. **Set up proper logging**
5. **Use CDN for static assets**

## Security

1. **Use HTTPS** (Render tự động cung cấp)
2. **Validate JWT tokens**
3. **Rate limiting** cho API endpoints
4. **Input validation**
5. **Environment variables security**
