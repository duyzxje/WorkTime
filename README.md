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
- **Giới hạn thời gian đăng ký ca**: Cho phép nhân viên đăng ký ca trong khung thời gian cấu hình (mặc định: Thứ 6–Thứ 7), admin có thể bật/tắt và điều chỉnh

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

### Admin Attendance Management

- `GET /api/attendance/admin/monthly-summary` - Get monthly attendance summary for all employees (admin only)
  - Required query params: `month` (1-12), `year`
  - Returns: Summary with employee names, emails, attendance counts, and daily records
  - Response format:
    ```json
    {
      "success": true,
      "data": {
        "month": 12,
        "year": 2024,
        "summary": [
          {
            "userId": "user_id",
            "name": "Employee Name",
            "email": "employee@example.com",
            "username": "username",
            "attendanceCount": 22,
            "dailyRecords": [
              {
                "date": "2024-12-01",
                "dayOfWeek": 0,
                "records": [
                  {
                    "id": "attendance_id",
                    "checkInTime": "2024-12-01T08:00:00.000Z",
                    "checkInTimeFormatted": "08:00",
                    "checkOutTime": "2024-12-01T17:00:00.000Z",
                    "checkOutTimeFormatted": "17:00",
                    "status": "checked-out",
                    "workDuration": 540,
                    "workTimeFormatted": "9h0m",
                    "officeId": "main",
                    "notes": "Working day",
                    "isValid": true
                  }
                ]
              }
            ]
          }
        ]
      }
    }
    ```
  
- `PUT /api/attendance/admin/:attendanceId` - Cập nhật bản ghi chấm công (admin only)
  - Body hỗ trợ 2 cách nhập thời gian:
    - Dạng ISO: `{ checkInTime, checkOutTime }` (chuỗi ISO `YYYY-MM-DDTHH:mm:ss.sssZ`)
    - Tách ngày/giờ: `{ checkInDate, checkInTimePart, checkOutDate, checkOutTimePart }`
      - `checkInDate`, `checkOutDate`: `YYYY-MM-DD`
      - `checkInTimePart`, `checkOutTimePart`: `HH:mm`
  - Các trường khác (tùy chọn): `{ notes, officeId }`
  - Hành vi:
    - Tự động tính lại `workDuration` (phút) khi có đủ `checkIn` và `checkOut`
    - Xác thực: `checkOut` phải sau `checkIn` (nếu không sẽ trả về 400)
    - Nếu chỉ có `checkIn` (không có `checkOut`), trạng thái đặt về `checked-in` và `workDuration = 0`
    - Khi bản ghi ở trạng thái `checked-out`, hệ thống sẽ tự kích hoạt tính lương lại cho ca đó
  - Ví dụ:
    ```bash
    # Dùng ISO datetime
    curl -X PUT http://localhost:5000/api/attendance/admin/ATTENDANCE_ID \
      -H "Content-Type: application/json" -H "Authorization: Bearer ADMIN_TOKEN" \
      -d '{"checkInTime":"2025-09-01T08:30:00.000Z","checkOutTime":"2025-09-01T17:45:00.000Z"}'

    # Dùng cặp ngày + giờ
    curl -X PUT http://localhost:5000/api/attendance/admin/ATTENDANCE_ID \
      -H "Content-Type: application/json" -H "Authorization: Bearer ADMIN_TOKEN" \
      -d '{"checkInDate":"2025-09-01","checkInTimePart":"08:30","checkOutDate":"2025-09-01","checkOutTimePart":"17:45"}'
    ```
  
- `DELETE /api/attendance/admin/:attendanceId` - Delete attendance record (admin only)
  - Permanently removes the attendance record

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

### Orders

- `GET /api/orders` - List orders with pagination and search
  - Required query params: `start`, `end` (ISO datetime)
  - Optional query params: `page`, `limit`, `search`, `status`
  - Returns: `{ data: [...], statusCounts: [...], page, limit, total }`

- `GET /api/orders/:orderId` - Get order detail
  - Returns: `{ order: {...}, items: [...] }`

- `GET /api/orders/:orderId/items` - Get order items
  - Returns: `{ data: [...] }`

- `PATCH /api/orders/:orderId/status` - Update order status
  - Body: `{ status: "chua_rep" | "giu_don" | "di_don" | "gap" | "hoan_thanh" | "warning" }`
  - Returns: `{ success: true, orderId, status }`

