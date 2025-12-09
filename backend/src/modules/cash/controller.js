/**
 * Cash Register Controller - Critical POS Cash Management
 * Manages cash sessions, movements, and Z reports
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

/**
 * Get current active cash session
 */
export const getCurrentSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await dbService.findOne('cash_sessions', {
      user_id: userId,
      status: 'open'
    });

    if (!session) {
      return res.json({
        success: true,
        data: null,
        message: 'No active cash session'
      });
    }

    // Get movements for this session
    const movements = await dbService.findMany('cash_movements', {
      cash_session_id: session.id
    }, {
      orderBy: { field: 'created_at', direction: 'desc' }
    });

    res.json({
      success: true,
      data: {
        ...session,
        movements
      }
    });
  } catch (error) {
    logger.error('Error getting current session:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting current cash session'
    });
  }
};

/**
 * Open a new cash session
 */
export const openSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { opening_balance = 0, notes } = req.body;

    // Check if user already has an open session
    const existingSession = await dbService.findOne('cash_sessions', {
      user_id: userId,
      status: 'open'
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open cash session'
      });
    }

    // Generate session number (format: CS-YYYYMMDD-XXXX)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await dbService.count('cash_sessions', {});
    const sessionNumber = `CS-${today}-${String(count + 1).padStart(4, '0')}`;

    // Create new session
    const session = await dbService.create('cash_sessions', {
      session_number: sessionNumber,
      user_id: userId,
      status: 'open',
      opening_balance: parseFloat(opening_balance),
      total_sales: 0,
      total_cash: 0,
      total_card: 0,
      total_other: 0,
      total_in: 0,
      total_out: 0,
      sales_count: 0,
      notes
    });

    // Create opening movement
    await dbService.create('cash_movements', {
      cash_session_id: session.id,
      type: 'opening',
      amount: parseFloat(opening_balance),
      payment_method: 'cash',
      reason: 'Apertura de caja',
      user_id: userId
    });

    logger.info(`Cash session opened: ${sessionNumber} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: session,
      message: 'Cash session opened successfully'
    });
  } catch (error) {
    logger.error('Error opening session:', error);
    res.status(500).json({
      success: false,
      message: 'Error opening cash session'
    });
  }
};

/**
 * Close current cash session
 */
export const closeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { closing_balance, notes } = req.body;

    // Get active session
    const session = await dbService.findOne('cash_sessions', {
      user_id: userId,
      status: 'open'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active cash session found'
      });
    }

    // Calculate expected balance
    const expectedBalance = parseFloat(session.opening_balance) +
                          parseFloat(session.total_cash) +
                          parseFloat(session.total_in) -
                          parseFloat(session.total_out);

    const difference = parseFloat(closing_balance) - expectedBalance;

    // Update session
    const updatedSession = await dbService.update('cash_sessions', session.id, {
      status: 'closed',
      closing_balance: parseFloat(closing_balance),
      expected_balance: expectedBalance,
      difference: difference,
      closed_at: new Date().toISOString(),
      notes: notes || session.notes
    });

    // Create closing movement
    await dbService.create('cash_movements', {
      cash_session_id: session.id,
      type: 'closing',
      amount: parseFloat(closing_balance),
      payment_method: 'cash',
      reason: 'Cierre de caja',
      notes: `Diferencia: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`,
      user_id: userId
    });

    logger.info(`Cash session closed: ${session.session_number} by user ${userId}`);

    res.json({
      success: true,
      data: updatedSession,
      message: 'Cash session closed successfully'
    });
  } catch (error) {
    logger.error('Error closing session:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing cash session'
    });
  }
};

/**
 * Add cash movement (income or expense)
 */
export const addMovement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, amount, payment_method, reason, notes } = req.body;

    // Validate type
    if (!['in', 'out'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid movement type. Must be "in" or "out"'
      });
    }

    // Get active session
    const session = await dbService.findOne('cash_sessions', {
      user_id: userId,
      status: 'open'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active cash session. Please open a session first'
      });
    }

    // Create movement
    const movement = await dbService.create('cash_movements', {
      cash_session_id: session.id,
      type,
      amount: parseFloat(amount),
      payment_method: payment_method || 'cash',
      reason,
      notes,
      user_id: userId
    });

    // Update session totals
    const field = type === 'in' ? 'total_in' : 'total_out';
    await dbService.update('cash_sessions', session.id, {
      [field]: parseFloat(session[field]) + parseFloat(amount)
    });

    logger.info(`Cash movement added: ${type} ${amount} for session ${session.session_number}`);

    res.status(201).json({
      success: true,
      data: movement,
      message: 'Movement added successfully'
    });
  } catch (error) {
    logger.error('Error adding movement:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding cash movement'
    });
  }
};

/**
 * Record a sale in the cash session
 * This is called automatically when a sale is completed
 */
export const recordSale = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sale_id, amount, payment_method } = req.body;

    // Get active session
    const session = await dbService.findOne('cash_sessions', {
      user_id: userId,
      status: 'open'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active cash session. Cannot process sale without open session'
      });
    }

    // Create sale movement
    await dbService.create('cash_movements', {
      cash_session_id: session.id,
      type: 'sale',
      amount: parseFloat(amount),
      payment_method,
      reference_id: sale_id,
      reference_type: 'sale',
      reason: 'Venta',
      user_id: userId
    });

    // Update session totals based on payment method
    const updates = {
      total_sales: parseFloat(session.total_sales) + parseFloat(amount),
      sales_count: parseInt(session.sales_count) + 1
    };

    if (payment_method === 'cash') {
      updates.total_cash = parseFloat(session.total_cash) + parseFloat(amount);
    } else if (payment_method === 'card') {
      updates.total_card = parseFloat(session.total_card) + parseFloat(amount);
    } else {
      updates.total_other = parseFloat(session.total_other) + parseFloat(amount);
    }

    await dbService.update('cash_sessions', session.id, updates);

    res.json({
      success: true,
      message: 'Sale recorded in cash session'
    });
  } catch (error) {
    logger.error('Error recording sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording sale in cash session'
    });
  }
};

/**
 * Generate Z Report for a closed session
 */
export const generateZReport = async (req, res) => {
  try {
    const { session_id } = req.params;
    const userId = req.user.id;

    // Get session
    const session = await dbService.findById('cash_sessions', session_id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Cash session not found'
      });
    }

    if (session.status !== 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Can only generate Z report for closed sessions'
      });
    }

    // Check if Z report already exists for this session
    const existingReport = await dbService.findOne('z_reports', {
      cash_session_id: session_id
    });

    if (existingReport) {
      return res.json({
        success: true,
        data: existingReport,
        message: 'Z report already exists for this session'
      });
    }

    // Get sales for this session period
    const sales = await dbService.query(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_count,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_sales,
        SUM(CASE WHEN status = 'completed' THEN tax_amount ELSE 0 END) as total_tax,
        SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END) as total_discount
      FROM sales
      WHERE created_at >= ? AND created_at <= ?
    `, [session.opened_at, session.closed_at || new Date().toISOString()]);

    const salesData = sales[0];

    // Generate report number (format: Z-YYYYMMDD-XXXX)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await dbService.count('z_reports', {});
    const reportNumber = `Z-${today}-${String(count + 1).padStart(4, '0')}`;

    // Create detailed report data
    const reportData = {
      session_number: session.session_number,
      user_id: session.user_id,
      opened_at: session.opened_at,
      closed_at: session.closed_at,
      payment_breakdown: {
        cash: session.total_cash,
        card: session.total_card,
        other: session.total_other
      },
      movements: {
        income: session.total_in,
        expenses: session.total_out
      }
    };

    // Create Z report
    const zReport = await dbService.create('z_reports', {
      report_number: reportNumber,
      cash_session_id: session_id,
      report_date: new Date().toISOString().split('T')[0],
      user_id: userId,
      total_sales: salesData.total_sales || session.total_sales,
      total_tax: salesData.total_tax || 0,
      total_discount: salesData.total_discount || 0,
      total_cash: session.total_cash,
      total_card: session.total_card,
      total_other: session.total_other,
      sales_count: salesData.total_count || session.sales_count,
      cancelled_count: salesData.cancelled_count || 0,
      refunded_count: salesData.refunded_count || 0,
      opening_balance: session.opening_balance,
      closing_balance: session.closing_balance,
      difference: session.difference,
      report_data: JSON.stringify(reportData)
    });

    logger.info(`Z report generated: ${reportNumber} for session ${session.session_number}`);

    res.status(201).json({
      success: true,
      data: zReport,
      message: 'Z report generated successfully'
    });
  } catch (error) {
    logger.error('Error generating Z report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating Z report'
    });
  }
};

