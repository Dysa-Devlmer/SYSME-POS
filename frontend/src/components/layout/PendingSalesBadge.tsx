/**
 * Pending Sales Badge Component
 * Shows count of open/suspended sales with real-time updates
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { socket } from '../../services/socket';

interface PendingSalesBadgeProps {
  userId?: string;
  showAll?: boolean; // Show all pending sales or just current user's
  onClick?: () => void;
}

export const PendingSalesBadge: React.FC<PendingSalesBadgeProps> = ({
  userId,
  showAll = false,
  onClick
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingSales();

    // Listen for real-time updates
    socket.on('sale:created', handleSaleUpdate);
    socket.on('sale:updated', handleSaleUpdate);
    socket.on('sale:completed', handleSaleUpdate);
    socket.on('sale:cancelled', handleSaleUpdate);

    return () => {
      socket.off('sale:created', handleSaleUpdate);
      socket.off('sale:updated', handleSaleUpdate);
      socket.off('sale:completed', handleSaleUpdate);
      socket.off('sale:cancelled', handleSaleUpdate);
    };
  }, [userId, showAll]);

  const fetchPendingSales = async () => {
    try {
      const endpoint = showAll
        ? '/api/v1/sales/pending'
        : `/api/v1/sales/pending/user/${userId}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaleUpdate = () => {
    fetchPendingSales();
  };

  const getBadgeColor = () => {
    if (pendingCount === 0) return 'bg-gray-400';
    if (pendingCount > 10) return 'bg-red-500 animate-pulse';
    if (pendingCount > 5) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="relative inline-block">
        <ShoppingCart className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 bg-gray-300 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          ...
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="relative inline-block hover:opacity-80 transition-opacity"
      title={`${pendingCount} venta${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`}
    >
      <ShoppingCart className="w-6 h-6" />
      {pendingCount > 0 && (
        <span className={`
          absolute -top-2 -right-2
          ${getBadgeColor()}
          text-white text-xs font-bold
          rounded-full min-w-[20px] h-5
          flex items-center justify-center
          px-1
        `}>
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  );
};

export default PendingSalesBadge;