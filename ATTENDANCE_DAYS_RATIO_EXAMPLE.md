# Ví dụ Response mới - Số ngày chấm công và tỷ lệ

## 📊 **API Response mới**

### **Endpoint:** `GET /api/attendance/admin/monthly-summary?month=8&year=2024`

### **Response mới:**
```json
{
  "success": true,
  "data": {
    "month": 8,
    "year": 2024,
    "summary": [
      {
        "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Nguyễn Văn A",
        "email": "nguyenvana@example.com",
        "username": "nguyenvana",
        "attendanceDays": "20/31",
        "attendanceRatio": "65%",
        "dailyRecords": [
          {
            "date": "2024-08-01T00:00:00.000Z",
            "dayOfWeek": 4,
            "records": [
              {
                "id": "attendanceId",
                "checkInTime": "2024-08-01T08:30:00.000Z",
                "checkInTimeFormatted": "08:30",
                "checkOutTime": "2024-08-01T17:00:00.000Z",
                "checkOutTimeFormatted": "17:00",
                "status": "checked-out",
                "workDuration": 510,
                "workTimeFormatted": "8h30m",
                "officeId": "office1",
                "notes": "",
                "isValid": true
              }
            ]
          }
        ]
      },
      {
        "userId": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "Trần Thị B",
        "email": "tranthib@example.com",
        "username": "tranthib",
        "attendanceDays": "15/31",
        "attendanceRatio": "48%",
        "dailyRecords": [...]
      }
    ]
  }
}
```

## 🔄 **So sánh trước và sau**

### **Trước (Số lần chấm công):**
```json
{
  "attendanceCount": 25  // Số lần check-in/check-out
}
```

### **Sau (Số ngày chấm công và tỷ lệ):**
```json
{
  "attendanceDays": "20/31",    // Số ngày có chấm công / Tổng số ngày trong tháng
  "attendanceRatio": "65%"      // Tỷ lệ phần trăm
}
```

## 📈 **Cách tính toán**

### **Số ngày chấm công:**
```javascript
// Lấy tất cả attendance records trong tháng
const dailyAttendance = await Attendance.find({
    user: user._id,
    checkInTime: { $gte: startOfMonth, $lte: endOfMonth }
});

// Đếm số ngày duy nhất có chấm công
const uniqueDays = new Set();
dailyAttendance.forEach(record => {
    const date = new Date(record.checkInTime).toDateString();
    uniqueDays.add(date);
});
const attendanceDays = uniqueDays.size; // Số ngày có chấm công
```

### **Tỷ lệ chấm công:**
```javascript
const daysInMonth = new Date(year, month, 0).getDate(); // Tổng số ngày trong tháng
const attendanceRatio = Math.round((attendanceDays / daysInMonth) * 100); // Tỷ lệ %
```

## 🎨 **Frontend Display**

### **Hiển thị trong bảng:**
```html
<table>
  <thead>
    <tr>
      <th>Tên</th>
      <th>Email</th>
      <th>Số ngày chấm công</th>
      <th>Tỷ lệ</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="employee in summary" :key="employee.userId">
      <td>{{ employee.name }}</td>
      <td>{{ employee.email }}</td>
      <td>{{ employee.attendanceDays }}</td>
      <td>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: employee.attendanceRatio }">
            {{ employee.attendanceRatio }}
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### **CSS cho progress bar:**
```css
.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
}
```

## 📊 **Ví dụ thực tế**

### **Tháng 8/2024 (31 ngày):**
- **Nguyễn Văn A**: 20 ngày chấm công → `20/31` (65%)
- **Trần Thị B**: 15 ngày chấm công → `15/31` (48%)
- **Lê Hoàng C**: 25 ngày chấm công → `25/31` (81%)

### **Tháng 2/2024 (29 ngày):**
- **Nguyễn Văn A**: 18 ngày chấm công → `18/29` (62%)
- **Trần Thị B**: 14 ngày chấm công → `14/29` (48%)

## ✅ **Lợi ích**

1. **Rõ ràng hơn**: Hiển thị số ngày thực tế có chấm công
2. **Tỷ lệ trực quan**: Dễ dàng so sánh hiệu suất giữa các nhân viên
3. **Chính xác**: Không bị ảnh hưởng bởi việc check-in/check-out nhiều lần trong ngày
4. **Thân thiện**: Format dễ hiểu cho người dùng cuối

## 🚀 **Cách sử dụng**

### **JavaScript:**
```javascript
// Lấy dữ liệu
const response = await fetch('/api/attendance/admin/monthly-summary?month=8&year=2024');
const data = await response.json();

// Hiển thị
data.data.summary.forEach(employee => {
  console.log(`${employee.name}: ${employee.attendanceDays} (${employee.attendanceRatio})`);
});
```

### **Vue.js:**
```javascript
computed: {
  attendanceStats() {
    return this.employees.map(emp => ({
      name: emp.name,
      days: emp.attendanceDays,
      ratio: emp.attendanceRatio,
      ratioNumber: parseInt(emp.attendanceRatio)
    }));
  }
}
```

Hệ thống đã được cập nhật để hiển thị số ngày chấm công và tỷ lệ thay vì số lần chấm công!
