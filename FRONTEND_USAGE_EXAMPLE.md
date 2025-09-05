# Hướng dẫn sử dụng API tính lương cho Frontend

## API Endpoint
```
POST /api/salary/calculate
```

## Request Body
```json
{
  "userId": "ObjectId của nhân viên",
  "month": 1,  // Tháng (1-12)
  "year": 2024 // Năm
}
```

## Response Success (200)
```json
{
  "success": true,
  "message": "Tính lương thành công cho Nguyễn Văn A - 1/2024",
  "data": {
    "salary": {
      "_id": "ObjectId",
      "userId": "ObjectId",
      "hourlyRate": 27000,
      "month": 1,
      "year": 2024,
      "totalHours": 160.5,
      "totalSalary": 4333500,
      "dailyRecords": [...],
      "createdAt": "2024-01-15T08:30:00.000Z",
      "updatedAt": "2024-01-15T08:30:00.000Z"
    },
    "user": {
      "id": "ObjectId",
      "name": "Nguyễn Văn A",
      "username": "nguyenvana",
      "email": "nguyenvana@example.com",
      "hourlyRate": 27000
    },
    "summary": {
      "month": 1,
      "year": 2024,
      "monthName": "tháng 1",
      "totalHours": 160.5,
      "totalSalary": 4333500,
      "dailyRecordsCount": 20,
      "averageHoursPerDay": 8.03,
      "averageSalaryPerDay": 216675
    },
    "dailyRecords": [
      {
        "date": "2024-01-15T08:30:00.000Z",
        "dateFormatted": "15/01/2024",
        "dayOfWeek": "thứ hai",
        "checkInTime": "08:30:00",
        "checkOutTime": "17:00:00",
        "workHours": 8.5,
        "dailySalary": 229500,
        "isValid": true,
        "notes": ""
      }
    ]
  }
}
```

## Response Error (400/404/500)
```json
{
  "success": false,
  "message": "User ID, month, and year are required"
}
```

## Ví dụ sử dụng trong Frontend

### JavaScript/React
```javascript
const calculateSalary = async (userId, month, year) => {
  try {
    const response = await fetch('/api/salary/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Nếu cần authentication
      },
      body: JSON.stringify({
        userId,
        month,
        year
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Hiển thị kết quả tính lương
      console.log('Tổng lương:', data.data.summary.totalSalary);
      console.log('Tổng giờ:', data.data.summary.totalHours);
      console.log('Chi tiết từng ngày:', data.data.dailyRecords);
      
      // Có thể hiển thị modal hoặc chuyển trang
      showSalaryResult(data.data);
    } else {
      // Hiển thị lỗi
      showError(data.message);
    }
  } catch (error) {
    console.error('Lỗi khi tính lương:', error);
    showError('Có lỗi xảy ra khi tính lương');
  }
};

// Sử dụng
calculateSalary('60f7b3b3b3b3b3b3b3b3b3b3', 1, 2024);
```

### Vue.js
```javascript
methods: {
  async calculateSalary() {
    try {
      const response = await this.$http.post('/api/salary/calculate', {
        userId: this.selectedUserId,
        month: this.selectedMonth,
        year: this.selectedYear
      });
      
      if (response.data.success) {
        this.salaryResult = response.data.data;
        this.showResult = true;
      } else {
        this.$toast.error(response.data.message);
      }
    } catch (error) {
      this.$toast.error('Có lỗi xảy ra khi tính lương');
    }
  }
}
```

### Angular
```typescript
calculateSalary(userId: string, month: number, year: number) {
  const body = { userId, month, year };
  
  this.http.post('/api/salary/calculate', body).subscribe({
    next: (response: any) => {
      if (response.success) {
        this.salaryData = response.data;
        this.showSalaryModal = true;
      } else {
        this.showError(response.message);
      }
    },
    error: (error) => {
      this.showError('Có lỗi xảy ra khi tính lương');
    }
  });
}
```

## Các trường hợp lỗi thường gặp

1. **400 Bad Request**: Thiếu thông tin userId, month, hoặc year
2. **404 Not Found**: Không tìm thấy nhân viên
3. **500 Server Error**: Lỗi server

## Lưu ý quan trọng

- API chỉ tính lương cho các ca làm việc đã hoàn thành (status: 'checked-out')
- Mức lương theo giờ được lấy từ thông tin user (mặc định 27,000đ/h)
- Kết quả được lưu vào database để có thể tra cứu lại
- Có thể tính lại lương cho cùng tháng (sẽ cập nhật dữ liệu cũ)
