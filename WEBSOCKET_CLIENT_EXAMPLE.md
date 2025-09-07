# WebSocket Client Example

## Cài đặt Socket.IO Client

```bash
npm install socket.io-client
```

## Kết nối WebSocket

### 1. Khởi tạo kết nối

```javascript
import { io } from 'socket.io-client';

class NotificationSocket {
  constructor(token) {
    this.token = token;
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    this.socket = io(process.env.REACT_APP_API_URL || 'https://your-app-name.onrender.com', {
      auth: {
        token: this.token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Kết nối thành công
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.onConnectionStatusChange(true);
    });

    // Mất kết nối
    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.isConnected = false;
      this.onConnectionStatusChange(false);
    });

    // Lỗi kết nối
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.onConnectionError(error);
    });

    // Thông báo mới
    this.socket.on('new_notification', (data) => {
      console.log('New notification received:', data);
      this.onNewNotification(data.data);
    });

    // Cập nhật số lượng thông báo chưa đọc
    this.socket.on('unread_count_update', (data) => {
      console.log('Unread count updated:', data);
      this.onUnreadCountUpdate(data.data.count);
    });

    // Thông báo đã đọc
    this.socket.on('notification_read', (data) => {
      console.log('Notification read:', data);
      this.onNotificationRead(data.data.notificationId);
    });

    // Tất cả thông báo đã đọc
    this.socket.on('all_notifications_read', (data) => {
      console.log('All notifications read:', data);
      this.onAllNotificationsRead(data.data.count);
    });

    // Thông báo được cập nhật
    this.socket.on('notification_updated', (data) => {
      console.log('Notification updated:', data);
      this.onNotificationUpdated(data.data);
    });

    // Thông báo bị xóa
    this.socket.on('notification_deleted', (data) => {
      console.log('Notification deleted:', data);
      this.onNotificationDeleted(data.data.notificationId);
    });

    // Thông báo hệ thống
    this.socket.on('system_notification', (data) => {
      console.log('System notification:', data);
      this.onSystemNotification(data.data);
    });

    // Trạng thái kết nối
    this.socket.on('connection_status', (data) => {
      console.log('Connection status:', data);
      this.onConnectionStatus(data.data.status);
    });
  }

  // Gửi event tới server
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_notification_room', { room });
    }
  }

  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_notification_room', { room });
    }
  }

  // Ngắt kết nối
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Callback functions (cần implement trong component)
  onConnectionStatusChange(isConnected) {
    // Override trong component
  }

  onConnectionError(error) {
    // Override trong component
  }

  onNewNotification(notification) {
    // Override trong component
  }

  onUnreadCountUpdate(count) {
    // Override trong component
  }

  onNotificationRead(notificationId) {
    // Override trong component
  }

  onAllNotificationsRead(count) {
    // Override trong component
  }

  onNotificationUpdated(notification) {
    // Override trong component
  }

  onNotificationDeleted(notificationId) {
    // Override trong component
  }

  onSystemNotification(notification) {
    // Override trong component
  }

  onConnectionStatus(status) {
    // Override trong component
  }
}

export default NotificationSocket;
```

## Sử dụng trong React Component

### 1. Hook để quản lý WebSocket

