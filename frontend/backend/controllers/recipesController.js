/**
 * =====================================================
 * SYSME POS - Recipes & Cost Control Controller
 * =====================================================
 * Controlador para gestión de recetas y control de costos
 *
 * Funcionalidades:
 * - CRUD de ingredientes
 * - CRUD de recetas
 * - Gestión de ingredientes de recetas
 * - Control de movimientos de stock
 * - Log de producción
 * - Análisis de costos y rentabilidad
 * - Seguimiento de desperdicios
 *
 * @module recipesController
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const db = require('../config/database');
const logger = require('../utils/logger');

// ====================================
// GESTIÓN DE INGREDIENTES
// ====================================

/**
 * Obtener todos los ingredientes con información detallada
 */
exports.getAllIngredients = async (req, res) => {
    try {
        const {
            category,
            stock_status,
            supplier_id,
            is_active = '1',
            search,
            sort_by = 'name',
            sort_order = 'ASC',
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_ingredients_detailed WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (stock_status) {
            query += ' AND stock_status = ?';
            params.push(stock_status);
        }

        if (supplier_id) {
            query += ' AND supplier_id = ?';
            params.push(supplier_id);
        }

        if (is_active !== 'all') {
            query += ' AND is_active = ?';
            params.push(is_active);
        }

        if (search) {
            query += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        // Add sorting and pagination
        query += ` ORDER BY ${sort_by} ${sort_order} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const ingredients = db.prepare(query).all(params);

        // Parse JSON fields
        ingredients.forEach(ing => {
            if (ing.allergen_info) ing.allergen_info = JSON.parse(ing.allergen_info);
            if (ing.nutritional_info) ing.nutritional_info = JSON.parse(ing.nutritional_info);
        });

        res.json({
            success: true,
            data: ingredients,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting ingredients:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ingredientes',
            details: error.message
        });
    }
};

/**
 * Obtener ingrediente por ID
 */
exports.getIngredientById = async (req, res) => {
    try {
        const { id } = req.params;

        const ingredient = db.prepare('SELECT * FROM v_ingredients_detailed WHERE id = ?').get(id);

        if (!ingredient) {
            return res.status(404).json({
                success: false,
                error: 'Ingrediente no encontrado'
            });
        }

        // Parse JSON fields
        if (ingredient.allergen_info) ingredient.allergen_info = JSON.parse(ingredient.allergen_info);
        if (ingredient.nutritional_info) ingredient.nutritional_info = JSON.parse(ingredient.nutritional_info);

        // Get usage in recipes
        const recipeUsage = db.prepare(`
            SELECT r.id, r.code, r.name, ri.quantity, ri.unit
            FROM recipe_ingredients ri
            JOIN recipes r ON ri.recipe_id = r.id
            WHERE ri.ingredient_id = ? AND r.is_active = 1
        `).all(id);

        // Get recent stock movements
        const recentMovements = db.prepare(`
            SELECT * FROM v_stock_movements_detailed
            WHERE ingredient_id = ?
            ORDER BY movement_date DESC
            LIMIT 10
        `).all(id);

        res.json({
            success: true,
            data: {
                ...ingredient,
                recipe_usage: recipeUsage,
                recent_movements: recentMovements
            }
        });

    } catch (error) {
        logger.error('Error getting ingredient:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ingrediente',
            details: error.message
        });
    }
};

/**
 * Crear nuevo ingrediente
 */
exports.createIngredient = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            category,
            unit_of_measure,
            current_stock = 0,
            min_stock = 0,
            max_stock,
            current_cost,
            supplier_id,
            alternative_supplier_id,
            storage_location,
            shelf_life_days,
            allergen_info,
            nutritional_info,
            is_perishable = 0,
            requires_refrigeration = 0,
            tax_rate = 0,
            notes,
            image_url
        } = req.body;

        // Validations
        if (!code || !name || !category || !unit_of_measure || current_cost === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: code, name, category, unit_of_measure, current_cost'
            });
        }

        const validCategories = ['protein', 'vegetable', 'dairy', 'grain', 'spice', 'beverage', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
            });
        }

        const stmt = db.prepare(`
            INSERT INTO ingredients (
                code, name, description, category, unit_of_measure,
                current_stock, min_stock, max_stock, current_cost, average_cost,
                supplier_id, alternative_supplier_id, storage_location,
                shelf_life_days, allergen_info, nutritional_info,
                is_perishable, requires_refrigeration, tax_rate, notes, image_url,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            code, name, description, category, unit_of_measure,
            current_stock, min_stock, max_stock, current_cost, current_cost,
            supplier_id, alternative_supplier_id, storage_location,
            shelf_life_days,
            allergen_info ? JSON.stringify(allergen_info) : null,
            nutritional_info ? JSON.stringify(nutritional_info) : null,
            is_perishable, requires_refrigeration, tax_rate, notes, image_url,
            req.user?.username || 'system'
        );

        // If initial stock > 0, create stock movement
        if (current_stock > 0) {
            db.prepare(`
                INSERT INTO ingredient_stock_movements (
                    ingredient_id, movement_type, quantity, unit, cost_per_unit,
                    reason, created_by
                ) VALUES (?, 'adjustment', ?, ?, ?, 'Stock inicial', ?)
            `).run(result.lastInsertRowid, current_stock, unit_of_measure, current_cost, req.user?.username || 'system');
        }

        const newIngredient = db.prepare('SELECT * FROM v_ingredients_detailed WHERE id = ?').get(result.lastInsertRowid);

        logger.info(`Ingrediente creado: ${code} - ${name}`);

        res.status(201).json({
            success: true,
            message: 'Ingrediente creado exitosamente',
            data: newIngredient
        });

    } catch (error) {
        logger.error('Error creating ingredient:', error);

        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'Ya existe un ingrediente con ese código'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear ingrediente',
            details: error.message
        });
    }
};