- `POST /api/orders/from-comments` - Lookup order by username and live_date
  - Body: `{ username, liveDate }`
  - Returns: `{ success: true, order_id, total, items }`

- `POST /api/orders/create-from-printed` - **Create/update orders from printed_history**
  - Body: `{ startTime: "2023-10-21T09:00:00.000Z", endTime: "2023-10-25T23:00:00.000Z" }`
  - Success Response (200):
    ```json
    {
      "success": true,
      "data": {
        "created": [
          {
            "orderId": 1436,
            "username": "user123",
            "itemsAdded": 5,
            "total": 500000,
            "liveDate": "2023-10-21"
          }
        ],
        "updated": [
          {
            "orderId": 1435,
            "username": "kiwiditinana",
            "itemsAdded": 3,
            "oldTotal": 200000,
            "newTotal": 350000
          }
        ],
        "summary": {
          "totalOrders": 2,
          "totalItems": 8,
          "totalAmount": 850000
        }
      }
    }
    ```
  - Error Response (400) - Split printed conflict:
    ```json
    {
      "success": false,
      "message": "Khoảng thời gian chọn sẽ chia cắt printed của đơn hàng #1435 (username: kiwiditinana). Vui lòng chọn khoảng thời gian phù hợp.",
      "conflictOrder": {
        "orderId": 1435,
        "username": "kiwiditinana",
        "usernameConflict": true
      }
    }
    ```
  - **Logic**:
    - Parse giá từ `comment_text` trong `printed_history` (ví dụ: "200" → 200000đ, "t150" → 150000đ)
    - Nhóm printed theo `username`
    - Nếu 1 đơn hàng có TẤT CẢ printed nằm trong khoảng thời gian → cập nhật (thêm printed mới vào)
    - Nếu không → tạo đơn hàng mới
    - `live_date` = ngày của printed đầu tiên (YYYY-MM-DD, không có giờ)
    - `status` mặc định = "chua_rep"
    - Ngăn chặn chia cắt printed: nếu khoảng thời gian chỉ chứa 1 nửa printed → trả lỗi 400

- `POST /api/orders/preview-from-printed` - **Preview đơn hàng có thể tạo từ printed_history (chỉ trả về dữ liệu, không ghi DB)**
  - Body: `{ startTime: "2023-10-21T09:00:00.000Z", endTime: "2023-10-25T23:00:00.000Z" }`
  - Success response:
    ```json
    {
      "success": true,
      "data": {
        "orders": [
          {
            "username": "user123",
            "liveDate": "2023-10-21",
            "items": [
              { "content": "xanh 100", "unit_price": 100000, "quantity": 1, "line_total": 100000 },
              { "content": "t150",     "unit_price": 150000, "quantity": 1, "line_total": 150000 }
            ],
            "total": 250000
          }
        ],
        "summary": {
          "totalOrders": 1,
          "totalItems": 2,
          "totalAmount": 250000
        }
      }
    }
    ```
  - Error response (400):
    ```json
    {
      "success": false,
      "message": "Khoảng thời gian chọn sẽ chia cắt printed của đơn hàng #1435 (username: kiwiditinana). Vui lòng chọn khoảng thời gian phù hợp.",
      "conflictOrder": { "orderId": 1435, "username": "kiwiditinana", "usernameConflict": true }
    }
    ```
  - Logic:
    - Nhóm printed chưa gán đơn theo username
    - Tính toán preview đơn và tổng doanh thu, số đơn, số sản phẩm theo khoảng chọn
    - Kiểm tra split printed

- `DELETE /api/orders/:orderId` - Delete order
  - Returns: `{ success: true }`

- `POST /api/orders/bulk-delete` - Bulk delete orders
  - Body: `{ ids: [orderId1, orderId2, ...] }`
  - Returns: `[{ orderId, success }, ...]`

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

### Settings (Quản trị cấu hình)

- `GET /api/settings` (admin only) - Lấy cấu hình hệ thống hiện tại
  - Trả về:
    ```json
    {
      "success": true,
      "data": {
        "shiftRegistration": {
          "enabled": true,
          "windowStartOffsetDays": -3,
          "windowEndOffsetDays": -2,
          "startTime": { "hour": 0, "minute": 0 },
          "endTime": { "hour": 23, "minute": 59 }
        }
      }
    }
    ```

