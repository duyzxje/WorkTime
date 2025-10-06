# API Quản Lý Lương Chi Tiết Cho Admin

## Tổng Quan

Hệ thống đã được mở rộng để hỗ trợ admin quản lý lương chi tiết với các tính năng:

1. **Xem bảng chi tiết lương theo tháng** - Hiển thị đầy đủ thông tin lương, thưởng, trừ
2. **Điều chỉnh lương theo ngày** - Chỉnh sửa mức lương của từng ngày cụ thể
3. **Quản lý tiền thưởng** - Thêm/sửa tiền thưởng và lý do
4. **Quản lý tiền trừ** - Thêm/sửa tiền trừ và lý do
5. **Tự động tính lại lương** - Hệ thống tự động cập nhật tổng lương khi có thay đổi

## Cấu Trúc Dữ Liệu Mới

### Salary Model đã được mở rộng:

```javascript
{
  // Các trường cũ...
  dailyRecords: [{
    date: Date,
    workHours: Number,
    dailySalary: Number,
    adjustedSalary: Number,        // MỚI: Lương đã điều chỉnh
    salaryAdjustmentReason: String, // MỚI: Lý do điều chỉnh
    checkInTime: Date,
    checkOutTime: Date,
    isValid: Boolean,
    notes: String
  }],
  bonus: Number,                   // MỚI: Tiền thưởng
  bonusReason: String,            // MỚI: Lý do thưởng
  deduction: Number,              // MỚI: Tiền trừ
  deductionReason: String,        // MỚI: Lý do trừ
  finalSalary: Number             // MỚI: Tổng lương cuối cùng
}
```

## API Endpoints Mới

### 1. Xem Bảng Chi Tiết Lương Theo Tháng

**GET** `/api/salary/detailed/:userId/:month/:year`

**Mô tả:** Lấy thông tin chi tiết lương của một nhân viên trong tháng cụ thể

**Parameters:**
- `userId`: ID của nhân viên
- `month`: Tháng (1-12)
- `year`: Năm

**Response:**
```json
{
  "success": true,
  "data": {
    "salary": {
      "id": "salary_id",
      "userId": "user_id",
      "userName": "Tên nhân viên",
      "userEmail": "email@example.com",
      "hourlyRate": 50000,
      "month": 12,
      "year": 2024,
      "totalHours": 160,
      "totalSalary": 8000000,
      "bonus": 500000,
      "bonusReason": "Thưởng cuối năm",
      "deduction": 200000,
      "deductionReason": "Trừ lương nghỉ phép",
      "finalSalary": 8300000,
      "dailyRecords": [
        {
          "date": "2024-12-01T00:00:00.000Z",
          "workHours": 8,
          "dailySalary": 400000,
          "adjustedSalary": 450000,
          "salaryAdjustmentReason": "Tăng ca",
          "checkInTime": "2024-12-01T08:00:00.000Z",
          "checkOutTime": "2024-12-01T17:00:00.000Z",
          "isValid": true,
          "notes": ""
        }
      ]
    }
  }
}
```

### 2. Điều Chỉnh Lương Theo Ngày

**PUT** `/api/salary/daily/:salaryId`

**Mô tả:** Cập nhật mức lương của một ngày cụ thể và tự động tính lại tổng lương

**Parameters:**
- `salaryId`: ID của bản ghi lương

**Body:**
```json
{
  "date": "2024-12-01",
  "adjustedSalary": 450000,
  "salaryAdjustmentReason": "Tăng ca cuối tuần"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Daily salary updated successfully",
  "data": {
    "salary": { /* Thông tin lương đã cập nhật */ },
    "updatedDailyRecord": { /* Bản ghi ngày đã cập nhật */ }
  }
}
```

### 3. Cập Nhật Tiền Thưởng

**PUT** `/api/salary/bonus/:salaryId`

**Mô tả:** Thêm hoặc cập nhật tiền thưởng cho nhân viên

**Parameters:**
- `salaryId`: ID của bản ghi lương

**Body:**
```json
{
  "bonus": 1000000,
  "bonusReason": "Thưởng hiệu suất xuất sắc"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bonus updated successfully",
  "data": {
    "salary": { /* Thông tin lương đã cập nhật */ }
  }
}
```

### 4. Cập Nhật Tiền Trừ

**PUT** `/api/salary/deduction/:salaryId`

**Mô tả:** Thêm hoặc cập nhật tiền trừ cho nhân viên

