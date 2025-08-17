import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Shield, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load notifications from localStorage
  useEffect(() => {
    // Check if user has intentionally cleared notifications
    const wasCleared = localStorage.getItem('waf_notifications_cleared');
    loadNotifications(wasCleared === 'true');
    
    // Listen for new critical events from WebSocket
    const handleStorageChange = (e: StorageEvent) => {
      // Only reload if waf_notifications was actually changed
      if (e.key === 'waf_notifications' || e.key === null) {
        loadNotifications(true); // Skip demo when storage changes
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = (skipDemo = false) => {
    const stored = localStorage.getItem('waf_notifications');
    if (stored) {
      try {
        const notifs: Notification[] = JSON.parse(stored);
        setNotifications(notifs.slice(0, 10)); // Keep only last 10
        setUnreadCount(notifs.filter(n => !n.read).length);
      } catch (error) {
        // If JSON parsing fails, clear corrupted data
        localStorage.removeItem('waf_notifications');
        setNotifications([]);
        setUnreadCount(0);
      }
    } else if (!skipDemo) {
      // Only add demo notifications on initial load, not after clearing
      const demoNotifications: Notification[] = [
        {
          id: '1',
          type: 'critical',
          title: 'Critical SQL Injection Blocked',
          message: 'Attack from 192.168.1.100 was blocked',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          read: false
        },
        {
          id: '2',
          type: 'attack',
          title: 'XSS Attack Detected',
          message: 'Multiple XSS attempts from suspicious IP',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: false
        },
        {
          id: '3',
          type: 'blocked',
          title: 'Path Traversal Blocked',
          message: 'Attempted directory traversal attack prevented',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          read: true
        }
      ];
      localStorage.setItem('waf_notifications', JSON.stringify(demoNotifications));
      setNotifications(demoNotifications);
      setUnreadCount(demoNotifications.filter(n => !n.read).length);
    } else {
      // After clearing, keep it empty
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('waf_notifications', JSON.stringify(updated));
    setUnreadCount(updated.filter(n => !n.read).length);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('waf_notifications', JSON.stringify(updated));
    setUnreadCount(0);
  };

  const clearAll = () => {
    // Set a flag to indicate intentional clearing
    localStorage.setItem('waf_notifications_cleared', 'true');
    localStorage.removeItem('waf_notifications');
    setNotifications([]);
    setUnreadCount(0);
    setDropdownOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'attack':
        return <Shield className="w-4 h-4 text-orange-500" />;
      default:
        return <Shield className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {dropdownOpen && (
        <div className={`
          absolute right-0 mt-2 w-80 z-50 max-h-96 overflow-hidden flex flex-col
          bg-white/95 dark:bg-gray-800/95 
          backdrop-blur-xl backdrop-saturate-150
          rounded-2xl shadow-2xl 
          border border-gray-200/50 dark:border-gray-700/50
          transition-all duration-300 ease-out origin-top-right
          animate-dropdown-enter
        `}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.eventId) {
                        navigate(`/security-events?event=${notification.eventId}`);
                        setDropdownOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  navigate('/security-events');
                  setDropdownOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center space-x-1"
              >
                <span>View all events</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}