```javascript
import { useEffect, useRef, useState } from 'react';
import NotificationSocket from './NotificationSocket';

const useNotificationSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (token) {
      socketRef.current = new NotificationSocket(token);
      
      // Override callback functions
      socketRef.current.onConnectionStatusChange = (connected) => {
        setIsConnected(connected);
        setConnectionError(null);
      };

      socketRef.current.onConnectionError = (error) => {
        setConnectionError(error.message);
        setIsConnected(false);
      };

      socketRef.current.onNewNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Hiển thị toast notification
        showToastNotification(notification);
      };

      socketRef.current.onUnreadCountUpdate = (count) => {
        setUnreadCount(count);
      };

      socketRef.current.onNotificationRead = (notificationId) => {
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
      };

      socketRef.current.onAllNotificationsRead = (count) => {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      };

      socketRef.current.onNotificationUpdated = (notification) => {
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notification._id ? notification : notif
          )
        );
      };

      socketRef.current.onNotificationDeleted = (notificationId) => {
        setNotifications(prev => 
          prev.filter(notif => notif._id !== notificationId)
        );
      };

      socketRef.current.onSystemNotification = (notification) => {
        // Hiển thị thông báo hệ thống
        showSystemNotification(notification);
      };

      socketRef.current.connect();

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [token]);

  const joinRoom = (room) => {
    if (socketRef.current) {
      socketRef.current.joinRoom(room);
    }
  };

  const leaveRoom = (room) => {
    if (socketRef.current) {
      socketRef.current.leaveRoom(room);
    }
  };

  return {
    isConnected,
    unreadCount,
    notifications,
    connectionError,
    joinRoom,
    leaveRoom
  };
};

export default useNotificationSocket;
```

### 2. Component sử dụng WebSocket

```javascript
import React, { useState, useEffect } from 'react';
import useNotificationSocket from './hooks/useNotificationSocket';

const NotificationComponent = ({ token }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { 
    isConnected, 
    unreadCount, 
    notifications, 
    connectionError 
  } = useNotificationSocket(token);

  // Lấy thông báo từ API khi component mount
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // WebSocket sẽ tự động cập nhật UI
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/user/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // WebSocket sẽ tự động cập nhật UI
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="notification-container">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {connectionError && <span className="error"> - {connectionError}</span>}
      </div>

      {/* Notification Bell */}
      <div 
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.map(notification => (
              <div 
                key={notification._id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                <div className="notification-type">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.content}</p>
                  <span className="notification-time">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                {!notification.isRead && <div className="unread-indicator" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getTypeIcon = (type) => {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    error: '❌'
  };
  return icons[type] || 'ℹ️';
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return date.toLocaleDateString('vi-VN');
};

const showToastNotification = (notification) => {
  // Implement toast notification
  console.log('Show toast:', notification);
};

const showSystemNotification = (notification) => {
  // Implement system notification
  console.log('Show system notification:', notification);
};

export default NotificationComponent;
```

## CSS Styles

```css
.notification-container {
  position: relative;
}

.connection-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.connection-status.connected {
  background-color: #d4edda;
  color: #155724;
}

.connection-status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.notification-bell {
  position: relative;
  cursor: pointer;
  font-size: 24px;
  padding: 8px;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 12px;
  min-width: 18px;
  text-align: center;
}

.notification-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 350px;
  max-height: 400px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1000;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.mark-all-read {
  background: #007bff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  position: relative;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #e3f2fd;
}

.notification-type {
  font-size: 20px;
  margin-right: 12px;
}

.notification-content {
  flex: 1;
}

.notification-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.notification-content p {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #666;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.unread-indicator {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
  transform: translateY(-50%);
}
```

## Sử dụng trong App

```javascript
import React from 'react';
import NotificationComponent from './components/NotificationComponent';

const App = () => {
  const token = localStorage.getItem('token'); // Lấy token từ localStorage

  return (
    <div className="App">
      <header>
        <h1>My App</h1>
        <NotificationComponent token={token} />
      </header>
      {/* Rest of your app */}
    </div>
  );
};

export default App;
```

## Lưu ý

1. **Token Authentication**: WebSocket sử dụng JWT token để xác thực
2. **Auto Reconnection**: Socket.IO tự động thử kết nối lại khi mất kết nối
3. **Room Management**: User tự động join vào room cá nhân và admin room (nếu là admin)
4. **Real-time Updates**: Tất cả thay đổi thông báo được push real-time
5. **Error Handling**: Có xử lý lỗi kết nối và hiển thị trạng thái
6. **Performance**: Chỉ load thông báo khi cần thiết, WebSocket chỉ push updates
