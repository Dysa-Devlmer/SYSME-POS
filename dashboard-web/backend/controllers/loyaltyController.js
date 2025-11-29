/**
 * =====================================================
 * SYSME POS - Loyalty & Rewards Controller
 * =====================================================
 * Controlador para sistema de fidelización y recompensas
 *
 * Funcionalidades:
 * - Gestión de miembros del programa
 * - Transacciones de puntos
 * - Catálogo de recompensas
 * - Canjes de recompensas
 * - Gestión de tiers
 * - Campañas promocionales
 * - Programa de referidos
 * - Analytics y reportes
 *
 * @module loyaltyController
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const db = require('../config/database');
const logger = require('../utils/logger');

// ====================================
// GESTIÓN DE MIEMBROS
// ====================================

/**
 * Obtener todos los miembros del programa de fidelidad
 */
exports.getAllMembers = async (req, res) => {
    try {
        const {
            tier_id,
            status = 'active',
            search,
            engagement_status,
            sort_by = 'enrollment_date',
            sort_order = 'DESC',
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_loyalty_members_detailed WHERE 1=1';
        const params = [];

        if (tier_id) {
            query += ' AND current_tier_id = ?';
            params.push(tier_id);
        }

        if (status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (engagement_status) {
            query += ' AND engagement_status = ?';
            params.push(engagement_status);
        }

        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR membership_number LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        // Add sorting and pagination
        query += ` ORDER BY ${sort_by} ${sort_order} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const members = db.prepare(query).all(params);

        res.json({
            success: true,
            data: members,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting loyalty members:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener miembros',
            details: error.message
        });
    }
};

/**
 * Obtener miembro por ID
 */
exports.getMemberById = async (req, res) => {
    try {
        const { id } = req.params;

        const member = db.prepare('SELECT * FROM v_loyalty_members_detailed WHERE id = ?').get(id);

        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Miembro no encontrado'
            });
        }

        // Get recent points transactions
        const recentTransactions = db.prepare(`
            SELECT * FROM v_loyalty_points_transactions_detailed
            WHERE member_id = ?
            ORDER BY transaction_date DESC
            LIMIT 10
        `).all(id);

        // Get active redemptions
        const activeRedemptions = db.prepare(`
            SELECT * FROM v_loyalty_redemptions_detailed
            WHERE member_id = ? AND status IN ('pending', 'active')
            ORDER BY redeemed_at DESC
        `).all(id);

        // Get tier history
        const tierHistory = db.prepare(`
            SELECT * FROM loyalty_member_tier_history
            WHERE member_id = ?
            ORDER BY change_date DESC
            LIMIT 5
        `).all(id);

        res.json({
            success: true,
            data: {
                ...member,
                recent_transactions: recentTransactions,
                active_redemptions: activeRedemptions,
                tier_history: tierHistory
            }
        });

    } catch (error) {
        logger.error('Error getting loyalty member:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener miembro',
            details: error.message
        });
    }
};

/**
 * Crear nuevo miembro del programa
 */
exports.enrollMember = async (req, res) => {
    try {
        const {
            customer_id,
            initial_tier_id = 1,
            referred_by_member_id
        } = req.body;

        if (!customer_id) {
            return res.status(400).json({
                success: false,
                error: 'customer_id es requerido'
            });
        }

        // Check if customer is already enrolled
        const existing = db.prepare('SELECT id FROM loyalty_members WHERE customer_id = ?').get(customer_id);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'El cliente ya está inscrito en el programa'
            });
        }

        // Get welcome bonus points from tier
        const tier = db.prepare('SELECT welcome_bonus_points FROM loyalty_tiers WHERE id = ?').get(initial_tier_id);
        const welcomeBonus = tier?.welcome_bonus_points || 0;

        // Generate membership number
        const lastMember = db.prepare('SELECT MAX(id) as max_id FROM loyalty_members').get();
        const membershipNumber = `LM${String((lastMember?.max_id || 0) + 1).padStart(8, '0')}`;

        // Create member
        const stmt = db.prepare(`
            INSERT INTO loyalty_members (
                customer_id, membership_number, current_tier_id,
                tier_achieved_date, referred_by_member_id
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `);

        const result = stmt.run(customer_id, membershipNumber, initial_tier_id, referred_by_member_id || null);
        const memberId = result.lastInsertRowid;

        // Award welcome bonus points
        if (welcomeBonus > 0) {
            db.prepare(`
                INSERT INTO loyalty_points_transactions (
                    member_id, transaction_type, points,
                    reference_type, description
                ) VALUES (?, 'bonus', ?, 'welcome_bonus', 'Bono de bienvenida al programa')
            `).run(memberId, welcomeBonus);
        }

        // If referred, create referral record and reward referrer
        if (referred_by_member_id) {
            db.prepare(`
                INSERT INTO loyalty_referrals (
                    referrer_member_id, referred_customer_id, referral_code_used
                ) VALUES (?, ?, (SELECT referral_code FROM loyalty_members WHERE id = ?))
            `).run(referred_by_member_id, customer_id, referred_by_member_id);

            // Update referrer's total referrals
            db.prepare(`
                UPDATE loyalty_members
                SET total_referrals = total_referrals + 1
                WHERE id = ?
            `).run(referred_by_member_id);
        }

        const newMember = db.prepare('SELECT * FROM v_loyalty_members_detailed WHERE id = ?').get(memberId);

        logger.info(`New loyalty member enrolled: ${membershipNumber}`);

        res.status(201).json({
            success: true,
            message: 'Miembro inscrito exitosamente',
            data: newMember
        });

    } catch (error) {
        logger.error('Error enrolling member:', error);
        res.status(500).json({
            success: false,
            error: 'Error al inscribir miembro',
            details: error.message
        });
    }
};

/**
 * Actualizar información de miembro
 */
exports.updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const existing = db.prepare('SELECT * FROM loyalty_members WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Miembro no encontrado'
            });
        }

        const allowedFields = [
            'status', 'email_notifications', 'sms_notifications',
            'push_notifications', 'notes'
        ];

        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos válidos para actualizar'
            });
        }

        params.push(id);
        const query = `UPDATE loyalty_members SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(params);

        const updatedMember = db.prepare('SELECT * FROM v_loyalty_members_detailed WHERE id = ?').get(id);

        res.json({
            success: true,
            message: 'Miembro actualizado exitosamente',
            data: updatedMember
        });

    } catch (error) {
        logger.error('Error updating member:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar miembro',
            details: error.message
        });
    }
};

// ====================================
// GESTIÓN DE PUNTOS
// ====================================

/**
 * Obtener transacciones de puntos
 */
exports.getPointsTransactions = async (req, res) => {
    try {
        const {
            member_id,
            transaction_type,
            start_date,
            end_date,
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_loyalty_points_transactions_detailed WHERE 1=1';
        const params = [];

        if (member_id) {
            query += ' AND member_id = ?';
            params.push(member_id);
        }

        if (transaction_type) {
            query += ' AND transaction_type = ?';
            params.push(transaction_type);
        }

        if (start_date) {
            query += ' AND transaction_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND transaction_date <= ?';
            params.push(end_date);
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        query += ' ORDER BY transaction_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const transactions = db.prepare(query).all(params);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting points transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener transacciones',
            details: error.message
        });
    }
};

/**
 * Registrar puntos ganados (generalmente por compra)
 */
exports.awardPoints = async (req, res) => {
    try {
        const {
            member_id,
            points,
            reference_type,
            reference_id,
            description,
            multiplier
        } = req.body;

        if (!member_id || !points) {
            return res.status(400).json({
                success: false,
                error: 'member_id y points son requeridos'
            });
        }

        // Get member's tier multiplier
        const member = db.prepare(`
            SELECT lm.*, lt.points_multiplier
            FROM loyalty_members lm
            JOIN loyalty_tiers lt ON lm.current_tier_id = lt.id
            WHERE lm.id = ?
        `).get(member_id);

        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Miembro no encontrado'
            });
        }

        const finalMultiplier = multiplier || member.points_multiplier || 1.0;
        const finalPoints = Math.floor(points * finalMultiplier);

        // Create transaction
        const stmt = db.prepare(`
            INSERT INTO loyalty_points_transactions (
                member_id, transaction_type, points,
                reference_type, reference_id, description, multiplier_applied
            ) VALUES (?, 'earned', ?, ?, ?, ?, ?)
        `);

        stmt.run(member_id, finalPoints, reference_type, reference_id, description, finalMultiplier);

        const updatedMember = db.prepare('SELECT * FROM v_loyalty_members_detailed WHERE id = ?').get(member_id);

        logger.info(`Points awarded: ${finalPoints} to member ${member_id}`);

        res.json({
            success: true,
            message: 'Puntos otorgados exitosamente',
            data: {
                points_awarded: finalPoints,
                multiplier_applied: finalMultiplier,
                new_balance: updatedMember.current_points
            }
        });

    } catch (error) {
        logger.error('Error awarding points:', error);
        res.status(500).json({
            success: false,
            error: 'Error al otorgar puntos',
            details: error.message
        });
    }
};

