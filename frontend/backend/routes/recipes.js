/**
 * =====================================================
 * SYSME POS - Recipes & Cost Control Routes
 * =====================================================
 * Rutas del API para gestión de recetas y control de costos
 *
 * @module recipesRoutes
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const express = require('express');
const router = express.Router();
const recipesController = require('../controllers/recipesController');
// const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Descomentar cuando esté implementado

// ====================================
// RUTAS DE INGREDIENTES
// ====================================

/**
 * @route   GET /api/recipes/ingredients
 * @desc    Obtener todos los ingredientes con filtros
 * @access  Private
 * @query   category, stock_status, supplier_id, is_active, search, sort_by, sort_order, limit, offset
 */
router.get('/ingredients', recipesController.getAllIngredients);

/**
 * @route   GET /api/recipes/ingredients/:id
 * @desc    Obtener ingrediente por ID con detalles
 * @access  Private
 */
router.get('/ingredients/:id', recipesController.getIngredientById);

/**
 * @route   POST /api/recipes/ingredients
 * @desc    Crear nuevo ingrediente
 * @access  Private (Admin, Manager)
 * @body    code, name, description, category, unit_of_measure, current_stock, min_stock, current_cost, etc.
 */
router.post('/ingredients', recipesController.createIngredient);

/**
 * @route   PUT /api/recipes/ingredients/:id
 * @desc    Actualizar ingrediente
 * @access  Private (Admin, Manager)
 */
router.put('/ingredients/:id', recipesController.updateIngredient);

/**
 * @route   DELETE /api/recipes/ingredients/:id
 * @desc    Eliminar ingrediente (soft delete)
 * @access  Private (Admin)
 */
router.delete('/ingredients/:id', recipesController.deleteIngredient);

/**
 * @route   GET /api/recipes/ingredients/analysis/low-stock
 * @desc    Obtener ingredientes con bajo stock
 * @access  Private
 */
router.get('/ingredients/analysis/low-stock', recipesController.getLowStockIngredients);

/**
 * @route   GET /api/recipes/ingredients/analysis/expensive
 * @desc    Obtener ingredientes más costosos
 * @access  Private
 * @query   limit (default: 20)
 */
router.get('/ingredients/analysis/expensive', recipesController.getTopExpensiveIngredients);

// ====================================
// RUTAS DE RECETAS
// ====================================

/**
 * @route   GET /api/recipes
 * @desc    Obtener todas las recetas con filtros
 * @access  Private
 * @query   category, is_active, search, min_margin, max_cost, sort_by, sort_order, limit, offset
 */
router.get('/', recipesController.getAllRecipes);

/**
 * @route   GET /api/recipes/:id
 * @desc    Obtener receta por ID con todos los detalles
 * @access  Private
 */
router.get('/:id', recipesController.getRecipeById);

/**
 * @route   POST /api/recipes
 * @desc    Crear nueva receta
 * @access  Private (Admin, Chef)
 * @body    code, name, description, category, ingredients[], etc.
 */
router.post('/', recipesController.createRecipe);

/**
 * @route   PUT /api/recipes/:id
 * @desc    Actualizar receta
 * @access  Private (Admin, Chef)
 */
router.put('/:id', recipesController.updateRecipe);

/**
 * @route   DELETE /api/recipes/:id
 * @desc    Eliminar receta (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', recipesController.deleteRecipe);

/**
 * @route   GET /api/recipes/:id/availability
 * @desc    Verificar disponibilidad de ingredientes para receta
 * @access  Private
 * @query   servings (número de porciones)
 */
router.get('/:id/availability', recipesController.checkRecipeAvailability);

// ====================================
// RUTAS DE INGREDIENTES DE RECETAS
// ====================================

/**
 * @route   POST /api/recipes/recipe-ingredients
 * @desc    Agregar ingrediente a receta
 * @access  Private (Admin, Chef)
 * @body    recipe_id, ingredient_id, quantity, unit, preparation_notes
 */
router.post('/recipe-ingredients', recipesController.addIngredientToRecipe);

/**
 * @route   PUT /api/recipes/recipe-ingredients/:id
 * @desc    Actualizar ingrediente de receta
 * @access  Private (Admin, Chef)
 */
router.put('/recipe-ingredients/:id', recipesController.updateRecipeIngredient);

/**
 * @route   DELETE /api/recipes/recipe-ingredients/:id
 * @desc    Eliminar ingrediente de receta
 * @access  Private (Admin, Chef)
 */
router.delete('/recipe-ingredients/:id', recipesController.removeIngredientFromRecipe);

// ====================================
// RUTAS DE MOVIMIENTOS DE STOCK
// ====================================

/**
 * @route   GET /api/recipes/stock-movements
 * @desc    Obtener movimientos de stock con filtros
 * @access  Private
 * @query   ingredient_id, movement_type, start_date, end_date, limit, offset
 */
router.get('/stock-movements', recipesController.getStockMovements);

/**
 * @route   POST /api/recipes/stock-movements
 * @desc    Registrar movimiento de stock
 * @access  Private (Admin, Manager, Chef)
 * @body    ingredient_id, movement_type, quantity, unit, cost_per_unit, reason
 */
router.post('/stock-movements', recipesController.createStockMovement);

// ====================================
// RUTAS DE ANÁLISIS Y REPORTES
// ====================================

/**
 * @route   GET /api/recipes/analysis/profitability
 * @desc    Análisis de rentabilidad de recetas
 * @access  Private (Admin, Manager)
 * @query   category, min_margin, sort_by, sort_order
 */
router.get('/analysis/profitability', recipesController.getRecipeProfitabilityAnalysis);

/**
 * @route   GET /api/recipes/analysis/cost-summary
 * @desc    Resumen de costos por categoría
 * @access  Private (Admin, Manager)
 */
router.get('/analysis/cost-summary', recipesController.getCostSummaryByCategory);

module.exports = router;
