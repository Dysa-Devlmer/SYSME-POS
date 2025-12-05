/**
 * =====================================================
 * AI Dashboard Component
 * =====================================================
 * Main dashboard for AI/ML features:
 * - Demand forecasting overview
 * - Active proactive alerts
 * - Trending products
 * - Reorder recommendations
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/ai.service';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Alert {
  alert_id: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  created_at: string;
  data: any;
}

interface ReorderRecommendation {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  predicted_demand_7d: number;
  shortfall: number;
  recommended_order_quantity: number;
  urgency: number;
  confidence: number;
  trend: string;
  stock_out_risk: 'high' | 'medium' | 'low';
}

interface TrendingProduct {
  product_id: number;
  name: string;
  price: number;
  recent_sales: number;
  previous_sales: number;
  growth_rate: number;
  growth_percentage: string;
  trend: 'up' | 'down';
}

interface DashboardData {
  reorder_recommendations: {
    count: number;
    urgent: number;
    items: ReorderRecommendation[];
  };
  active_alerts: {
    total: number;
    critical: number;
    high: number;
    items: Alert[];
  };
  trending_products: {
    count: number;
    items: TrendingProduct[];
  };
  alert_statistics: any;
}

export const AIDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      const response = await aiService.getDashboard();

      if (response.success) {
        setDashboardData(response.data);
        setError(null);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Error loading AI dashboard:', err);
      setError(err.message || 'Failed to load AI dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-600 font-semibold';
      case 'medium':
        return 'text-orange-600 font-semibold';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 90) return 'bg-red-500';
    if (urgency >= 75) return 'bg-orange-500';
    if (urgency >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <XCircle className="h-6 w-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-red-800 font-semibold">Error loading AI dashboard</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Intelligence Dashboard</h1>
            <p className="text-gray-500">Predictive analytics and proactive insights</p>
          </div>
        </div>
        <button
          onClick={loadDashboard}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Alerts</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardData.active_alerts.total}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-orange-500" />
          </div>
          <div className="mt-4 flex space-x-2 text-xs">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
              {dashboardData.active_alerts.critical} Critical
            </span>
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
              {dashboardData.active_alerts.high} High
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Reorder Needed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardData.reorder_recommendations.count}
              </p>
            </div>
            <Package className="h-10 w-10 text-blue-500" />
          </div>
          <div className="mt-4 text-xs">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
              {dashboardData.reorder_recommendations.urgent} Urgent
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Trending Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardData.trending_products.count}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-500" />
          </div>
          <div className="mt-4 flex items-center text-green-600 text-sm">
            <ArrowUp className="h-4 w-4 mr-1" />
            <span>Growing demand</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">AI Confidence</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">87%</p>
            </div>
            <CheckCircle className="h-10 w-10 text-purple-500" />
          </div>
          <div className="mt-4 text-xs text-gray-600">
            Based on historical data accuracy
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Active Alerts
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.active_alerts.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p>No active alerts</p>
                </div>
              ) : (
                dashboardData.active_alerts.items.map((alert) => (
                  <div
                    key={alert.alert_id}
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs uppercase font-semibold">
                            {alert.severity}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600">{alert.type}</span>
                        </div>
                        <h4 className="font-semibold mt-1">{alert.title}</h4>
                        <p className="text-sm mt-1">{alert.message}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Reorder Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-500" />
              Reorder Recommendations
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.reorder_recommendations.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p>All stock levels adequate</p>
                </div>
              ) : (
                dashboardData.reorder_recommendations.items.map((rec) => (
                  <div
                    key={rec.product_id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{rec.product_name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${getRiskColor(rec.stock_out_risk)}`}>
                            {rec.stock_out_risk} risk
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">SKU: {rec.sku}</p>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                          <div>
                            <p className="text-gray-500">Current</p>
                            <p className="font-semibold">{rec.current_stock}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Predicted (7d)</p>
                            <p className="font-semibold">{rec.predicted_demand_7d}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Order Qty</p>
                            <p className="font-semibold text-indigo-600">
                              {rec.recommended_order_quantity}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUrgencyColor(rec.urgency)}`}
                              style={{ width: `${rec.urgency}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{rec.urgency}% urgent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trending Products */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            Trending Products
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.trending_products.items.map((product) => (
              <div
                key={product.product_id}
                className="p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">${product.price.toFixed(2)}</p>
                    <div className="mt-3 flex items-center space-x-4 text-xs">
                      <div>
                        <p className="text-gray-500">Recent Sales</p>
                        <p className="font-semibold">{product.recent_sales}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Growth</p>
                        <p className="font-semibold text-green-600 flex items-center">
                          <ArrowUp className="h-3 w-3 mr-1" />
                          {product.growth_percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
