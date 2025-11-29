/**
 * =====================================================
 * SYSME POS - Loyalty & Rewards Service
 * =====================================================
 * Servicio para interactuar con el API de fidelización
 *
 * @module loyaltyService
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ====================================
// INTERFACES Y TIPOS
// ====================================

export interface LoyaltyTier {
    id: number;
    name: string;
    code: string;
    description?: string;
    color: string;
    min_points: number;
    min_visits: number;
    min_total_spent: number;
    points_multiplier: number;
    discount_percentage: number;
    birthday_bonus_points: number;
    welcome_bonus_points: number;
    priority_support: boolean;
    exclusive_offers: boolean;
    free_delivery: boolean;
    early_access: boolean;
    tier_order: number;
    is_active: boolean;
    total_members?: number;
    avg_points?: number;
    avg_spending?: number;
    avg_visits?: number;
    total_points_pool?: number;
    total_revenue_from_tier?: number;
    created_at: string;
    updated_at: string;
}

export interface LoyaltyMember {
    id: number;
    customer_id: number;
    membership_number: string;
    current_tier_id: number;
    tier_achieved_date?: string;
    total_points_earned: number;
    current_points: number;
    lifetime_points: number;
    points_redeemed: number;
    points_expired: number;
    total_visits: number;
    total_spent: number;
    average_ticket: number;
    last_visit_date?: string;
    enrollment_date: string;
    status: 'active' | 'suspended' | 'cancelled';
    status_display?: string;
    membership_expiry_date?: string;
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    referral_code?: string;
    referred_by_member_id?: number;
    total_referrals: number;
    notes?: string;

    // From view
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    tier_name?: string;
    tier_color?: string;
    points_multiplier?: number;
    tier_discount?: number;
    days_since_last_visit?: number;
    engagement_status?: 'active' | 'at_risk' | 'inactive';

    created_at: string;
    updated_at: string;
}

export interface PointsTransaction {
    id: number;
    member_id: number;
    transaction_type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus' | 'refund';
    transaction_type_display?: string;
    points: number;
    points_before?: number;
    points_after?: number;
    reference_type?: string;
    reference_id?: number;
    description?: string;
    expiry_date?: string;
    multiplier_applied: number;
    transaction_date: string;
    transaction_date_only?: string;
    created_by?: string;
    notes?: string;

    // From view
    membership_number?: string;
    member_name?: string;
    member_email?: string;
}

export interface LoyaltyReward {
    id: number;
    code: string;
    name: string;
    description?: string;
    reward_type: 'discount' | 'free_item' | 'cashback' | 'upgrade' | 'gift';
    points_cost: number;
    discount_type?: 'percentage' | 'fixed_amount';
    discount_value?: number;
    max_discount_amount?: number;
    applicable_to: 'all' | 'category' | 'product' | 'specific_items';
    category_id?: number;
    product_ids?: number[];
    min_purchase_amount?: number;
    max_redemptions_per_member: number;
    total_available_quantity?: number;
    remaining_quantity?: number;
    min_tier_required: number;
    min_tier_name?: string;
    exclusive_to_tiers?: number[];
    valid_from?: string;
    valid_until?: string;
    days_valid_after_redemption: number;
    valid_days_of_week?: number[];
    valid_time_start?: string;
    valid_time_end?: string;
    image_url?: string;
    featured: boolean;
    display_order: number;
    terms_and_conditions?: string;
    is_active: boolean;

    // From view
    total_redemptions?: number;
    used_redemptions?: number;
    unique_redeemers?: number;
    total_points_spent?: number;
    availability_status?: 'available' | 'sold_out' | 'expired' | 'inactive';

    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface RewardRedemption {
    id: number;
    redemption_code: string;
    member_id: number;
    reward_id: number;
    points_used: number;
    status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
    status_display?: string;
    redeemed_at: string;
    valid_from: string;
    valid_until: string;
    used_at?: string;
    order_id?: number;
    used_by_employee_id?: number;
    discount_applied?: number;
    cancelled_at?: string;
    cancellation_reason?: string;
    points_refunded: boolean;
    notes?: string;
    created_by?: string;

    // From view
    membership_number?: string;
    member_name?: string;
    reward_name?: string;
    reward_type?: string;
    member_tier?: string;
    days_until_expiry?: number;
}

export interface LoyaltyCampaign {
    id: number;
    code: string;
    name: string;
    description?: string;
    campaign_type: 'bonus_points' | 'double_points' | 'special_reward' | 'tier_upgrade';
    bonus_points_amount?: number;
    points_multiplier: number;
    target_all_members: boolean;
    target_tiers?: number[];
    target_member_ids?: number[];
    min_purchase_amount?: number;
    applicable_categories?: number[];
    applicable_products?: number[];
    start_date: string;
    end_date: string;
    max_redemptions?: number;
    max_redemptions_per_member: number;
    total_redemptions: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface TierHistory {
    id: number;
    member_id: number;
    from_tier_id?: number;
    to_tier_id: number;
    change_reason: string;
    points_at_change: number;
    total_spent_at_change: number;
    total_visits_at_change: number;
    change_date: string;
    notes?: string;
}

export interface Referral {
    id: number;
    referrer_member_id: number;
    referred_customer_id: number;
    referral_code_used?: string;
    status: 'pending' | 'completed' | 'rewarded';
    referrer_points_earned: number;
    referred_points_earned: number;
    referrer_rewarded_at?: string;
    referred_at: string;
    first_purchase_at?: string;
    completed_at?: string;
    notes?: string;
}

export interface MemberFilters {
    tier_id?: number;
    status?: string;
    search?: string;
    engagement_status?: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
}

export interface PointsTransactionFilters {
    member_id?: number;
    transaction_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}

export interface RewardFilters {
    reward_type?: string;
    min_tier_required?: number;
    is_active?: string;
    featured?: boolean;
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

export interface DashboardStats {
    member_stats: Array<{
        status: string;
        count: number;
        total_points: number;
        total_revenue: number;
    }>;
    points_stats: {
        total_earned: number;
        total_redeemed: number;
        total_expired: number;
        active_members: number;
    };
    top_rewards: Array<{
        name: string;
        redemption_count: number;
    }>;
    engagement_stats: {
        active_last_30_days: number;
        at_risk: number;
        inactive: number;
    };
}

export interface AwardPointsRequest {
    member_id: number;
    points: number;
    reference_type?: string;
    reference_id?: number;
    description?: string;
    multiplier?: number;
}

export interface AdjustPointsRequest {
    member_id: number;
    points: number;
    reason: string;
    notes?: string;
}

export interface RedeemRewardRequest {
    member_id: number;
    reward_id: number;
}

export interface UseRedemptionRequest {
    order_id?: number;
    discount_applied?: number;
}

// ====================================
// SERVICIOS DE MIEMBROS
// ====================================

/**
 * Obtener todos los miembros del programa
 */