/**
 * Ajustar puntos manualmente
 */
exports.adjustPoints = async (req, res) => {
    try {
        const {
            member_id,
            points,
            reason,
            notes
        } = req.body;

        if (!member_id || points === undefined || !reason) {
            return res.status(400).json({
                success: false,
                error: 'member_id, points y reason son requeridos'
            });
        }

        const stmt = db.prepare(`
            INSERT INTO loyalty_points_transactions (
                member_id, transaction_type, points,
                reference_type, description, notes, created_by
            ) VALUES (?, 'adjusted', ?, 'manual_adjustment', ?, ?, ?)
        `);

        stmt.run(member_id, points, reason, notes, req.user?.username || 'system');

        const updatedMember = db.prepare('SELECT * FROM v_loyalty_members_detailed WHERE id = ?').get(member_id);

        logger.info(`Points adjusted: ${points} for member ${member_id}`);

        res.json({
            success: true,
            message: 'Puntos ajustados exitosamente',
            data: {
                points_adjusted: points,
                new_balance: updatedMember.current_points
            }
        });

    } catch (error) {
        logger.error('Error adjusting points:', error);
        res.status(500).json({
            success: false,
            error: 'Error al ajustar puntos',
            details: error.message
        });
    }
};

// ====================================
// GESTIÓN DE RECOMPENSAS
// ====================================

