# Quick Setup Guide

## Prerequisites Check

Before starting, ensure you have:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version (should be 9+)
npm --version

# Verify backend is running
curl http://localhost:3000/health
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install:
- React 18 + TypeScript
- Tailwind CSS + UI libraries
- Redux Toolkit + React Query
- Axios + Socket.IO
- And all other dependencies

### 2. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Default configuration (development):
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_API_KEYS_ONLY=false
VITE_ENV=development
```

**⚠️ Important**: Do NOT include `/api/v1` in the API URL. The backend endpoints start from root.

### 3. Start Development Server

```bash
npm run dev
```

The application will start at: `http://localhost:5173`

## First Login

### Super Admin Access
- **URL**: http://localhost:5173/login
- **Email**: admin@email.com
- **Password**: 123password
- **Redirects to**: /admin/dashboard

### Tenant Admin Access
- **URL**: http://localhost:5173/login
- **Email**: tenant@email.com
- **Password**: 123password
- **Redirects to**: /tenant/dashboard

## Feature Testing

### 1. Test Authentication
- Navigate to http://localhost:5173
- Login with super admin credentials
- Verify redirect to admin dashboard
- Check theme toggle works
- Test logout

### 2. Test Super Admin Features
- View system dashboard statistics
- Navigate to Tenants page
- Navigate to Providers page
- Navigate to Users page

### 3. Test Provider Management
- Go to /admin/providers
- Click "Generate HMAC Secret"
- Copy the secret (shown once)
- Test "Rotate Secret" with confirmation

### 4. Test Tenant Features
Login as tenant user and test:
- View tenant dashboard
- Initiate a verification
- View verifications list
- Search accounts
- Manage API keys

### 5. Test Verification Flow
1. Click "Initiate Verification"
2. Fill in user details
3. Submit form
4. Observe WebSocket real-time update
5. Check session URL opens (if provided)

### 6. Test API Keys
1. Navigate to API Keys page
2. Click "Create API Key"
3. Enter name and expiration
4. Copy the key (shown once)
5. Test revoke functionality

## Common Issues

### WebSocket Connection Failed
**Problem**: WebSocket not connecting
**Solution**: 
1. Verify backend is running
2. Check VITE_WS_URL in .env
3. Ensure JWT token is valid
4. Check browser console for errors

### 401 Unauthorized Errors
**Problem**: API calls returning 401
**Solution**:
1. Token may be expired
2. Try logging out and back in
3. Check localStorage for access_token
4. Verify backend is accepting tokens

### Build Errors
**Problem**: npm run build fails
**Solution**:
1. Delete node_modules and package-lock.json
2. Run `npm install` again
3. Clear npm cache: `npm cache clean --force`
4. Try building again

### Port Already in Use
**Problem**: Port 5173 is already in use
**Solution**:
```bash
# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or change port in vite.config.ts
server: {
  port: 5174, // Use different port
}
```

## Development Tips

### Hot Module Replacement (HMR)
Changes to files are automatically reflected:
- React components
- TypeScript files
- CSS/Tailwind styles
- Environment variables (requires restart)

### Code Quality
```bash
# Run linter
npm run lint

# Auto-fix lint issues
npm run lint -- --fix
```

### Testing
```bash
# Run unit tests
npm run test

# Run with UI
npm run test:ui

# Run E2E tests
npm run cypress
```

### Building for Production
```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

## API Integration

### Making API Calls

```typescript
import { apiClient } from './services/apiClient'

// GET request
const data = await apiClient.get('/endpoint')

// POST request
const result = await apiClient.post('/endpoint', { data })

// PUT request
const updated = await apiClient.put('/endpoint/:id', { data })

// DELETE request
await apiClient.delete('/endpoint/:id')
```

### WebSocket Integration

```typescript
import { websocketService } from './services/websocketService'

// Connect
websocketService.connect()

// Subscribe to verification
const unsubscribe = websocketService.subscribeToVerification(
  verificationId,
  (data) => {
    console.log('Update:', data)
  }
)

// Cleanup
unsubscribe()
```

## Project Structure Overview

```
src/
├── components/          # Reusable components
│   ├── auth/           # Auth components
│   ├── layouts/        # Layouts (Sidebar, Header)
│   └── ui/             # UI components (Button, Card, etc)
├── pages/              # Page components
│   ├── admin/          # Super admin pages
│   ├── tenant/         # Tenant pages
│   └── auth/           # Auth pages (Login)
├── services/           # API & WebSocket services
├── store/              # Redux store & slices
├── utils/              # Helper functions
├── types/              # TypeScript types
└── constants/          # App constants
```

## Next Steps

1. ✅ Backend is running on http://localhost:3000
2. ✅ Frontend is running on http://localhost:5173
3. ✅ Login with demo credentials
4. ✅ Explore all features
5. ✅ Test verification flow
6. ✅ Review API documentation at http://localhost:3000/api/docs

## Need Help?

- **Backend API Docs**: http://localhost:3000/api/docs
- **Frontend Docs**: See README.md
- **Integration Guide**: See documentation files in Obsidian vault
- **Support**: Open an issue on GitHub

---

Happy coding! 🚀