export const getAllMembers = async (filters?: MemberFilters): Promise<PaginatedResponse<LoyaltyMember>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/members`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener miembros');
    }
};

/**
 * Obtener miembro por ID
 */
export const getMemberById = async (id: number): Promise<ApiResponse<LoyaltyMember & {
    recent_transactions: PointsTransaction[];
    active_redemptions: RewardRedemption[];
    tier_history: TierHistory[];
}>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/members/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener miembro');
    }
};

/**
 * Inscribir nuevo miembro
 */
export const enrollMember = async (data: {
    customer_id: number;
    initial_tier_id?: number;
    referred_by_member_id?: number;
}): Promise<ApiResponse<LoyaltyMember>> => {
    try {
        const response = await axios.post(`${API_URL}/loyalty/members/enroll`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al inscribir miembro');
    }
};

/**
 * Actualizar miembro
 */
export const updateMember = async (id: number, updates: Partial<LoyaltyMember>): Promise<ApiResponse<LoyaltyMember>> => {
    try {
        const response = await axios.put(`${API_URL}/loyalty/members/${id}`, updates);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al actualizar miembro');
    }
};

// ====================================
// SERVICIOS DE PUNTOS
// ====================================

/**
 * Obtener transacciones de puntos
 */
export const getPointsTransactions = async (filters?: PointsTransactionFilters): Promise<PaginatedResponse<PointsTransaction>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/points/transactions`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener transacciones');
    }
};

/**
 * Otorgar puntos
 */
export const awardPoints = async (data: AwardPointsRequest): Promise<ApiResponse<{ points_awarded: number; multiplier_applied: number; new_balance: number }>> => {
    try {
        const response = await axios.post(`${API_URL}/loyalty/points/award`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al otorgar puntos');
    }
};

/**
 * Ajustar puntos manualmente
 */
export const adjustPoints = async (data: AdjustPointsRequest): Promise<ApiResponse<{ points_adjusted: number; new_balance: number }>> => {
    try {
        const response = await axios.post(`${API_URL}/loyalty/points/adjust`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al ajustar puntos');
    }
};

// ====================================
// SERVICIOS DE RECOMPENSAS
// ====================================

/**
 * Obtener catálogo de recompensas
 */
export const getAllRewards = async (filters?: RewardFilters): Promise<PaginatedResponse<LoyaltyReward>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/rewards`, { params: filters });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener recompensas');
    }
};

/**
 * Obtener recompensas disponibles para un miembro
 */
export const getAvailableRewardsForMember = async (memberId: number): Promise<ApiResponse<LoyaltyReward[] & { member_info: { current_points: number; current_tier: number } }>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/rewards/available/${memberId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener recompensas disponibles');
    }
};

/**
 * Crear nueva recompensa
 */
export const createReward = async (reward: Partial<LoyaltyReward>): Promise<ApiResponse<LoyaltyReward>> => {
    try {
        const response = await axios.post(`${API_URL}/loyalty/rewards`, reward);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al crear recompensa');
    }
};

/**
 * Canjear recompensa
 */
export const redeemReward = async (data: RedeemRewardRequest): Promise<ApiResponse<RewardRedemption>> => {
    try {
        const response = await axios.post(`${API_URL}/loyalty/rewards/redeem`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al canjear recompensa');
    }
};

/**
 * Marcar canje como usado
 */
export const useRedemption = async (redemptionCode: string, data: UseRedemptionRequest): Promise<ApiResponse<RewardRedemption>> => {
    try {
        const response = await axios.post(`${API_URL}/loyalty/rewards/use/${redemptionCode}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al usar canje');
    }
};

