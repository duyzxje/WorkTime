# Notification System API Documentation

## Tổng quan
Hệ thống thông báo cho phép admin tạo, quản lý thông báo và user xem, đánh dấu đã đọc thông báo.

## Cấu trúc dữ liệu

### Notification Object
```json
{
  "_id": "ObjectId",
  "title": "Tiêu đề thông báo",
  "content": "Nội dung thông báo",
  "type": "info|warning|success|error",
  "isRead": false,
  "userId": "ObjectId",
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## API Endpoints

### 1. User Routes (Cần authentication)

#### GET /api/notifications/user
Lấy tất cả thông báo của user hiện tại

**Query Parameters:**
- `includeExpired` (boolean, optional): Bao gồm thông báo đã hết hạn

**Response:**
```json
{
  "success": true,
  "data": [Notification],
  "count": 10
}
```

#### GET /api/notifications/user/unread
Lấy thông báo chưa đọc của user

**Response:**
```json
{
  "success": true,
  "data": [Notification],
  "count": 5
}
```

#### GET /api/notifications/user/recent
Lấy thông báo gần đây (chưa đọc)

**Query Parameters:**
- `limit` (number, optional): Số lượng thông báo (default: 5)

**Response:**
```json
{
  "success": true,
  "data": [Notification],
  "count": 3
}
```

#### GET /api/notifications/user/count
Đếm số thông báo chưa đọc

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

#### PUT /api/notifications/:id/read
Đánh dấu thông báo đã đọc

**Response:**
```json
{
  "success": true,
  "message": "Đánh dấu thông báo đã đọc thành công",
  "data": Notification
}
```

#### PUT /api/notifications/user/mark-all-read
Đánh dấu tất cả thông báo đã đọc

**Response:**
```json
{
  "success": true,
  "message": "Đánh dấu 5 thông báo đã đọc thành công",
  "affectedRows": 5
}
```

### 2. Admin Routes (Cần authentication + admin role)

#### POST /api/notifications
Tạo thông báo mới

**Request Body:**
```json
{
  "title": "Tiêu đề thông báo",
  "content": "Nội dung thông báo",
  "type": "info",
  "userId": "ObjectId",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo thông báo thành công",
  "data": Notification
}
```

#### GET /api/notifications/admin/all
Lấy tất cả thông báo (admin)

**Query Parameters:**
- `limit` (number, optional): Số lượng thông báo (default: 50)
- `offset` (number, optional): Vị trí bắt đầu (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [Notification],
  "count": 25
}
```

#### PUT /api/notifications/:id
Cập nhật thông báo

**Request Body:**
```json
{
  "title": "Tiêu đề mới",
  "content": "Nội dung mới",
  "type": "warning",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật thông báo thành công",
  "data": Notification
}
```

#### DELETE /api/notifications/:id
Xóa thông báo (soft delete)

**Response:**
```json
{
  "success": true,
  "message": "Xóa thông báo thành công"
}
```

#### DELETE /api/notifications/admin/expired
Xóa tất cả thông báo đã hết hạn

**Response:**
```json
{
  "success": true,
  "message": "Xóa 10 thông báo đã hết hạn thành công",
  "affectedRows": 10
}
```

## Notification Service

### Các tính năng nâng cao

#### Tạo thông báo hàng loạt
```javascript
const notificationService = require('./services/notificationService');

// Tạo thông báo cho nhiều user
await notificationService.createBulkNotifications(
  {
    title: "Thông báo chung",
    content: "Nội dung thông báo",
    type: "info"
  },
  ["userId1", "userId2", "userId3"]
);

// Tạo thông báo cho tất cả user
await notificationService.createNotificationForAllUsers({
  title: "Thông báo hệ thống",
  content: "Hệ thống sẽ bảo trì vào 2:00 AM",
  type: "warning"
});

// Tạo thông báo cho user theo role
await notificationService.createNotificationForRole(
  {
    title: "Thông báo cho admin",
    content: "Có báo cáo mới cần xem xét",
    type: "info"
  },
  "admin"
);
```

#### Tạo thông báo với thời gian hết hạn
```javascript
// Hết hạn sau 24 giờ
await notificationService.createNotificationWithExpiry(
  {
    title: "Thông báo tạm thời",
    content: "Thông báo này sẽ tự động xóa sau 24 giờ",
    type: "info",
    userId: "userId"
  },
  { type: "hours", value: 24 }
);

// Hết hạn sau 7 ngày
await notificationService.createNotificationWithExpiry(
  {
    title: "Thông báo tuần",
    content: "Thông báo này sẽ tự động xóa sau 7 ngày",
    type: "info",
    userId: "userId"
  },
  { type: "days", value: 7 }
);

// Hết hạn vào thời điểm cụ thể
await notificationService.createNotificationWithExpiry(
  {
    title: "Thông báo có thời hạn",
    content: "Thông báo này sẽ hết hạn vào cuối năm",
    type: "info",
    userId: "userId"
  },
  { type: "custom", value: "2024-12-31T23:59:59.000Z" }
);
```

#### Tạo thông báo từ template
```javascript
// Thông báo chào mừng
await notificationService.createFromTemplate(
  "welcome",
  "userId",
  { name: "Nguyễn Văn A" }
);

// Thông báo nhắc nhở chấm công
await notificationService.createFromTemplate(
  "attendance_reminder",
  "userId",
  { type: "vào", time: "8:00 AM" }
);

// Thông báo cập nhật lương
await notificationService.createFromTemplate(
  "salary_update",
  "userId",
  { month: "tháng 1", amount: "15,000,000 VNĐ" }
);
```

## Tự động hóa

### Job tự động xóa thông báo hết hạn
- Chạy mỗi ngày lúc 2:00 AM
- Tự động xóa (soft delete) các thông báo đã hết hạn
- Có thể dừng job bằng `notificationService.stopCleanupJob()`

### Các template có sẵn
- `welcome`: Thông báo chào mừng
- `attendance_reminder`: Nhắc nhở chấm công
- `salary_update`: Cập nhật lương
- `system_maintenance`: Bảo trì hệ thống

## Lưu ý
- Tất cả thông báo đều có soft delete (isActive = false)
- Thông báo hết hạn sẽ không hiển thị trong danh sách user (trừ khi includeExpired = true)
- Hệ thống tự động tạo index để tối ưu hiệu suất query
- Có thể tìm kiếm thông báo theo title và content
- Có thể lấy thống kê thông báo theo loại và trạng thái
