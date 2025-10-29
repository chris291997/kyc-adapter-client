import { NavLink, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux'
import { logout } from '../../store/slices/authSlice'
import { 
  LayoutDashboard, 
  Building2, 
  Shield, 
  Users, 
  FileCheck, 
  CreditCard,
  Key,
  LogOut
} from 'lucide-react'

interface NavItem {
  name: string
  path: string
  icon: React.ReactNode
}

const adminNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Tenants', path: '/admin/tenants', icon: <Building2 className="h-5 w-5" /> },
  { name: 'Providers', path: '/admin/providers', icon: <Shield className="h-5 w-5" /> },
  { name: 'Users', path: '/admin/users', icon: <Users className="h-5 w-5" /> },
]

const tenantNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/tenant/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Verifications', path: '/tenant/verifications', icon: <FileCheck className="h-5 w-5" /> },
  { name: 'Accounts', path: '/tenant/accounts', icon: <CreditCard className="h-5 w-5" /> },
  { name: 'API Keys', path: '/tenant/api-keys', icon: <Key className="h-5 w-5" /> },
]

export default function Sidebar() {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const userType = user?.userType || user?.user_type
  const navItems = userType === 'super_admin' ? adminNavItems : tenantNavItems

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-white">
          KYC Adapter
        </h1>
        <p className="text-xs text-white/80 mt-1">
          {(user?.userType || user?.user_type)?.replace('_', ' ')}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/20">
        <div className="mb-3 px-4 py-2">
          <p className="text-sm font-medium text-white">{user?.name || user?.email}</p>
          <p className="text-xs text-white/60">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white/80 hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
