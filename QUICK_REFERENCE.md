# Quick Reference Card

## 🚀 Start Project
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
```

## 🔐 Demo Logins
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@email.com | 123password |
| Tenant Admin | tenant@email.com | 123password |

## 📁 Key Directories
```
src/
  components/    # Reusable UI components
  pages/         # Page components (admin/, tenant/, auth/)
  services/      # API, Auth, WebSocket services
  store/         # Redux store and slices
  utils/         # Helper functions
  types/         # TypeScript types
```

## 🔌 API Usage

### HTTP Calls
```typescript
import { apiClient } from '@/services/apiClient'

// GET
const data = await apiClient.get('/endpoint')

// POST
const result = await apiClient.post('/endpoint', payload)

// PUT
const updated = await apiClient.put('/endpoint/:id', payload)

// DELETE
await apiClient.delete('/endpoint/:id')
```

### WebSocket
```typescript
import { websocketService } from '@/services/websocketService'

// Connect
websocketService.connect()

// Subscribe to verification
const unsubscribe = websocketService.subscribeToVerification(
  verificationId,
  (data) => console.log('Update:', data)
)

// Cleanup
unsubscribe()
websocketService.disconnect()
```

## 🎨 UI Components

### Import Pattern
```typescript
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
```

### Button
```tsx
<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>

// Variants: primary, secondary, danger, ghost, outline
// Sizes: sm, md, lg
```

### Card
```tsx
<Card hover>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### Modal
```tsx
<Modal 
  isOpen={isOpen} 
  onClose={onClose} 
  title="Modal Title"
  size="md"
>
  <div>Modal content</div>
  <ModalActions>
    <Button>Action</Button>
  </ModalActions>
</Modal>
```

### Table
```tsx
<Table>
  <TableHead>
    <TableRow>
      <TableHeader>Header</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## 🔑 Authentication

### Check Auth Status
```typescript
import { useAppSelector } from '@/hooks/useRedux'

const { isAuthenticated, user } = useAppSelector(state => state.auth)
```

### Login
```typescript
import { useAppDispatch } from '@/hooks/useRedux'
import { login } from '@/store/slices/authSlice'

const dispatch = useAppDispatch()
await dispatch(login({ email, password }))
```

### Logout
```typescript
import { logout } from '@/store/slices/authSlice'

dispatch(logout())
```

## 🎨 Theming

### Use Theme
```typescript
import { useTheme } from '@/contexts/ThemeContext'

const { isDark, toggleTheme, setTheme } = useTheme()
```

### Theme Toggle Component
```tsx
import ThemeToggle from '@/components/ui/ThemeToggle'

<ThemeToggle showLabel={true} />
```

## 📊 Data Fetching

### React Query
```typescript
import { useQuery } from '@tanstack/react-query'

const { data, isLoading, error } = useQuery({
  queryKey: ['key'],
  queryFn: () => apiClient.get('/endpoint'),
})
```

### Mutation
```typescript
import { useMutation } from '@tanstack/react-query'

const mutation = useMutation({
  mutationFn: (data) => apiClient.post('/endpoint', data),
  onSuccess: () => {
    // Handle success
  },
})
```

## 🛣️ Navigation

### Link Navigation
```tsx
import { Link } from 'react-router-dom'

<Link to="/path">Navigate</Link>
```

### Programmatic Navigation
```typescript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate('/path')
```

### Protected Routes
```tsx
<ProtectedRoute requiredUserType="super_admin">
  <Component />
</ProtectedRoute>
```

## 🔧 Utilities

### Format Functions
```typescript
import { formatDate, formatTimeAgo, formatNumber } from '@/utils/format'

formatDate('2024-01-01') // "Jan 01, 2024"
formatTimeAgo('2024-01-01') // "2 days ago"
formatNumber(1000) // "1,000"
```

### Crypto Functions
```typescript
import { generateHMACSecret, copyToClipboard } from '@/utils/crypto'

const secret = generateHMACSecret(32)
await copyToClipboard(text)
```

### Class Names
```typescript
import { cn } from '@/utils/cn'

<div className={cn('base-class', condition && 'conditional-class')} />
```

## 🪝 Custom Hooks

### Redux Hooks
```typescript
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux'

const state = useAppSelector(state => state.auth)
const dispatch = useAppDispatch()
```

### Debounce Hook
```typescript
import { useDebounce } from '@/hooks/useDebounce'

const debouncedValue = useDebounce(value, 500)
```

## 🎯 Environment Variables

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_API_KEYS_ONLY=false
VITE_ENV=development
```

**⚠️ Important**: Backend does NOT use `/api/v1` prefix!

Access in code:
```typescript
import.meta.env.VITE_API_URL
```

## 📝 TypeScript Types

### Import Types
```typescript
import type { 
  User, 
  Tenant, 
  Verification, 
  Provider,
  ApiKey 
} from '@/types'
```

## 🐛 Debugging

### Check Redux State
```typescript
import { useAppSelector } from '@/hooks/useRedux'

const state = useAppSelector(state => state)
console.log('Redux State:', state)
```

### Check Local Storage
```javascript
// In browser console
localStorage.getItem('access_token')
localStorage.getItem('user')
```

### WebSocket Status
```typescript
websocketService.isConnected() // true/false
```

## 📦 Build & Deploy

```bash
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
npm run test         # Run tests
```

## 🔍 Common Patterns

### Loading State
```tsx
if (isLoading) return <LoadingSpinner />
if (error) return <div>Error: {error.message}</div>
return <div>{data}</div>
```

### Empty State
```tsx
{items.length === 0 ? (
  <EmptyState 
    title="No items" 
    description="Add your first item"
    action={<Button>Add Item</Button>}
  />
) : (
  <ItemList items={items} />
)}
```

### Modal Pattern
```tsx
const [isOpen, setIsOpen] = useState(false)

<Button onClick={() => setIsOpen(true)}>Open</Button>
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  Content
</Modal>
```

## 🚨 Important Rules

### ❌ Never Do
```typescript
// Don't send tenantId
apiClient.get('/accounts?tenantId=123') // ❌

// Don't expose secrets
console.log(apiKey) // ❌
localStorage.setItem('secret', secret) // ❌
```

### ✅ Always Do
```typescript
// Let backend derive tenantId
apiClient.get('/accounts') // ✅

// Show secrets once
setNewSecret(secret)
copyToClipboard(secret)
setNewSecret('') // Clear after use ✅
```

## 🎓 Best Practices

1. **Components**: Keep small and focused
2. **Types**: Always define TypeScript types
3. **Errors**: Handle all error cases
4. **Loading**: Show loading states
5. **Empty**: Show empty states
6. **Cleanup**: Unsubscribe from events
7. **Security**: Never log sensitive data

## 📞 Get Help

- Backend API: http://localhost:3000/api/docs
- Frontend Docs: README.md
- Setup Guide: SETUP_GUIDE.md
- Project Summary: PROJECT_SUMMARY.md

---

**Quick Tip**: Use Cmd/Ctrl+P in VS Code to quickly find files!

