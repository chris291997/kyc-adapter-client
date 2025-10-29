# KYC Adapter Frontend

A modern, multi-tenant KYC (Know Your Customer) verification frontend application built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Multi-tenant Architecture**: Support for super admin, tenant admin, and tenant user roles
- **Real-time Updates**: WebSocket integration for live verification status updates
- **Provider Management**: Configure and manage KYC verification providers
- **Webhook Management**: Generate and rotate HMAC secrets for secure webhook verification
- **API Key Management**: Create and manage API keys for programmatic access
- **Verification Workflows**: Initiate and track verification requests
- **Dark Mode**: Built-in light/dark theme toggle with persistence
- **Responsive Design**: Mobile-first design that works on all devices
- **Accessibility**: WCAG AA compliant with keyboard navigation

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Backend API**: KYC Adapter backend running on `http://localhost:3000`

## 🛠️ Tech Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation

### State Management
- **Redux Toolkit** - Global state
- **React Query** - Server state

### UI/UX
- **Tailwind CSS** - Styling
- **Headless UI** - Accessible components
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Communication
- **Axios** - HTTP client
- **Socket.IO** - WebSocket client

### Forms & Validation
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd CLIENT
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Feature Flags
VITE_API_KEYS_ONLY=false

# Environment
VITE_ENV=development
```

**Important**: The backend API does NOT use `/api/v1` prefix. Endpoints start from root:
- `/auth/login` (not `/api/v1/auth/login`)
- `/admin/dashboard` (not `/api/v1/admin/dashboard`)

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🚀 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
npm run cypress      # Open Cypress E2E tests
```

## 📁 Project Structure

```
src/
├── components/       # Reusable components
│   ├── auth/        # Authentication components
│   ├── layouts/     # Layout components
│   └── ui/          # UI components
├── constants/       # App constants
├── contexts/        # React contexts
├── hooks/           # Custom hooks
├── pages/           # Page components
│   ├── admin/       # Super admin pages
│   ├── tenant/      # Tenant pages
│   └── auth/        # Auth pages
├── services/        # API services
│   ├── apiClient.ts      # HTTP client
│   ├── authService.ts    # Authentication
│   └── websocketService.ts # WebSocket
├── store/           # Redux store
│   └── slices/      # Redux slices
├── types/           # TypeScript types
├── utils/           # Utility functions
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

## 🎯 Key Features

### 1. Authentication

- **JWT-based authentication** with automatic token refresh
- **API Key support** for external integrations
- **Role-based access control** (RBAC)
- **Automatic token expiration** handling

### 2. Dashboards

#### Super Admin Dashboard
- System-wide statistics
- Tenant management
- User management
- Provider management

#### Tenant Dashboard
- Verification statistics
- Quota usage tracking
- User management
- API key management

### 3. Verification Management

- **Initiate verifications** with custom metadata
- **Real-time status updates** via WebSocket
- **Session URL integration** for hosted workflows
- **Fallback polling** when WebSocket disconnects

### 4. Provider Management (Super Admin Only)

- View all registered providers
- **Webhook endpoint display** (provider-level, static URL)
- **Generate HMAC secrets** for webhook verification
- **Rotate secrets** with confirmation and warnings
- **Copy-to-clipboard** functionality
- Secret state indication (webhook_secret_set)

### 5. API Keys

- Create API keys with custom expiration
- View key prefix and metadata
- Revoke keys
- Copy new keys to clipboard
- Usage examples provided

## 🔐 Authentication

The application supports two authentication methods:

### 1. JWT Authentication (Dashboard)
```typescript
// Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// Response
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { ... }
}
```

### 2. API Key Authentication (External Apps)
```bash
curl -X POST https://api.kyc-adapter.com/verifications/initiate \
  -H "X-API-Key: kyc_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"verificationType": "document", "userEmail": "user@example.com"}'
```

## 🌐 API Integration

### Base Configuration

The API client is configured in `src/services/apiClient.ts`:

- **Automatic token refresh** on 401 errors
- **Request/response interceptors**
- **Error normalization**
- **Timeout handling**

### Example API Calls

```typescript
// Get dashboard stats
const stats = await apiClient.get('/admin/dashboard')

// Initiate verification
const verification = await apiClient.post('/verifications/initiate', {
  verificationType: 'document',
  userEmail: 'user@example.com',
  metadata: {
    firstName: 'John',
    lastName: 'Doe'
  }
})

// Get verification status
const status = await apiClient.get(`/verifications/${id}/status`)
```

## 🔌 WebSocket Integration

Real-time updates are handled via Socket.IO:

```typescript
import { websocketService } from './services/websocketService'