/**
 * Obtener catálogo de recompensas
 */
exports.getAllRewards = async (req, res) => {
    try {
        const {
            reward_type,
            min_tier_required,
            is_active = '1',
            featured,
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_loyalty_rewards_stats WHERE 1=1';
        const params = [];

        if (reward_type) {
            query += ' AND reward_type = ?';
            params.push(reward_type);
        }

        if (min_tier_required) {
            query += ' AND min_tier_required <= ?';
            params.push(min_tier_required);
        }

        if (is_active !== 'all') {
            query += ' AND is_active = ?';
            params.push(is_active);
        }

        if (featured !== undefined) {
            query += ' AND featured = ?';
            params.push(featured);
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        query += ' ORDER BY display_order ASC, points_cost ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const rewards = db.prepare(query).all(params);

        // Parse JSON fields
        rewards.forEach(reward => {
            if (reward.product_ids) reward.product_ids = JSON.parse(reward.product_ids);
            if (reward.exclusive_to_tiers) reward.exclusive_to_tiers = JSON.parse(reward.exclusive_to_tiers);
            if (reward.valid_days_of_week) reward.valid_days_of_week = JSON.parse(reward.valid_days_of_week);
        });

        res.json({
            success: true,
            data: rewards,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting rewards:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener recompensas',
            details: error.message
        });
    }
};

/**
 * Obtener recompensas disponibles para un miembro específico
 */
exports.getAvailableRewardsForMember = async (req, res) => {
    try {
        const { member_id } = req.params;

        const member = db.prepare('SELECT * FROM loyalty_members WHERE id = ?').get(member_id);
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Miembro no encontrado'
            });
        }

        const rewards = db.prepare(`
            SELECT lr.*,
                CASE WHEN lr.points_cost <= ? THEN 1 ELSE 0 END as can_afford,
                COUNT(lrr.id) as member_redemption_count
            FROM loyalty_rewards lr
            LEFT JOIN loyalty_reward_redemptions lrr ON lr.id = lrr.reward_id AND lrr.member_id = ?
            WHERE lr.is_active = 1
            AND lr.min_tier_required <= ?
            AND (lr.valid_from IS NULL OR DATE(lr.valid_from) <= DATE('now'))
            AND (lr.valid_until IS NULL OR DATE(lr.valid_until) >= DATE('now'))
            AND (lr.remaining_quantity IS NULL OR lr.remaining_quantity > 0)
            GROUP BY lr.id
            HAVING member_redemption_count < COALESCE(lr.max_redemptions_per_member, 999999)
            ORDER BY lr.display_order, lr.points_cost
        `).all(member.current_points, member_id, member.current_tier_id);

        res.json({
            success: true,
            data: rewards,
            member_info: {
                current_points: member.current_points,
                current_tier: member.current_tier_id
            }
        });

    } catch (error) {
        logger.error('Error getting available rewards:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener recompensas disponibles',
            details: error.message
        });
    }
};