/**
 * Actualizar ingrediente
 */
exports.updateIngredient = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if ingredient exists
        const existing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Ingrediente no encontrado'
            });
        }

        // Build dynamic update query
        const allowedFields = [
            'name', 'description', 'category', 'unit_of_measure',
            'min_stock', 'max_stock', 'current_cost',
            'supplier_id', 'alternative_supplier_id', 'storage_location',
            'shelf_life_days', 'allergen_info', 'nutritional_info',
            'is_perishable', 'requires_refrigeration', 'tax_rate',
            'notes', 'image_url', 'is_active'
        ];

        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                updateFields.push(`${key} = ?`);

                // Handle JSON fields
                if (['allergen_info', 'nutritional_info'].includes(key)) {
                    params.push(JSON.stringify(updates[key]));
                } else {
                    params.push(updates[key]);
                }
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos válidos para actualizar'
            });
        }

        updateFields.push('updated_by = ?');
        params.push(req.user?.username || 'system');
        params.push(id);

        const query = `UPDATE ingredients SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(params);

        // If current_cost changed, update recipe costs
        if (updates.current_cost && updates.current_cost !== existing.current_cost) {
            db.prepare(`
                UPDATE recipe_ingredients
                SET cost_per_unit = ?
                WHERE ingredient_id = ?
            `).run(updates.current_cost, id);
        }

        const updatedIngredient = db.prepare('SELECT * FROM v_ingredients_detailed WHERE id = ?').get(id);

        logger.info(`Ingrediente actualizado: ${id}`);

        res.json({
            success: true,
            message: 'Ingrediente actualizado exitosamente',
            data: updatedIngredient
        });

    } catch (error) {
        logger.error('Error updating ingredient:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar ingrediente',
            details: error.message
        });
    }
};

/**
 * Eliminar ingrediente (soft delete)
 */
exports.deleteIngredient = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if ingredient exists
        const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
        if (!ingredient) {
            return res.status(404).json({
                success: false,
                error: 'Ingrediente no encontrado'
            });
        }

        // Check if used in active recipes
        const usageCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM recipe_ingredients ri
            JOIN recipes r ON ri.recipe_id = r.id
            WHERE ri.ingredient_id = ? AND r.is_active = 1
        `).get(id);

        if (usageCount.count > 0) {
            return res.status(409).json({
                success: false,
                error: `No se puede eliminar. El ingrediente está siendo usado en ${usageCount.count} receta(s) activa(s)`,
                usage_count: usageCount.count
            });
        }

        // Soft delete
        db.prepare('UPDATE ingredients SET is_active = 0, updated_by = ? WHERE id = ?')
            .run(req.user?.username || 'system', id);

        logger.info(`Ingrediente eliminado: ${id}`);

        res.json({
            success: true,
            message: 'Ingrediente eliminado exitosamente'
        });

    } catch (error) {
        logger.error('Error deleting ingredient:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar ingrediente',
            details: error.message
        });
    }
};

