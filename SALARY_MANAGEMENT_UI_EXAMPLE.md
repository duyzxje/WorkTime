# Giao diện quản lý mức lương cho Frontend

## 🎨 **Giao diện quản lý mức lương**

### 1. **Trang danh sách nhân viên với mức lương**

```html
<!-- Danh sách nhân viên -->
<div class="salary-management">
  <h2>Quản lý mức lương nhân viên</h2>
  
  <div class="search-bar">
    <input type="text" placeholder="Tìm kiếm nhân viên..." v-model="searchTerm">
  </div>

  <table class="users-table">
    <thead>
      <tr>
        <th>Tên</th>
        <th>Username</th>
        <th>Email</th>
        <th>Mức lương/giờ</th>
        <th>Thao tác</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in filteredUsers" :key="user._id">
        <td>{{ user.name }}</td>
        <td>{{ user.username }}</td>
        <td>{{ user.email }}</td>
        <td>
          <span class="current-rate">{{ formatCurrency(user.hourlyRate) }}/h</span>
        </td>
        <td>
          <button @click="openEditModal(user)" class="btn-edit">
            Chỉnh sửa
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### 2. **Modal chỉnh sửa mức lương**

```html
<!-- Modal chỉnh sửa mức lương -->
<div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
  <div class="modal-content" @click.stop>
    <h3>Chỉnh sửa mức lương</h3>
    
    <div class="user-info">
      <p><strong>Tên:</strong> {{ selectedUser.name }}</p>
      <p><strong>Username:</strong> {{ selectedUser.username }}</p>
      <p><strong>Email:</strong> {{ selectedUser.email }}</p>
    </div>

    <div class="form-group">
      <label for="hourlyRate">Mức lương/giờ (VNĐ):</label>
      <input 
        type="number" 
        id="hourlyRate"
        v-model="newHourlyRate"
        placeholder="Nhập mức lương mới..."
        min="0"
        step="1000"
      >
      <small class="help-text">
        Mức lương hiện tại: {{ formatCurrency(selectedUser.hourlyRate) }}/h
      </small>
    </div>

    <div class="modal-actions">
      <button @click="closeEditModal" class="btn-cancel">Hủy</button>
      <button @click="updateHourlyRate" class="btn-save" :disabled="loading">
        {{ loading ? 'Đang cập nhật...' : 'Cập nhật' }}
      </button>
    </div>
  </div>
</div>
```

### 3. **JavaScript/Vue.js Logic**

```javascript
// Vue.js Component
export default {
  data() {
    return {
      users: [],
      searchTerm: '',
      showEditModal: false,
      selectedUser: null,
      newHourlyRate: 0,
      loading: false
    }
  },
  
  computed: {
    filteredUsers() {
      return this.users.filter(user => 
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  },
  
  methods: {
    // Lấy danh sách nhân viên
    async loadUsers() {
      try {
        const response = await this.$http.get('/api/salary/users');
        if (response.data.success) {
          this.users = response.data.data.users;
        }
      } catch (error) {
        this.$toast.error('Lỗi khi tải danh sách nhân viên');
      }
    },
    
    // Mở modal chỉnh sửa
    openEditModal(user) {
      this.selectedUser = user;
      this.newHourlyRate = user.hourlyRate;
      this.showEditModal = true;
    },
    
    // Đóng modal
    closeEditModal() {
      this.showEditModal = false;
      this.selectedUser = null;
      this.newHourlyRate = 0;
    },
    
    // Cập nhật mức lương
    async updateHourlyRate() {
      if (!this.newHourlyRate || this.newHourlyRate < 0) {
        this.$toast.error('Vui lòng nhập mức lương hợp lệ');
        return;
      }
      
      this.loading = true;
      
      try {
        const response = await this.$http.put(`/api/salary/rate/${this.selectedUser._id}`, {
          hourlyRate: parseInt(this.newHourlyRate)
        });
        
        if (response.data.success) {
          this.$toast.success('Cập nhật mức lương thành công');
          
          // Cập nhật lại danh sách
          await this.loadUsers();
          this.closeEditModal();
        } else {
          this.$toast.error(response.data.message);
        }
      } catch (error) {
        this.$toast.error('Có lỗi xảy ra khi cập nhật mức lương');
      } finally {
        this.loading = false;
      }
    },
    
    // Format tiền tệ
    formatCurrency(amount) {
      return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }
  },
  
  mounted() {
    this.loadUsers();
  }
}
```

### 4. **CSS Styling**

```css
.salary-management {
  padding: 20px;
}

.search-bar {
  margin-bottom: 20px;
}

.search-bar input {
  width: 300px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.current-rate {
  font-weight: 600;
  color: #28a745;
}

.btn-edit {
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-edit:hover {
  background: #0056b3;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.user-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.help-text {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-save {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

## 🔧 **Các API sử dụng**

### 1. **Lấy danh sách nhân viên**
```javascript
GET /api/salary/users
```

### 2. **Cập nhật mức lương**
```javascript
PUT /api/salary/rate/:userId
Body: { "hourlyRate": 30000 }
```

### 3. **Hoặc cập nhật qua User Management**
```javascript
PUT /api/users/:userId
Body: { "hourlyRate": 30000 }
```

## 📱 **Responsive Design**

```css
@media (max-width: 768px) {
  .users-table {
    font-size: 14px;
  }
  
  .users-table th,
  .users-table td {
    padding: 8px;
  }
  
  .modal-content {
    width: 95%;
    padding: 16px;
  }
  
  .search-bar input {
    width: 100%;
  }
}
```

## ✅ **Tính năng**

- ✅ Hiển thị danh sách nhân viên với mức lương hiện tại
- ✅ Tìm kiếm nhân viên theo tên, username, email
- ✅ Chỉnh sửa mức lương với validation
- ✅ Giao diện thân thiện, responsive
- ✅ Thông báo thành công/lỗi
- ✅ Loading state khi cập nhật
