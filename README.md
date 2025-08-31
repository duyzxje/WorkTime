# WorkTime API

Backend service for employee attendance tracking with GPS validation.

## Features

- Employee check-in/check-out with GPS validation
- View attendance history by user
- Verify location against predefined office coordinates
- Generate daily and monthly attendance reports
- Manual check-out for forgotten check-outs
- Admin features for managing office locations
- Work shift registration system (morning, noon, afternoon, evening, off)
- Live event schedule management with automatic "off" calculation
- User management with role-based access control
- **Dashboard statistics**: Total employees count and currently working employees

## Tech Stack

- Node.js
- Express
- MongoDB Atlas
- Geospatial validation

## Models

### Live Event Schema
```javascript
{
  weekStartDate: Date,    // Ngày bắt đầu tuần
  day: Number,            // Ngày trong tuần (1-7: Thứ 2 - Chủ nhật)
  morning: Boolean,       // Ca sáng
  noon: Boolean,          // Ca trưa
  afternoon: Boolean,     // Ca chiều
  evening: Boolean,       // Ca tối
  off: Boolean,           // Ca nghỉ (được quản lý độc lập)
  timestamps: true
}
```

**Cách hoạt động:**
- Field `off` được quản lý độc lập với các ca khác
- Khi tạo mới, tất cả ca (bao gồm `off`) đều được khởi tạo là `false`
- Người dùng có thể tự do chọn ca `off` mà không bị ảnh hưởng bởi các ca khác

### Attendance Schema
```javascript
{
  user: ObjectId,         // ID người dùng
  checkInTime: Date,      // Thời gian check-in
  checkOutTime: Date,     // Thời gian check-out
  checkInLocation: {      // Vị trí check-in
    type: 'Point',
    coordinates: [Number]  // [longitude, latitude]
  },
  checkOutLocation: {     // Vị trí check-out
    type: 'Point',
    coordinates: [Number]  // [longitude, latitude]
  },
  status: String,         // 'checked-in' hoặc 'checked-out'
  isValid: Boolean,       // Vị trí GPS có hợp lệ không
  officeId: String,       // ID văn phòng
  workDuration: Number,   // Thời gian làm việc (phút)
  notes: String,          // Ghi chú
  timestamps: true
}
```

### User Schema
```javascript
{
  username: String,       // Tên đăng nhập
  name: String,           // Họ tên
  email: String,          // Email
  password: String,       // Mật khẩu (đã hash)
  role: String,           // 'admin', 'staff', 'viewer'
  timestamps: true
}
```

### Office Schema
```javascript
{
  officeId: String,       // ID văn phòng
  name: String,           // Tên văn phòng
  location: {             // Vị trí văn phòng
    type: 'Point',
    coordinates: [Number]  // [longitude, latitude]
  },
  radius: Number,         // Bán kính cho phép (mét)
  address: String,        // Địa chỉ
  timestamps: true
}
```

## API Endpoints

### Attendance

- `POST /api/attendance/checkin` - Check in with GPS coordinates
  - Required body: `{ userId, longitude, latitude }`
  - Optional body: `{ officeId, notes }`
  
- `POST /api/attendance/checkout` - Check out with GPS coordinates
  - Required body: `{ userId, longitude, latitude }`
  - Optional body: `{ notes }`
  
- `POST /api/attendance/manual-checkout` - Manual check-out for forgotten check-outs
  - Required body: `{ userId, date }`
  - Optional body: `{ notes }`

- `POST /api/attendance/manual-record` - Create manual attendance record (admin only)
  - Required body: `{ userId, date, checkInTime }`
  - Optional body: `{ checkOutTime, officeId, notes }`
  
- `GET /api/attendance/:userId` - Get user's attendance history
  - Optional query params: `startDate, endDate`
  
- `GET /api/attendance/all` - Get all users' attendance (admin only)
  - Optional query params: `startDate, endDate, userId`

### Offices

- `GET /api/offices` - Get all office locations
- `GET /api/offices/:id` - Get office by ID
- `POST /api/offices` - Create a new office (admin only)
  - Required body: `{ officeId, name, longitude, latitude }`
  - Optional body: `{ radius, address }`
- `PUT /api/offices/:id` - Update office (admin only)
- `DELETE /api/offices/:id` - Delete office (admin only)

### Reports

- `GET /api/reports/daily/:userId` - Get daily attendance report
  - Optional query params: `startDate, endDate`
- `GET /api/reports/monthly/:userId` - Get monthly attendance report
  - Optional query params: `year`

### Shifts

- `GET /api/shifts` - Get all shift registrations for the week
  - Required query params: `weekStartDate` (YYYY-MM-DD)

- `GET /api/shifts/user/:userId` - Get shifts for a specific user
  - Required query params: `weekStartDate` (YYYY-MM-DD)

