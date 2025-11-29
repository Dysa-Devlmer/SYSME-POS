/**
 * =====================================================
 * SYSME POS - Recipes & Cost Control Service
 * =====================================================
 * Servicio para interactuar con el API de recetas y control de costos
 *
 * @module recipesService
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ====================================
// INTERFACES Y TIPOS
// ====================================

export interface Ingredient {
    id: number;
    code: string;
    name: string;
    description?: string;
    category: 'protein' | 'vegetable' | 'dairy' | 'grain' | 'spice' | 'beverage' | 'other';
    unit_of_measure: string;
    current_stock: number;
    min_stock: number;
    max_stock?: number;
    current_cost: number;
    average_cost: number;
    last_purchase_cost?: number;
    last_purchase_date?: string;
    supplier_id?: number;
    supplier_name?: string;
    alternative_supplier_id?: number;
    alternative_supplier_name?: string;
    storage_location?: string;
    shelf_life_days?: number;
    allergen_info?: string[];
    nutritional_info?: NutritionalInfo;
    is_perishable: boolean;
    requires_refrigeration: boolean;
    tax_rate: number;
    notes?: string;
    image_url?: string;
    is_active: boolean;
    stock_status?: 'critical' | 'low' | 'normal' | 'overstocked';
    stock_percentage?: number;
    stock_value?: number;
    created_at: string;
    updated_at: string;
}

export interface NutritionalInfo {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
}

export interface Recipe {
    id: number;
    code: string;
    name: string;
    description?: string;
    category: 'appetizer' | 'main' | 'dessert' | 'beverage' | 'side';
    subcategory?: string;
    product_id?: number;
    product_name?: string;
    portion_size: number;
    portion_unit: string;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    total_time_minutes?: number;
    difficulty_level?: 'easy' | 'medium' | 'hard' | 'expert';
    servings: number;
    instructions?: RecipeStep[];
    plating_instructions?: string;
    chef_notes?: string;

    // Costos
    total_ingredient_cost: number;
    cost_per_serving: number;
    labor_cost: number;
    overhead_cost: number;
    total_cost: number;

    // Precios y márgenes
    suggested_price?: number;
    current_price?: number;
    profit_margin?: number;
    profit_amount?: number;

    // Control
    version: number;
    is_active: boolean;
    is_seasonal: boolean;
    season_start?: string;
    season_end?: string;
    popularity_score: number;
    last_prepared_date?: string;
    total_times_prepared: number;

    // Información nutricional
    total_calories?: number;
    total_protein?: number;
    total_carbs?: number;
    total_fat?: number;
    allergens?: string[];

    // Multimedia
    image_url?: string;
    video_url?: string;

    // Calculated fields
    ingredient_count?: number;
    profitability_rating?: 'excellent' | 'good' | 'fair' | 'low' | 'unprofitable';
    popularity_rating?: 'star' | 'popular' | 'moderate' | 'low' | 'poor';

    created_at: string;
    updated_at: string;
}

export interface RecipeStep {
    step: number;
    description: string;
    duration_minutes?: number;
    temperature?: string;
    technique?: string;
}

export interface RecipeIngredient {
    id: number;
    recipe_id: number;
    recipe_name?: string;
    recipe_code?: string;
    ingredient_id: number;
    ingredient_name?: string;
    ingredient_code?: string;
    ingredient_category?: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    preparation_notes?: string;
    is_optional: boolean;
    is_garnish: boolean;
    substitutes?: IngredientSubstitute[];
    display_order: number;
    ingredient_stock?: number;
    ingredient_unit?: string;
    current_ingredient_cost?: number;
    updated_total_cost?: number;
    availability_status?: 'insufficient' | 'limited' | 'available';
    created_at: string;
    updated_at: string;
}

export interface IngredientSubstitute {
    ingredient_id: number;
    ratio: number;
}

export interface StockMovement {
    id: number;
    ingredient_id: number;
    ingredient_name?: string;
    ingredient_code?: string;
    ingredient_category?: string;
    movement_type: 'purchase' | 'usage' | 'adjustment' | 'waste' | 'transfer' | 'return';
    quantity: number;
    unit: string;
    cost_per_unit?: number;
    total_cost?: number;
    previous_stock?: number;
    new_stock?: number;
    reference_type?: string;
    reference_id?: number;
    reason?: string;
    notes?: string;
    warehouse_location?: string;
    batch_number?: string;
    expiry_date?: string;
    movement_date: string;
    movement_direction?: 'inbound' | 'outbound' | 'other';
    created_by?: string;
}

export interface ProductionLog {
    id: number;
    recipe_id: number;
    recipe_name?: string;
    recipe_code?: string;
    production_date: string;
    quantity_produced: number;
    ingredient_cost_snapshot: number;
    labor_cost_snapshot: number;
    overhead_cost_snapshot: number;
    total_cost_snapshot: number;
    chef_id?: number;
    chef_name?: string;
    assistant_ids?: number[];
    actual_prep_time_minutes?: number;
    actual_cook_time_minutes?: number;
    total_time_minutes?: number;
    quality_rating?: number;
    yield_percentage?: number;
    waste_amount?: number;
    waste_cost?: number;
    variance_percentage?: number;
    yield_rating?: 'excellent' | 'good' | 'acceptable' | 'poor';
    cost_per_portion?: number;
    notes?: string;
    created_by?: string;
}

export interface CostAnalysis {
    id: number;
    analysis_type: 'recipe' | 'category' | 'period' | 'product';
    reference_id?: number;
    reference_name?: string;
    period_start: string;
    period_end: string;
    total_ingredient_cost: number;
    total_labor_cost: number;
    total_overhead_cost: number;
    total_cost: number;
    total_sales: number;
    total_revenue: number;
    units_sold: number;
    gross_profit: number;
    gross_margin_percentage: number;
    average_cost_per_unit?: number;
    average_price_per_unit?: number;
    contribution_margin?: number;
    rank_by_profit?: number;
    rank_by_margin?: number;
    rank_by_volume?: number;
    generated_at: string;
    generated_by?: string;
    notes?: string;
}

export interface WasteTracking {
    id: number;
    waste_date: string;
    ingredient_id?: number;
    ingredient_name?: string;
    recipe_id?: number;
    recipe_name?: string;
    waste_type: 'spoilage' | 'preparation' | 'overproduction' | 'customer_return' | 'accident';
    quantity: number;
    unit: string;
    estimated_cost: number;
    reason?: string;
    prevention_notes?: string;
    responsible_employee_id?: number;
    responsible_employee_name?: string;
    is_preventable: boolean;
    preventability?: 'preventable' | 'unavoidable';
    created_by?: string;
}

export interface IngredientFilters {
    category?: string;
    stock_status?: 'critical' | 'low' | 'normal' | 'overstocked';
    supplier_id?: number;
    is_active?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
}

export interface RecipeFilters {
    category?: string;
    is_active?: string;
    search?: string;
    min_margin?: number;
    max_cost?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
}

export interface StockMovementFilters {
    ingredient_id?: number;
    movement_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        pages: number;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    details?: string;
}

export interface RecipeAvailability {
    available: boolean;
    servings: number;
    ingredients: RecipeIngredient[];
    missing_ingredients: RecipeIngredient[];
}

export interface RecipeProfitabilityAnalysis {
    total_recipes: number;
    avg_cost: number;
    avg_margin: number;
    total_value: number;
    high_margin_count: number;
    low_margin_count: number;
}

export interface CostSummaryByCategory {
    category: string;
    recipe_count: number;
    avg_ingredient_cost: number;
    avg_total_cost: number;
    avg_selling_price: number;
    avg_profit_margin: number;
    total_productions: number;
    avg_popularity: number;
}

// ====================================
// SERVICIOS DE INGREDIENTES
// ====================================

/**
 * Obtener todos los ingredientes con filtros
 */