// ====================================
// GESTIÓN DE RECETAS
// ====================================

/**
 * Obtener todas las recetas
 */
exports.getAllRecipes = async (req, res) => {
    try {
        const {
            category,
            is_active = '1',
            search,
            min_margin,
            max_cost,
            sort_by = 'name',
            sort_order = 'ASC',
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_recipes_profitability WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (is_active !== 'all') {
            query += ' AND is_active = ?';
            params.push(is_active);
        }

        if (search) {
            query += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (min_margin) {
            query += ' AND profit_margin >= ?';
            params.push(parseFloat(min_margin));
        }

        if (max_cost) {
            query += ' AND total_cost <= ?';
            params.push(parseFloat(max_cost));
        }

        // Total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        // Add sorting and pagination
        query += ` ORDER BY ${sort_by} ${sort_order} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const recipes = db.prepare(query).all(params);

        // Parse JSON fields
        recipes.forEach(recipe => {
            if (recipe.instructions) recipe.instructions = JSON.parse(recipe.instructions);
            if (recipe.allergens) recipe.allergens = JSON.parse(recipe.allergens);
        });

        res.json({
            success: true,
            data: recipes,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting recipes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener recetas',
            details: error.message
        });
    }
};

/**
 * Obtener receta por ID con todos los detalles
 */
exports.getRecipeById = async (req, res) => {
    try {
        const { id } = req.params;

        const recipe = db.prepare('SELECT * FROM v_recipes_profitability WHERE id = ?').get(id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Receta no encontrada'
            });
        }

        // Parse JSON fields
        if (recipe.instructions) recipe.instructions = JSON.parse(recipe.instructions);
        if (recipe.allergens) recipe.allergens = JSON.parse(recipe.allergens);

        // Get ingredients with details
        const ingredients = db.prepare(`
            SELECT * FROM v_recipe_ingredients_detailed
            WHERE recipe_id = ?
            ORDER BY display_order
        `).all(id);

        // Get production history
        const productionHistory = db.prepare(`
            SELECT * FROM v_production_log_detailed
            WHERE recipe_id = ?
            ORDER BY production_date DESC
            LIMIT 10
        `).all(id);

        res.json({
            success: true,
            data: {
                ...recipe,
                ingredients,
                production_history: productionHistory
            }
        });

    } catch (error) {
        logger.error('Error getting recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener receta',
            details: error.message
        });
    }
};

/**
 * Crear nueva receta
 */
exports.createRecipe = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            category,
            subcategory,
            product_id,
            portion_size = 1,
            portion_unit = 'serving',
            prep_time_minutes,
            cook_time_minutes,
            difficulty_level,
            servings = 1,
            instructions,
            plating_instructions,
            chef_notes,
            labor_cost = 0,
            overhead_cost = 0,
            suggested_price,
            current_price,
            is_seasonal = 0,
            season_start,
            season_end,
            image_url,
            video_url,
            ingredients = [] // Array of {ingredient_id, quantity, unit, preparation_notes}
        } = req.body;

        // Validations
        if (!code || !name || !category) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: code, name, category'
            });
        }

        const validCategories = ['appetizer', 'main', 'dessert', 'beverage', 'side'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
            });
        }

        // Start transaction
        const insertRecipe = db.prepare(`
            INSERT INTO recipes (
                code, name, description, category, subcategory, product_id,
                portion_size, portion_unit, prep_time_minutes, cook_time_minutes,
                difficulty_level, servings, instructions, plating_instructions,
                chef_notes, labor_cost, overhead_cost, suggested_price,
                current_price, is_seasonal, season_start, season_end,
                image_url, video_url, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertRecipe.run(
            code, name, description, category, subcategory, product_id,
            portion_size, portion_unit, prep_time_minutes, cook_time_minutes,
            difficulty_level, servings,
            instructions ? JSON.stringify(instructions) : null,
            plating_instructions, chef_notes, labor_cost, overhead_cost,
            suggested_price, current_price, is_seasonal, season_start, season_end,
            image_url, video_url, req.user?.username || 'system'
        );

        const recipeId = result.lastInsertRowid;

        // Add ingredients
        if (ingredients && ingredients.length > 0) {
            const insertIngredient = db.prepare(`
                INSERT INTO recipe_ingredients (
                    recipe_id, ingredient_id, quantity, unit,
                    preparation_notes, display_order
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);

            ingredients.forEach((ing, index) => {
                insertIngredient.run(
                    recipeId,
                    ing.ingredient_id,
                    ing.quantity,
                    ing.unit,
                    ing.preparation_notes || null,
                    index + 1
                );
            });
        }

        const newRecipe = db.prepare('SELECT * FROM v_recipes_profitability WHERE id = ?').get(recipeId);

        logger.info(`Receta creada: ${code} - ${name}`);

        res.status(201).json({
            success: true,
            message: 'Receta creada exitosamente',
            data: newRecipe
        });

    } catch (error) {
        logger.error('Error creating recipe:', error);

        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'Ya existe una receta con ese código'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear receta',
            details: error.message
        });
    }
};

/**
 * Actualizar receta
 */
exports.updateRecipe = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Check if recipe exists
        const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Receta no encontrada'
            });
        }

        // Build dynamic update query
        const allowedFields = [
            'name', 'description', 'category', 'subcategory', 'product_id',
            'portion_size', 'portion_unit', 'prep_time_minutes', 'cook_time_minutes',
            'difficulty_level', 'servings', 'instructions', 'plating_instructions',
            'chef_notes', 'labor_cost', 'overhead_cost', 'suggested_price',
            'current_price', 'is_active', 'is_seasonal', 'season_start', 'season_end',
            'popularity_score', 'image_url', 'video_url'
        ];

        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                updateFields.push(`${key} = ?`);

                // Handle JSON fields
                if (key === 'instructions') {
                    params.push(JSON.stringify(updates[key]));
                } else {
                    params.push(updates[key]);
                }
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos válidos para actualizar'
            });
        }

        updateFields.push('updated_by = ?', 'version = version + 1');
        params.push(req.user?.username || 'system', id);

        const query = `UPDATE recipes SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(params);

        const updatedRecipe = db.prepare('SELECT * FROM v_recipes_profitability WHERE id = ?').get(id);

        logger.info(`Receta actualizada: ${id}`);

        res.json({
            success: true,
            message: 'Receta actualizada exitosamente',
            data: updatedRecipe
        });

    } catch (error) {
        logger.error('Error updating recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar receta',
            details: error.message
        });
    }
};

/**
 * Eliminar receta (soft delete)
 */
exports.deleteRecipe = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if recipe exists
        const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                error: 'Receta no encontrada'
            });
        }

        // Soft delete
        db.prepare('UPDATE recipes SET is_active = 0, updated_by = ? WHERE id = ?')
            .run(req.user?.username || 'system', id);

        logger.info(`Receta eliminada: ${id}`);

        res.json({
            success: true,
            message: 'Receta eliminada exitosamente'
        });

    } catch (error) {
        logger.error('Error deleting recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar receta',
            details: error.message
        });
    }
};

