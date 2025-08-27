# WorkTime API

Backend service for employee attendance tracking with GPS validation.

## Features

- Employee check-in/check-out with GPS validation
- View attendance history by user
- Verify location against predefined office coordinates
- Generate daily and monthly attendance reports
- Manual check-out for forgotten check-outs
- Admin features for managing office locations

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

## Cách hoạt động

1. Frontend xử lý đăng nhập trực tiếp với database
2. Sau khi đăng nhập thành công, frontend sẽ gửi thông tin check-in/check-out kèm userId và tọa độ GPS
3. Backend xác thực tọa độ GPS với các vị trí văn phòng (từ database hoặc config)
4. Backend lưu dữ liệu chấm công và trả kết quả thành công hoặc thất bại
   - Nếu vị trí không hợp lệ, dữ liệu vẫn được lưu nhưng được đánh dấu là không hợp lệ
5. Frontend hiển thị lịch sử chấm công dựa theo userId

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