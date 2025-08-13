// Stat card component
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'blue'
}) => {
  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500'
    };
    return colors[color];
  };

  const getTrend = () => {
    if (!change) return null;
    
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span>+{change}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <TrendingDown className="w-4 h-4 mr-1" />
          <span>{change}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-500 text-sm">
          <Minus className="w-4 h-4 mr-1" />
          <span>0%</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change !== undefined && (
            <div className="mt-2">
              {getTrend()}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${getColorClasses()} bg-opacity-10`}>
          <div className={`${getColorClasses()} bg-opacity-100`}>
            {React.cloneElement(icon as React.ReactElement, {
              className: 'w-6 h-6 text-white'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};