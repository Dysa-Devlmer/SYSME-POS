/**
 * Favorites Service
 * API para gestión de productos favoritos
 */

import apiClient from './client';

export interface FavoriteProduct {
  favorite_id: number;
  position: number;
  id: number;
  name: string;
  description: string;
  price: number;
  cost: number;
  category_id: number;
  stock: number;
  min_stock: number;
  sku: string;
  barcode: string;
  image_url: string;
  is_active: boolean;
  category_name: string;
  category_color: string;
}

/**
 * Obtener todos los productos favoritos
 */
export const getFavorites = async (): Promise<FavoriteProduct[]> => {
  const response = await apiClient.get('/products/favorites');
  return response.data.data;
};

/**
 * Agregar producto a favoritos
 */
export const addFavorite = async (productId: number): Promise<void> => {
  await apiClient.post('/products/favorites', { product_id: productId });
};

/**
 * Remover producto de favoritos
 */
export const removeFavorite = async (productId: number): Promise<void> => {
  await apiClient.delete(`/products/favorites/${productId}`);
};

/**
 * Toggle estado de favorito
 */
export const toggleFavorite = async (productId: number): Promise<{ is_favorite: boolean }> => {
  const response = await apiClient.post(`/products/favorites/${productId}/toggle`);
  return response.data;
};

/**
 * Reordenar favoritos
 */
export const reorderFavorites = async (
  favorites: Array<{ product_id: number; position: number }>
): Promise<void> => {
  await apiClient.put('/products/favorites/reorder', { favorites });
};

export default {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  reorderFavorites
};