// ====================================
// GESTIÓN DE INGREDIENTES DE RECETAS
// ====================================

/**
 * Agregar ingrediente a receta
 */
exports.addIngredientToRecipe = async (req, res) => {
    try {
        const { recipe_id, ingredient_id, quantity, unit, preparation_notes, is_optional = 0 } = req.body;

        if (!recipe_id || !ingredient_id || !quantity || !unit) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: recipe_id, ingredient_id, quantity, unit'
            });
        }

        // Get next display order
        const maxOrder = db.prepare('SELECT COALESCE(MAX(display_order), 0) as max FROM recipe_ingredients WHERE recipe_id = ?').get(recipe_id);

        const stmt = db.prepare(`
            INSERT INTO recipe_ingredients (
                recipe_id, ingredient_id, quantity, unit,
                preparation_notes, is_optional, display_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(recipe_id, ingredient_id, quantity, unit, preparation_notes, is_optional, maxOrder.max + 1);

        const ingredient = db.prepare(`
            SELECT * FROM v_recipe_ingredients_detailed
            WHERE recipe_id = ? AND ingredient_id = ?
        `).get(recipe_id, ingredient_id);

        logger.info(`Ingrediente agregado a receta: ${recipe_id} - ${ingredient_id}`);

        res.status(201).json({
            success: true,
            message: 'Ingrediente agregado a receta',
            data: ingredient
        });

    } catch (error) {
        logger.error('Error adding ingredient to recipe:', error);

        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'Este ingrediente ya está en la receta'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al agregar ingrediente',
            details: error.message
        });
    }
};

/**
 * Actualizar ingrediente de receta
 */
exports.updateRecipeIngredient = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, unit, preparation_notes, is_optional } = req.body;

        const existing = db.prepare('SELECT * FROM recipe_ingredients WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Ingrediente de receta no encontrado'
            });
        }

        const updateFields = [];
        const params = [];

        if (quantity !== undefined) {
            updateFields.push('quantity = ?');
            params.push(quantity);
        }
        if (unit !== undefined) {
            updateFields.push('unit = ?');
            params.push(unit);
        }
        if (preparation_notes !== undefined) {
            updateFields.push('preparation_notes = ?');
            params.push(preparation_notes);
        }
        if (is_optional !== undefined) {
            updateFields.push('is_optional = ?');
            params.push(is_optional);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos para actualizar'
            });
        }

        params.push(id);
        const query = `UPDATE recipe_ingredients SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(params);

        const updated = db.prepare(`
            SELECT * FROM v_recipe_ingredients_detailed WHERE id = ?
        `).get(id);

        res.json({
            success: true,
            message: 'Ingrediente actualizado',
            data: updated
        });

    } catch (error) {
        logger.error('Error updating recipe ingredient:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar ingrediente',
            details: error.message
        });
    }
};