export const getAllIngredients = async (filters?: IngredientFilters): Promise<PaginatedResponse<Ingredient>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/ingredients`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener ingredientes');
    }
};

/**
 * Obtener ingrediente por ID
 */
export const getIngredientById = async (id: number): Promise<ApiResponse<Ingredient>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/ingredients/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener ingrediente');
    }
};

/**
 * Crear nuevo ingrediente
 */
export const createIngredient = async (ingredient: Partial<Ingredient>): Promise<ApiResponse<Ingredient>> => {
    try {
        const response = await axios.post(`${API_URL}/recipes/ingredients`, ingredient);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al crear ingrediente');
    }
};

/**
 * Actualizar ingrediente
 */
export const updateIngredient = async (id: number, updates: Partial<Ingredient>): Promise<ApiResponse<Ingredient>> => {
    try {
        const response = await axios.put(`${API_URL}/recipes/ingredients/${id}`, updates);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al actualizar ingrediente');
    }
};

/**
 * Eliminar ingrediente
 */
export const deleteIngredient = async (id: number): Promise<ApiResponse<void>> => {
    try {
        const response = await axios.delete(`${API_URL}/recipes/ingredients/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al eliminar ingrediente');
    }
};

/**
 * Obtener ingredientes con bajo stock
 */