- `PUT /api/settings/shift-registration` (admin only) - Cập nhật bật/tắt và khung thời gian đăng ký ca
  - Body (tùy chọn từng trường):
    ```json
    {
      "enabled": true,
      "windowStartOffsetDays": -3,
      "windowEndOffsetDays": -2,
      "startTime": { "hour": 0, "minute": 0 },
      "endTime": { "hour": 23, "minute": 59 }
    }
    ```
  - Ý nghĩa:
    - **enabled**: Bật/tắt giới hạn thời gian đăng ký (admin luôn không bị giới hạn)
    - **windowStartOffsetDays / windowEndOffsetDays**: Số ngày lệch so với `weekStartDate` (thứ Hai của tuần đăng ký). Mặc định `-3 → Thứ 6` và `-2 → Thứ 7` trước tuần đó.
    - **startTime / endTime**: Giờ-phút bắt đầu/kết thúc trong ngày tương ứng

- `GET /api/settings/public/shift-registration` (public) - Dành cho FE đọc cấu hình hiển thị
  - Trả về:
    ```json
    {
      "success": true,
      "data": {
        "enabled": true,
        "windowStartOffsetDays": -3,
        "windowEndOffsetDays": -2,
        "startTime": { "hour": 0, "minute": 0 },
        "endTime": { "hour": 23, "minute": 59 },
        "nextWeekStartDate": "2025-01-13",
        "windowStartAt": "2025-01-10T00:00:00.000Z",
        "windowEndAt": "2025-01-11T23:59:59.999Z"
      }
    }
    ```
  - Ghi chú: `nextWeekStartDate` là Thứ Hai tuần kế tiếp; FE có thể dùng để set `weekStartDate` khi gọi API đăng ký.

## Giới hạn thời gian đăng ký ca (mặc định Thứ 6–Thứ 7)

- Khi nhân viên (không phải admin) đăng ký ca qua `POST /api/shifts/toggle`, hệ thống sẽ kiểm tra thời điểm hiện tại có nằm trong khung thời gian cho phép không.
- Mặc định, khung thời gian cho phép là từ 00:00 Thứ 6 đến 23:59 Thứ 7 và chỉ áp dụng để đăng ký cho đúng tuần kế tiếp (tuần sau). Hệ thống tự tính "tuần sau" là Thứ Hai kế tiếp so với ngày hiện tại; nếu `weekStartDate` khác tuần sau thì sẽ bị chặn với thông báo: "Chỉ được đăng ký cho tuần sau trong khung thời gian cho phép." Ngoài khoảng thời gian này, nhân viên sẽ nhận `403` với thông báo: "Đã hết thời gian đăng ký ca làm việc."
- Admin không bị giới hạn và có thể bật/tắt hoặc điều chỉnh khung thời gian trong phần Settings.

### Ví dụ cấu hình khung thời gian đăng ký (Admin)

Request:
```
PUT /api/settings/shift-registration
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "enabled": true,
  "windowStartOffsetDays": -3,
  "windowEndOffsetDays": -2,
  "startTime": { "hour": 0, "minute": 0 },
  "endTime": { "hour": 23, "minute": 59 }
}
```

Gợi ý cấu hình khác:
- Chỉ cho đăng ký vào Chủ nhật trước tuần: `windowStartOffsetDays = -1`, `windowEndOffsetDays = -1`, `startTime = {8:00}`, `endTime = {20:00}`
- Mở cả Thứ 5–Chủ nhật trước tuần: `windowStartOffsetDays = -4`, `windowEndOffsetDays = -1`

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
  - Each user includes: id, username, name, email, role, hourlyRate

- `GET /api/users/count` - Get total employees count (admin only)
  - Returns: `{ success: true, data: { totalEmployees: number } }`
  - **Note**: Excludes users with admin role

- `GET /api/users/currently-working` - Get currently working employees (admin only)
  - Returns employees who have checked in but not checked out
  - Returns: `{ success: true, data: { currentlyWorking: array, count: number } }`
  - Each employee includes: userId, name, username, email, role, hourlyRate, checkInTime, checkInTimeFormatted, checkInDateFormatted, officeId, notes
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
  - Returns: `{ success: true, data: { id, username, name, email, role, hourlyRate } }`

- `GET /api/users/:userId` - Get user by ID (admin only)
  - Returns: `{ success: true, data: { id, username, name, email, role, hourlyRate, createdAt, updatedAt } }`

### Salary Management

- `POST /api/salary/calculate` - Calculate salary for a user in a specific month
  - Required body: `{ userId, month, year }`
  - Returns: Detailed salary calculation with daily records and totals
  - **Sử dụng lương mặc định** từ User.hourlyRate để tính lương
  - **Frontend Usage**: Gọi API này khi user bấm nút "Tính lương" trong giao diện

