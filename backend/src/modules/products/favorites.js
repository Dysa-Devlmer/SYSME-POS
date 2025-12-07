/**
 * Product Favorites Module
 * Gestión de productos favoritos para acceso rápido en POS
 */

import { getDatabase } from '../../config/database.js';

const getDb = () => getDatabase();

// Ensure favorites table exists
const ensureFavoritesTable = () => {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_user ON product_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_position ON product_favorites(position);
  `);
};

/**
 * Get all favorite products
 */
export const getFavorites = async (req, res) => {
  try {
    ensureFavoritesTable();
    const db = getDb();
    const userId = req.user?.id || null;

    const favorites = db.prepare(`
      SELECT
        pf.id as favorite_id,
        pf.position,
        p.*,
        c.name as category_name,
        c.color as category_color
      FROM product_favorites pf
      JOIN products p ON pf.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (pf.user_id = ? OR pf.user_id IS NULL)
        AND p.is_active = 1
      ORDER BY pf.position ASC, pf.created_at ASC
    `).all(userId);

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo favoritos',
      error: error.message
    });
  }
};

/**
 * Add product to favorites
 */
export const addFavorite = async (req, res) => {
  try {
    ensureFavoritesTable();
    const db = getDb();
    const { product_id } = req.body;
    const userId = req.user?.id || null;

    // Check if product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Get max position
    const maxPos = db.prepare(`
      SELECT COALESCE(MAX(position), 0) as max_pos
      FROM product_favorites
      WHERE user_id = ? OR user_id IS NULL
    `).get(userId);

    // Insert favorite
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO product_favorites (product_id, user_id, position)
      VALUES (?, ?, ?)
    `);

    stmt.run(product_id, userId, (maxPos?.max_pos || 0) + 1);

    res.json({
      success: true,
      message: 'Producto agregado a favoritos'
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando favorito',
      error: error.message
    });
  }
};

/**
 * Remove product from favorites
 */
export const removeFavorite = async (req, res) => {
  try {
    ensureFavoritesTable();
    const db = getDb();
    const { product_id } = req.params;
    const userId = req.user?.id || null;

    db.prepare(`
      DELETE FROM product_favorites
      WHERE product_id = ? AND (user_id = ? OR user_id IS NULL)
    `).run(product_id, userId);

    res.json({
      success: true,
      message: 'Producto removido de favoritos'
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error removiendo favorito',
      error: error.message
    });
  }
};

/**
 * Reorder favorites
 */
export const reorderFavorites = async (req, res) => {
  try {
    ensureFavoritesTable();
    const db = getDb();
    const { favorites } = req.body; // Array of { product_id, position }
    const userId = req.user?.id || null;

    const stmt = db.prepare(`
      UPDATE product_favorites
      SET position = ?
      WHERE product_id = ? AND (user_id = ? OR user_id IS NULL)
    `);

    const transaction = db.transaction(() => {
      for (const fav of favorites) {
        stmt.run(fav.position, fav.product_id, userId);
      }
    });

    transaction();

    res.json({
      success: true,
      message: 'Favoritos reordenados'
    });
  } catch (error) {
    console.error('Error reordering favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordenando favoritos',
      error: error.message
    });
  }
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (req, res) => {
  try {
    ensureFavoritesTable();
    const db = getDb();
    const { product_id } = req.params;
    const userId = req.user?.id || null;

    // Check if already favorite
    const existing = db.prepare(`
      SELECT id FROM product_favorites
      WHERE product_id = ? AND (user_id = ? OR user_id IS NULL)
    `).get(product_id, userId);

    if (existing) {
      // Remove
      db.prepare(`
        DELETE FROM product_favorites
        WHERE product_id = ? AND (user_id = ? OR user_id IS NULL)
      `).run(product_id, userId);

      res.json({
        success: true,
        is_favorite: false,
        message: 'Removido de favoritos'
      });
    } else {
      // Add
      const maxPos = db.prepare(`
        SELECT COALESCE(MAX(position), 0) as max_pos
        FROM product_favorites
        WHERE user_id = ? OR user_id IS NULL
      `).get(userId);

      db.prepare(`
        INSERT INTO product_favorites (product_id, user_id, position)
        VALUES (?, ?, ?)
      `).run(product_id, userId, (maxPos?.max_pos || 0) + 1);

      res.json({
        success: true,
        is_favorite: true,
        message: 'Agregado a favoritos'
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error cambiando favorito',
      error: error.message
    });
  }
};

export default {
  getFavorites,
  addFavorite,
  removeFavorite,
  reorderFavorites,
  toggleFavorite
};
