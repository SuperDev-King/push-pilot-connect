# Push Pilot Connect - Setup Guide

A professional Progressive Web App (PWA) for managing push notifications using Firebase Cloud Messaging (FCM) with JWT authentication.

## 🚀 Features

- **Cross-Platform Notifications**: Web browsers, Android, and iOS support
- **JWT Authentication**: Custom token-based authentication system
- **Real-time Dashboard**: Beautiful notification management interface
- **PWA Support**: Installable app with offline capabilities
- **Background Notifications**: Service worker for background message handling
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 📋 Prerequisites

1. **Firebase Project**: Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **VB.NET Backend**: Your existing backend with login API
3. **VAPID Keys**: For web push notifications

## 🔧 Firebase Configuration

### 1. Enable Firebase Cloud Messaging

1. Go to your Firebase Console
2. Select your project
3. Navigate to **Project Settings** > **Cloud Messaging**
4. Generate a new **Web Push certificate (VAPID key)**

### 2. Get Firebase Config

1. In Firebase Console, go to **Project Settings** > **General**
2. Scroll down to **Your apps** section
3. Click **Add app** and select **Web**
4. Copy the Firebase config object

### 3. Update Configuration Files

#### Update `src/lib/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

#### Update VAPID key in `requestNotificationPermission`:
```typescript
const token = await getToken(messaging, {
  vapidKey: 'your-vapid-key-here'
});
```

#### Update `public/firebase-messaging-sw.js`:
```javascript
const firebaseConfig = {
  // Same config as above
};
```

## 🔧 Backend Integration

### Required API Endpoints

Your VB.NET backend should provide these endpoints:

#### 1. Login Endpoint
```
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### 2. FCM Token Registration
```
POST /api/register-fcm-token
Authorization: Bearer jwt-token-here
Content-Type: application/json

{
  "fcm_token": "firebase-fcm-token"
}

Response:
{
  "success": true,
  "message": "Token registered successfully"
}
```

### JWT Token Requirements

- Include user information in JWT payload
- Set appropriate expiration time
- Use HS256 or RS256 algorithm
- Include standard claims (exp, iat, sub)

## 🔧 VB.NET Backend Sample

### JWT Token Generation
```vb
' Install JWT library: Install-Package System.IdentityModel.Tokens.Jwt

Imports System.IdentityModel.Tokens.Jwt
Imports System.Security.Claims
Imports Microsoft.IdentityModel.Tokens
Imports System.Text

Public Function GenerateJwtToken(userId As String, email As String) As String
    Dim key = Encoding.ASCII.GetBytes("your-secret-key-here")
    Dim tokenDescriptor = New SecurityTokenDescriptor() With {
        .Subject = New ClaimsIdentity(New Claim() {
            New Claim(ClaimTypes.NameIdentifier, userId),
            New Claim(ClaimTypes.Email, email)
        }),
        .Expires = DateTime.UtcNow.AddDays(7),
        .SigningCredentials = New SigningCredentials(New SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    }
    
    Dim tokenHandler = New JwtSecurityTokenHandler()
    Dim token = tokenHandler.CreateToken(tokenDescriptor)
    Return tokenHandler.WriteToken(token)
End Function
```

### FCM Token Storage
```vb
' Database table: UserFcmTokens
' Columns: UserId, FcmToken, DeviceType, CreatedAt

Public Sub RegisterFcmToken(userId As String, fcmToken As String)
    ' Store or update FCM token in database
    ' Associate with user ID for targeted notifications
End Sub
```

## 🚀 Deployment

### 1. Build the Application
```bash
npm run build
```

### 2. Deploy to Web Server
- Deploy the `dist` folder to your web server
- Ensure HTTPS is enabled (required for PWA features)
- Configure proper MIME types for service worker

### 3. Test Installation
1. Open the app in a web browser
2. You should see an "Install App" prompt
3. Test notification permissions
4. Verify FCM token registration

## 🧪 Testing

### 1. Test Notifications via Firebase Console
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Select "Send test message to FCM registration token"
5. Enter the FCM token from your app

### 2. Test Authentication Flow
1. Use valid credentials to log in
2. Check browser network tab for JWT token
3. Verify FCM token is sent to backend

## 🔒 Security Considerations

1. **HTTPS Required**: PWA features require HTTPS
2. **JWT Security**: Use strong secret keys and appropriate expiration
3. **Token Storage**: FCM tokens should be associated with authenticated users
4. **CORS Configuration**: Ensure proper CORS settings on backend

## 📱 PWA Installation

Users can install the app:
- **Desktop**: Click the install button in the address bar
- **Mobile**: Use "Add to Home Screen" option
- **Chrome**: Use the install prompt

## 🎨 Customization

### Colors and Themes
Edit `src/index.css` to customize the color scheme:
```css
:root {
  --primary: 346 77% 49.8%;  /* Main brand color */
  --background: 240 10% 3.9%; /* Background color */
  /* ... other colors */
}
```

### Notification Types
Extend the notification system by adding new types in `NotificationCard.tsx`.

## 📞 Support

For technical support or questions about the implementation, please refer to:
- [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- [PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [JWT.io](https://jwt.io/) for JWT debugging

## 📄 License

This project is built for educational and professional use. Ensure compliance with your organization's security policies.