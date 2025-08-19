import React, { memo, useMemo, useCallback } from 'react';
import { Shield, AlertTriangle, ChevronRight, Activity, Globe, Ban, CheckCircle, Zap } from 'lucide-react';
import type { SecurityEvent, EventTableProps } from '../../../types';
import { toKSTTimeString, toKSTDateString } from '../../../utils/datetime';

const EventTableComponent = memo<EventTableProps>(({ 
  events, 
  loading, 
  onEventClick 
}) => {
  const getSeverityColor = useCallback((severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }, []);

  const getAttackTypeIcon = useCallback((type: string | null) => {
    if (!type) return null;
    switch (type) {
      case 'XSS':
      case 'SQLI':
      case 'RCE':
        return <Zap className="w-3 h-3 text-red-500" />;
      default:
        return <Shield className="w-3 h-3 text-yellow-500" />;
    }
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <Activity className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading events...</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex flex-col items-center justify-center h-48">
          <Shield className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No security events found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Destination
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Request
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attack
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedEvents.map((event) => (
              <tr 
                key={event.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                onClick={() => onEventClick(event)}
              >
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {toKSTTimeString(event.timestamp)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {toKSTDateString(event.timestamp)}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <div>
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {event.source_ip}{event.source_port ? `:${event.source_port}` : ''}
                      </div>
                      {event.country && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {event.country}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div>
                    <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {event.destination_ip || '127.0.0.1'}{event.destination_port ? `:${event.destination_port}` : ''}
                    </div>
                    {event.target_website && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {event.target_website}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                      {event.method}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs" title={event.uri}>
                      {event.uri}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Status: {event.status_code}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {event.attack_type ? (
                    <div className="flex items-center gap-1.5">
                      {getAttackTypeIcon(event.attack_type)}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {event.attack_type}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {event.is_blocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                      <Ban className="w-3 h-3" />
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Allowed
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`font-mono text-sm ${(event.risk_score || 0) >= 50 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {event.risk_score ? event.risk_score.toFixed(1) : '0.0'}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">
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