- `GET /api/salary/user/:userId` - Get salary history for a user
  - Optional query: `year` to filter by specific year
  - Returns: Complete salary history for the user

- `GET /api/salary/monthly` - Get all salaries for a specific month
  - Required query: `month`, `year`
  - Returns: All employee salaries for the month with summary totals

- `GET /api/salary/export/:userId/:month/:year` - Export salary report to Excel
  - Downloads Excel file with 2 sheets:
    - "Lịch sử chấm công": Daily attendance records
    - "Tổng kết": Summary with totals and averages

- `PUT /api/salary/rate/:userId` - Update user hourly rate
  - Required body: `{ hourlyRate }`
  - Updates the hourly rate for salary calculations

- `GET /api/salary/users` - Get users available for salary calculation
  - Returns: List of all non-admin users with their hourly rates
  - **Frontend Usage**: Sử dụng để hiển thị dropdown chọn nhân viên khi tính lương

- `POST /api/salary/recalculate-month` - Recalculate all salaries for a specific month
  - Required body: `{ month, year }`
  - **Frontend Usage**: Sử dụng để tính lại lương cho tất cả nhân viên trong tháng

- `PUT /api/salary/update-month` - Update salary for a specific month with new hourly rate
  - Required body: `{ userId, month, year, hourlyRate }`
  - **Chỉ cập nhật lương cho tháng đó**, không thay đổi lương mặc định của User
  - **Frontend Usage**: Sử dụng để cập nhật lương cho tháng cụ thể đã tính lương

### Authentication

- `POST /api/auth/login` - Authenticate user & get token
  - Required body: `{ username, password }`
  - Returns: `{ success: true, data: { token: string, user: { id, username, name, email, role } } }`

- `GET /api/auth/verify` - Verify token and get user data

### Customers

- `GET /api/customers` - List customers with pagination and search
  - Query params (optional):
    - `page`: number (default: 1)
    - `limit`: number (default: 20)
    - `search`: string - matches `username`, `name`, `phone`, `address`
    - `marked`: `true|1` to return only customers with `marked_at` not null
  - Response:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 123,
          "username": "user123",
          "name": "Khách A",
          "phone": "0909...",
          "address": "Hà Nội",
          "notes": "ghi chú",
          "marked_at": "2025-10-01T00:00:00.000Z",
          "created_at": "2025-09-30T10:00:00.000Z",
          "updated_at": "2025-10-01T00:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
    ```

- `GET /api/customers/:id` - Get customer by id
  - Response:
    ```json
    { "success": true, "data": { "id": 123, "username": "user123", "name": "Khách A", "phone": "", "address": "", "notes": "", "marked_at": null, "created_at": "...", "updated_at": "..." } }
    ```

- `GET /api/customers/by-username/:username` - Get by username
  - Response when found:
    ```json
    { "success": true, "data": { "id": 123, "username": "user123", "name": "Khách A" } }
    ```
  - Response when not found:
    ```json
    { "success": false, "data": null }
    ```

- `POST /api/customers` - Create or update by username (upsert)
  - Body:
    ```json
    { "username": "user123", "name": "Khách A", "phone": "0909...", "address": "Hà Nội", "notes": "ghi chú" }
    ```
  - Responses:
    - Created (username chưa tồn tại):
      ```json
      { "success": true, "data": { /* customer */ }, "upserted": false, "action": "created" }
      ```
    - Updated (username đã tồn tại):
      ```json
      { "success": true, "data": { /* customer */ }, "upserted": true, "action": "updated" }
      ```

- `PUT /api/customers/:id` - Update customer
  - Body: bất kỳ trường trong số `name, phone, address, notes, username`
  - Response:
    ```json
    { "success": true, "data": { /* customer */ } }
    ```

- `PATCH /api/customers/:id/mark` - Mark/Unmark customer
  - Body:
    ```json
    { "marked": true }
    ```
  - Response:
    ```json
    { "success": true, "id": 123, "marked_at": "2025-10-01T00:00:00.000Z" }
    ```

- `DELETE /api/customers/:id` - Delete customer
  - Response:
    ```json
    { "success": true }
    ```

#### Customers - cURL examples
```
# List
curl 'http://localhost:5000/api/customers?page=1&limit=20&search=anh&marked=true'

