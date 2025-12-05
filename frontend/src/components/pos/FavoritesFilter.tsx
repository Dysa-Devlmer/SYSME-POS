/**
 * Favorites Filter Component
 * Toggle between all products and favorite products only
 */

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import axios from 'axios';

interface Product {
  id: number;
  name: string;
  price: number;
  isFavorite?: boolean;
}

interface FavoritesFilterProps {
  userId: string;
  onFilterChange: (showFavoritesOnly: boolean, favorites?: Product[]) => void;
}

export const FavoritesFilter: React.FC<FavoritesFilterProps> = ({
  userId,
  onFilterChange
}) => {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchFavoritesCount();
  }, [userId]);

  useEffect(() => {
    if (showFavoritesOnly) {
      fetchFavorites();
    } else {
      onFilterChange(false);
    }
  }, [showFavoritesOnly]);

  const fetchFavoritesCount = async () => {
    try {
      const response = await axios.get(`/api/v1/favorites/${userId}/count`);
      setCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching favorites count:', error);
    }
  };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/v1/favorites/${userId}`);
      setFavorites(response.data);
      onFilterChange(true, response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
  };

  return (
    <button
      onClick={toggleFilter}
      disabled={loading || count === 0}
      className={`
        px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all
        ${showFavoritesOnly
          ? 'bg-yellow-500 text-white shadow-lg'
          : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
        }
        ${loading ? 'opacity-50 cursor-wait' : ''}
        ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={count === 0 ? 'No tienes productos favoritos' : `${count} favoritos`}
    >
      <Star
        className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`}
      />
      <span>Favoritos</span>
      {count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-bold
          ${showFavoritesOnly ? 'bg-yellow-600' : 'bg-gray-200 text-gray-700'}
        `}>
          {count}
        </span>
      )}
      {loading && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
    </button>
  );
};

export default FavoritesFilter;