- `POST /api/shifts/toggle` - Toggle shift registration (register/unregister)
  - Required body: `{ userId, day, shiftType, weekStartDate }`
  - Where:
    - `day`: number (1-7)
    - `shiftType`: string ("morning", "noon", "afternoon", "evening", "off")
    - `weekStartDate`: string (YYYY-MM-DD)

- `DELETE /api/shifts/own/:day` - Delete all shifts for the current user on a specific day
  - Required params: `day` (1-7)
  - Required query: `weekStartDate` (YYYY-MM-DD)
  - Users can delete their own shift schedule for a specific day

- `DELETE /api/shifts/user/:userId/day/:day` - Delete all shifts for a specific user on a specific day (admin only)
  - Required params: `userId` (ObjectId), `day` (1-7)
  - Required query: `weekStartDate` (YYYY-MM-DD)
  - Admin can delete entire shift schedule for any specified user and day

### Live Events

- `GET /api/live` - Get live events schedule for the week
  - Required query params: `weekStartDate` (YYYY-MM-DD)

- `POST /api/live/update` - Add/Remove live event for a day (admin only)
  - Required body: `{ day, shiftType, weekStartDate, action }`
  - Where:
    - `day`: number (1-7)
    - `shiftType`: string ("morning", "noon", "afternoon", "evening", "off")
    - `weekStartDate`: string (YYYY-MM-DD)
    - `action`: string ("add" or "remove")

- `DELETE /api/live/:day` - Delete live event for a specific day (admin only)
  - Required params: `day` (1-7)
  - Required query: `weekStartDate` (YYYY-MM-DD)
  - Deletes entire live schedule for the specified day

### Users

- `GET /api/users` - Get all users (admin only)
  - Returns: `{ success: true, data: { users: array } }`
  - Each user includes: id, username, name, email, role

- `GET /api/users/count` - Get total employees count (admin only)
  - Returns: `{ success: true, data: { totalEmployees: number } }`
  - **Note**: Excludes users with admin role

- `GET /api/users/currently-working` - Get currently working employees (admin only)
  - Returns employees who have checked in but not checked out
  - Returns: `{ success: true, data: { currentlyWorking: array, count: number } }`
  - **Note**: Excludes users with admin role

- `POST /api/users` - Create a new user (admin only)
  - Required body: `{ username, name, password, email }`
  - Optional body: `{ role }` ("admin", "staff", "viewer")
  - Validations:
    - Email format validation
    - Password minimum 6 characters
    - Username and email uniqueness
    - Role validation

- `PUT /api/users/:userId` - Update user (admin only)
  - Optional body: `{ name, role, email, password }`
  - Validations:
    - Email format and uniqueness
    - Role validation
    - User ID format validation

- `DELETE /api/users/:userId` - Delete user (admin only)
  - Validations:
    - User ID format validation
    - Prevents deleting the last admin user
    - Returns deleted user information

- `GET /api/users/profile` - Get current user profile

### Authentication

- `POST /api/auth/login` - Authenticate user & get token
  - Required body: `{ username, password }`
  - Returns: `{ success: true, data: { token: string, user: { id, username, name, email, role } } }`

- `GET /api/auth/verify` - Verify token and get user data

## Cách hoạt động

### Dashboard Statistics

Hệ thống cung cấp thống kê tổng quan cho quản trị viên:

1. **Tổng số nhân viên**: Đếm tổng số người dùng trong hệ thống (loại trừ admin)
   - Endpoint: `GET /api/users/count`
   - Trả về số lượng nhân viên hiện có (không bao gồm admin)

2. **Nhân viên đang làm việc**: Hiển thị danh sách nhân viên đã check-in nhưng chưa check-out (loại trừ admin)
   - Endpoint: `GET /api/users/currently-working`
   - Trả về thông tin chi tiết: tên, username, email, thời gian check-in, văn phòng
   - Thời gian được định dạng theo múi giờ Việt Nam
   - Chỉ hiển thị nhân viên (staff, viewer), không bao gồm admin

### Quản lý người dùng

Hệ thống cung cấp đầy đủ chức năng quản lý người dùng cho quản trị viên:

1. **Tạo người dùng mới** (`POST /api/users`)
   - Yêu cầu: username, name, email, password
   - Tùy chọn: role (admin, staff, viewer)
   - Validation: định dạng email, độ dài mật khẩu, tính duy nhất của username/email

2. **Cập nhật thông tin người dùng** (`PUT /api/users/:userId`)
   - Có thể cập nhật: name, email, role, password
   - Validation: định dạng email, tính duy nhất email, định dạng user ID

3. **Xóa người dùng** (`DELETE /api/users/:userId`)
   - Validation: định dạng user ID
   - Bảo vệ: không cho phép xóa admin cuối cùng
   - Trả về thông tin user đã xóa

