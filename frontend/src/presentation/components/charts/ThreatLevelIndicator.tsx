// Threat level indicator component
import React from 'react';
import { AlertTriangle, Shield, ShieldAlert, ShieldOff } from 'lucide-react';

interface ThreatLevelIndicatorProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  reasons?: string[];
}

export const ThreatLevelIndicator: React.FC<ThreatLevelIndicatorProps> = ({
  level,
  score,
  reasons = []
}) => {
  const getLevelConfig = () => {
    switch (level) {
      case 'low':
        return {
          color: 'text-green-600 bg-green-100 dark:bg-green-900/20',
          borderColor: 'border-green-500',
          icon: <Shield className="w-8 h-8" />,
          label: 'Low Risk',
          bgGradient: 'from-green-500 to-green-600'
        };
      case 'medium':
        return {
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-500',
          icon: <ShieldAlert className="w-8 h-8" />,
          label: 'Medium Risk',
          bgGradient: 'from-yellow-500 to-yellow-600'
        };
      case 'high':
        return {
          color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
          borderColor: 'border-orange-500',
          icon: <ShieldOff className="w-8 h-8" />,
          label: 'High Risk',
          bgGradient: 'from-orange-500 to-orange-600'
        };
      case 'critical':
        return {
          color: 'text-red-600 bg-red-100 dark:bg-red-900/20',
          borderColor: 'border-red-500',
          icon: <AlertTriangle className="w-8 h-8" />,
          label: 'Critical Risk',
          bgGradient: 'from-red-500 to-red-600'
        };
    }
  };

  const config = getLevelConfig();
  const percentage = Math.min(100, score);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Threat Level</h3>
        <div className={`p-2 rounded-lg ${config.color}`}>
          {config.icon}
        </div>
      </div>

      <div className="space-y-4">
        {/* Score bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{config.label}</span>
            <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">{score}/100</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${config.bgGradient} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Risk Factors:</p>
            <ul className="space-y-1">
              {reasons.map((reason, index) => (
                <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};