**Parameters:**
- `salaryId`: ID của bản ghi lương

**Body:**
```json
{
  "deduction": 300000,
  "deductionReason": "Trừ lương đi muộn"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deduction updated successfully",
  "data": {
    "salary": { /* Thông tin lương đã cập nhật */ }
  }
}
```

### 5. Xem Tổng Quan Lương Theo Tháng (Admin)

**GET** `/api/salary/detailed-monthly/:month/:year`

**Mô tả:** Lấy thông tin lương của tất cả nhân viên trong tháng để admin quản lý

**Parameters:**
- `month`: Tháng (1-12)
- `year`: Năm

**Response:**
```json
{
  "success": true,
  "data": {
    "month": 12,
    "year": 2024,
    "salaries": [
      {
        "id": "salary_id",
        "userId": "user_id",
        "userName": "Tên nhân viên",
        "userEmail": "email@example.com",
        "hourlyRate": 50000,
        "totalHours": 160,
        "totalSalary": 8000000,
        "bonus": 500000,
        "bonusReason": "Thưởng cuối năm",
        "deduction": 200000,
        "deductionReason": "Trừ lương nghỉ phép",
        "finalSalary": 8300000,
        "dailyRecordsCount": 20
      }
    ],
    "summary": {
      "totalEmployees": 10,
      "totalHours": 1600,
      "totalSalary": 80000000,
      "totalBonus": 5000000,
      "totalDeduction": 2000000,
      "totalFinalSalary": 83000000
    }
  }
}
```

## Logic Tính Lương

### Công Thức Tính Lương Cuối Cùng:
```
finalSalary = totalSalary + bonus - deduction
```

### Trong đó:
- `totalSalary`: Tổng lương cơ bản (từ giờ làm việc)
- `bonus`: Tiền thưởng
- `deduction`: Tiền trừ

### Khi Điều Chỉnh Lương Theo Ngày:
- Nếu có `adjustedSalary` > 0: Sử dụng `adjustedSalary`
- Nếu không: Sử dụng `dailySalary` gốc
- Tự động tính lại `totalSalary` và `finalSalary`

## Cách Sử Dụng

### 1. Xem Chi Tiết Lương Nhân Viên
```javascript
// Lấy thông tin chi tiết lương tháng 12/2024 của nhân viên
GET /api/salary/detailed/60f7b3b3b3b3b3b3b3b3b3b3/12/2024
```

### 2. Điều Chỉnh Lương Ngày 1/12
```javascript
PUT /api/salary/daily/60f7b3b3b3b3b3b3b3b3b3b3
{
  "date": "2024-12-01",
  "adjustedSalary": 500000,
  "salaryAdjustmentReason": "Tăng ca đặc biệt"
}
```

### 3. Thêm Tiền Thưởng
```javascript
PUT /api/salary/bonus/60f7b3b3b3b3b3b3b3b3b3b3
{
  "bonus": 1000000,
  "bonusReason": "Thưởng hiệu suất"
}
```

### 4. Thêm Tiền Trừ
```javascript
PUT /api/salary/deduction/60f7b3b3b3b3b3b3b3b3b3b3
{
  "deduction": 200000,
  "deductionReason": "Trừ lương nghỉ không phép"
}
```

### 5. Xem Tổng Quan Tháng
```javascript
GET /api/salary/detailed-monthly/12/2024
```

## Lưu Ý Quan Trọng

1. **Bảo Mật:** Tất cả API đều yêu cầu quyền admin
2. **Validation:** Hệ thống kiểm tra dữ liệu đầu vào
3. **Tự Động Tính Lại:** Mọi thay đổi đều tự động cập nhật `finalSalary`
4. **Lịch Sử:** Các thay đổi được lưu lại trong database
5. **Tương Thích:** Các API cũ vẫn hoạt động bình thường

## Frontend Integration

Frontend có thể sử dụng các API này để:

1. **Hiển thị bảng lương chi tiết** với khả năng chỉnh sửa inline
2. **Form thêm/sửa thưởng/trừ** với validation
3. **Dashboard tổng quan** cho admin
4. **Export dữ liệu** với thông tin đầy đủ

## Migration

Các bản ghi lương cũ sẽ tự động được cập nhật với các trường mới có giá trị mặc định:
- `bonus`: 0
- `bonusReason`: ""
- `deduction`: 0  
- `deductionReason`: ""
- `finalSalary`: `totalSalary`