/**
 * Eliminar ingrediente de receta
 */
exports.removeIngredientFromRecipe = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM recipe_ingredients WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Ingrediente de receta no encontrado'
            });
        }

        db.prepare('DELETE FROM recipe_ingredients WHERE id = ?').run(id);

        logger.info(`Ingrediente eliminado de receta: ${id}`);

        res.json({
            success: true,
            message: 'Ingrediente eliminado de receta'
        });

    } catch (error) {
        logger.error('Error removing ingredient from recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar ingrediente',
            details: error.message
        });
    }
};

// ====================================
// MOVIMIENTOS DE STOCK
// ====================================

/**
 * Registrar movimiento de stock
 */
exports.createStockMovement = async (req, res) => {
    try {
        const {
            ingredient_id,
            movement_type,
            quantity,
            unit,
            cost_per_unit,
            reason,
            notes,
            batch_number,
            expiry_date
        } = req.body;

        if (!ingredient_id || !movement_type || !quantity || !unit) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: ingredient_id, movement_type, quantity, unit'
            });
        }

        const validTypes = ['purchase', 'usage', 'adjustment', 'waste', 'transfer', 'return'];
        if (!validTypes.includes(movement_type)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de movimiento inválido. Debe ser uno de: ${validTypes.join(', ')}`
            });
        }

        const stmt = db.prepare(`
            INSERT INTO ingredient_stock_movements (
                ingredient_id, movement_type, quantity, unit, cost_per_unit,
                reason, notes, batch_number, expiry_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            ingredient_id, movement_type, quantity, unit, cost_per_unit,
            reason, notes, batch_number, expiry_date, req.user?.username || 'system'
        );

        const movement = db.prepare(`
            SELECT * FROM v_stock_movements_detailed WHERE id = ?
        `).get(result.lastInsertRowid);

        logger.info(`Movimiento de stock registrado: ${movement_type} - ${ingredient_id}`);

        res.status(201).json({
            success: true,
            message: 'Movimiento de stock registrado',
            data: movement
        });

    } catch (error) {
        logger.error('Error creating stock movement:', error);
        res.status(500).json({
            success: false,
            error: 'Error al registrar movimiento de stock',
            details: error.message
        });
    }
};

/**
 * Obtener movimientos de stock
 */
