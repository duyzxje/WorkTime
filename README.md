# WorkTime API

Backend service for employee attendance tracking with GPS validation.

## Features

- Employee check-in/check-out with GPS validation
- View attendance history
- Verify location against predefined office coordinates

## Tech Stack

- Node.js
- Express
- MongoDB Atlas

## API Endpoints

### Attendance

- `POST /api/attendance/checkin` - Check in with GPS coordinates
  - Required body: `{ userId, longitude, latitude }`
  - Optional body: `{ officeId, notes }`
  
- `POST /api/attendance/checkout` - Check out with GPS coordinates
  - Required body: `{ userId, longitude, latitude }`
  - Optional body: `{ notes }`
  
- `GET /api/attendance/:userId` - Get user's attendance history
  - Optional query params: `startDate, endDate`
  
- `GET /api/attendance/all` - Get all users' attendance (admin only)
  - Optional query params: `startDate, endDate, userId`

## Cách hoạt động

1. Frontend xử lý đăng nhập trực tiếp với database
2. Sau khi đăng nhập thành công, frontend sẽ gửi thông tin check-in/check-out kèm userId và tọa độ GPS
3. Backend xác thực tọa độ GPS với các vị trí văn phòng cài đặt sẵn
4. Backend lưu dữ liệu chấm công và trả kết quả thành công hoặc thất bại
5. Frontend hiển thị lịch sử chấm công dựa theo userId

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
4. Run the server: `npm run dev`

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
   - Add Environment Variables:
     - `PORT`: 5000
     - `NODE_ENV`: production
     - `MONGODB_URI`: 
     - `JWT_SECRET`: tạo chuỗi ngẫu nhiên
6. Nhấn "Create Web Service"

## GPS Validation

Backend xác thực check-in bằng cách so sánh tọa độ GPS của người dùng với vị trí văn phòng đã xác định. Người dùng phải ở trong phạm vi bán kính quy định của văn phòng để check-in thành công.
