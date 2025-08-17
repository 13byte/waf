import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ChevronDown, Check, Sparkles } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
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

  if (!mounted) {
    return (
      <div className="w-32 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    );
  }

  // Get current theme config
  const getCurrentTheme = () => {
    switch (theme) {
      case 'light':
        return { icon: <Sun className="w-4 h-4" />, label: 'Light', color: 'text-amber-500' };
      case 'dark':
        return { icon: <Moon className="w-4 h-4" />, label: 'Dark', color: 'text-indigo-400' };
      default:
        return { icon: <Monitor className="w-4 h-4" />, label: 'System', color: 'text-gray-500' };
    }
  };

  const themeOptions = [
    { 
      value: 'light', 
      label: 'Light', 
      icon: <Sun className="w-4 h-4" />,
      description: 'Bright theme',
      color: 'group-hover:text-amber-500'
    },
    { 
      value: 'dark', 
      label: 'Dark', 
      icon: <Moon className="w-4 h-4" />,
      description: 'Dark theme',
      color: 'group-hover:text-indigo-400'
    },
    { 
      value: 'system', 
      label: 'System', 
      icon: <Monitor className="w-4 h-4" />,
      description: 'Auto detect',
      color: 'group-hover:text-gray-500'
    }
  ];

  const currentTheme = getCurrentTheme();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 
          bg-gradient-to-r from-gray-50 to-gray-100 
          dark:from-gray-800 dark:to-gray-700 
          hover:from-gray-100 hover:to-gray-150
          dark:hover:from-gray-700 dark:hover:to-gray-600
          border border-gray-200 dark:border-gray-600
          rounded-xl shadow-sm hover:shadow-md
          transition-all duration-300 ease-out
          ${dropdownOpen ? 'ring-2 ring-blue-500/20 dark:ring-blue-400/20' : ''}
        `}
        title="Theme settings"
      >
        <span className={`transition-colors duration-300 ${currentTheme.color}`}>
          {currentTheme.icon}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentTheme.label}
        </span>
        <ChevronDown className={`
          w-3.5 h-3.5 text-gray-400 
          transition-all duration-300 ease-out
          ${dropdownOpen ? 'rotate-180 text-blue-500' : ''}
        `} />
      </button>

      <div className={`
        absolute right-0 mt-2 w-48
        bg-white dark:bg-gray-800 
        backdrop-blur-xl backdrop-saturate-150
        rounded-2xl shadow-2xl 
        border border-gray-200 dark:border-gray-700
        overflow-hidden
        transition-all duration-300 ease-out origin-top-right
        z-50
        ${dropdownOpen 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }
      `}>
        <div className="p-1.5">
          {themeOptions.map((option, index) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setTimeout(() => setDropdownOpen(false), 150);
              }}
              className={`
                group w-full flex items-center gap-3 px-3 py-2.5 
                rounded-xl transition-all duration-200
                ${theme === option.value
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/30'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                }
              `}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <span className={`
                transition-all duration-300 
                ${theme === option.value 
                  ? 'text-blue-600 dark:text-blue-400 scale-110' 
                  : `text-gray-500 dark:text-gray-400 ${option.color}`
                }
              `}>
                {option.icon}
              </span>
              <div className="flex-1 text-left">
                <div className={`
                  text-sm font-medium
                  ${theme === option.value 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300'
                  }
                `}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {option.description}
                </div>
              </div>
              {theme === option.value && (
                <span className="flex items-center">
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 transition-all duration-300 scale-100" />
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>Theme preference saved</span>
          </div>
        </div>
      </div>

    </div>
  );
}