exports.getStockMovements = async (req, res) => {
    try {
        const {
            ingredient_id,
            movement_type,
            start_date,
            end_date,
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_stock_movements_detailed WHERE 1=1';
        const params = [];

        if (ingredient_id) {
            query += ' AND ingredient_id = ?';
            params.push(ingredient_id);
        }

        if (movement_type) {
            query += ' AND movement_type = ?';
            params.push(movement_type);
        }

        if (start_date) {
            query += ' AND movement_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND movement_date <= ?';
            params.push(end_date);
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        query += ' ORDER BY movement_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const movements = db.prepare(query).all(params);

        res.json({
            success: true,
            data: movements,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting stock movements:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener movimientos de stock',
            details: error.message
        });
    }
};

// ====================================
// ANÁLISIS Y REPORTES
// ====================================

/**
 * Análisis de rentabilidad de recetas
 */
exports.getRecipeProfitabilityAnalysis = async (req, res) => {
    try {
        const { category, min_margin, sort_by = 'profit_margin', sort_order = 'DESC' } = req.query;

        let query = 'SELECT * FROM v_recipes_profitability WHERE is_active = 1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        if (min_margin) {
            query += ' AND profit_margin >= ?';
            params.push(parseFloat(min_margin));
        }

        query += ` ORDER BY ${sort_by} ${sort_order}`;

        const recipes = db.prepare(query).all(params);

        // Calculate summary statistics
        const stats = {
            total_recipes: recipes.length,
            avg_cost: recipes.reduce((sum, r) => sum + (r.total_cost || 0), 0) / recipes.length,
            avg_margin: recipes.reduce((sum, r) => sum + (r.profit_margin || 0), 0) / recipes.length,
            total_value: recipes.reduce((sum, r) => sum + (r.total_cost || 0), 0),
            high_margin_count: recipes.filter(r => r.profit_margin >= 70).length,
            low_margin_count: recipes.filter(r => r.profit_margin < 30).length
        };

        res.json({
            success: true,
            data: recipes,
            statistics: stats
        });

    } catch (error) {
        logger.error('Error getting recipe profitability analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener análisis de rentabilidad',
            details: error.message
        });
    }
};

/**
 * Ingredientes con bajo stock
 */
exports.getLowStockIngredients = async (req, res) => {
    try {
        const lowStock = db.prepare(`
            SELECT * FROM v_ingredients_detailed
            WHERE stock_status IN ('critical', 'low')
            AND is_active = 1
            ORDER BY stock_percentage ASC
        `).all();

        res.json({
            success: true,
            data: lowStock,
            count: lowStock.length
        });

    } catch (error) {
        logger.error('Error getting low stock ingredients:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ingredientes con bajo stock',
            details: error.message
        });
    }
};

/**
 * Reporte de costos por categoría
 */
exports.getCostSummaryByCategory = async (req, res) => {
    try {
        const summary = db.prepare('SELECT * FROM v_recipe_cost_summary_by_category').all();

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        logger.error('Error getting cost summary:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener resumen de costos',
            details: error.message
        });
    }
};

/**
 * Top ingredientes más costosos
 */
exports.getTopExpensiveIngredients = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const expensive = db.prepare(`
            SELECT * FROM v_top_expensive_ingredients
            LIMIT ?
        `).all(parseInt(limit));

        res.json({
            success: true,
            data: expensive
        });

    } catch (error) {
        logger.error('Error getting expensive ingredients:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ingredientes costosos',
            details: error.message
        });
    }
};

/**
 * Validar disponibilidad de ingredientes para receta
 */
exports.checkRecipeAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { servings = 1 } = req.query;

        const ingredients = db.prepare(`
            SELECT
                ri.*,
                i.name as ingredient_name,
                i.current_stock,
                i.unit_of_measure,
                ri.quantity * ? as required_quantity,
                i.current_stock - (ri.quantity * ?) as remaining_stock,
                CASE
                    WHEN i.current_stock >= (ri.quantity * ?) THEN 1
                    ELSE 0
                END as is_available
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = ?
        `).all(servings, servings, servings, id);

        const allAvailable = ingredients.every(ing => ing.is_available === 1);
        const missingIngredients = ingredients.filter(ing => ing.is_available === 0);

        res.json({
            success: true,
            data: {
                available: allAvailable,
                servings: parseInt(servings),
                ingredients,
                missing_ingredients: missingIngredients
            }
        });

    } catch (error) {
        logger.error('Error checking recipe availability:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar disponibilidad',
            details: error.message
        });
    }
};

module.exports = exports;
