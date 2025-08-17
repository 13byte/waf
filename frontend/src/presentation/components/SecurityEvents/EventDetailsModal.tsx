import React, { memo, useMemo } from 'react';
import { X, Copy, CheckCircle } from 'lucide-react';
import type { SecurityEvent, EventDetailsModalProps } from '../../../types';

const EventDetailsModalComponent = memo<EventDetailsModalProps>(({ 
  event, 
  isOpen, 
  onClose 
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = React.useCallback((field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const getSeverityColor = React.useCallback((severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  }, []);

  if (!isOpen || !event) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Event Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Event ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{event.id}</p>
                  <button
                    onClick={() => copyToClipboard('id', event.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copiedField === 'id' ? 
                      <CheckCircle className="w-3 h-3 text-green-500" /> : 
                      <Copy className="w-3 h-3 text-gray-500" />
                    }
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Timestamp</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {new Date(event.timestamp).toLocaleString('ko-KR')}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Source</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {event.source_ip}{event.source_port ? `:${event.source_port}` : ''}
                  </p>
                  <button
                    onClick={() => copyToClipboard('source', `${event.source_ip}${event.source_port ? `:${event.source_port}` : ''}`)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copiedField === 'source' ? 
                      <CheckCircle className="w-3 h-3 text-green-500" /> : 
                      <Copy className="w-3 h-3 text-gray-500" />
                    }
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Destination</label>
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-mono">
                    {event.destination_ip || '127.0.0.1'}{event.destination_port ? `:${event.destination_port}` : ''}
                  </p>
                  {event.target_website && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {event.target_website}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Request Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Method & URI</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-mono">
                  {event.method} {event.uri}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Status Code</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{event.status_code}</p>
              </div>
              {event.user_agent && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">User Agent</label>
                  <p className="text-xs text-gray-900 dark:text-gray-100 mt-1">{event.user_agent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Security Analysis */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Security Analysis</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Attack Type</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {event.attack_type || 'None detected'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {event.is_blocked ? (
                    <span className="text-red-600 dark:text-red-400 font-medium">Blocked</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 font-medium">Allowed</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Risk Score</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-mono">
                  {event.risk_score ? event.risk_score.toFixed(1) : '0.0'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Anomaly Score</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{event.anomaly_score || 0}</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Severity Level</label>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                  {event.severity ? event.severity.toUpperCase() : 'LOW'}
                </span>
              </div>
            </div>
            {event.rule_files && event.rule_files.length > 0 && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 dark:text-gray-400">Rule Configuration Files</label>
                <div className="mt-2 space-y-1">
                  {event.rule_files.map((file: string, idx: number) => (
                    <div key={idx} className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded">
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Matched Rules */}
          {event.rules_matched && event.rules_matched.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Matched Rules</h3>
              <div className="space-y-2">
                {event.rules_matched.map((rule: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
                        Rule ID: {typeof rule === 'string' ? rule : rule.id || rule}
                      </span>
                      {rule.severity && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                          rule.severity === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {rule.severity}
                        </span>
                      )}
                    </div>
                    {rule.message && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">{rule.message}</p>
                    )}
                    {rule.tags && rule.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Headers */}
          {event.request_headers && Object.keys(event.request_headers).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Request Headers</h3>
              <pre className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg text-xs overflow-x-auto font-mono text-gray-700 dark:text-gray-300">
                {JSON.stringify(event.request_headers, null, 2)}
              </pre>
            </div>
          )}

          {/* Request Body */}
          {event.request_body && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Request Body</h3>
              <pre className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-gray-700 dark:text-gray-300">
                {event.request_body}
              </pre>
            </div>
          )}

          {/* Raw Audit Log */}
          {event.raw_audit_log && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Raw Audit Log</h3>
              <pre className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono text-gray-700 dark:text-gray-300">
                {typeof event.raw_audit_log === 'string' 
                  ? JSON.stringify(JSON.parse(event.raw_audit_log), null, 2)
                  : JSON.stringify(event.raw_audit_log, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

EventDetailsModalComponent.displayName = 'EventDetailsModal';

export default EventDetailsModalComponent;