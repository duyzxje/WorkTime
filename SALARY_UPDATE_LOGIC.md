# Logic cập nhật lương mới

## 🎯 **Yêu cầu**

1. **Mỗi user có mức lương cố định** lưu trong User model
2. **Khi thay đổi mức lương chung** → chỉ áp dụng cho các checkout mới
3. **Các tháng đã tính lương** → không tự động thay đổi
4. **Chỉ khi admin cập nhật lương cho tháng cụ thể** → mới cập nhật tháng đó

## 🔄 **Logic hoạt động**

### **1. Mức lương cố định trong User**
```javascript
// User model có trường hourlyRate
{
  _id: "userId",
  name: "Nguyễn Văn A",
  hourlyRate: 27000,  // Mức lương cố định
  // ... other fields
}
```

### **2. Khi thay đổi mức lương chung**
```javascript
PUT /api/salary/rate/:userId
{
  "hourlyRate": 30000
}

// Chỉ cập nhật User.hourlyRate
// KHÔNG tự động tính lại lương các tháng cũ
// Chỉ áp dụng cho các checkout mới
```

### **3. Khi checkout mới**
```javascript
// Sử dụng User.hourlyRate hiện tại để tính lương
// Tự động tính và lưu vào Salary collection
```

### **4. Cập nhật lương cho tháng cụ thể**
```javascript
PUT /api/salary/update-month
{
  "userId": "userId",
  "month": 8,
  "year": 2024,
  "hourlyRate": 35000
}

// Tính lại lương cho tháng 8/2024 với mức lương 35,000đ/h
// Cập nhật Salary record cho tháng đó
```

## 📊 **Ví dụ thực tế**

### **Tình huống:**
- **Tháng 8/2024**: Nhân viên A có lương 27,000đ/h, làm 160h → 4,320,000đ
- **Tháng 9/2024**: Admin thay đổi lương chung thành 30,000đ/h
- **Tháng 9/2024**: Nhân viên A làm 168h → 5,040,000đ (với lương 30,000đ/h)
- **Tháng 8/2024**: Vẫn giữ nguyên 4,320,000đ (không tự động thay đổi)

### **Nếu admin muốn cập nhật lương tháng 8:**
```javascript
PUT /api/salary/update-month
{
  "userId": "userId",
  "month": 8,
  "year": 2024,
  "hourlyRate": 30000
}

// Kết quả: Tháng 8/2024 được tính lại với 30,000đ/h
// 160h × 30,000đ/h = 4,800,000đ
```

## 🔧 **API Endpoints**

### **1. Thay đổi mức lương chung (không tự động tính lại)**
```javascript
PUT /api/salary/rate/:userId
{
  "hourlyRate": 30000
}
```

### **2. Cập nhật lương cho tháng cụ thể**
```javascript
PUT /api/salary/update-month
{
  "userId": "userId",
  "month": 8,
  "year": 2024,
  "hourlyRate": 35000
}
```

### **3. Tính lương thủ công**
```javascript
POST /api/salary/calculate
{
  "userId": "userId",
  "month": 8,
  "year": 2024
}
```

## 🎨 **Frontend Usage**

### **1. Hiển thị bảng lương theo tháng**
```javascript
// Lấy lịch sử lương
GET /api/salary/user/:userId

// Hiển thị từng tháng với mức lương áp dụng
salaryHistory.forEach(record => {
  console.log(`${record.month}/${record.year}: ${record.totalSalary}đ (${record.hourlyRate}đ/h)`);
});
```

### **2. Cập nhật lương cho tháng cụ thể**
```javascript
const updateSalaryForMonth = async (userId, month, year, newRate) => {
  const response = await fetch('/api/salary/update-month', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      month,
      year,
      hourlyRate: newRate
    })
  });
  
  if (response.data.success) {
    // Refresh bảng lương
    loadSalaryHistory();
  }
};
```

### **3. Thay đổi mức lương chung**
```javascript
const updateGeneralRate = async (userId, newRate) => {
  const response = await fetch(`/api/salary/rate/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hourlyRate: newRate
    })
  });
  
  // Lưu ý: Không tự động cập nhật lương các tháng cũ
  // Chỉ áp dụng cho các checkout mới
};
```

## 📋 **Cấu trúc dữ liệu**

### **User Model:**
```javascript
{
  _id: "userId",
  name: "Nguyễn Văn A",
  hourlyRate: 30000,  // Mức lương hiện tại
  // ... other fields
}
```

### **Salary Model:**
```javascript
{
  _id: "salaryId",
  userId: "userId",
  hourlyRate: 27000,  // Mức lương áp dụng cho tháng này
  month: 8,
  year: 2024,
  totalHours: 160,
  totalSalary: 4320000,
  dailyRecords: [...],
  // ... other fields
}
```

## ✅ **Lợi ích**

1. **Linh hoạt**: Admin có thể cập nhật lương cho từng tháng riêng biệt
2. **An toàn**: Không tự động thay đổi lương cũ khi thay đổi mức lương chung
3. **Rõ ràng**: Mỗi tháng có mức lương riêng được lưu trữ
4. **Kiểm soát**: Admin hoàn toàn kiểm soát việc cập nhật lương
5. **Lịch sử**: Giữ nguyên lịch sử lương các tháng trước

## 🚀 **Workflow**

1. **User checkout** → Tự động tính lương với mức lương hiện tại
2. **Admin thay đổi mức lương chung** → Chỉ cập nhật User.hourlyRate
3. **Admin cập nhật lương tháng cụ thể** → Tính lại lương cho tháng đó
4. **Frontend hiển thị** → Lấy dữ liệu từ Salary collection (đã có mức lương áp dụng)

Hệ thống đã được điều chỉnh theo đúng yêu cầu!
