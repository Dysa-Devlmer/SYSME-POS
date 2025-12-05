/**
 * =====================================================
 * SYSME POS - Recipes Management Page
 * =====================================================
 * Página principal de gestión de recetas y costos
 *
 * @module RecipesPage
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Grid,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    LinearProgress,
    Tooltip,
    Badge
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    Restaurant as RecipeIcon,
    LocalDining as IngredientIcon,
    Assessment as AnalyticsIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    MonetizationOn as MoneyIcon
} from '@mui/icons-material';
import {
    getAllRecipes,
    getAllIngredients,
    getLowStockIngredients,
    getRecipeProfitabilityAnalysis,
    getCostSummaryByCategory,
    deleteRecipe,
    deleteIngredient,
    Recipe,
    Ingredient,
    RecipeFilters,
    IngredientFilters,
    formatRecipeCategory,
    formatIngredientCategory,
    getStockStatusColor,
    getProfitabilityColor
} from '../services/recipesService';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
    return (
        <div hidden={value !== index} style={{ marginTop: '20px' }}>
            {value === index && <Box>{children}</Box>}
        </div>
    );
};

const RecipesPage: React.FC = () => {
    // ====================================
    // STATE MANAGEMENT
    // ====================================
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Recipes state
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [recipesPage, setRecipesPage] = useState(0);
    const [recipesRowsPerPage, setRecipesRowsPerPage] = useState(10);
    const [recipesTotalCount, setRecipesTotalCount] = useState(0);
    const [recipeFilters, setRecipeFilters] = useState<RecipeFilters>({
        is_active: '1',
        sort_by: 'name',
        sort_order: 'ASC'
    });

    // Ingredients state
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [ingredientsPage, setIngredientsPage] = useState(0);
    const [ingredientsRowsPerPage, setIngredientsRowsPerPage] = useState(10);
    const [ingredientsTotalCount, setIngredientsTotalCount] = useState(0);
    const [ingredientFilters, setIngredientFilters] = useState<IngredientFilters>({
        is_active: '1',
        sort_by: 'name',
        sort_order: 'ASC'
    });

    // Analytics state
    const [lowStockCount, setLowStockCount] = useState(0);
    const [profitabilityStats, setProfitabilityStats] = useState<any>(null);
    const [categorySummary, setCategorySummary] = useState<any[]>([]);

    // Dialogs
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'recipe' | 'ingredient', id: number } | null>(null);

    // ====================================
    // DATA FETCHING
    // ====================================

    const fetchRecipes = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllRecipes({
                ...recipeFilters,
                limit: recipesRowsPerPage,
                offset: recipesPage * recipesRowsPerPage
            });
            setRecipes(response.data);
            setRecipesTotalCount(response.pagination.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchIngredients = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllIngredients({
                ...ingredientFilters,
                limit: ingredientsRowsPerPage,
                offset: ingredientsPage * ingredientsRowsPerPage
            });
            setIngredients(response.data);
            setIngredientsTotalCount(response.pagination.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            // Low stock count
            const lowStockResponse = await getLowStockIngredients();
            setLowStockCount(lowStockResponse.count || 0);

            // Profitability analysis
            const profitResponse = await getRecipeProfitabilityAnalysis();
            setProfitabilityStats(profitResponse.data.statistics);

            // Category summary
            const summaryResponse = await getCostSummaryByCategory();
            setCategorySummary(summaryResponse.data || []);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        }
    };

    useEffect(() => {
        if (currentTab === 0) {
            fetchRecipes();
        } else if (currentTab === 1) {
            fetchIngredients();
        } else if (currentTab === 2) {
            fetchAnalytics();
        }
    }, [currentTab, recipesPage, recipesRowsPerPage, ingredientsPage, ingredientsRowsPerPage]);

    // ====================================
    // EVENT HANDLERS
    // ====================================

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleRecipeFilterChange = (field: keyof RecipeFilters, value: any) => {
        setRecipeFilters(prev => ({ ...prev, [field]: value }));
        setRecipesPage(0);
    };

    const handleIngredientFilterChange = (field: keyof IngredientFilters, value: any) => {
        setIngredientFilters(prev => ({ ...prev, [field]: value }));
        setIngredientsPage(0);
    };

    const handleSearchRecipes = () => {
        fetchRecipes();
    };

    const handleSearchIngredients = () => {
        fetchIngredients();
    };

    const handleDeleteClick = (type: 'recipe' | 'ingredient', id: number) => {
        setItemToDelete({ type, id });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        setLoading(true);
        try {
            if (itemToDelete.type === 'recipe') {
                await deleteRecipe(itemToDelete.id);
                fetchRecipes();
            } else {
                await deleteIngredient(itemToDelete.id);
                fetchIngredients();
            }
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ====================================
    // RENDER HELPERS
    // ====================================

    const renderProfitabilityChip = (rating?: string, margin?: number) => {
        const color = getProfitabilityColor(rating);
        return (
            <Chip
                label={`${margin?.toFixed(1) || 0}%`}
                size="small"
                style={{
                    backgroundColor: color,
                    color: 'white'
                }}
            />
        );
    };

    const renderStockStatusChip = (status?: string) => {
        const color = getStockStatusColor(status);
        const labels: Record<string, string> = {
            critical: 'Crítico',
            low: 'Bajo',
            normal: 'Normal',
            overstocked: 'Exceso'
        };

        return (
            <Chip
                label={labels[status || 'normal']}
                size="small"
                style={{
                    backgroundColor: color,
                    color: 'white'
                }}
                icon={status === 'critical' || status === 'low' ? <WarningIcon /> : undefined}
            />
        );
    };

    // ====================================
    // RECIPES TAB
    // ====================================

    const renderRecipesTab = () => (
        <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Buscar"
                            placeholder="Nombre o código..."
                            value={recipeFilters.search || ''}
                            onChange={(e) => handleRecipeFilterChange('search', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <IconButton size="small" onClick={handleSearchRecipes}>
                                        <SearchIcon />
                                    </IconButton>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Categoría</InputLabel>
                            <Select
                                value={recipeFilters.category || ''}
                                label="Categoría"
                                onChange={(e) => handleRecipeFilterChange('category', e.target.value)}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                <MenuItem value="appetizer">Entrada</MenuItem>
                                <MenuItem value="main">Plato Principal</MenuItem>
                                <MenuItem value="dessert">Postre</MenuItem>
                                <MenuItem value="beverage">Bebida</MenuItem>
                                <MenuItem value="side">Acompañamiento</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={recipeFilters.is_active || '1'}
                                label="Estado"
                                onChange={(e) => handleRecipeFilterChange('is_active', e.target.value)}
                            >
                                <MenuItem value="1">Activas</MenuItem>
                                <MenuItem value="0">Inactivas</MenuItem>
                                <MenuItem value="all">Todas</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Margen mínimo (%)"
                            value={recipeFilters.min_margin || ''}
                            onChange={(e) => handleRecipeFilterChange('min_margin', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => {/* Navigate to create recipe */}}
                            >
                                Nueva Receta
                            </Button>
                            <IconButton onClick={fetchRecipes}>
                                <RefreshIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Recipes Table */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Código</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Categoría</TableCell>
                            <TableCell align="right">Costo Total</TableCell>
                            <TableCell align="right">Precio Venta</TableCell>
                            <TableCell align="center">Margen</TableCell>
                            <TableCell align="right">Ingredientes</TableCell>
                            <TableCell align="center">Estado</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {recipes.map((recipe) => (
                            <TableRow key={recipe.id} hover>
                                <TableCell>{recipe.code}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {recipe.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {recipe.description?.substring(0, 50)}...
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={formatRecipeCategory(recipe.category)} size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    ${recipe.total_cost?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell align="right">
                                    ${recipe.current_price?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell align="center">
                                    {renderProfitabilityChip(recipe.profitability_rating, recipe.profit_margin)}
                                </TableCell>
                                <TableCell align="right">
                                    <Badge badgeContent={recipe.ingredient_count || 0} color="primary">
                                        <IngredientIcon />
                                    </Badge>
                                </TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={recipe.is_active ? 'Activa' : 'Inactiva'}
                                        size="small"
                                        color={recipe.is_active ? 'success' : 'default'}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Ver detalles">
                                        <IconButton size="small">
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Editar">
                                        <IconButton size="small">
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Eliminar">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick('recipe', recipe.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={recipesTotalCount}
                    page={recipesPage}
                    onPageChange={(_, newPage) => setRecipesPage(newPage)}
                    rowsPerPage={recipesRowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRecipesRowsPerPage(parseInt(e.target.value, 10));
                        setRecipesPage(0);
                    }}
                    labelRowsPerPage="Filas por página:"
                />
            </TableContainer>
        </Box>
    );

    // ====================================
    // INGREDIENTS TAB
    // ====================================

    const renderIngredientsTab = () => (
        <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Buscar"
                            placeholder="Nombre o código..."
                            value={ingredientFilters.search || ''}
                            onChange={(e) => handleIngredientFilterChange('search', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <IconButton size="small" onClick={handleSearchIngredients}>
                                        <SearchIcon />
                                    </IconButton>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Categoría</InputLabel>
                            <Select
                                value={ingredientFilters.category || ''}
                                label="Categoría"
                                onChange={(e) => handleIngredientFilterChange('category', e.target.value)}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                <MenuItem value="protein">Proteína</MenuItem>
                                <MenuItem value="vegetable">Vegetales</MenuItem>
                                <MenuItem value="dairy">Lácteos</MenuItem>
                                <MenuItem value="grain">Granos</MenuItem>
                                <MenuItem value="spice">Especias</MenuItem>
                                <MenuItem value="beverage">Bebidas</MenuItem>
                                <MenuItem value="other">Otros</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado Stock</InputLabel>
                            <Select
                                value={ingredientFilters.stock_status || ''}
                                label="Estado Stock"
                                onChange={(e) => handleIngredientFilterChange('stock_status', e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="critical">Crítico</MenuItem>
                                <MenuItem value="low">Bajo</MenuItem>
                                <MenuItem value="normal">Normal</MenuItem>
                                <MenuItem value="overstocked">Exceso</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={ingredientFilters.is_active || '1'}
                                label="Estado"
                                onChange={(e) => handleIngredientFilterChange('is_active', e.target.value)}
                            >
                                <MenuItem value="1">Activos</MenuItem>
                                <MenuItem value="0">Inactivos</MenuItem>
                                <MenuItem value="all">Todos</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => {/* Navigate to create ingredient */}}
                            >
                                Nuevo Ingrediente
                            </Button>
                            <IconButton onClick={fetchIngredients}>
                                <RefreshIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Alert for low stock */}
            {lowStockCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>{lowStockCount}</strong> ingrediente(s) con stock bajo o crítico
                    </Typography>
                </Alert>
            )}

            {/* Ingredients Table */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Código</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Categoría</TableCell>
                            <TableCell align="right">Stock Actual</TableCell>
                            <TableCell align="right">Stock Mínimo</TableCell>
                            <TableCell align="center">Estado Stock</TableCell>
                            <TableCell align="right">Costo Actual</TableCell>
                            <TableCell align="right">Valor Stock</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {ingredients.map((ingredient) => (
                            <TableRow key={ingredient.id} hover>
                                <TableCell>{ingredient.code}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {ingredient.name}
                                    </Typography>
                                    {ingredient.supplier_name && (
                                        <Typography variant="caption" color="text.secondary">
                                            Proveedor: {ingredient.supplier_name}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip label={formatIngredientCategory(ingredient.category)} size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    {ingredient.current_stock.toFixed(2)} {ingredient.unit_of_measure}
                                </TableCell>
                                <TableCell align="right">
                                    {ingredient.min_stock.toFixed(2)} {ingredient.unit_of_measure}
                                </TableCell>
                                <TableCell align="center">
                                    {renderStockStatusChip(ingredient.stock_status)}
                                </TableCell>
                                <TableCell align="right">
                                    ${ingredient.current_cost.toFixed(2)}
                                </TableCell>
                                <TableCell align="right">
                                    ${ingredient.stock_value?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Ver detalles">
                                        <IconButton size="small">
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Editar">
                                        <IconButton size="small">
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Eliminar">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick('ingredient', ingredient.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={ingredientsTotalCount}
                    page={ingredientsPage}
                    onPageChange={(_, newPage) => setIngredientsPage(newPage)}
                    rowsPerPage={ingredientsRowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setIngredientsRowsPerPage(parseInt(e.target.value, 10));
                        setIngredientsPage(0);
                    }}
                    labelRowsPerPage="Filas por página:"
                />
            </TableContainer>
        </Box>
    );

    // ====================================
    // ANALYTICS TAB
    // ====================================

    const renderAnalyticsTab = () => (
        <Box>
            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Recetas
                            </Typography>
                            <Typography variant="h4">
                                {profitabilityStats?.total_recipes || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Margen Promedio
                            </Typography>
                            <Typography variant="h4" color="primary">
                                {profitabilityStats?.avg_margin?.toFixed(1) || 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Costo Promedio
                            </Typography>
                            <Typography variant="h4">
                                ${profitabilityStats?.avg_cost?.toFixed(2) || '0.00'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: 'warning.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Stock Bajo
                            </Typography>
                            <Typography variant="h4" color="error">
                                {lowStockCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Category Summary Table */}
            <Paper>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Resumen por Categoría
                    </Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Categoría</TableCell>
                                <TableCell align="right">Recetas</TableCell>
                                <TableCell align="right">Costo Prom.</TableCell>
                                <TableCell align="right">Precio Prom.</TableCell>
                                <TableCell align="right">Margen Prom.</TableCell>
                                <TableCell align="right">Producciones</TableCell>
                                <TableCell align="right">Popularidad</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categorySummary.map((category: any) => (
                                <TableRow key={category.category}>
                                    <TableCell>
                                        <Chip label={formatRecipeCategory(category.category)} />
                                    </TableCell>
                                    <TableCell align="right">{category.recipe_count}</TableCell>
                                    <TableCell align="right">${category.avg_total_cost?.toFixed(2)}</TableCell>
                                    <TableCell align="right">${category.avg_selling_price?.toFixed(2)}</TableCell>
                                    <TableCell align="right">
                                        {category.avg_profit_margin?.toFixed(1)}%
                                    </TableCell>
                                    <TableCell align="right">{category.total_productions}</TableCell>
                                    <TableCell align="right">
                                        <Chip
                                            label={category.avg_popularity?.toFixed(0) || 0}
                                            size="small"
                                            color="primary"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );

    // ====================================
    // DELETE DIALOG
    // ====================================

    const renderDeleteDialog = () => (
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogContent>
                <Typography>
                    ¿Está seguro que desea eliminar este{' '}
                    {itemToDelete?.type === 'recipe' ? 'receta' : 'ingrediente'}?
                    Esta acción desactivará el registro.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleConfirmDelete} color="error" variant="contained">
                    Eliminar
                </Button>
            </DialogActions>
        </Dialog>
    );

    // ====================================
    // MAIN RENDER
    // ====================================

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Gestión de Recetas y Costos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Sistema de control de recetas, ingredientes y análisis de costos
                </Typography>
            </Box>

            <Paper>
                <Tabs value={currentTab} onChange={handleTabChange}>
                    <Tab icon={<RecipeIcon />} label="Recetas" />
                    <Tab icon={<IngredientIcon />} label="Ingredientes" />
                    <Tab icon={<AnalyticsIcon />} label="Análisis" />
                </Tabs>

                <TabPanel value={currentTab} index={0}>
                    {renderRecipesTab()}
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    {renderIngredientsTab()}
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    {renderAnalyticsTab()}
                </TabPanel>
            </Paper>

            {renderDeleteDialog()}
        </Box>
    );
};

export default RecipesPage;
