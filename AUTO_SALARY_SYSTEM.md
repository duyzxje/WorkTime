# Hệ thống tính lương tự động

## 🎯 **Tổng quan**

Hệ thống tự động tính lương được thiết kế để:
- **Tự động tính lương** khi nhân viên checkout
- **Tự động tính lại lương** khi thay đổi mức lương
- **Lưu trữ theo tháng** để đảm bảo tính chính xác
- **Không ảnh hưởng lương cũ** khi thay đổi mức lương

## 🔄 **Cách hoạt động**

### 1. **Tự động tính lương khi checkout**

```javascript
// Khi nhân viên checkout
POST /api/attendance/checkout
{
  "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "longitude": 106.6297,
  "latitude": 10.8231
}

// Hệ thống tự động:
// 1. Lưu attendance record
// 2. Gọi handleNewCheckout(attendance)
// 3. Tính lương cho tháng hiện tại
// 4. Lưu vào Salary collection
```

### 2. **Tự động tính lại khi thay đổi mức lương**

```javascript
// Khi admin thay đổi mức lương
PUT /api/salary/rate/:userId
{
  "hourlyRate": 30000
}

// Hệ thống tự động:
// 1. Cập nhật hourlyRate trong User
// 2. Gọi handleSalaryRateChange(userId, newRate)
// 3. Tính lại lương từ tháng hiện tại
// 4. Cập nhật Salary records
```

## 📊 **Logic tính lương theo tháng**

### **Ví dụ thực tế:**

**Tháng 8/2024:**
- Nhân viên A: 27,000đ/h
- Làm việc: 20 ngày, 160 giờ
- Lương tháng 8: 4,320,000đ

**Tháng 9/2024:**
- Admin thay đổi mức lương: 30,000đ/h
- Hệ thống chỉ tính lại lương tháng 9
- Lương tháng 8 vẫn giữ nguyên: 4,320,000đ

### **Code xử lý:**

```javascript
// Trong handleSalaryRateChange
const handleSalaryRateChange = async (userId, newHourlyRate, fromMonth = null, fromYear = null) => {
    // Nếu không chỉ định tháng/năm, tính lại từ tháng hiện tại
    if (!fromMonth || !fromYear) {
        const now = new Date();
        fromMonth = now.getMonth() + 1;
        fromYear = now.getFullYear();
    }

    // Tính lại từ tháng được chỉ định đến tháng hiện tại
    for (let year = fromYear; year <= currentYear; year++) {
        const startMonth = (year === fromYear) ? fromMonth : 1;
        const endMonth = (year === currentYear) ? currentMonth : 12;

        for (let month = startMonth; month <= endMonth; month++) {
            await calculateMonthlySalary(userId, month, year, newHourlyRate);
        }
    }
};
```

## 🗄️ **Cấu trúc dữ liệu**

### **Salary Model:**
```javascript
{
  userId: ObjectId,
  hourlyRate: 27000,        // Mức lương áp dụng cho tháng này
  month: 8,                 // Tháng
  year: 2024,               // Năm
  totalHours: 160,          // Tổng giờ làm việc
  totalSalary: 4320000,     // Tổng lương
  dailyRecords: [           // Chi tiết từng ngày
    {
      date: "2024-08-15T08:30:00.000Z",
      workHours: 8.5,
      dailySalary: 229500,
      checkInTime: "2024-08-15T08:30:00.000Z",
      checkOutTime: "2024-08-15T17:00:00.000Z",
      isValid: true,
      notes: ""
    }
  ]
}
```

## 🔧 **API Endpoints**

### **1. Tính lương thủ công**
```javascript
POST /api/salary/calculate
{
  "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "month": 8,
  "year": 2024
}
```

### **2. Cập nhật mức lương (tự động tính lại)**
```javascript
PUT /api/salary/rate/:userId
{
  "hourlyRate": 30000
}
```

### **3. Tính lại tất cả lương trong tháng**
```javascript
POST /api/salary/recalculate-month
{
  "month": 8,
  "year": 2024
}
```

### **4. Xem lịch sử lương**
```javascript
GET /api/salary/user/:userId?year=2024
```

## 📈 **Workflow tự động**

### **Khi checkout:**
```
1. User checkout → POST /api/attendance/checkout
2. Lưu attendance record
3. Gọi handleNewCheckout(attendance)
4. Tính lương cho tháng hiện tại
5. Lưu/cập nhật Salary record
```

### **Khi thay đổi mức lương:**
```
1. Admin thay đổi mức lương → PUT /api/salary/rate/:userId
2. Cập nhật User.hourlyRate
3. Gọi handleSalaryRateChange(userId, newRate)
4. Tính lại lương từ tháng hiện tại
5. Cập nhật tất cả Salary records liên quan
```

## 🎛️ **Quản lý và monitoring**

### **Logs tự động:**
```javascript
console.log(`[Auto Salary] Calculating salary for user ${userId}, month ${month}/${year}`);
console.log(`[Auto Salary] New checkout detected for user ${userId}, month ${month}/${year}`);
console.log(`[Auto Salary] Hourly rate changed for user ${userId} to ${newHourlyRate}đ/h`);
console.log(`[Auto Salary] Successfully calculated salary: ${salaryRecord.totalSalary}đ for ${salaryRecord.totalHours}h`);
```

### **Error handling:**
```javascript
try {
    // Tính lương
} catch (error) {
    console.error(`[Auto Salary] Error calculating salary for user ${userId}, month ${month}/${year}:`, error);
    return null;
}
```

## ✅ **Tính năng đã hoàn thành**

- ✅ **Tự động tính lương khi checkout**
- ✅ **Tự động tính lại khi thay đổi mức lương**
- ✅ **Lưu trữ theo tháng**
- ✅ **Không ảnh hưởng lương cũ**
- ✅ **API quản lý đầy đủ**
- ✅ **Error handling và logging**
- ✅ **Tính lại tất cả nhân viên trong tháng**

## 🚀 **Cách sử dụng**

### **Frontend không cần làm gì thêm:**
- Khi user checkout → Lương tự động được tính
- Khi admin thay đổi mức lương → Lương tự động được tính lại
- Tất cả dữ liệu được lưu vào database

### **Admin có thể:**
- Xem lịch sử lương của nhân viên
- Xuất báo cáo Excel
- Tính lại lương cho cả tháng nếu cần
- Cập nhật mức lương (tự động tính lại)

## 🔍 **Kiểm tra hoạt động**

### **1. Kiểm tra auto calculation:**
```javascript
// Checkout một nhân viên
POST /api/attendance/checkout
// Kiểm tra Salary collection có record mới không

// Thay đổi mức lương
PUT /api/salary/rate/:userId
// Kiểm tra Salary records có được cập nhật không
```

### **2. Kiểm tra logs:**
```bash
# Xem logs trong console
[Auto Salary] New checkout detected for user 60f7b3b3b3b3b3b3b3b3b3b3, month 8/2024
[Auto Salary] Successfully calculated salary: 4320000đ for 160h
```

Hệ thống đã sẵn sàng hoạt động tự động!