/**
 * Crear nueva recompensa
 */
exports.createReward = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            reward_type,
            points_cost,
            discount_type,
            discount_value,
            max_discount_amount,
            applicable_to = 'all',
            category_id,
            product_ids,
            min_purchase_amount,
            max_redemptions_per_member = 1,
            total_available_quantity,
            min_tier_required = 1,
            exclusive_to_tiers,
            valid_from,
            valid_until,
            days_valid_after_redemption = 30,
            valid_days_of_week,
            valid_time_start,
            valid_time_end,
            image_url,
            featured = 0,
            display_order = 0,
            terms_and_conditions
        } = req.body;

        if (!code || !name || !reward_type || !points_cost) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: code, name, reward_type, points_cost'
            });
        }

        const stmt = db.prepare(`
            INSERT INTO loyalty_rewards (
                code, name, description, reward_type, points_cost,
                discount_type, discount_value, max_discount_amount,
                applicable_to, category_id, product_ids,
                min_purchase_amount, max_redemptions_per_member,
                total_available_quantity, remaining_quantity,
                min_tier_required, exclusive_to_tiers,
                valid_from, valid_until, days_valid_after_redemption,
                valid_days_of_week, valid_time_start, valid_time_end,
                image_url, featured, display_order, terms_and_conditions,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            code, name, description, reward_type, points_cost,
            discount_type, discount_value, max_discount_amount,
            applicable_to, category_id,
            product_ids ? JSON.stringify(product_ids) : null,
            min_purchase_amount, max_redemptions_per_member,
            total_available_quantity, total_available_quantity,
            min_tier_required,
            exclusive_to_tiers ? JSON.stringify(exclusive_to_tiers) : null,
            valid_from, valid_until, days_valid_after_redemption,
            valid_days_of_week ? JSON.stringify(valid_days_of_week) : null,
            valid_time_start, valid_time_end,
            image_url, featured, display_order, terms_and_conditions,
            req.user?.username || 'system'
        );

        const newReward = db.prepare('SELECT * FROM v_loyalty_rewards_stats WHERE id = ?').get(result.lastInsertRowid);

        logger.info(`New loyalty reward created: ${code}`);

        res.status(201).json({
            success: true,
            message: 'Recompensa creada exitosamente',
            data: newReward
        });

    } catch (error) {
        logger.error('Error creating reward:', error);

        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'Ya existe una recompensa con ese código'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear recompensa',
            details: error.message
        });
    }
};

/**
 * Canjear recompensa
 */
exports.redeemReward = async (req, res) => {
    try {
        const {
            member_id,
            reward_id
        } = req.body;

        if (!member_id || !reward_id) {
            return res.status(400).json({
                success: false,
                error: 'member_id y reward_id son requeridos'
            });
        }

        // Get member
        const member = db.prepare('SELECT * FROM loyalty_members WHERE id = ?').get(member_id);
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Miembro no encontrado'
            });
        }

        // Get reward
        const reward = db.prepare('SELECT * FROM loyalty_rewards WHERE id = ?').get(reward_id);
        if (!reward) {
            return res.status(404).json({
                success: false,
                error: 'Recompensa no encontrada'
            });
        }

        // Validations
        if (member.current_points < reward.points_cost) {
            return res.status(400).json({
                success: false,
                error: 'Puntos insuficientes',
                required: reward.points_cost,
                available: member.current_points
            });
        }

        if (member.current_tier_id < reward.min_tier_required) {
            return res.status(400).json({
                success: false,
                error: 'Tier insuficiente para esta recompensa'
            });
        }

        if (reward.remaining_quantity !== null && reward.remaining_quantity <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Recompensa agotada'
            });
        }

        // Check redemption limit per member
        const redemptionCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM loyalty_reward_redemptions
            WHERE member_id = ? AND reward_id = ?
        `).get(member_id, reward_id);

        if (redemptionCount.count >= (reward.max_redemptions_per_member || 999999)) {
            return res.status(400).json({
                success: false,
                error: 'Se alcanzó el límite de canjes para esta recompensa'
            });
        }

        // Generate redemption code
        const redemptionCode = `RDM${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // Calculate valid_until
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + (reward.days_valid_after_redemption || 30));

        // Create redemption
        const insertRedemption = db.prepare(`
            INSERT INTO loyalty_reward_redemptions (
                redemption_code, member_id, reward_id, points_used,
                status, valid_until, created_by
            ) VALUES (?, ?, ?, ?, 'active', ?, ?)
        `);

        const redemptionResult = insertRedemption.run(
            redemptionCode,
            member_id,
            reward_id,
            reward.points_cost,
            validUntil.toISOString(),
            req.user?.username || 'system'
        );

        // Deduct points
        db.prepare(`
            INSERT INTO loyalty_points_transactions (
                member_id, transaction_type, points,
                reference_type, reference_id, description
            ) VALUES (?, 'redeemed', ?, 'reward_redemption', ?, ?)
        `).run(member_id, -reward.points_cost, redemptionResult.lastInsertRowid, `Canje: ${reward.name}`);

        const redemption = db.prepare('SELECT * FROM v_loyalty_redemptions_detailed WHERE id = ?').get(redemptionResult.lastInsertRowid);

        logger.info(`Reward redeemed: ${reward.code} by member ${member_id}`);

        res.status(201).json({
            success: true,
            message: 'Recompensa canjeada exitosamente',
            data: redemption
        });

    } catch (error) {
        logger.error('Error redeeming reward:', error);
        res.status(500).json({
            success: false,
            error: 'Error al canjear recompensa',
            details: error.message
        });
    }
};

/**
 * Marcar canje como usado
 */
exports.useRedemption = async (req, res) => {
    try {
        const { redemption_code } = req.params;
        const { order_id, discount_applied } = req.body;

        const redemption = db.prepare(`
            SELECT * FROM loyalty_reward_redemptions
            WHERE redemption_code = ?
        `).get(redemption_code);

        if (!redemption) {
            return res.status(404).json({
                success: false,
                error: 'Canje no encontrado'
            });
        }

        if (redemption.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: `No se puede usar este canje. Estado: ${redemption.status}`
            });
        }

        // Check if expired
        if (new Date(redemption.valid_until) < new Date()) {
            db.prepare('UPDATE loyalty_reward_redemptions SET status = ? WHERE id = ?')
                .run('expired', redemption.id);

            return res.status(400).json({
                success: false,
                error: 'El canje ha expirado'
            });
        }

        // Mark as used
        db.prepare(`
            UPDATE loyalty_reward_redemptions
            SET status = 'used',
                used_at = CURRENT_TIMESTAMP,
                order_id = ?,
                discount_applied = ?,
                used_by_employee_id = ?
            WHERE id = ?
        `).run(order_id, discount_applied, req.user?.id || null, redemption.id);

        const updatedRedemption = db.prepare('SELECT * FROM v_loyalty_redemptions_detailed WHERE id = ?').get(redemption.id);

        logger.info(`Redemption used: ${redemption_code}`);

        res.json({
            success: true,
            message: 'Canje marcado como usado',
            data: updatedRedemption
        });

    } catch (error) {
        logger.error('Error using redemption:', error);
        res.status(500).json({
            success: false,
            error: 'Error al usar canje',
            details: error.message
        });
    }
};

// ====================================
// GESTIÓN DE TIERS
// ====================================

/**
 * Obtener todos los tiers
 */
exports.getAllTiers = async (req, res) => {
    try {
        const tiers = db.prepare(`
            SELECT * FROM v_loyalty_tier_statistics
            WHERE is_active = 1
            ORDER BY tier_order
        `).all();

        res.json({
            success: true,
            data: tiers
        });

    } catch (error) {
        logger.error('Error getting tiers:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener tiers',
            details: error.message
        });
    }
};

// ====================================
// ANALYTICS Y REPORTES
// ====================================

/**
 * Dashboard de estadísticas generales
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Total members by status
        const memberStats = db.prepare(`
            SELECT
                status,
                COUNT(*) as count,
                SUM(current_points) as total_points,
                SUM(total_spent) as total_revenue
            FROM loyalty_members
            GROUP BY status
        `).all();

        // Points statistics
        const pointsStats = db.prepare(`
            SELECT
                SUM(CASE WHEN transaction_type = 'earned' THEN points ELSE 0 END) as total_earned,
                SUM(CASE WHEN transaction_type = 'redeemed' THEN ABS(points) ELSE 0 END) as total_redeemed,
                SUM(CASE WHEN transaction_type = 'expired' THEN ABS(points) ELSE 0 END) as total_expired,
                COUNT(DISTINCT member_id) as active_members
            FROM loyalty_points_transactions
            WHERE DATE(transaction_date) >= DATE('now', '-30 days')
        `).get();

        // Top rewards
        const topRewards = db.prepare(`
            SELECT lr.name, COUNT(*) as redemption_count
            FROM loyalty_reward_redemptions lrr
            JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
            WHERE DATE(lrr.redeemed_at) >= DATE('now', '-30 days')
            GROUP BY lr.id
            ORDER BY redemption_count DESC
            LIMIT 5
        `).all();

        // Engagement metrics
        const engagementStats = db.prepare(`
            SELECT
                COUNT(CASE WHEN julianday('now') - julianday(last_visit_date) <= 30 THEN 1 END) as active_last_30_days,
                COUNT(CASE WHEN julianday('now') - julianday(last_visit_date) > 30 AND julianday('now') - julianday(last_visit_date) <= 90 THEN 1 END) as at_risk,
                COUNT(CASE WHEN julianday('now') - julianday(last_visit_date) > 90 THEN 1 END) as inactive
            FROM loyalty_members
            WHERE status = 'active'
        `).get();

        res.json({
            success: true,
            data: {
                member_stats: memberStats,
                points_stats: pointsStats,
                top_rewards: topRewards,
                engagement_stats: engagementStats
            }
        });

    } catch (error) {
        logger.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas',
            details: error.message
        });
    }
};

/**
 * Top miembros del programa
 */
exports.getTopMembers = async (req, res) => {
    try {
        const { sort_by = 'lifetime_points', limit = 50 } = req.query;

        const validSortBy = ['lifetime_points', 'total_spent', 'total_visits'];
        const sortField = validSortBy.includes(sort_by) ? sort_by : 'lifetime_points';

        const topMembers = db.prepare(`
            SELECT * FROM v_top_loyalty_members
            ORDER BY ${sortField} DESC
            LIMIT ?
        `).all(parseInt(limit));

        res.json({
            success: true,
            data: topMembers
        });

    } catch (error) {
        logger.error('Error getting top members:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener top miembros',
            details: error.message
        });
    }
};

module.exports = exports;