/**
 * Get cash sessions history
 */
export const getSessionsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let conditions = {};
    if (status) conditions.status = status;
    if (start_date && end_date) {
      conditions.opened_at = { '>=': start_date, '<=': end_date };
    }

    const sessions = await dbService.findMany('cash_sessions', conditions, {
      orderBy: { field: 'opened_at', direction: 'desc' },
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await dbService.count('cash_sessions', conditions);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting sessions history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cash sessions history'
    });
  }
};

/**
 * Get Z reports history
 */
export const getZReportsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let conditions = {};
    if (start_date && end_date) {
      conditions.report_date = { '>=': start_date, '<=': end_date };
    }

    const reports = await dbService.findMany('z_reports', conditions, {
      orderBy: { field: 'report_date', direction: 'desc' },
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await dbService.count('z_reports', conditions);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting Z reports history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting Z reports history'
    });
  }
};

/**
 * Mark Z report as printed
 */
export const markZReportPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await dbService.findById('z_reports', id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Z report not found'
      });
    }

    const updatedReport = await dbService.update('z_reports', id, {
      printed: 1,
      printed_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: updatedReport,
      message: 'Z report marked as printed'
    });
  } catch (error) {
    logger.error('Error marking Z report as printed:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating Z report'
    });
  }
};
