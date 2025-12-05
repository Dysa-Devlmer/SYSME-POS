/**
 * =====================================================
 * Proactive Alerts Component
 * =====================================================
 * Displays and manages AI-generated proactive alerts:
 * - Inventory warnings
 * - Sales anomalies
 * - Expiring products
 * - Stock-out predictions
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/ai.service';
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  TrendingDown,
  Package,
  Calendar,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';

interface Alert {
  alert_id: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  created_at: string;
  status: 'active' | 'dismissed' | 'resolved';
  data: any;
  recommended_action?: string;
}

interface ProactiveAlertsProps {
  showDismissed?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  maxAlerts?: number;
  filterSeverity?: string[];
  filterType?: string[];
  onAlertClick?: (alert: Alert) => void;
}

export const ProactiveAlerts: React.FC<ProactiveAlertsProps> = ({
  showDismissed = false,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  maxAlerts = 20,
  filterSeverity = [],
  filterType = [],
  onAlertClick
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<number | null>(null);

  useEffect(() => {
    loadAlerts();

    if (autoRefresh) {
      const interval = setInterval(loadAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, filterSeverity, filterType, maxAlerts]);

  const loadAlerts = async () => {
    try {
      const filters: any = { limit: maxAlerts };

      if (filterSeverity.length > 0) {
        filters.severity = filterSeverity.join(',');
      }

      if (filterType.length > 0) {
        filters.type = filterType.join(',');
      }

      const response = await aiService.getActiveAlerts(filters);

      if (response.success) {
        setAlerts(response.data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading alerts:', err);
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      setDismissing(alertId);
      const response = await aiService.dismissAlert(alertId);

      if (response.success) {
        // Remove alert from list
        setAlerts(alerts.filter((a) => a.alert_id !== alertId));
      }
    } catch (err: any) {
      console.error('Error dismissing alert:', err);
      alert('Failed to dismiss alert: ' + err.message);
    } finally {
      setDismissing(null);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'stock_out':
        return <Package className="h-4 w-4" />;
      case 'sales_anomaly':
      case 'sales_drop':
        return <TrendingDown className="h-4 w-4" />;
      case 'expiring_soon':
        return <Calendar className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <XCircle className="h-6 w-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-red-800 font-semibold">Error loading alerts</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadAlerts}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">
            No active alerts at the moment. Our AI is monitoring your business.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div
          key={alert.alert_id}
          className={`rounded-lg border-2 p-5 transition-all ${getSeverityColor(
            alert.severity
          )} ${onAlertClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
          onClick={() => onAlertClick && onAlertClick(alert)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="mt-1">{getSeverityIcon(alert.severity)}</div>

              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center space-x-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${getSeverityBadgeColor(
                      alert.severity
                    )}`}
                  >
                    {alert.severity}
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    {getTypeIcon(alert.type)}
                    <span className="uppercase">{alert.type.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Title & Message */}
                <h4 className="font-semibold text-base mb-1">{alert.title}</h4>
                <p className="text-sm leading-relaxed mb-3">{alert.message}</p>

                {/* Data Details */}
                {alert.data && (
                  <div className="bg-white bg-opacity-60 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(alert.data).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600 capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>{' '}
                          <span className="font-semibold">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Action */}
                {alert.recommended_action && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-indigo-900 mb-1">
                          Recommended Action
                        </p>
                        <p className="text-xs text-indigo-700">
                          {alert.recommended_action}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(alert.created_at)}</span>
                  </div>
                  <span>•</span>
                  <span>{new Date(alert.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(alert.alert_id);
              }}
              disabled={dismissing === alert.alert_id}
              className="ml-4 p-2 rounded-lg hover:bg-white hover:bg-opacity-50 transition-colors disabled:opacity-50"
              title="Dismiss alert"
            >
              {dismissing === alert.alert_id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              ) : (
                <X className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
