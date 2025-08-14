import React, { memo, useMemo } from 'react';
import { X, Shield, AlertTriangle, Info, Copy, CheckCircle } from 'lucide-react';
import type { SecurityEvent, EventDetailsModalProps } from '../../../types';

const EventDetailsModalComponent = memo<EventDetailsModalProps>(({ 
  event, 
  isOpen, 
  onClose 
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const handleCopy = React.useCallback((field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const formatHeaders = useMemo(() => {
    if (!event?.request_headers) return [];
    return Object.entries(event.request_headers).map(([key, value]) => ({
      key,
      value: String(value)
    }));
  }, [event?.request_headers]);

  const formatRules = useMemo(() => {
    if (!event?.matched_rules) return [];
    return event.matched_rules.map((rule: any) => ({
      id: rule.id || 'N/A',
      message: rule.message || 'No message',
      severity: rule.severity || 'UNKNOWN',
      tags: rule.tags || []
    }));
  }, [event?.matched_rules]);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Event Details - {event.event_id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-semibold flex items-center mt-1">
                {event.is_blocked ? (
                  <>
                    <Shield className="w-4 h-4 mr-1 text-red-600" />
                    <span className="text-red-600">Blocked</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-1 text-green-600" />
                    <span className="text-green-600">Allowed</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">Severity</div>
              <div className={`font-semibold mt-1 ${
                event.severity === 'CRITICAL' ? 'text-red-600' :
                event.severity === 'HIGH' ? 'text-orange-600' :
                event.severity === 'MEDIUM' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {event.severity}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">Anomaly Score</div>
              <div className="font-semibold mt-1">{event.anomaly_score}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">Response Time</div>
              <div className="font-semibold mt-1">{event.response_time}ms</div>
            </div>
          </div>

          {/* Request Information */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Request Information</h3>
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Timestamp:</span>
                <span className="font-mono text-sm">{new Date(event.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Source IP:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm mr-2">{event.source_ip}</span>
                  <button
                    onClick={() => handleCopy('ip', event.source_ip)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === 'ip' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Method:</span>
                <span className="font-mono text-sm">{event.method}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">URI:</span>
                <div className="flex items-center">
                  <span className="font-mono text-sm truncate max-w-md">{event.uri}</span>
                  <button
                    onClick={() => handleCopy('uri', event.uri)}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    {copiedField === 'uri' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status Code:</span>
                <span className="font-mono text-sm">{event.status_code}</span>
              </div>
              {event.attack_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Attack Type:</span>
                  <span className="font-semibold text-sm text-red-600">{event.attack_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Request Headers */}
          {formatHeaders.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Request Headers</h3>
              <div className="bg-gray-50 rounded p-4">
                <div className="space-y-1">
                  {formatHeaders.map(({ key, value }) => (
                    <div key={key} className="flex items-start">
                      <span className="text-sm font-mono text-gray-600 mr-2">{key}:</span>
                      <span className="text-sm font-mono text-gray-900 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Matched Rules */}
          {formatRules.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Matched Rules</h3>
              <div className="space-y-2">
                {formatRules.map((rule: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm">Rule ID: {rule.id}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                        rule.severity === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{rule.message}</p>
                    {rule.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="text-xs bg-gray-200 px-2 py-1 rounded">
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

          {/* Request Body */}
          {event.request_body && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Request Body</h3>
              <div className="bg-gray-50 rounded p-4">
                <pre className="text-sm font-mono text-gray-900 whitespace-pre-wrap break-all">
                  {event.request_body}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

EventDetailsModalComponent.displayName = 'EventDetailsModal';

export default EventDetailsModalComponent;