export const getLowStockIngredients = async (): Promise<ApiResponse<Ingredient[]>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/ingredients/analysis/low-stock`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener ingredientes con bajo stock');
    }
};

/**
 * Obtener ingredientes más costosos
 */
export const getTopExpensiveIngredients = async (limit = 20): Promise<ApiResponse<Ingredient[]>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/ingredients/analysis/expensive`, { params: { limit } });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener ingredientes costosos');
    }
};

// ====================================
// SERVICIOS DE RECETAS
// ====================================

/**
 * Obtener todas las recetas con filtros
 */
export const getAllRecipes = async (filters?: RecipeFilters): Promise<PaginatedResponse<Recipe>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener recetas');
    }
};

/**
 * Obtener receta por ID con detalles completos
 */
export const getRecipeById = async (id: number): Promise<ApiResponse<Recipe & { ingredients: RecipeIngredient[], production_history: ProductionLog[] }>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener receta');
    }
};

/**
 * Crear nueva receta
 */
export const createRecipe = async (recipe: Partial<Recipe> & { ingredients?: Partial<RecipeIngredient>[] }): Promise<ApiResponse<Recipe>> => {
    try {
        const response = await axios.post(`${API_URL}/recipes`, recipe);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al crear receta');
    }
};

/**
 * Actualizar receta
 */
export const updateRecipe = async (id: number, updates: Partial<Recipe>): Promise<ApiResponse<Recipe>> => {
    try {
        const response = await axios.put(`${API_URL}/recipes/${id}`, updates);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al actualizar receta');
    }
};

/**
 * Eliminar receta
 */
export const deleteRecipe = async (id: number): Promise<ApiResponse<void>> => {
    try {
        const response = await axios.delete(`${API_URL}/recipes/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al eliminar receta');
    }
};

/**
 * Verificar disponibilidad de ingredientes para receta
 */
export const checkRecipeAvailability = async (id: number, servings = 1): Promise<ApiResponse<RecipeAvailability>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/${id}/availability`, { params: { servings } });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al verificar disponibilidad');
    }
};

// ====================================
// SERVICIOS DE INGREDIENTES DE RECETAS
// ====================================

/**
 * Agregar ingrediente a receta
 */
