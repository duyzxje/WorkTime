# VAPID Keys Setup Guide

## Vấn đề hiện tại

Lỗi `No key set vapidDetails.publicKey` xảy ra vì VAPID keys chưa được cấu hình trong environment variables trên Render.

## Giải pháp

### 1. Generate VAPID Keys

Chạy lệnh sau để tạo VAPID keys:

```bash
npm run generate-vapid
```

Hoặc chạy trực tiếp:

```bash
node scripts/generateVapidKeys.js
```

### 2. Cấu hình Environment Variables

#### **Cho Render Deployment:**

1. Vào Render Dashboard
2. Chọn service của bạn
3. Vào tab "Environment"
4. Thêm các environment variables sau:

```
VAPID_SUBJECT=mailto:admin@worktime.com
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI...
VAPID_PRIVATE_KEY=your-private-key-here
```

#### **Cho Local Development:**

Thêm vào file `.env`:

```
VAPID_SUBJECT=mailto:admin@worktime.com
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI...
VAPID_PRIVATE_KEY=your-private-key-here
```

### 3. Deploy lại

Sau khi thêm environment variables, deploy lại service trên Render.

## VAPID Keys là gì?

VAPID (Voluntary Application Server Identification) keys được sử dụng để:
- Xác thực server với push service
- Đảm bảo chỉ server của bạn mới có thể gửi push notifications
- Bảo mật cho Web Push Notifications

## Lưu ý bảo mật

⚠️ **QUAN TRỌNG:**
- **KHÔNG BAO GIỜ** commit VAPID private key vào Git
- **KHÔNG BAO GIỜ** chia sẻ private key
- Chỉ sử dụng public key ở frontend
- Private key chỉ dùng ở backend

## Kiểm tra cấu hình

Sau khi cấu hình, bạn có thể kiểm tra bằng cách:

1. **Kiểm tra logs** trên Render để xem:
   ```
   Web Push VAPID keys configured
   ```

2. **Test API endpoint:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://your-app.onrender.com/api/push/vapid-key
   ```

3. **Kiểm tra frontend:**
   ```javascript
   fetch('/api/push/vapid-key')
     .then(response => response.json())
     .then(data => {
       if (data.success) {
         console.log('VAPID key available:', data.publicKey);
       } else {
         console.log('VAPID not configured:', data.message);
       }
     });
   ```

## Troubleshooting

### Lỗi "VAPID keys not configured"

**Nguyên nhân:** Environment variables chưa được set hoặc không đúng format.

**Giải pháp:**
1. Kiểm tra environment variables trên Render
2. Đảm bảo không có khoảng trắng thừa
3. Deploy lại service

### Lỗi "Invalid VAPID key"

**Nguyên nhân:** VAPID key không đúng format hoặc bị corrupt.

**Giải pháp:**
1. Generate lại VAPID keys
2. Cập nhật environment variables
3. Deploy lại

### Push notifications không hoạt động

**Nguyên nhân có thể:**
- VAPID keys chưa được cấu hình
- Service Worker chưa được register
- Browser không hỗ trợ push notifications
- User chưa cho phép notifications

**Giải pháp:**
1. Kiểm tra VAPID keys
2. Kiểm tra Service Worker
3. Test trên browser hỗ trợ (Chrome, Firefox, Edge)
4. Hướng dẫn user enable notifications

## Test Push Notifications

Sau khi cấu hình xong, test push notifications:

1. **Đăng ký push notification** từ frontend
2. **Gửi test notification** từ admin panel
3. **Kiểm tra** notification có xuất hiện không

## Fallback Behavior

Nếu VAPID keys chưa được cấu hình:
- WebSocket notifications vẫn hoạt động bình thường
- Push notifications sẽ bị skip (không gây lỗi)
- API sẽ trả về message "Push notifications not available"

## Production Checklist

- [ ] VAPID keys đã được generate
- [ ] Environment variables đã được set trên Render
- [ ] Service đã được deploy lại
- [ ] Logs hiển thị "Web Push VAPID keys configured"
- [ ] API `/api/push/vapid-key` trả về public key
- [ ] Test push notification hoạt động
- [ ] Frontend có thể đăng ký push notifications
