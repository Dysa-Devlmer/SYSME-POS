/**
 * Tables Controller
 * Manages restaurant tables, salons, and seating
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { emitToRoom, broadcastEvent } from '../../websockets/socketHandler.js';

// Get all salons
export const getSalons = async (req, res) => {
  try {
    const salons = await dbService.findMany('salons', { is_active: 1 }, {
      orderBy: { field: 'name', direction: 'asc' }
    });

    res.json({
      success: true,
      salons
    });
  } catch (error) {
    logger.error('Error fetching salons:', error);
    throw error;
  }
};

// Get all tarifas (pricing tiers)
export const getTarifas = async (req, res) => {
  try {
    const tarifas = await dbService.findMany('tarifas', { is_active: 1 }, {
      orderBy: { field: 'name', direction: 'asc' }
    });

    res.json({
      success: true,
      tarifas
    });
  } catch (error) {
    logger.error('Error fetching tarifas:', error);
    throw error;
  }
};

// Get all tables with salon and tarifa information
export const getTables = async (req, res) => {
  try {
    const { salon_id } = req.query;

    let query = `
      SELECT
        t.id,
        t.table_number,
        t.description,
        t.salon_id,
        t.tarifa_id,
        t.max_capacity,
        t.status,
        t.position_x,
        t.position_y,
        t.is_active,
        s.name as salon_name,
        tar.name as tarifa_name,
        tar.multiplier as tarifa_multiplier
      FROM tables t
      LEFT JOIN salons s ON t.salon_id = s.id
      LEFT JOIN tarifas tar ON t.tarifa_id = tar.id
      WHERE t.is_active = 1
    `;

    const params = [];
    if (salon_id) {
      query += ' AND t.salon_id = ?';
      params.push(salon_id);
    }

    query += ' ORDER BY s.name, t.table_number';

    const tables = await dbService.raw(query, params);

    res.json({
      success: true,
      tables
    });
  } catch (error) {
    logger.error('Error fetching tables:', error);
    throw error;
  }
};

// Get table by ID
export const getTable = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await dbService.raw(`
      SELECT
        t.*,
        s.name as salon_name,
        tar.name as tarifa_name,
        tar.multiplier as tarifa_multiplier
      FROM tables t
      LEFT JOIN salons s ON t.salon_id = s.id
      LEFT JOIN tarifas tar ON t.tarifa_id = tar.id
      WHERE t.id = ? AND t.is_active = 1
    `, [id]);

    if (!table.length) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      table: table[0]
    });
  } catch (error) {
    logger.error('Error fetching table:', error);
    throw error;
  }
};

// Update table status
export const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['free', 'occupied', 'reserved', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    await dbService.update('tables', id, { status });

    // Get updated table info
    const updatedTable = await dbService.raw(`
      SELECT
        t.*,
        s.name as salon_name,
        tar.name as tarifa_name
      FROM tables t
      LEFT JOIN salons s ON t.salon_id = s.id
      LEFT JOIN tarifas tar ON t.tarifa_id = tar.id
      WHERE t.id = ?
    `, [id]);

    // Send real-time table status update
    broadcastEvent('table_status_updated', {
      table_id: id,
      table_number: updatedTable[0].table_number,
      salon_name: updatedTable[0].salon_name,
      status: status,
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: 'Table status updated successfully',
      table: updatedTable[0]
    });
  } catch (error) {
    logger.error('Error updating table status:', error);
    throw error;
  }
};

// Get tables layout for a salon (for visual display)
export const getSalonLayout = async (req, res) => {
  try {
    const { salon_id } = req.params;

    // Get salon info
    const salon = await dbService.findById('salons', salon_id);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found'
      });
    }

    // Get tables in this salon
    const tables = await dbService.raw(`
      SELECT
        t.*,
        tar.name as tarifa_name,
        tar.multiplier as tarifa_multiplier
      FROM tables t
      LEFT JOIN tarifas tar ON t.tarifa_id = tar.id
      WHERE t.salon_id = ? AND t.is_active = 1
      ORDER BY t.table_number
    `, [salon_id]);

    res.json({
      success: true,
      salon,
      tables,
      layout: {
        salon_id: parseInt(salon_id),
        salon_name: salon.name,
        tables: tables.map(table => ({
          id: table.id,
          table_number: table.table_number,
          description: table.description,
          status: table.status,
          max_capacity: table.max_capacity,
          position: {
            x: parseFloat(table.position_x),
            y: parseFloat(table.position_y)
          },
          tarifa: {
            name: table.tarifa_name,
            multiplier: parseFloat(table.tarifa_multiplier)
          }
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching salon layout:', error);
    throw error;
  }
};

// Create new table
export const createTable = async (req, res) => {
  try {
    const {
      table_number,
      description,
      salon_id,
      tarifa_id,
      max_capacity,
      position_x,
      position_y
    } = req.body;

    // Check if table number already exists in this salon
    const existingTable = await dbService.raw(
      'SELECT id FROM tables WHERE table_number = ? AND salon_id = ? AND is_active = 1',
      [table_number, salon_id]
    );

    if (existingTable.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Table number already exists in this salon'
      });
    }

    const tableData = {
      table_number,
      description,
      salon_id,
      tarifa_id,
      max_capacity: max_capacity || 4,
      position_x: position_x || 0,
      position_y: position_y || 0,
      status: 'free'
    };

    const newTable = await dbService.create('tables', tableData);

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      table: newTable
    });
  } catch (error) {
    logger.error('Error creating table:', error);
    throw error;
  }
};

// Update table
export const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove id from update data
    delete updateData.id;

    const updatedTable = await dbService.update('tables', id, updateData);

    res.json({
      success: true,
      message: 'Table updated successfully',
      table: updatedTable
    });
  } catch (error) {
    logger.error('Error updating table:', error);
    throw error;
  }
};

// Delete table (soft delete)
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('tables', id, { is_active: false });

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting table:', error);
    throw error;
  }
};