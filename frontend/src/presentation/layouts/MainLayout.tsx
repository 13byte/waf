// Modern main layout with enhanced design
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Home,
  Activity,
  Bug,
  Settings,
  BarChart3,
  Menu,
  LogOut,
  ChevronRight,
  X,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { NavItem } from '../../types';
import { NotificationBell } from '../../components/NotificationBell';
import { ThemeToggle } from '../../components/ThemeToggle';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { state, logout } = useAuth();
  const user = state.user;

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/security-events', label: 'Security Events', icon: <Activity className="w-5 h-5" /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/rules', label: 'WAF Rules', icon: <FileText className="w-5 h-5" /> },
    { path: '/attack-lab', label: 'Attack Lab', icon: <Bug className="w-5 h-5" /> },
    { path: '/config', label: 'Configuration', icon: <Settings className="w-5 h-5" /> }
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mesh gradient background - Matching HTML preview */}
      <div className="mesh-gradient" />
      
      <div className="relative flex h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col z-40`}
        >
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  WAF Security
                </span>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className={`${!sidebarOpen && 'mx-auto'}`}>{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {isActive(item.path) && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </>
                )}
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20
                hover:text-red-600 dark:hover:text-red-400 transition-all duration-200
                ${!sidebarOpen && 'justify-center'}
              `}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {/* Theme Switcher */}
              <ThemeToggle />

              {/* Notifications */}
              <NotificationBell />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;