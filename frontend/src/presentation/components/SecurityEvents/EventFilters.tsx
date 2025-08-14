import React, { memo, useCallback } from 'react';
import { Search, X, Filter, Download } from 'lucide-react';
import type { EventFiltersState, EventFiltersProps } from '../../../types';

const EventFiltersComponent = memo<EventFiltersProps>(({ 
  filters, 
  onFilterChange, 
  onExport,
  eventCount 
}) => {
  const handleFilterChange = useCallback((key: keyof EventFiltersState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFilterChange]);

  const handleClearFilters = useCallback(() => {
    onFilterChange({
      search: '',
      severity: '',
      attackType: '',
      isBlocked: '',
      startDate: '',
      endDate: '',
      sourceIp: '',
      destinationIp: '',
      domain: '',
      method: '',
      statusCode: '',
      riskScore: ''
    });
  }, [onFilterChange]);

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {eventCount} events
          </span>
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary hover:text-primary-dark transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onExport}
            className="btn-primary text-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 input-field"
          />
        </div>

        {/* Severity Filter */}
        <select
          value={filters.severity}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
          className="input-field"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Attack Type Filter */}
        <select
          value={filters.attackType}
          onChange={(e) => handleFilterChange('attackType', e.target.value)}
          className="input-field"
        >
          <option value="">All Attack Types</option>
          <option value="XSS">XSS</option>
          <option value="SQLi">SQL Injection</option>
          <option value="LFI">Local File Inclusion</option>
          <option value="RFI">Remote File Inclusion</option>
          <option value="RCE">Remote Code Execution</option>
          <option value="XXE">XML External Entity</option>
          <option value="SSRF">Server-Side Request Forgery</option>
        </select>

        {/* Blocked Status Filter */}
        <select
          value={filters.isBlocked}
          onChange={(e) => handleFilterChange('isBlocked', e.target.value)}
          className="input-field"
        >
          <option value="">All Status</option>
          <option value="true">Blocked</option>
          <option value="false">Allowed</option>
        </select>

        {/* Source IP Filter */}
        <input
          type="text"
          placeholder="Source IP"
          value={filters.sourceIp}
          onChange={(e) => handleFilterChange('sourceIp', e.target.value)}
          className="input-field"
        />

        {/* Destination IP Filter */}
        <input
          type="text"
          placeholder="Destination IP"
          value={filters.destinationIp}
          onChange={(e) => handleFilterChange('destinationIp', e.target.value)}
          className="input-field"
        />

        {/* Domain Filter */}
        <input
          type="text"
          placeholder="Domain"
          value={filters.domain}
          onChange={(e) => handleFilterChange('domain', e.target.value)}
          className="input-field"
        />

        {/* HTTP Method Filter */}
        <select
          value={filters.method}
          onChange={(e) => handleFilterChange('method', e.target.value)}
          className="input-field"
        >
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        {/* Status Code Filter */}
        <input
          type="text"
          placeholder="Status Code"
          value={filters.statusCode}
          onChange={(e) => handleFilterChange('statusCode', e.target.value)}
          className="input-field"
        />

        {/* Date Range */}
        <input
          type="datetime-local"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="input-field"
        />
        <input
          type="datetime-local"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="input-field"
        />
      </div>
    </div>
  );
});

EventFiltersComponent.displayName = 'EventFilters';

export default EventFiltersComponent;