// Connect
websocketService.connect()

// Subscribe to verification updates
const unsubscribe = websocketService.subscribeToVerification(
  verificationId,
  (data) => {
    console.log('Verification update:', data)
    // Update UI
  }
)

// Cleanup
unsubscribe()
websocketService.disconnect()
```

### WebSocket Events

- `verification:status_update` - Status change
- `verification:completed` - Verification complete

## 🎨 Theming

The application supports light and dark themes with persistence:

```typescript
import { useTheme } from './contexts/ThemeContext'

function MyComponent() {
  const { isDark, toggleTheme } = useTheme()
  
  return (
    <button onClick={toggleTheme}>
      Toggle {isDark ? 'Light' : 'Dark'} Mode
    </button>
  )
}
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run cypress
```

### Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Environment Variables

Set the following environment variables for production:

```env
VITE_API_URL=https://api.your-domain.com/api/v1
VITE_WS_URL=wss://api.your-domain.com
VITE_ENV=production
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

#### Method 1: Using Netlify Dashboard (Recommended)

1. **Prepare your repository**
   - Ensure your code is pushed to GitHub, GitLab, or Bitbucket
   - Make sure `netlify.toml` and `public/_redirects` are committed

2. **Connect to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select this repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (These are already configured in `netlify.toml`)

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add the following variables:
     ```
     VITE_API_URL=https://your-api-domain.com
     VITE_WS_URL=wss://your-api-domain.com
     VITE_API_KEYS_ONLY=false
     VITE_IDMETA_API_KEY=your-api-key-if-needed
     ```
   - Replace URLs with your actual backend API URLs

5. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

#### Method 2: Using Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize site** (first time only)
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Follow the prompts

4. **Set Environment Variables**
   ```bash
   netlify env:set VITE_API_URL https://your-api-domain.com
   netlify env:set VITE_WS_URL wss://your-api-domain.com
   netlify env:set VITE_API_KEYS_ONLY false
   ```

5. **Deploy to production**
   ```bash
   netlify deploy --prod
   ```

#### Important Notes for Netlify Deployment

- **SPA Routing**: The `public/_redirects` file ensures all routes are redirected to `index.html` for React Router
- **Environment Variables**: All `VITE_*` variables must be set in Netlify's dashboard
- **Build Output**: The build creates files in the `dist/` directory (configured in `netlify.toml`)
- **API URLs**: Make sure your backend API URLs support CORS and are accessible from Netlify's domain
- **WebSocket**: Use `wss://` (secure WebSocket) for production, not `ws://`

#### Troubleshooting Netlify Deployment

- **404 on routes**: Ensure `public/_redirects` file exists and is committed
- **API calls failing**: Check CORS settings on your backend
- **Environment variables not working**: Make sure they start with `VITE_` and are set in Netlify dashboard
- **Build fails**: Check build logs in Netlify dashboard for errors

## 📝 Demo Credentials

### Super Admin
- Email: `admin@email.com`
- Password: `123password`

### Tenant Admin
- Email: `tenant@email.com`
- Password: `123password`

*Note: These are the default credentials set up in your backend. Check your backend seed data if these don't work.*

## 🔒 Security

- **No tenantId in requests** - Backend derives from JWT
- **Secrets never exposed** - Only state indicator shown
- **HMAC webhook verification** - Secure webhook signatures
- **API key prefix only** - Full keys never displayed after creation
- **Token refresh** - Automatic token renewal
- **CORS protection** - Backend handles CORS
- **XSS protection** - React's built-in protections

## 🐛 Troubleshooting

### WebSocket Connection Issues

If WebSocket fails to connect:

1. Check backend is running
2. Verify WS_URL in `.env`
3. Check browser console for errors
4. Ensure JWT token is valid

### API Errors

Common issues:

- **401 Unauthorized**: Token expired or invalid
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Endpoint doesn't exist
- **500 Server Error**: Backend issue

## 📚 Documentation

- [Backend API Documentation](http://localhost:3000/api/docs)
- [Frontend Integration Guide](../DOCS/59-Frontend-Integration-Guide.md)
- [Frontend Requirements](../DOCS/60-Frontend-Requirements.md)
- [API Reference](../DOCS/51-API-Reference-Complete.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support, please contact:
- Email: support@kyc-adapter.com
- Documentation: https://docs.kyc-adapter.com

## 🙏 Acknowledgments

- Backend team for comprehensive API documentation
- Design team for UI/UX specifications
- Open source community for amazing tools

---

**Built with ❤️ by the KYC Adapter Team**

