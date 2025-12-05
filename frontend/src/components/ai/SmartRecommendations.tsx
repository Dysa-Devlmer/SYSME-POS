/**
 * =====================================================
 * Smart Recommendations Component
 * =====================================================
 * Displays AI-powered product recommendations:
 * - Frequently bought together
 * - Upsell options
 * - Cross-sell suggestions
 * - Trending products
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/ai.service';
import { Sparkles, TrendingUp, ArrowUpRight, ShoppingBag, Plus } from 'lucide-react';

interface Product {
  product_id: number;
  name: string;
  price: number;
  reason?: string;
  confidence?: number;
  times_bought_together?: number;
  upgrade_value?: number;
  score?: number;
}

interface SmartRecommendationsProps {
  currentProductId?: number;
  customerId?: number;
  cartItems?: any[];
  onAddToCart?: (product: Product) => void;
  type: 'frequently-bought' | 'upsell' | 'cross-sell' | 'trending' | 'personalized';
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  currentProductId,
  customerId,
  cartItems = [],
  onAddToCart,
  type
}) => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [type, currentProductId, customerId, cartItems]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      switch (type) {
        case 'frequently-bought':
          if (!currentProductId) return;
          response = await aiService.getFrequentlyBoughtTogether(currentProductId);
          break;

        case 'upsell':
          if (!currentProductId) return;
          response = await aiService.getUpsellOptions(currentProductId);
          break;

        case 'cross-sell':
          if (cartItems.length === 0) return;
          response = await aiService.getCrossSellSuggestions(cartItems);
          break;

        case 'trending':
          response = await aiService.getTrendingProducts();
          break;

        case 'personalized':
          if (!customerId) return;
          response = await aiService.getPersonalizedRecommendations(customerId);
          break;

        default:
          return;
      }

      if (response.success) {
        setRecommendations(response.data);
      }
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'frequently-bought':
        return 'Frequently Bought Together';
      case 'upsell':
        return 'Premium Alternatives';
      case 'cross-sell':
        return 'Suggested Add-ons';
      case 'trending':
        return 'Trending Now';
      case 'personalized':
        return 'Recommended For You';
      default:
        return 'Recommendations';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'frequently-bought':
        return <ShoppingBag className="h-5 w-5" />;
      case 'upsell':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'cross-sell':
        return <Plus className="h-5 w-5" />;
      case 'trending':
        return <TrendingUp className="h-5 w-5" />;
      case 'personalized':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Silent fail for recommendations
  }

  if (recommendations.length === 0) {
    return null; // Don't show if no recommendations
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 text-gray-900">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-semibold">{getTitle()}</h3>
            <p className="text-xs text-gray-500">AI-powered suggestions</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          {recommendations.map((product) => (
            <div
              key={product.product_id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
              onClick={() => onAddToCart && onAddToCart(product)}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 group-hover:text-indigo-700">
                      {product.name}
                    </h4>
                    {product.reason && (
                      <p className="text-xs text-gray-500 mt-1">{product.reason}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900">
                      ${product.price.toFixed(2)}
                    </p>
                    {type === 'upsell' && product.upgrade_value && (
                      <p className="text-xs text-green-600">
                        +${product.upgrade_value.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="flex items-center mt-2 space-x-3 text-xs">
                  {product.confidence && (
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${product.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-600">
                        {Math.round(product.confidence * 100)}% match
                      </span>
                    </div>
                  )}

                  {product.times_bought_together && (
                    <span className="text-gray-600">
                      Bought together {product.times_bought_together} times
                    </span>
                  )}

                  {product.score && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                      Score: {Math.round(product.score)}
                    </span>
                  )}
                </div>
              </div>

              {onAddToCart && (
                <button
                  className="ml-4 p-2 rounded-lg bg-indigo-600 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Badge */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>Powered by AI/ML recommendation engine</span>
        </div>
      </div>
    </div>
  );
};