// ====================================
// SERVICIOS DE TIERS
// ====================================

/**
 * Obtener todos los tiers
 */
export const getAllTiers = async (): Promise<ApiResponse<LoyaltyTier[]>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/tiers`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener tiers');
    }
};

// ====================================
// SERVICIOS DE ANALYTICS
// ====================================

/**
 * Obtener estadísticas del dashboard
 */
export const getDashboardStats = async (): Promise<ApiResponse<DashboardStats>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/analytics/dashboard`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener estadísticas');
    }
};

/**
 * Obtener top miembros
 */
export const getTopMembers = async (sortBy: 'lifetime_points' | 'total_spent' | 'total_visits' = 'lifetime_points', limit = 50): Promise<ApiResponse<LoyaltyMember[]>> => {
    try {
        const response = await axios.get(`${API_URL}/loyalty/analytics/top-members`, {
            params: { sort_by: sortBy, limit }
        });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.error || 'Error al obtener top miembros');
    }
};

// ====================================
// UTILIDADES Y HELPERS
// ====================================

/**
 * Formatear tipo de recompensa
 */
export const formatRewardType = (type: string): string => {
    const types: Record<string, string> = {
        'discount': 'Descuento',
        'free_item': 'Artículo Gratis',
        'cashback': 'Cashback',
        'upgrade': 'Mejora',
        'gift': 'Regalo'
    };
    return types[type] || type;
};

/**
 * Formatear tipo de transacción
 */
export const formatTransactionType = (type: string): string => {
    const types: Record<string, string> = {
        'earned': 'Ganados',
        'redeemed': 'Canjeados',
        'expired': 'Expirados',
        'adjusted': 'Ajustados',
        'bonus': 'Bonificación',
        'refund': 'Reembolso'
    };
    return types[type] || type;
};

/**
 * Obtener color del tier
 */
export const getTierColor = (tierName?: string): string => {
    const colors: Record<string, string> = {
        'Bronce': '#CD7F32',
        'Plata': '#C0C0C0',
        'Oro': '#FFD700',
        'Platino': '#E5E4E2'
    };
    return colors[tierName || ''] || '#gray';
};

/**
 * Obtener color del estado de engagement
 */
export const getEngagementStatusColor = (status?: string): string => {
    const colors: Record<string, string> = {
        'active': 'green',
        'at_risk': 'orange',
        'inactive': 'red'
    };
    return colors[status || ''] || 'gray';
};

/**
 * Calcular puntos por compra
 */
export const calculatePointsForPurchase = (amount: number, multiplier: number = 1.0, baseRate: number = 1): number => {
    return Math.floor(amount * baseRate * multiplier);
};

/**
 * Verificar si la recompensa está disponible
 */
export const isRewardAvailable = (reward: LoyaltyReward): boolean => {
    const now = new Date();

    if (!reward.is_active) return false;
    if (reward.remaining_quantity !== undefined && reward.remaining_quantity !== null && reward.remaining_quantity <= 0) return false;
    if (reward.valid_from && new Date(reward.valid_from) > now) return false;
    if (reward.valid_until && new Date(reward.valid_until) < now) return false;

    return true;
};

/**
 * Formatear número de puntos
 */
export const formatPoints = (points: number): string => {
    return points.toLocaleString('es-CL') + ' pts';
};

export default {
    // Members
    getAllMembers,
    getMemberById,
    enrollMember,
    updateMember,

    // Points
    getPointsTransactions,
    awardPoints,
    adjustPoints,

    // Rewards
    getAllRewards,
    getAvailableRewardsForMember,
    createReward,
    redeemReward,
    useRedemption,

    // Tiers
    getAllTiers,

    // Analytics
    getDashboardStats,
    getTopMembers,

    // Utilities
    formatRewardType,
    formatTransactionType,
    getTierColor,
    getEngagementStatusColor,
    calculatePointsForPurchase,
    isRewardAvailable,
    formatPoints
};