export const addIngredientToRecipe = async (data: Partial<RecipeIngredient>): Promise<ApiResponse<RecipeIngredient>> => {
    try {
        const response = await axios.post(`${API_URL}/recipes/recipe-ingredients`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al agregar ingrediente a receta');
    }
};

/**
 * Actualizar ingrediente de receta
 */
export const updateRecipeIngredient = async (id: number, updates: Partial<RecipeIngredient>): Promise<ApiResponse<RecipeIngredient>> => {
    try {
        const response = await axios.put(`${API_URL}/recipes/recipe-ingredients/${id}`, updates);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al actualizar ingrediente de receta');
    }
};

/**
 * Eliminar ingrediente de receta
 */
export const removeIngredientFromRecipe = async (id: number): Promise<ApiResponse<void>> => {
    try {
        const response = await axios.delete(`${API_URL}/recipes/recipe-ingredients/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al eliminar ingrediente de receta');
    }
};

// ====================================
// SERVICIOS DE MOVIMIENTOS DE STOCK
// ====================================

/**
 * Obtener movimientos de stock
 */
export const getStockMovements = async (filters?: StockMovementFilters): Promise<PaginatedResponse<StockMovement>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/stock-movements`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener movimientos de stock');
    }
};

/**
 * Crear movimiento de stock
 */
export const createStockMovement = async (movement: Partial<StockMovement>): Promise<ApiResponse<StockMovement>> => {
    try {
        const response = await axios.post(`${API_URL}/recipes/stock-movements`, movement);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al crear movimiento de stock');
    }
};

// ====================================
// SERVICIOS DE ANÁLISIS Y REPORTES
// ====================================

/**
 * Obtener análisis de rentabilidad de recetas
 */
export const getRecipeProfitabilityAnalysis = async (filters?: Partial<RecipeFilters>): Promise<ApiResponse<Recipe[] & { statistics: RecipeProfitabilityAnalysis }>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/analysis/profitability`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener análisis de rentabilidad');
    }
};

/**
 * Obtener resumen de costos por categoría
 */
export const getCostSummaryByCategory = async (): Promise<ApiResponse<CostSummaryByCategory[]>> => {
    try {
        const response = await axios.get(`${API_URL}/recipes/analysis/cost-summary`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener resumen de costos');
    }
};

// ====================================
// UTILIDADES Y HELPERS
// ====================================

/**
 * Formatear categoría de ingrediente para display
 */
export const formatIngredientCategory = (category: string): string => {
    const categories: Record<string, string> = {
        'protein': 'Proteína',
        'vegetable': 'Vegetales',
        'dairy': 'Lácteos',
        'grain': 'Granos',
        'spice': 'Especias',
        'beverage': 'Bebidas',
        'other': 'Otros'
    };
    return categories[category] || category;
};

/**
 * Formatear categoría de receta para display
 */
export const formatRecipeCategory = (category: string): string => {
    const categories: Record<string, string> = {
        'appetizer': 'Entrada',
        'main': 'Plato Principal',
        'dessert': 'Postre',
        'beverage': 'Bebida',
        'side': 'Acompañamiento'
    };
    return categories[category] || category;
};

/**
 * Obtener color basado en el estado de stock
 */
export const getStockStatusColor = (status?: string): string => {
    const colors: Record<string, string> = {
        'critical': 'red',
        'low': 'orange',
        'normal': 'green',
        'overstocked': 'blue'
    };
    return colors[status || 'normal'] || 'gray';
};

/**
 * Obtener color basado en rentabilidad
 */
export const getProfitabilityColor = (rating?: string): string => {
    const colors: Record<string, string> = {
        'excellent': 'green',
        'good': 'blue',
        'fair': 'yellow',
        'low': 'orange',
        'unprofitable': 'red'
    };
    return colors[rating || 'fair'] || 'gray';
};

/**
 * Calcular margen de ganancia
 */
export const calculateProfitMargin = (cost: number, price: number): number => {
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
};

/**
 * Formatear unidad de medida
 */
export const formatUnit = (unit: string): string => {
    const units: Record<string, string> = {
        'kg': 'Kilogramos',
        'g': 'Gramos',
        'l': 'Litros',
        'ml': 'Mililitros',
        'unit': 'Unidades',
        'dozen': 'Docenas',
        'serving': 'Porción'
    };
    return units[unit] || unit;
};

export default {
    // Ingredients
    getAllIngredients,
    getIngredientById,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    getLowStockIngredients,
    getTopExpensiveIngredients,

    // Recipes
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    checkRecipeAvailability,

    // Recipe Ingredients
    addIngredientToRecipe,
    updateRecipeIngredient,
    removeIngredientFromRecipe,

    // Stock Movements
    getStockMovements,
    createStockMovement,

    // Analysis
    getRecipeProfitabilityAnalysis,
    getCostSummaryByCategory,

    // Utilities
    formatIngredientCategory,
    formatRecipeCategory,
    getStockStatusColor,
    getProfitabilityColor,
    calculateProfitMargin,
    formatUnit
};
