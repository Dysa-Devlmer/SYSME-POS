/**
 * =====================================================
 * SYSME POS - Loyalty Program Management Page
 * =====================================================
 * Página principal de gestión del programa de fidelización
 *
 * @module LoyaltyPage
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
    Badge,
    Avatar
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    CardGiftcard as RewardIcon,
    People as MembersIcon,
    Stars as PointsIcon,
    TrendingUp as TrendingUpIcon,
    EmojiEvents as TrophyIcon,
    LocalOffer as OfferIcon
} from '@mui/icons-material';
import {
    getAllMembers,
    getAllRewards,
    getAllTiers,
    getDashboardStats,
    getTopMembers,
    enrollMember,
    awardPoints,
    redeemReward,
    LoyaltyMember,
    LoyaltyReward,
    LoyaltyTier,
    MemberFilters,
    RewardFilters,
    DashboardStats,
    formatRewardType,
    getTierColor,
    getEngagementStatusColor,
    formatPoints
} from '../services/loyaltyService';

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

const LoyaltyPage: React.FC = () => {
    // ====================================
    // STATE MANAGEMENT
    // ====================================
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Members state
    const [members, setMembers] = useState<LoyaltyMember[]>([]);
    const [membersPage, setMembersPage] = useState(0);
    const [membersRowsPerPage, setMembersRowsPerPage] = useState(10);
    const [membersTotalCount, setMembersTotalCount] = useState(0);
    const [memberFilters, setMemberFilters] = useState<MemberFilters>({
        status: 'active',
        sort_by: 'enrollment_date',
        sort_order: 'DESC'
    });

    // Rewards state
    const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
    const [rewardsPage, setRewardsPage] = useState(0);
    const [rewardsRowsPerPage, setRewardsRowsPerPage] = useState(10);
    const [rewardsTotalCount, setRewardsTotalCount] = useState(0);
    const [rewardFilters, setRewardFilters] = useState<RewardFilters>({
        is_active: '1'
    });

    // Tiers and analytics
    const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [topMembers, setTopMembers] = useState<LoyaltyMember[]>([]);

    // Dialogs
    const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
    const [awardPointsDialogOpen, setAwardPointsDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<LoyaltyMember | null>(null);

    // ====================================
    // DATA FETCHING
    // ====================================

    const fetchMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllMembers({
                ...memberFilters,
                limit: membersRowsPerPage,
                offset: membersPage * membersRowsPerPage
            });
            setMembers(response.data);
            setMembersTotalCount(response.pagination.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRewards = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllRewards({
                ...rewardFilters,
                limit: rewardsRowsPerPage,
                offset: rewardsPage * rewardsRowsPerPage
            });
            setRewards(response.data);
            setRewardsTotalCount(response.pagination.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTiers = async () => {
        try {
            const response = await getAllTiers();
            setTiers(response.data || []);
        } catch (err) {
            console.error('Error fetching tiers:', err);
        }
    };

    const fetchDashboard = async () => {
        try {
            const [statsResponse, topResponse] = await Promise.all([
                getDashboardStats(),
                getTopMembers('lifetime_points', 10)
            ]);
            setDashboardStats(statsResponse.data || null);
            setTopMembers(topResponse.data || []);
        } catch (err) {
            console.error('Error fetching dashboard:', err);
        }
    };

    useEffect(() => {
        if (currentTab === 0) {
            fetchDashboard();
        } else if (currentTab === 1) {
            fetchMembers();
        } else if (currentTab === 2) {
            fetchRewards();
        }
        fetchTiers();
    }, [currentTab, membersPage, membersRowsPerPage, rewardsPage, rewardsRowsPerPage]);

    // ====================================
    // EVENT HANDLERS
    // ====================================

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleMemberFilterChange = (field: keyof MemberFilters, value: any) => {
        setMemberFilters(prev => ({ ...prev, [field]: value }));
        setMembersPage(0);
    };

    const handleRewardFilterChange = (field: keyof RewardFilters, value: any) => {
        setRewardFilters(prev => ({ ...prev, [field]: value }));
        setRewardsPage(0);
    };

    const handleSearchMembers = () => {
        fetchMembers();
    };

    const handleSearchRewards = () => {
        fetchRewards();
    };

    // ====================================
    // RENDER HELPERS
    // ====================================

    const renderTierChip = (tier?: LoyaltyTier | null, tierName?: string, tierColor?: string) => {
        const name = tier?.name || tierName || 'N/A';
        const color = tier?.color || tierColor || '#gray';

        return (
            <Chip
                label={name}
                size="small"
                style={{
                    backgroundColor: color,
                    color: 'white',
                    fontWeight: 'bold'
                }}
                icon={<TrophyIcon style={{ color: 'white' }} />}
            />
        );
    };

    const renderEngagementChip = (status?: string) => {
        const labels: Record<string, string> = {
            active: 'Activo',
            at_risk: 'En Riesgo',
            inactive: 'Inactivo'
        };

        const colors: Record<string, any> = {
            active: 'success',
            at_risk: 'warning',
            inactive: 'error'
        };

        return (
            <Chip
                label={labels[status || 'active']}
                size="small"
                color={colors[status || 'active']}
            />
        );
    };

    // ====================================
    // DASHBOARD TAB
    // ====================================

    const renderDashboardTab = () => (
        <Box>
            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Miembros Activos
                                    </Typography>
                                    <Typography variant="h4">
                                        {dashboardStats?.member_stats.find(s => s.status === 'active')?.count || 0}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    <MembersIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Puntos Ganados (30d)
                                    </Typography>
                                    <Typography variant="h4" color="success.main">
                                        {formatPoints(dashboardStats?.points_stats.total_earned || 0)}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'success.main' }}>
                                    <PointsIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Puntos Canjeados (30d)
                                    </Typography>
                                    <Typography variant="h4" color="warning.main">
                                        {formatPoints(dashboardStats?.points_stats.total_redeemed || 0)}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'warning.main' }}>
                                    <RewardIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" variant="body2">
                                        Miembros Enganchados
                                    </Typography>
                                    <Typography variant="h4" color="info.main">
                                        {dashboardStats?.engagement_stats.active_last_30_days || 0}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: 'info.main' }}>
                                    <TrendingUpIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tiers Overview */}
            <Paper sx={{ mb: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Distribución por Tiers
                </Typography>
                <Grid container spacing={2}>
                    {tiers.map((tier) => (
                        <Grid item xs={12} md={3} key={tier.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    {renderTierChip(tier)}
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {tier.total_members || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        miembros
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        Multiplicador: {tier.points_multiplier}x
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        Descuento: {tier.discount_percentage}%
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Top Members */}
            <Paper>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Top 10 Miembros
                    </Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Ranking</TableCell>
                                <TableCell>Miembro</TableCell>
                                <TableCell>Tier</TableCell>
                                <TableCell align="right">Puntos Lifetime</TableCell>
                                <TableCell align="right">Gasto Total</TableCell>
                                <TableCell align="right">Visitas</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {topMembers.map((member, index) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <Avatar sx={{ bgcolor: index < 3 ? 'gold' : 'grey.300', width: 32, height: 32 }}>
                                            {index + 1}
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            {member.first_name} {member.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {member.membership_number}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {renderTierChip(null, member.tier_name, member.tier_color)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                            {formatPoints(member.lifetime_points)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        ${member.total_spent.toLocaleString('es-CL')}
                                    </TableCell>
                                    <TableCell align="right">
                                        {member.total_visits}
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
    // MEMBERS TAB
    // ====================================

    const renderMembersTab = () => (
        <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Buscar"
                            placeholder="Nombre, email o número..."
                            value={memberFilters.search || ''}
                            onChange={(e) => handleMemberFilterChange('search', e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <IconButton size="small" onClick={handleSearchMembers}>
                                        <SearchIcon />
                                    </IconButton>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Tier</InputLabel>
                            <Select
                                value={memberFilters.tier_id || ''}
                                label="Tier"
                                onChange={(e) => handleMemberFilterChange('tier_id', e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {tiers.map(tier => (
                                    <MenuItem key={tier.id} value={tier.id}>{tier.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={memberFilters.status || 'active'}
                                label="Estado"
                                onChange={(e) => handleMemberFilterChange('status', e.target.value)}
                            >
                                <MenuItem value="active">Activos</MenuItem>
                                <MenuItem value="suspended">Suspendidos</MenuItem>
                                <MenuItem value="cancelled">Cancelados</MenuItem>
                                <MenuItem value="all">Todos</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Engagement</InputLabel>
                            <Select
                                value={memberFilters.engagement_status || ''}
                                label="Engagement"
                                onChange={(e) => handleMemberFilterChange('engagement_status', e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="active">Activo</MenuItem>
                                <MenuItem value="at_risk">En Riesgo</MenuItem>
                                <MenuItem value="inactive">Inactivo</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setEnrollDialogOpen(true)}
                            >
                                Inscribir Miembro
                            </Button>
                            <IconButton onClick={fetchMembers}>
                                <RefreshIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Members Table */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Membresía</TableCell>
                            <TableCell>Miembro</TableCell>
                            <TableCell>Tier</TableCell>
                            <TableCell align="right">Puntos</TableCell>
                            <TableCell align="right">Gasto Total</TableCell>
                            <TableCell align="right">Visitas</TableCell>
                            <TableCell align="center">Engagement</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow key={member.id} hover>
                                <TableCell>{member.membership_number}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {member.first_name} {member.last_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {member.email}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {renderTierChip(null, member.tier_name, member.tier_color)}
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                        {formatPoints(member.current_points)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Lifetime: {formatPoints(member.lifetime_points)}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    ${member.total_spent.toLocaleString('es-CL')}
                                </TableCell>
                                <TableCell align="right">
                                    {member.total_visits}
                                </TableCell>
                                <TableCell align="center">
                                    {renderEngagementChip(member.engagement_status)}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Ver detalles">
                                        <IconButton size="small">
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Otorgar puntos">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => {
                                                setSelectedMember(member);
                                                setAwardPointsDialogOpen(true);
                                            }}
                                        >
                                            <PointsIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={membersTotalCount}
                    page={membersPage}
                    onPageChange={(_, newPage) => setMembersPage(newPage)}
                    rowsPerPage={membersRowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setMembersRowsPerPage(parseInt(e.target.value, 10));
                        setMembersPage(0);
                    }}
                    labelRowsPerPage="Filas por página:"
                />
            </TableContainer>
        </Box>
    );

    // ====================================
    // REWARDS TAB
    // ====================================

    const renderRewardsTab = () => (
        <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Tipo</InputLabel>
                            <Select
                                value={rewardFilters.reward_type || ''}
                                label="Tipo"
                                onChange={(e) => handleRewardFilterChange('reward_type', e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="discount">Descuento</MenuItem>
                                <MenuItem value="free_item">Artículo Gratis</MenuItem>
                                <MenuItem value="cashback">Cashback</MenuItem>
                                <MenuItem value="upgrade">Mejora</MenuItem>
                                <MenuItem value="gift">Regalo</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={rewardFilters.is_active || '1'}
                                label="Estado"
                                onChange={(e) => handleRewardFilterChange('is_active', e.target.value)}
                            >
                                <MenuItem value="1">Activas</MenuItem>
                                <MenuItem value="0">Inactivas</MenuItem>
                                <MenuItem value="all">Todas</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}></Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AddIcon />}
                            >
                                Nueva Recompensa
                            </Button>
                            <IconButton onClick={fetchRewards}>
                                <RefreshIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Rewards Grid */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Grid container spacing={2}>
                {rewards.map((reward) => (
                    <Grid item xs={12} md={4} key={reward.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Chip
                                        label={formatRewardType(reward.reward_type)}
                                        size="small"
                                        color="primary"
                                    />
                                    {reward.featured && (
                                        <Chip
                                            label="Destacado"
                                            size="small"
                                            color="secondary"
                                            icon={<OfferIcon />}
                                        />
                                    )}
                                </Box>
                                <Typography variant="h6" gutterBottom>
                                    {reward.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {reward.description}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h5" color="primary">
                                        {formatPoints(reward.points_cost)}
                                    </Typography>
                                    <Box>
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
                                    </Box>
                                </Box>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Canjes: {reward.total_redemptions || 0} | Tier mínimo: {reward.min_tier_name}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <TablePagination
                    component="div"
                    count={rewardsTotalCount}
                    page={rewardsPage}
                    onPageChange={(_, newPage) => setRewardsPage(newPage)}
                    rowsPerPage={rewardsRowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRewardsRowsPerPage(parseInt(e.target.value, 10));
                        setRewardsPage(0);
                    }}
                    labelRowsPerPage="Filas por página:"
                />
            </Box>
        </Box>
    );

    // ====================================
    // MAIN RENDER
    // ====================================

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Programa de Fidelización
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Sistema de gestión de miembros, puntos y recompensas
                </Typography>
            </Box>

            <Paper>
                <Tabs value={currentTab} onChange={handleTabChange}>
                    <Tab icon={<TrendingUpIcon />} label="Dashboard" />
                    <Tab icon={<MembersIcon />} label="Miembros" />
                    <Tab icon={<RewardIcon />} label="Recompensas" />
                </Tabs>

                <TabPanel value={currentTab} index={0}>
                    {renderDashboardTab()}
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    {renderMembersTab()}
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    {renderRewardsTab()}
                </TabPanel>
            </Paper>
        </Box>
    );
};

export default LoyaltyPage;
