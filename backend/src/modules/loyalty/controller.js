/**
 * Loyalty Program Controller
 * Sistema de Fidelización para Restaurantes
 *
 * Features:
 * - Member management with QR codes
 * - Points earning and redemption
 * - Tier-based benefits (Bronze, Silver, Gold, Platinum)
 * - Rewards catalog
 * - Referral program
 * - Birthday bonuses
 * - Multi-branch support
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import crypto from 'crypto';

// =============================================
// HELPER FUNCTIONS
// =============================================

// Generate unique member code
const generateMemberCode = () => {
  const prefix = 'LYL';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Generate redemption code
const generateRedemptionCode = () => {
  return `RDM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// Calculate points for a purchase
const calculatePoints = async (amount, memberId) => {
  const program = await dbService.findOne('loyalty_programs', { id: 1, is_active: 1 });
  if (!program) return 0;

  let member = null;
  let multiplier = 1.0;

  if (memberId) {
    member = await dbService.findById('loyalty_members', memberId);
    if (member && member.current_tier_id) {
      const tier = await dbService.findById('loyalty_tiers', member.current_tier_id);
      if (tier) {
        multiplier = tier.multiplier || 1.0;
      }
    }
  }

  // Calculate base points (1 point per X CLP)
  const basePoints = Math.floor(amount / program.points_per_clp);
  const finalPoints = Math.floor(basePoints * multiplier);

  return finalPoints;
};

// Update member tier based on lifetime points
const updateMemberTier = async (memberId) => {
  const member = await dbService.findById('loyalty_members', memberId);
  if (!member) return;

  const tiers = await dbService.raw(`
    SELECT * FROM loyalty_tiers
    WHERE is_active = 1
    ORDER BY min_points DESC
  `);

  for (const tier of tiers) {
    if (member.lifetime_points >= tier.min_points) {
      if (member.current_tier_id !== tier.id) {
        await dbService.update('loyalty_members', memberId, {
          current_tier_id: tier.id,
          updated_at: new Date().toISOString()
        });

        // Log tier change
        await dbService.create('loyalty_activity_log', {
          member_id: memberId,
          activity_type: 'tier_change',
          description: `Upgraded to ${tier.name}`,
          metadata: JSON.stringify({ new_tier_id: tier.id, old_tier_id: member.current_tier_id })
        });

        logger.info(`Member ${memberId} upgraded to tier ${tier.name}`);
      }
      break;
    }
  }
};

// =============================================
// PROGRAM SETTINGS
// =============================================

export const getProgramSettings = async (req, res) => {
  try {
    const program = await dbService.findOne('loyalty_programs', { id: 1 });
    const tiers = await dbService.findMany('loyalty_tiers', { is_active: 1 }, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    res.json({
      success: true,
      data: {
        program,
        tiers
      }
    });
  } catch (error) {
    logger.error('Error getting program settings:', error);
    res.status(500).json({ success: false, message: 'Error al obtener configuración' });
  }
};

export const updateProgramSettings = async (req, res) => {
  try {
    const updates = req.body;
    await dbService.update('loyalty_programs', 1, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const program = await dbService.findOne('loyalty_programs', { id: 1 });

    logger.info('Loyalty program settings updated');
    res.json({ success: true, data: program, message: 'Configuración actualizada' });
  } catch (error) {
    logger.error('Error updating program settings:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
  }
};

// =============================================
// MEMBER MANAGEMENT
// =============================================

export const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tier_id, status, branch_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        m.*,
        t.name as tier_name,
        t.color as tier_color,
        t.discount_percentage
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (m.first_name LIKE ? OR m.last_name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ? OR m.email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (tier_id) {
      query += ` AND m.current_tier_id = ?`;
      params.push(tier_id);
    }

    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    if (branch_id) {
      query += ` AND m.favorite_branch_id = ?`;
      params.push(branch_id);
    }

    // Count total
    const countQuery = query.replace('SELECT \n        m.*,\n        t.name as tier_name,\n        t.color as tier_color,\n        t.discount_percentage', 'SELECT COUNT(*) as total');
    const countResult = await dbService.raw(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const members = await dbService.raw(query, params);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting members:', error);
    res.status(500).json({ success: false, message: 'Error al obtener miembros' });
  }
};

export const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const members = await dbService.raw(`
      SELECT
        m.*,
        t.name as tier_name,
        t.color as tier_color,
        t.multiplier,
        t.discount_percentage,
        t.benefits
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.id = ?
    `, [id]);

    if (!members.length) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    const member = members[0];

    // Get recent transactions
    const transactions = await dbService.raw(`
      SELECT * FROM loyalty_transactions
      WHERE member_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [id]);

    // Get active redemptions
    const redemptions = await dbService.raw(`
      SELECT r.*, rw.name as reward_name
      FROM loyalty_redemptions r
      JOIN loyalty_rewards rw ON r.reward_id = rw.id
      WHERE r.member_id = ? AND r.status IN ('pending', 'completed')
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [id]);

    res.json({
      success: true,
      data: {
        ...member,
        transactions,
        redemptions
      }
    });
  } catch (error) {
    logger.error('Error getting member:', error);
    res.status(500).json({ success: false, message: 'Error al obtener miembro' });
  }
};

export const getMemberByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    const members = await dbService.raw(`
      SELECT
        m.*,
        t.name as tier_name,
        t.color as tier_color,
        t.multiplier,
        t.discount_percentage
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.phone = ? AND m.status = 'active'
    `, [phone]);

    if (!members.length) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    res.json({ success: true, data: members[0] });
  } catch (error) {
    logger.error('Error getting member by phone:', error);
    res.status(500).json({ success: false, message: 'Error al buscar miembro' });
  }
};

export const getMemberByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const members = await dbService.raw(`
      SELECT
        m.*,
        t.name as tier_name,
        t.color as tier_color,
        t.multiplier,
        t.discount_percentage
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.member_code = ? AND m.status = 'active'
    `, [code]);

    if (!members.length) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    res.json({ success: true, data: members[0] });
  } catch (error) {
    logger.error('Error getting member by code:', error);
    res.status(500).json({ success: false, message: 'Error al buscar miembro' });
  }
};

export const createMember = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      rut,
      birth_date,
      gender,
      address,
      commune,
      city,
      dietary_preferences,
      referred_by_code
    } = req.body;

    // Validation
    if (!first_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y teléfono son requeridos'
      });
    }

    // Check if phone already exists
    const existing = await dbService.findOne('loyalty_members', { phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Este teléfono ya está registrado',
        existing_member: { id: existing.id, member_code: existing.member_code }
      });
    }

    const member_code = generateMemberCode();

    // Get default tier
    const defaultTier = await dbService.findOne('loyalty_tiers', { code: 'BRONZE' });

    const memberData = {
      member_code,
      first_name,
      last_name,
      phone,
      email,
      rut,
      birth_date,
      gender,
      address,
      commune,
      city: city || 'Santiago',
      dietary_preferences,
      current_tier_id: defaultTier?.id || 1,
      enrolled_branch_id: req.body.branch_id,
      status: 'active'
    };

    const member = await dbService.create('loyalty_members', memberData);

    // Handle referral
    if (referred_by_code) {
      const referrer = await dbService.findOne('loyalty_members', { member_code: referred_by_code });
      if (referrer) {
        await dbService.create('loyalty_referrals', {
          referrer_member_id: referrer.id,
          referred_member_id: member.id,
          referral_code: referred_by_code,
          referrer_bonus_points: 500,
          referred_bonus_points: 200,
          status: 'pending'
        });

        await dbService.update('loyalty_members', member.id, {
          referred_by_member_id: referrer.id
        });
      }
    }

    // Log activity
    await dbService.create('loyalty_activity_log', {
      member_id: member.id,
      activity_type: 'registration',
      description: 'New member registered',
      branch_id: req.body.branch_id
    });

    logger.info(`New loyalty member created: ${member_code}`);

    res.status(201).json({
      success: true,
      data: member,
      message: 'Miembro registrado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating member:', error);
    res.status(500).json({ success: false, message: 'Error al registrar miembro' });
  }
};

export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await dbService.findById('loyalty_members', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    // Don't allow updating sensitive fields directly
    delete updates.member_code;
    delete updates.total_points;
    delete updates.available_points;
    delete updates.lifetime_points;

    await dbService.update('loyalty_members', id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const updated = await dbService.findById('loyalty_members', id);

    logger.info(`Loyalty member ${id} updated`);
    res.json({ success: true, data: updated, message: 'Miembro actualizado' });
  } catch (error) {
    logger.error('Error updating member:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar miembro' });
  }
};

// =============================================
// POINTS OPERATIONS
// =============================================

export const earnPoints = async (req, res) => {
  try {
    const { member_id, sale_id, amount, description, branch_id } = req.body;

    if (!member_id || !amount) {
      return res.status(400).json({ success: false, message: 'member_id y amount son requeridos' });
    }

    const member = await dbService.findById('loyalty_members', member_id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    if (member.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Miembro no está activo' });
    }

    // Calculate points with tier multiplier
    const points = await calculatePoints(amount, member_id);

    if (points <= 0) {
      return res.json({ success: true, data: { points_earned: 0 }, message: 'No se generaron puntos' });
    }

    const pointsBefore = member.available_points;
    const pointsAfter = pointsBefore + points;

    // Get current tier
    const tier = await dbService.findById('loyalty_tiers', member.current_tier_id);

    // Create transaction
    await dbService.create('loyalty_transactions', {
      member_id,
      sale_id,
      type: 'earn',
      points,
      points_before: pointsBefore,
      points_after: pointsAfter,
      description: description || 'Puntos por compra',
      reference_type: 'sale',
      reference_id: sale_id,
      purchase_amount: amount,
      multiplier_applied: tier?.multiplier || 1,
      tier_at_transaction: tier?.name,
      branch_id,
      processed_by_user_id: req.user?.id
    });

    // Update member points
    await dbService.update('loyalty_members', member_id, {
      available_points: pointsAfter,
      total_points: member.total_points + points,
      lifetime_points: member.lifetime_points + points,
      total_visits: member.total_visits + 1,
      total_spent: member.total_spent + amount,
      average_ticket: (member.total_spent + amount) / (member.total_visits + 1),
      last_visit_at: new Date().toISOString(),
      last_purchase_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Check for tier upgrade
    await updateMemberTier(member_id);

    // Complete referral bonus if first purchase
    if (member.total_visits === 0 && member.referred_by_member_id) {
      const referral = await dbService.findOne('loyalty_referrals', {
        referred_member_id: member_id,
        status: 'pending'
      });

      if (referral) {
        // Give bonus to referrer
        const referrer = await dbService.findById('loyalty_members', referral.referrer_member_id);
        if (referrer) {
          await dbService.create('loyalty_transactions', {
            member_id: referrer.id,
            type: 'referral',
            points: referral.referrer_bonus_points,
            points_before: referrer.available_points,
            points_after: referrer.available_points + referral.referrer_bonus_points,
            description: `Bono por referir a ${member.first_name}`
          });

          await dbService.update('loyalty_members', referrer.id, {
            available_points: referrer.available_points + referral.referrer_bonus_points,
            lifetime_points: referrer.lifetime_points + referral.referrer_bonus_points
          });
        }

        // Give bonus to referred
        await dbService.create('loyalty_transactions', {
          member_id,
          type: 'referral',
          points: referral.referred_bonus_points,
          points_before: pointsAfter,
          points_after: pointsAfter + referral.referred_bonus_points,
          description: 'Bono de bienvenida por referido'
        });

        await dbService.update('loyalty_members', member_id, {
          available_points: pointsAfter + referral.referred_bonus_points,
          lifetime_points: member.lifetime_points + points + referral.referred_bonus_points
        });

        await dbService.update('loyalty_referrals', referral.id, {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }
    }

    logger.info(`Member ${member_id} earned ${points} points from sale ${sale_id}`);

    res.json({
      success: true,
      data: {
        points_earned: points,
        multiplier: tier?.multiplier || 1,
        new_balance: pointsAfter,
        tier: tier?.name
      },
      message: `¡Ganaste ${points} puntos!`
    });
  } catch (error) {
    logger.error('Error earning points:', error);
    res.status(500).json({ success: false, message: 'Error al procesar puntos' });
  }
};

export const redeemPoints = async (req, res) => {
  try {
    const { member_id, reward_id, sale_id, branch_id } = req.body;

    const member = await dbService.findById('loyalty_members', member_id);
    if (!member || member.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado o inactivo' });
    }

    const reward = await dbService.findById('loyalty_rewards', reward_id);
    if (!reward || !reward.is_active) {
      return res.status(404).json({ success: false, message: 'Recompensa no disponible' });
    }

    // Check points
    if (member.available_points < reward.points_cost) {
      return res.status(400).json({
        success: false,
        message: `Puntos insuficientes. Necesitas ${reward.points_cost}, tienes ${member.available_points}`
      });
    }

    // Check tier requirement
    if (reward.min_tier_id && member.current_tier_id < reward.min_tier_id) {
      const requiredTier = await dbService.findById('loyalty_tiers', reward.min_tier_id);
      return res.status(400).json({
        success: false,
        message: `Requiere nivel ${requiredTier?.name || 'superior'}`
      });
    }

    const pointsBefore = member.available_points;
    const pointsAfter = pointsBefore - reward.points_cost;
    const redemptionCode = generateRedemptionCode();

    // Create redemption
    const redemption = await dbService.create('loyalty_redemptions', {
      member_id,
      reward_id,
      sale_id,
      points_spent: reward.points_cost,
      reward_value: reward.monetary_value || reward.discount_value,
      status: sale_id ? 'completed' : 'pending',
      redemption_code: redemptionCode,
      redeemed_at: new Date().toISOString(),
      completed_at: sale_id ? new Date().toISOString() : null,
      branch_id,
      processed_by_user_id: req.user?.id
    });

    // Create transaction
    await dbService.create('loyalty_transactions', {
      member_id,
      sale_id,
      type: 'redeem',
      points: -reward.points_cost,
      points_before: pointsBefore,
      points_after: pointsAfter,
      description: `Canje: ${reward.name}`,
      reference_type: 'reward',
      reference_id: reward_id,
      branch_id,
      processed_by_user_id: req.user?.id
    });

    // Update member points
    await dbService.update('loyalty_members', member_id, {
      available_points: pointsAfter,
      updated_at: new Date().toISOString()
    });

    // Update reward redemption count
    await dbService.update('loyalty_rewards', reward_id, {
      current_redemptions: (reward.current_redemptions || 0) + 1
    });

    logger.info(`Member ${member_id} redeemed reward ${reward_id}`);

    res.json({
      success: true,
      data: {
        redemption,
        redemption_code: redemptionCode,
        points_spent: reward.points_cost,
        new_balance: pointsAfter,
        reward: reward.name
      },
      message: `¡Canjeaste ${reward.name}!`
    });
  } catch (error) {
    logger.error('Error redeeming points:', error);
    res.status(500).json({ success: false, message: 'Error al canjear recompensa' });
  }
};

export const getMemberTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM loyalty_transactions WHERE member_id = ?';
    const params = [id];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await dbService.raw(query, params);

    const countResult = await dbService.raw(
      'SELECT COUNT(*) as total FROM loyalty_transactions WHERE member_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0]?.total || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error getting transactions:', error);
    res.status(500).json({ success: false, message: 'Error al obtener transacciones' });
  }
};

// =============================================
// REWARDS CATALOG
// =============================================

export const getRewards = async (req, res) => {
  try {
    const { active_only = true, tier_id, branch_id } = req.query;

    let query = `
      SELECT
        r.*,
        t.name as min_tier_name,
        p.name as product_name
      FROM loyalty_rewards r
      LEFT JOIN loyalty_tiers t ON r.min_tier_id = t.id
      LEFT JOIN products p ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true' || active_only === true) {
      query += ' AND r.is_active = 1';
    }

    if (tier_id) {
      query += ' AND (r.min_tier_id IS NULL OR r.min_tier_id <= ?)';
      params.push(tier_id);
    }

    query += ' ORDER BY r.is_featured DESC, r.points_cost ASC';

    const rewards = await dbService.raw(query, params);

    res.json({ success: true, data: rewards });
  } catch (error) {
    logger.error('Error getting rewards:', error);
    res.status(500).json({ success: false, message: 'Error al obtener recompensas' });
  }
};

export const getRewardById = async (req, res) => {
  try {
    const { id } = req.params;
    const reward = await dbService.findById('loyalty_rewards', id);

    if (!reward) {
      return res.status(404).json({ success: false, message: 'Recompensa no encontrada' });
    }

    res.json({ success: true, data: reward });
  } catch (error) {
    logger.error('Error getting reward:', error);
    res.status(500).json({ success: false, message: 'Error al obtener recompensa' });
  }
};

export const createReward = async (req, res) => {
  try {
    const rewardData = req.body;

    if (!rewardData.name || !rewardData.points_cost || !rewardData.reward_type) {
      return res.status(400).json({
        success: false,
        message: 'name, points_cost y reward_type son requeridos'
      });
    }

    rewardData.code = rewardData.code || `RWD-${Date.now().toString(36).toUpperCase()}`;

    const reward = await dbService.create('loyalty_rewards', rewardData);

    logger.info(`New reward created: ${reward.code}`);
    res.status(201).json({ success: true, data: reward, message: 'Recompensa creada' });
  } catch (error) {
    logger.error('Error creating reward:', error);
    res.status(500).json({ success: false, message: 'Error al crear recompensa' });
  }
};

export const updateReward = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await dbService.update('loyalty_rewards', id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const reward = await dbService.findById('loyalty_rewards', id);
    res.json({ success: true, data: reward, message: 'Recompensa actualizada' });
  } catch (error) {
    logger.error('Error updating reward:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar recompensa' });
  }
};

export const deleteReward = async (req, res) => {
  try {
    const { id } = req.params;
    await dbService.update('loyalty_rewards', id, { is_active: 0 });
    res.json({ success: true, message: 'Recompensa desactivada' });
  } catch (error) {
    logger.error('Error deleting reward:', error);
    res.status(500).json({ success: false, message: 'Error al desactivar recompensa' });
  }
};

// =============================================
// ANALYTICS & REPORTS
// =============================================

export const getLoyaltyDashboard = async (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;

    // Total members by tier
    const membersByTier = await dbService.raw(`
      SELECT
        t.name as tier,
        t.color,
        COUNT(m.id) as count
      FROM loyalty_tiers t
      LEFT JOIN loyalty_members m ON t.id = m.current_tier_id AND m.status = 'active'
      GROUP BY t.id
      ORDER BY t.display_order
    `);

    // Points summary
    const pointsSummary = await dbService.raw(`
      SELECT
        SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as total_earned,
        SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END) as total_redeemed,
        COUNT(DISTINCT member_id) as active_members
      FROM loyalty_transactions
      WHERE created_at >= date('now', '-30 days')
    `);

    // Top members
    const topMembers = await dbService.raw(`
      SELECT
        m.id,
        m.member_code,
        m.first_name,
        m.last_name,
        m.lifetime_points,
        m.total_spent,
        t.name as tier
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.status = 'active'
      ORDER BY m.lifetime_points DESC
      LIMIT 10
    `);

    // Recent redemptions
    const recentRedemptions = await dbService.raw(`
      SELECT
        r.id,
        r.points_spent,
        r.created_at,
        rw.name as reward_name,
        m.first_name,
        m.last_name
      FROM loyalty_redemptions r
      JOIN loyalty_rewards rw ON r.reward_id = rw.id
      JOIN loyalty_members m ON r.member_id = m.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

    // Monthly growth
    const monthlyGrowth = await dbService.raw(`
      SELECT
        strftime('%Y-%m', enrolled_at) as month,
        COUNT(*) as new_members
      FROM loyalty_members
      WHERE enrolled_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `);

    res.json({
      success: true,
      data: {
        members_by_tier: membersByTier,
        points_summary: pointsSummary[0],
        top_members: topMembers,
        recent_redemptions: recentRedemptions,
        monthly_growth: monthlyGrowth,
        total_members: membersByTier.reduce((sum, t) => sum + t.count, 0)
      }
    });
  } catch (error) {
    logger.error('Error getting loyalty dashboard:', error);
    res.status(500).json({ success: false, message: 'Error al obtener dashboard' });
  }
};

export const getMemberReport = async (req, res) => {
  try {
    const { start_date, end_date, tier_id, branch_id, export_format } = req.query;

    let query = `
      SELECT
        m.member_code,
        m.first_name,
        m.last_name,
        m.phone,
        m.email,
        t.name as tier,
        m.available_points,
        m.lifetime_points,
        m.total_visits,
        m.total_spent,
        m.average_ticket,
        m.enrolled_at,
        m.last_visit_at
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.status = 'active'
    `;
    const params = [];

    if (tier_id) {
      query += ' AND m.current_tier_id = ?';
      params.push(tier_id);
    }

    if (start_date) {
      query += ' AND m.enrolled_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND m.enrolled_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY m.lifetime_points DESC';

    const members = await dbService.raw(query, params);

    res.json({
      success: true,
      data: members,
      summary: {
        total_members: members.length,
        total_points: members.reduce((sum, m) => sum + m.available_points, 0),
        total_spent: members.reduce((sum, m) => sum + m.total_spent, 0),
        avg_lifetime_points: members.length > 0
          ? Math.round(members.reduce((sum, m) => sum + m.lifetime_points, 0) / members.length)
          : 0
      }
    });
  } catch (error) {
    logger.error('Error getting member report:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte' });
  }
};

// =============================================
// QUICK ACTIONS (FOR POS)
// =============================================

export const quickLookup = async (req, res) => {
  try {
    const { query } = req.params;

    // Search by phone, code, or name
    const members = await dbService.raw(`
      SELECT
        m.id,
        m.member_code,
        m.first_name,
        m.last_name,
        m.phone,
        m.available_points,
        t.name as tier,
        t.color as tier_color,
        t.multiplier,
        t.discount_percentage
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.status = 'active'
        AND (m.phone LIKE ? OR m.member_code LIKE ? OR m.first_name LIKE ? OR m.last_name LIKE ?)
      LIMIT 5
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

    res.json({ success: true, data: members });
  } catch (error) {
    logger.error('Error in quick lookup:', error);
    res.status(500).json({ success: false, message: 'Error en búsqueda' });
  }
};

export const calculatePointsPreview = async (req, res) => {
  try {
    const { member_id, amount } = req.body;

    const points = await calculatePoints(amount, member_id);

    let tierInfo = null;
    if (member_id) {
      const member = await dbService.findById('loyalty_members', member_id);
      if (member) {
        const tier = await dbService.findById('loyalty_tiers', member.current_tier_id);
        tierInfo = {
          name: tier?.name,
          multiplier: tier?.multiplier,
          discount: tier?.discount_percentage
        };
      }
    }

    res.json({
      success: true,
      data: {
        estimated_points: points,
        tier: tierInfo
      }
    });
  } catch (error) {
    logger.error('Error calculating points preview:', error);
    res.status(500).json({ success: false, message: 'Error al calcular puntos' });
  }
};

// =============================================
// ADDITIONAL ENDPOINTS FOR FRONTEND COMPATIBILITY
// =============================================

// Alias for createMember - frontend uses /members/enroll
export const enrollMember = createMember;

// Get all tiers
export const getAllTiers = async (req, res) => {
  try {
    const tiers = await dbService.findMany('loyalty_tiers', { is_active: 1 }, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    res.json({ success: true, data: tiers });
  } catch (error) {
    logger.error('Error getting tiers:', error);
    res.status(500).json({ success: false, message: 'Error al obtener niveles' });
  }
};

// Get all transactions (not just for one member)
export const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, member_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        t.*,
        m.first_name,
        m.last_name,
        m.member_code
      FROM loyalty_transactions t
      LEFT JOIN loyalty_members m ON t.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (member_id) {
      query += ' AND t.member_id = ?';
      params.push(member_id);
    }

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (start_date) {
      query += ' AND DATE(t.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(t.created_at) <= ?';
      params.push(end_date);
    }

    const countQuery = query.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await dbService.raw(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await dbService.raw(query, params);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting all transactions:', error);
    res.status(500).json({ success: false, message: 'Error al obtener transacciones' });
  }
};

// Award points (alias for earnPoints with simpler interface)
export const awardPoints = async (req, res) => {
  try {
    const { member_id, points, description, reference_type, reference_id, multiplier = 1 } = req.body;

    if (!member_id || !points) {
      return res.status(400).json({ success: false, message: 'member_id y points son requeridos' });
    }

    const member = await dbService.findById('loyalty_members', member_id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    const finalPoints = Math.floor(points * multiplier);
    const pointsBefore = member.available_points;
    const pointsAfter = pointsBefore + finalPoints;

    await dbService.create('loyalty_transactions', {
      member_id,
      type: 'earn',
      points: finalPoints,
      points_before: pointsBefore,
      points_after: pointsAfter,
      description: description || 'Puntos otorgados',
      reference_type,
      reference_id,
      multiplier_applied: multiplier,
      processed_by_user_id: req.user?.id
    });

    await dbService.update('loyalty_members', member_id, {
      available_points: pointsAfter,
      total_points: member.total_points + finalPoints,
      lifetime_points: member.lifetime_points + finalPoints,
      updated_at: new Date().toISOString()
    });

    await updateMemberTier(member_id);

    res.json({
      success: true,
      data: {
        points_awarded: finalPoints,
        multiplier_applied: multiplier,
        new_balance: pointsAfter
      },
      message: `${finalPoints} puntos otorgados`
    });
  } catch (error) {
    logger.error('Error awarding points:', error);
    res.status(500).json({ success: false, message: 'Error al otorgar puntos' });
  }
};

// Adjust points manually (positive or negative)
export const adjustPoints = async (req, res) => {
  try {
    const { member_id, points, reason, notes } = req.body;

    if (!member_id || points === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'member_id, points y reason son requeridos'
      });
    }

    const member = await dbService.findById('loyalty_members', member_id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    const pointsBefore = member.available_points;
    const pointsAfter = Math.max(0, pointsBefore + points); // Don't go negative

    await dbService.create('loyalty_transactions', {
      member_id,
      type: 'adjustment',
      points,
      points_before: pointsBefore,
      points_after: pointsAfter,
      description: reason,
      notes,
      processed_by_user_id: req.user?.id
    });

    await dbService.update('loyalty_members', member_id, {
      available_points: pointsAfter,
      updated_at: new Date().toISOString()
    });

    logger.info(`Points adjusted for member ${member_id}: ${points} (reason: ${reason})`);

    res.json({
      success: true,
      data: {
        points_adjusted: points,
        new_balance: pointsAfter
      },
      message: `Puntos ajustados: ${points > 0 ? '+' : ''}${points}`
    });
  } catch (error) {
    logger.error('Error adjusting points:', error);
    res.status(500).json({ success: false, message: 'Error al ajustar puntos' });
  }
};

// Get available rewards for a specific member
export const getAvailableRewardsForMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await dbService.findById('loyalty_members', memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }

    const rewards = await dbService.raw(`
      SELECT
        r.*,
        t.name as min_tier_name,
        CASE
          WHEN r.points_cost <= ? THEN 1
          ELSE 0
        END as can_afford,
        CASE
          WHEN r.min_tier_id IS NULL OR r.min_tier_id <= ? THEN 1
          ELSE 0
        END as tier_eligible
      FROM loyalty_rewards r
      LEFT JOIN loyalty_tiers t ON r.min_tier_id = t.id
      WHERE r.is_active = 1
        AND (r.max_redemptions IS NULL OR r.current_redemptions < r.max_redemptions)
        AND (r.valid_until IS NULL OR r.valid_until >= date('now'))
      ORDER BY can_afford DESC, tier_eligible DESC, r.points_cost ASC
    `, [member.available_points, member.current_tier_id]);

    res.json({
      success: true,
      data: rewards,
      member_info: {
        current_points: member.available_points,
        current_tier: member.current_tier_id
      }
    });
  } catch (error) {
    logger.error('Error getting available rewards:', error);
    res.status(500).json({ success: false, message: 'Error al obtener recompensas' });
  }
};

// Use a redemption (mark as used)
export const useRedemption = async (req, res) => {
  try {
    const { redemptionCode } = req.params;
    const { order_id, discount_applied } = req.body;

    const redemption = await dbService.findOne('loyalty_redemptions', {
      redemption_code: redemptionCode
    });

    if (!redemption) {
      return res.status(404).json({ success: false, message: 'Canje no encontrado' });
    }

    if (redemption.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Este canje ya fue utilizado' });
    }

    if (redemption.status === 'expired') {
      return res.status(400).json({ success: false, message: 'Este canje ha expirado' });
    }

    await dbService.update('loyalty_redemptions', redemption.id, {
      status: 'completed',
      sale_id: order_id,
      reward_value: discount_applied,
      completed_at: new Date().toISOString(),
      processed_by_user_id: req.user?.id
    });

    const updated = await dbService.findById('loyalty_redemptions', redemption.id);

    logger.info(`Redemption ${redemptionCode} used for order ${order_id}`);

    res.json({
      success: true,
      data: updated,
      message: 'Canje aplicado exitosamente'
    });
  } catch (error) {
    logger.error('Error using redemption:', error);
    res.status(500).json({ success: false, message: 'Error al usar canje' });
  }
};

// Get top members
export const getTopMembers = async (req, res) => {
  try {
    const { sort_by = 'lifetime_points', limit = 50 } = req.query;

    const validSortFields = ['lifetime_points', 'total_spent', 'total_visits', 'available_points'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'lifetime_points';

    const members = await dbService.raw(`
      SELECT
        m.id,
        m.member_code,
        m.first_name,
        m.last_name,
        m.phone,
        m.email,
        m.available_points,
        m.lifetime_points,
        m.total_spent,
        m.total_visits,
        m.average_ticket,
        t.name as tier,
        t.color as tier_color
      FROM loyalty_members m
      LEFT JOIN loyalty_tiers t ON m.current_tier_id = t.id
      WHERE m.status = 'active'
      ORDER BY m.${sortField} DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({ success: true, data: members });
  } catch (error) {
    logger.error('Error getting top members:', error);
    res.status(500).json({ success: false, message: 'Error al obtener ranking' });
  }
};