4. **Xem danh sách người dùng** (`GET /api/users`)
   - Hiển thị tất cả users (không bao gồm password)
   - Chỉ admin mới có quyền truy cập

### Chấm công

1. Frontend xử lý đăng nhập trực tiếp với database
2. Sau khi đăng nhập thành công, frontend sẽ gửi thông tin check-in/check-out kèm userId và tọa độ GPS
3. Backend xác thực tọa độ GPS với các vị trí văn phòng (từ database hoặc config)
4. Backend lưu dữ liệu chấm công và trả kết quả thành công hoặc thất bại
   - Nếu vị trí không hợp lệ, dữ liệu vẫn được lưu nhưng được đánh dấu là không hợp lệ
5. Frontend hiển thị lịch sử chấm công dựa theo userId

### Đăng ký ca làm việc

1. Người dùng có thể xem lịch đăng ký ca làm việc theo tuần
2. Người dùng có thể đăng ký nhiều ca làm việc trong cùng một ngày (sáng, trưa, chiều, tối, off)
3. Field `off` được quản lý độc lập với các ca khác
4. Khi người dùng đăng ký hoặc hủy đăng ký ca làm việc, hệ thống sẽ cập nhật trạng thái ca làm việc
5. Người dùng có thể xóa toàn bộ lịch làm việc của chính họ cho một ngày cụ thể
6. Quản trị viên có thể xem đăng ký ca làm việc của tất cả người dùng
7. Quản trị viên có thể xóa toàn bộ lịch làm việc của một user trong một ngày cụ thể

### Lịch Live

1. Quản trị viên có thể cập nhật lịch Live cho từng ngày trong tuần
2. Mỗi ngày có thể có nhiều ca Live: sáng, trưa, chiều, tối hoặc off
3. Field `off` được quản lý độc lập với các ca khác
4. Người dùng có thể tự do chọn ca "off" mà không bị ảnh hưởng bởi các ca khác
5. Field `off` không còn được tự động tính toán dựa trên các ca khác
6. Quản trị viên có thể xóa toàn bộ lịch Live của một ngày cụ thể
7. Người dùng có thể xem lịch Live của toàn bộ tuần

## Khởi tạo dữ liệu văn phòng

Chạy script để khởi tạo dữ liệu văn phòng từ file config:
```
npm run seed
```

## Running Locally

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://giorlin:Exactly258@worktime.8tlbcbr.mongodb.net/worktime?retryWrites=true&w=majority&appName=WorkTime
   JWT_SECRET=worktimeSecretKey123
   NODE_ENV=development
   ```
4. Khởi tạo dữ liệu văn phòng: `npm run seed`
5. Run the server: `npm run dev`

## Deployment

Các bước triển khai lên Render:

1. Tạo tài khoản trên [Render.com](https://render.com)
2. Đưa code lên GitHub repository
3. Trong Render Dashboard, chọn "New" và "Web Service"
4. Kết nối với GitHub repository
5. Cấu hình các thông số:
   - Name: `worktime-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
   - Add Environment Variables:
     - `PORT`: 5000
     - `NODE_ENV`: production
     - `MONGODB_URI`: mongodb+srv://giorlin:Exactly258@worktime.8tlbcbr.mongodb.net/worktime?retryWrites=true&w=majority&appName=WorkTime
     - `JWT_SECRET`: (tạo chuỗi ngẫu nhiên)
6. Nhấn "Create Web Service"
7. Sau khi deploy thành công, chạy script khởi tạo: `npm run seed`

## Mô hình dữ liệu

### Attendance
- `user`: ObjectId (tham chiếu đến User)
- `checkInTime`: Date
- `checkOutTime`: Date
- `checkInLocation`: GeoJSON Point
- `checkOutLocation`: GeoJSON Point
- `status`: String (checked-in, checked-out)
- `isValid`: Boolean
- `officeId`: String
- `workDuration`: Number (phút)
- `notes`: String

### Office
- `officeId`: String
- `name`: String
- `location`: GeoJSON Point
- `radius`: Number (mét)
- `address`: String
- `isActive`: Boolean

### User
- `username`: String
- `name`: String
- `email`: String
- `password`: String (hashed)
- `role`: String (admin, staff, viewer)

### Shift
- `userId`: ObjectId (tham chiếu đến User)
- `weekStartDate`: Date
- `day`: Number (1-7)
- `morning`: Boolean
- `noon`: Boolean
- `afternoon`: Boolean
- `evening`: Boolean
- `off`: Boolean

### Live
- `weekStartDate`: Date
- `day`: Number (1-7)
- `morning`: Boolean
- `noon`: Boolean
- `afternoon`: Boolean
- `evening`: Boolean