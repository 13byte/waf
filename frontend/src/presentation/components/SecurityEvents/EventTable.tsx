import React, { memo, useMemo, useCallback } from 'react';
import { Shield, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import type { SecurityEvent, EventTableProps } from '../../../types';

const EventTableComponent = memo<EventTableProps>(({ 
  events, 
  loading, 
  onEventClick 
}) => {
  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MEDIUM': return 'badge-info';
      case 'LOW': return 'badge-success';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  }, []);

  const getAttackTypeColor = useCallback((type: string | null) => {
    if (!type) return 'text-gray-500';
    const colors: Record<string, string> = {
      'XSS': 'text-purple-600',
      'SQLi': 'text-red-600',
      'LFI': 'text-orange-600',
      'RFI': 'text-orange-700',
      'RCE': 'text-red-700',
      'XXE': 'text-pink-600',
      'SSRF': 'text-indigo-600',
      'Path Traversal': 'text-yellow-600'
    };
    return colors[type] || 'text-gray-600';
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events]);

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center">
          <Activity className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-gray-600 dark:text-gray-400">Loading events...</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          No security events found
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source IP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                URI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attack Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
            {sortedEvents.map((event) => (
              <tr 
                key={event.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                onClick={() => onEventClick(event)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                  {event.source_ip}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-mono">
                    {event.method}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                  {event.uri}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {event.attack_type ? (
                    <span className={`font-medium ${getAttackTypeColor(event.attack_type)}`}>
                      {event.attack_type}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {event.is_blocked ? (
                    <span className="flex items-center text-red-600">
                      <Shield className="w-4 h-4 mr-1" />
                      Blocked
                    </span>
                  ) : (
                    <span className="flex items-center text-green-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Allowed
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-mono ${event.anomaly_score >= 5 ? 'text-red-600' : 'text-gray-600'}`}>
                    {event.anomaly_score}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <ChevronRight className="w-4 h-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

EventTableComponent.displayName = 'EventTable';

export default EventTableComponent;