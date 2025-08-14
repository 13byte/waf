// Modern main layout with enhanced design
import React, { useState, useEffect } from 'react';
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
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { NavItem } from '../../types';
import { NotificationBell } from '../../components/NotificationBell';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const location = useLocation();
  const navigate = useNavigate();
  const { state, logout } = useAuth();
  const user = state.user;

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { path: '/security-events', label: 'Security Events', icon: <Activity className="w-5 h-5" /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/attack-lab', label: 'Attack Lab', icon: <Bug className="w-5 h-5" /> },
    { path: '/config', label: 'Configuration', icon: <Settings className="w-5 h-5" /> }
  ];

  const isActive = (path: string) => location.pathname === path;

  // Handle theme changes
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', systemPrefersDark);
      } else {
        root.classList.toggle('dark', theme === 'dark');
      }
    };

    applyTheme(savedTheme || 'system');

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    const root = document.documentElement;
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemPrefersDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-50">
      {/* Mesh gradient background - Matching HTML preview */}
      <div className="mesh-gradient" />
      
      <div className="relative flex h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white dark:bg-gray-100 border-r border-gray-200 dark:border-gray-300 transition-all duration-300 flex flex-col z-40`}
        >
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-300">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-800">
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
                    : 'text-gray-700 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-200'
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

          {/* User Section */}
          {user && (
            <div className="border-t border-gray-200 dark:border-gray-300 p-3">
              <div className={`${sidebarOpen ? 'flex items-center gap-3' : 'flex justify-center'}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center text-white font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {sidebarOpen && (
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-600">
                      {user.email}
                    </p>
                  </div>
                )}
                {sidebarOpen && (
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 text-gray-600 dark:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 bg-white dark:bg-gray-100 border-b border-gray-200 dark:border-gray-300 flex items-center justify-between px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-600" />
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {/* Theme Switcher */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-1.5 rounded-md transition-colors ${
                    theme === 'light' 
                      ? 'bg-white dark:bg-gray-50 shadow-sm text-primary' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-800'
                  }`}
                  title="Light mode"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-1.5 rounded-md transition-colors ${
                    theme === 'system' 
                      ? 'bg-white dark:bg-gray-50 shadow-sm text-primary' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-800'
                  }`}
                  title="System theme"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-1.5 rounded-md transition-colors ${
                    theme === 'dark' 
                      ? 'bg-white dark:bg-gray-50 shadow-sm text-primary' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-800'
                  }`}
                  title="Dark mode"
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              {user && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-800">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-600">
                      Administrator
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
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