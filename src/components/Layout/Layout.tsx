import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const roleNames: Record<string, string> = {
  journalist: '记者',
  editor: '编辑',
  legal: '法务',
  admin: '管理员',
};

const roleColors: Record<string, string> = {
  journalist: 'bg-blue-500/20 text-blue-400',
  editor: 'bg-green-500/20 text-green-400',
  legal: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-orange-500/20 text-orange-400',
};

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: '工作台', icon: LayoutDashboard },
    { path: '/manuscripts', label: '稿件管理', icon: FileText },
    { path: '/corrections', label: '更正单', icon: AlertCircle },
    { path: '/history', label: '历史记录', icon: History },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/settings', label: '配置管理', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="fixed top-0 left-0 right-0 h-16 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-sm">
                更
              </div>
              <span className="font-semibold text-lg hidden sm:block">稿件更正工作台</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role]}`}>
                  {roleNames[user.role]}
                </span>
                <span className="text-sm text-gray-400 hidden sm:block">{user.displayName}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="退出登录"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-gray-900/50 border-r border-gray-800 z-40 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'hover:bg-gray-800/50 text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="pt-16 lg:pl-64">
        <div className="p-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
