/**
 * =====================================================
 * Demand Forecast Component
 * =====================================================
 * Displays demand forecasting predictions with charts:
 * - 7-day demand predictions
 * - Trend analysis
 * - Seasonality patterns
 * - Confidence indicators
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/ai.service';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface Prediction {
  date: string;
  day_of_week: number;
  predicted_quantity: number;
  confidence_score: number;
}

interface ForecastData {
  product_id: number;
  predictions: Prediction[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  seasonality: {
    day_of_week_patterns: number[];
    peak_day: number;
    low_day: number;
  };
  confidence: 'high' | 'medium' | 'low';
  historical_avg: number;
  data_points: number;
}

interface DemandForecastProps {
  productId: number;
  productName?: string;
  daysAhead?: number;
  onDataLoaded?: (data: ForecastData) => void;
}

export const DemandForecast: React.FC<DemandForecastProps> = ({
  productId,
  productName = 'Product',
  daysAhead = 7,
  onDataLoaded
}) => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadForecast();
  }, [productId, daysAhead]);

  const loadForecast = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const response = await aiService.getDemandForecast(productId, daysAhead);

      if (response.success) {
        setForecast(response.data);
        if (onDataLoaded) {
          onDataLoaded(response.data);
        }
      }
    } catch (err: any) {
      console.error('Error loading forecast:', err);
      setError(err.message || 'Failed to load demand forecast');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'stable':
        return <Minus className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'decreasing':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'stable':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-700 bg-green-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'low':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const getShortDayName = (dayOfWeek: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayOfWeek];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-red-800 font-semibold">Error loading forecast</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadForecast}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!forecast || forecast.predictions.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-yellow-800 font-semibold">Insufficient data</h3>
            <p className="text-yellow-600 text-sm mt-1">
              Not enough historical sales data to generate accurate predictions. Minimum 14 days of sales history required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const maxPrediction = Math.max(...forecast.predictions.map((p) => p.predicted_quantity));
  const totalPredicted = forecast.predictions.reduce((sum, p) => sum + p.predicted_quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Demand Forecast</h3>
              <p className="text-sm text-gray-500">{productName}</p>
            </div>
          </div>
          <button
            onClick={loadForecast}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Refresh forecast"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase mb-1">Trend</p>
          <div className="flex items-center justify-center space-x-1">
            {getTrendIcon(forecast.trend)}
            <span className={`font-semibold ${getTrendColor(forecast.trend)} px-2 py-1 rounded text-sm`}>
              {forecast.trend}
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase mb-1">Confidence</p>
          <span className={`inline-block px-3 py-1 rounded font-semibold text-sm ${getConfidenceColor(forecast.confidence)}`}>
            {forecast.confidence}
          </span>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase mb-1">Total Predicted</p>
          <p className="text-2xl font-bold text-gray-900">{totalPredicted}</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase mb-1">Daily Avg</p>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(forecast.historical_avg)}
          </p>
        </div>
      </div>

      {/* Predictions Chart */}
      <div className="p-6">
        <div className="space-y-3">
          {forecast.predictions.map((prediction, index) => (
            <div key={index} className="flex items-center space-x-4">
              {/* Date Info */}
              <div className="w-32 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {new Date(prediction.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getShortDayName(prediction.day_of_week)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(prediction.predicted_quantity / maxPrediction) * 100}%`
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {prediction.predicted_quantity}
                      </span>
                    </div>
                  </div>

                  {/* Confidence Badge */}
                  <div className="w-16 text-center">
                    <div className="inline-flex items-center space-x-1 text-xs">
                      {prediction.confidence_score >= 0.7 ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : prediction.confidence_score >= 0.5 ? (
                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-gray-600">
                        {Math.round(prediction.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonality Pattern */}
      {forecast.seasonality && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Weekly Pattern</h4>
          <div className="grid grid-cols-7 gap-2">
            {forecast.seasonality.day_of_week_patterns.map((value, dayIndex) => {
              const isPeakDay = dayIndex === forecast.seasonality.peak_day;
              const isLowDay = dayIndex === forecast.seasonality.low_day;
              const avgValue =
                forecast.seasonality.day_of_week_patterns.reduce((a, b) => a + b, 0) / 7;
              const heightPercent = (value / Math.max(...forecast.seasonality.day_of_week_patterns)) * 100;

              return (
                <div key={dayIndex} className="text-center">
                  <div className="h-20 flex items-end justify-center mb-2">
                    <div
                      className={`w-full rounded-t-lg ${
                        isPeakDay
                          ? 'bg-green-500'
                          : isLowDay
                          ? 'bg-red-400'
                          : 'bg-indigo-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs font-medium text-gray-700">
                    {getShortDayName(dayIndex)}
                  </p>
                  <p className="text-xs text-gray-500">{Math.round(value)}</p>
                  {isPeakDay && (
                    <p className="text-xs text-green-600 font-semibold">Peak</p>
                  )}
                  {isLowDay && (
                    <p className="text-xs text-red-600 font-semibold">Low</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-gray-200 bg-indigo-50">
        <p className="text-xs text-gray-600 text-center">
          Based on {forecast.data_points} days of historical sales data • Updated just now
        </p>
      </div>
    </div>
  );
};
