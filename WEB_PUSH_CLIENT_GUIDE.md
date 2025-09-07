# Web Push Client Implementation Guide

## 1. Service Worker Registration

### **Register Service Worker**

```javascript
// registerServiceWorker.js
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Service Worker not supported');
  }
};

export default registerServiceWorker;
```

### **Initialize Service Worker in App**

```javascript
// App.js
import { useEffect, useState } from 'react';
import registerServiceWorker from './registerServiceWorker';

const App = () => {
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    registerServiceWorker()
      .then(registration => {
        setSwRegistration(registration);
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.error('SW registration failed:', error);
      });
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
};

export default App;
```

## 2. Push Notification Manager

### **PushNotificationManager Class**

```javascript
// PushNotificationManager.js
class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = null;
  }

  // Khởi tạo push notification
  async initialize() {
    try {
      // Kiểm tra browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      // Lấy service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
      // Lấy VAPID public key từ server
      await this.getVapidPublicKey();
      
      // Kiểm tra subscription hiện tại
      this.subscription = await this.registration.pushManager.getSubscription();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Lấy VAPID public key từ server
  async getVapidPublicKey() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/push/vapid-key', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        this.vapidPublicKey = data.publicKey;
        return data.publicKey;
      } else {
        throw new Error('Failed to get VAPID key');
      }
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      throw error;
    }
  }

  // Kiểm tra quyền notification
  async checkPermission() {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    return Notification.permission;
  }

  // Yêu cầu quyền notification
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Đăng ký push notification
  async subscribe() {
    try {
      // Kiểm tra quyền
      const permission = await this.checkPermission();
      if (permission === 'denied') {
        throw new Error('Notification permission denied');
      }

      if (permission === 'default') {
        const newPermission = await this.requestPermission();
        if (newPermission === 'denied') {
          throw new Error('User denied notification permission');
        }
      }

      // Kiểm tra xem đã subscribe chưa
      if (this.subscription) {
        console.log('Already subscribed to push notifications');
        return this.subscription;
      }

      // Tạo subscription mới
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;

      // Gửi subscription lên server
      await this.sendSubscriptionToServer(subscription);

      console.log('Successfully subscribed to push notifications');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Hủy đăng ký push notification
  async unsubscribe() {
    try {
      if (!this.subscription) {
        console.log('No subscription to unsubscribe');
        return true;
      }

      // Hủy subscription
      const result = await this.subscription.unsubscribe();
      
      if (result) {
        // Gửi request hủy đăng ký lên server
        await this.removeSubscriptionFromServer(this.subscription);
        
        this.subscription = null;
        console.log('Successfully unsubscribed from push notifications');
        return true;
      } else {
        throw new Error('Failed to unsubscribe');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Gửi subscription lên server
  async sendSubscriptionToServer(subscription) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription,
          userAgent: navigator.userAgent
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save subscription');
      }

      console.log('Subscription saved to server');
      return data;
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  // Xóa subscription khỏi server
  async removeSubscriptionFromServer(subscription) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to remove subscription');
      }

      console.log('Subscription removed from server');
      return data;
    } catch (error) {
      console.error('Error removing subscription:', error);
      throw error;
    }
  }

  // Test push notification
  async testPushNotification() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Notification',
          body: 'This is a test push notification'
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('Test push notification sent');
        return data;
      } else {
        throw new Error(data.message || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Lấy trạng thái subscription
  getSubscriptionStatus() {
    return {
      isSubscribed: !!this.subscription,
      permission: Notification.permission,
      subscription: this.subscription
    };
  }
}

export default PushNotificationManager;
```

## 3. React Hook cho Push Notifications

### **usePushNotifications Hook**

```javascript
// usePushNotifications.js
import { useState, useEffect, useCallback } from 'react';
import PushNotificationManager from './PushNotificationManager';

const usePushNotifications = () => {
  const [pushManager] = useState(() => new PushNotificationManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Khởi tạo push manager
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        const success = await pushManager.initialize();
        if (success) {
          const status = pushManager.getSubscriptionStatus();
          setIsSubscribed(status.isSubscribed);
          setPermission(status.permission);
          setIsInitialized(true);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [pushManager]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await pushManager.subscribe();
      setIsSubscribed(true);
      setPermission('granted');
      
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pushManager]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await pushManager.unsubscribe();
      setIsSubscribed(false);
      
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pushManager]);

  // Test push notification
  const testPush = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await pushManager.testPushNotification();
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pushManager]);

  return {
    isInitialized,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testPush,
    clearError: () => setError(null)
  };
};

export default usePushNotifications;
```

## 4. Push Notification Component

### **PushNotificationSettings Component**

