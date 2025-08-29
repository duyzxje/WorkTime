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
- Live event schedule management
- User management with role-based access control

## Tech Stack

- Node.js
- Express
- MongoDB Atlas
- Geospatial validation

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
    - `shiftType`: string ("morning", "noon", "afternoon", "evening")
    - `weekStartDate`: string (YYYY-MM-DD)

### Live Events

- `GET /api/live` - Get live events schedule for the week
  - Required query params: `weekStartDate` (YYYY-MM-DD)

- `POST /api/live/update` - Update live event for a day (admin only)
  - Required body: `{ day, shiftType, weekStartDate }`
  - Where:
    - `day`: number (1-7)
    - `shiftType`: string ("morning", "noon", "afternoon", "evening", "off")
    - `weekStartDate`: string (YYYY-MM-DD)

### Users

- `GET /api/users` - Get all users (admin only)

- `POST /api/users` - Create a new user (admin only)
  - Required body: `{ username, name, password, email }`
  - Optional body: `{ role }` ("admin", "staff", "viewer")

- `PUT /api/users/:userId` - Update user (admin only)
  - Optional body: `{ name, role, email, password }`

- `DELETE /api/users/:userId` - Delete user (admin only)

- `GET /api/users/profile` - Get current user profile

### Authentication

- `POST /api/auth/login` - Authenticate user & get token
  - Required body: `{ username, password }`

- `GET /api/auth/verify` - Verify token and get user data

## Cách hoạt động

### Chấm công

1. Frontend xử lý đăng nhập trực tiếp với database
2. Sau khi đăng nhập thành công, frontend sẽ gửi thông tin check-in/check-out kèm userId và tọa độ GPS
3. Backend xác thực tọa độ GPS với các vị trí văn phòng (từ database hoặc config)
4. Backend lưu dữ liệu chấm công và trả kết quả thành công hoặc thất bại
   - Nếu vị trí không hợp lệ, dữ liệu vẫn được lưu nhưng được đánh dấu là không hợp lệ
5. Frontend hiển thị lịch sử chấm công dựa theo userId

### Đăng ký ca làm việc

1. Người dùng có thể xem lịch đăng ký ca làm việc theo tuần
2. Người dùng có thể đăng ký nhiều ca làm việc trong cùng một ngày (sáng, trưa, chiều, tối)
3. Khi người dùng đăng ký hoặc hủy đăng ký ca làm việc, hệ thống sẽ cập nhật trạng thái ca làm việc
4. Quản trị viên có thể xem đăng ký ca làm việc của tất cả người dùng

### Lịch Live

1. Quản trị viên có thể cập nhật lịch Live cho từng ngày trong tuần
2. Mỗi ngày có thể có một trạng thái Live: sáng, trưa, chiều, tối hoặc off
3. Người dùng có thể xem lịch Live của toàn bộ tuần

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

### Live
- `weekStartDate`: Date
- `day`: Number (1-7)
- `shiftType`: String (morning, noon, afternoon, evening, off)