# Create / upsert by username
curl -X POST 'http://localhost:5000/api/customers' \
  -H 'Content-Type: application/json' \
  -d '{"username":"user123","name":"Khách A","phone":"0909...","address":"HN"}'

# Update
curl -X PUT 'http://localhost:5000/api/customers/123' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Khách A+"}'

# Mark
curl -X PATCH 'http://localhost:5000/api/customers/123/mark' \
  -H 'Content-Type: application/json' -d '{"marked": true}'

# Delete
curl -X DELETE 'http://localhost:5000/api/customers/123'
```

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
   - Bao gồm thông tin lương mặc định (hourlyRate)
   - Chỉ admin mới có quyền truy cập

5. **Xem thông tin chi tiết người dùng** (`GET /api/users/:userId`)
   - Hiển thị thông tin chi tiết của một user cụ thể
   - Bao gồm lương mặc định và thời gian tạo/cập nhật
   - Chỉ admin mới có quyền truy cập

### Quản lý chấm công (Admin)

Hệ thống cung cấp chức năng quản lý chấm công toàn diện cho quản trị viên:

1. **Tổng quan chấm công theo tháng** (`GET /api/attendance/admin/monthly-summary`)
   - Hiển thị tất cả nhân viên (không bao gồm admin)
   - Thông tin: tên, email, username, số ngày chấm công và tỷ lệ trong tháng
   - Chi tiết chấm công theo từng ngày trong tháng
   - Mỗi ngày hiển thị: giờ check-in/check-out, thời gian làm việc, văn phòng, ghi chú

2. **Chỉnh sửa bản ghi chấm công** (`PUT /api/attendance/admin/:attendanceId`)
   - Có thể cập nhật: giờ check-in, giờ check-out, ghi chú, văn phòng
   - Tự động tính lại thời gian làm việc khi cập nhật giờ check-out
   - Cập nhật trạng thái thành "checked-out" nếu có giờ check-out

3. **Xóa bản ghi chấm công** (`DELETE /api/attendance/admin/:attendanceId`)
   - Xóa vĩnh viễn bản ghi chấm công
   - Trả về thông tin bản ghi đã xóa

4. **Tính năng bổ sung**
   - Thời gian được định dạng theo múi giờ Việt Nam
   - Hiển thị thời gian làm việc theo format giờ:phút
   - Sắp xếp theo thứ tự thời gian

### Hệ thống tính lương

Hệ thống cung cấp tính năng tính lương toàn diện dựa trên dữ liệu chấm công:

1. **Cấu hình mức lương**
   - Mỗi nhân viên có mức lương theo giờ có thể tùy chỉnh (mặc định: 27,000đ/h)
   - Admin có thể cập nhật mức lương cho từng nhân viên

2. **Tính lương theo tháng**
   - Tự động tính lương dựa trên dữ liệu chấm công đã hoàn thành (checked-out)
   - Tính tổng số giờ làm việc và tổng lương cho từng ngày
   - Lưu trữ lịch sử tính lương để tra cứu

3. **Báo cáo Excel**
   - Xuất báo cáo lương chi tiết với 2 sheet:
     - **Lịch sử chấm công**: Chi tiết từng ngày (ngày, giờ vào/ra, số giờ, lương ngày)
     - **Tổng kết**: Thông tin tổng hợp (tên, mức lương/giờ, tổng giờ, tổng lương)

4. **API quản lý lương**
   - Tính lương cho nhân viên theo tháng
   - Xem lịch sử lương của nhân viên
   - Xem tổng hợp lương theo tháng
   - Cập nhật mức lương theo giờ

5. **Tính lương tự động**
   - **Tự động tính lương khi checkout**: Khi nhân viên checkout, hệ thống tự động tính và lưu lương vào database
   - **Mức lương cố định**: Mỗi user có mức lương cố định lưu trong User model
   - **Không tự động thay đổi lương cũ**: Khi thay đổi mức lương chung, các tháng đã tính lương không tự động thay đổi
   - **Cập nhật tháng cụ thể**: Admin có thể cập nhật lương cho tháng cụ thể thông qua API
   - **Lưu trữ theo tháng**: Mỗi tháng có record lương riêng với mức lương áp dụng cho tháng đó

6. **Hai trường hợp tính lương**
   - **Tính lương mới**: Sử dụng lương mặc định từ User.hourlyRate
   - **Cập nhật lương tháng đã tính**: Chỉ thay đổi lương cho tháng đó, không ảnh hưởng lương mặc định của User

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