```javascript
// PushNotificationSettings.jsx
import React from 'react';
import usePushNotifications from './usePushNotifications';

const PushNotificationSettings = () => {
  const {
    isInitialized,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testPush,
    clearError
  } = usePushNotifications();

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      alert('Đã đăng ký nhận thông báo push thành công!');
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      alert('Đã hủy đăng ký thông báo push!');
    }
  };

  const handleTestPush = async () => {
    const success = await testPush();
    if (success) {
      alert('Đã gửi thông báo test!');
    }
  };

  if (!isInitialized) {
    return (
      <div className="push-notification-settings">
        <h3>Cài đặt thông báo</h3>
        <p>Đang khởi tạo...</p>
      </div>
    );
  }

  return (
    <div className="push-notification-settings">
      <h3>Cài đặt thông báo Push</h3>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError}>Đóng</button>
        </div>
      )}

      <div className="permission-status">
        <p>Trạng thái quyền: <strong>{permission}</strong></p>
      </div>

      <div className="subscription-status">
        <p>Trạng thái đăng ký: <strong>{isSubscribed ? 'Đã đăng ký' : 'Chưa đăng ký'}</strong></p>
      </div>

      <div className="actions">
        {!isSubscribed ? (
          <button 
            onClick={handleSubscribe}
            disabled={isLoading || permission === 'denied'}
            className="btn btn-primary"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng ký thông báo'}
          </button>
        ) : (
          <div>
            <button 
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              {isLoading ? 'Đang xử lý...' : 'Hủy đăng ký'}
            </button>
            <button 
              onClick={handleTestPush}
              disabled={isLoading}
              className="btn btn-info"
            >
              {isLoading ? 'Đang gửi...' : 'Test thông báo'}
            </button>
          </div>
        )}
      </div>

      {permission === 'denied' && (
        <div className="permission-help">
          <p>
            <strong>Quyền thông báo bị từ chối.</strong> 
            Để nhận thông báo, vui lòng:
          </p>
          <ol>
            <li>Mở Settings của trình duyệt</li>
            <li>Tìm và chọn "Notifications" hoặc "Thông báo"</li>
            <li>Tìm trang web này và cho phép thông báo</li>
            <li>Refresh trang và thử lại</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PushNotificationSettings;
```

## 5. CSS Styles

### **Push Notification Styles**

```css
/* PushNotificationSettings.css */
.push-notification-settings {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.push-notification-settings h3 {
  margin-top: 0;
  color: #333;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.error-message button {
  background: none;
  border: none;
  color: #721c24;
  cursor: pointer;
  float: right;
}

.permission-status,
.subscription-status {
  margin: 10px 0;
  padding: 10px;
  background: #e9ecef;
  border-radius: 4px;
}

.actions {
  margin: 20px 0;
}

.actions button {
  margin-right: 10px;
  margin-bottom: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #117a8b;
}

.permission-help {
  background: #fff3cd;
  color: #856404;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
}

.permission-help ol {
  margin: 10px 0;
  padding-left: 20px;
}

.permission-help li {
  margin: 5px 0;
}
```

## 6. Sử dụng trong App

### **App.js Integration**

```javascript
// App.js
import React from 'react';
import PushNotificationSettings from './components/PushNotificationSettings';
import registerServiceWorker from './registerServiceWorker';

const App = () => {
  React.useEffect(() => {
    // Register service worker
    registerServiceWorker();
  }, []);

  return (
    <div className="App">
      <header>
        <h1>WorkTime App</h1>
      </header>
      
      <main>
        {/* Your app content */}
        
        {/* Push notification settings */}
        <PushNotificationSettings />
      </main>
    </div>
  );
};

export default App;
```

## 7. Environment Variables

### **Frontend (.env)**

```
REACT_APP_API_URL=https://your-backend-app.onrender.com
```

### **Backend (.env)**

```
VAPID_SUBJECT=mailto:admin@worktime.com
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

## 8. Generate VAPID Keys

### **Generate VAPID Keys**

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Copy các keys được tạo ra vào environment variables của backend.

## 9. Testing

### **Test Push Notifications**

1. **Enable notifications** trong browser settings
2. **Subscribe** to push notifications
3. **Send test notification** từ admin panel
4. **Check** if notification appears
5. **Click notification** to verify navigation

## 10. Troubleshooting

### **Common Issues**

1. **Service Worker not registering**: Check if sw.js is accessible
2. **VAPID key error**: Verify VAPID keys are correct
3. **Permission denied**: Guide user to enable notifications
4. **No notifications**: Check browser console for errors
5. **HTTPS required**: Push notifications only work on HTTPS

### **Debug Tips**

```javascript
// Check service worker status
navigator.serviceWorker.ready.then(registration => {
  console.log('SW ready:', registration);
});

// Check push manager
if ('PushManager' in window) {
  console.log('Push Manager supported');
} else {
  console.log('Push Manager not supported');
}

// Check notification permission
console.log('Notification permission:', Notification.permission);
```
