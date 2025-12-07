/**
 * Delivery Management System Controller
 * Sistema completo de gestión de entregas a domicilio
 *
 * Features:
 * - Driver management with status tracking
 * - Delivery zones with pricing
 * - Order assignment (manual & automatic)
 * - Real-time GPS tracking via WebSocket
 * - Commission and payment tracking
 * - Driver ratings and performance metrics
 * - Route optimization suggestions
 * - Integration with external apps (Rappi, Uber Eats)
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { emitToRoom } from '../../websockets/socketHandler.js';

// =============================================
// CONSTANTS
// =============================================

const DRIVER_STATUSES = ['offline', 'available', 'busy', 'break', 'returning'];
const DELIVERY_STATUSES = ['pending', 'assigned', 'picking_up', 'in_transit', 'delivered', 'cancelled', 'failed'];
const VEHICLE_TYPES = ['motorcycle', 'bicycle', 'car', 'walking'];

// =============================================
// DATABASE INITIALIZATION
// =============================================

export const initDeliveryTables = async () => {
  try {
    // Delivery drivers
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS delivery_drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        code TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        rut TEXT,
        photo_url TEXT,
        vehicle_type TEXT DEFAULT 'motorcycle',
        vehicle_plate TEXT,
        vehicle_brand TEXT,
        vehicle_model TEXT,
        license_number TEXT,
        license_expiry DATE,
        status TEXT DEFAULT 'offline',
        is_active INTEGER DEFAULT 1,
        is_verified INTEGER DEFAULT 0,
        current_latitude REAL,
        current_longitude REAL,
        last_location_at DATETIME,
        current_delivery_id INTEGER,
        home_branch_id INTEGER,
        max_concurrent_orders INTEGER DEFAULT 3,
        rating_average REAL DEFAULT 5.0,
        total_ratings INTEGER DEFAULT 0,
        total_deliveries INTEGER DEFAULT 0,
        total_earnings REAL DEFAULT 0,
        commission_type TEXT DEFAULT 'percentage',
        commission_value REAL DEFAULT 15,
        bank_name TEXT,
        bank_account_type TEXT,
        bank_account_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (home_branch_id) REFERENCES branches(id)
      )
    `);

    // Delivery zones
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        description TEXT,
        branch_id INTEGER,
        polygon_coordinates TEXT,
        center_latitude REAL,
        center_longitude REAL,
        radius_km REAL,
        min_order_amount REAL DEFAULT 0,
        delivery_fee REAL DEFAULT 0,
        free_delivery_min REAL,
        estimated_time_minutes INTEGER DEFAULT 30,
        is_active INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        color TEXT DEFAULT '#3B82F6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      )
    `);

    // Deliveries (order deliveries)
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_number TEXT UNIQUE NOT NULL,
        sale_id INTEGER NOT NULL,
        branch_id INTEGER NOT NULL,
        driver_id INTEGER,
        zone_id INTEGER,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        customer_name TEXT,
        customer_phone TEXT,
        customer_address TEXT NOT NULL,
        customer_address_detail TEXT,
        customer_commune TEXT,
        customer_city TEXT DEFAULT 'Santiago',
        customer_latitude REAL,
        customer_longitude REAL,
        customer_notes TEXT,
        estimated_pickup_at DATETIME,
        estimated_delivery_at DATETIME,
        actual_pickup_at DATETIME,
        actual_delivery_at DATETIME,
        distance_km REAL,
        delivery_fee REAL DEFAULT 0,
        driver_tip REAL DEFAULT 0,
        driver_commission REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'prepaid',
        payment_collected REAL DEFAULT 0,
        requires_change_for REAL,
        proof_photo_url TEXT,
        signature_url TEXT,
        customer_rating INTEGER,
        customer_feedback TEXT,
        driver_notes TEXT,
        cancel_reason TEXT,
        cancelled_by INTEGER,
        cancelled_at DATETIME,
        failed_reason TEXT,
        retry_count INTEGER DEFAULT 0,
        is_scheduled INTEGER DEFAULT 0,
        scheduled_for DATETIME,
        external_order_id TEXT,
        external_platform TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id),
        FOREIGN KEY (zone_id) REFERENCES delivery_zones(id)
      )
    `);

    // Driver location history (for GPS tracking)
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        delivery_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        speed REAL,
        heading REAL,
        battery_level INTEGER,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id),
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
      )
    `);

    // Delivery status history
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS delivery_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        previous_status TEXT,
        latitude REAL,
        longitude REAL,
        notes TEXT,
        changed_by INTEGER,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
      )
    `);

    // Driver shifts
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS driver_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        branch_id INTEGER,
        shift_date DATE NOT NULL,
        scheduled_start TIME,
        scheduled_end TIME,
        actual_start DATETIME,
        actual_end DATETIME,
        status TEXT DEFAULT 'scheduled',
        total_deliveries INTEGER DEFAULT 0,
        total_distance_km REAL DEFAULT 0,
        total_earnings REAL DEFAULT 0,
        total_tips REAL DEFAULT 0,
        break_minutes INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      )
    `);

    // Driver payments/settlements
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS driver_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        driver_id INTEGER NOT NULL,
        payment_number TEXT UNIQUE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        total_deliveries INTEGER DEFAULT 0,
        total_commissions REAL DEFAULT 0,
        total_tips REAL DEFAULT 0,
        total_bonuses REAL DEFAULT 0,
        deductions REAL DEFAULT 0,
        deduction_notes TEXT,
        net_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        paid_at DATETIME,
        paid_by INTEGER,
        payment_method TEXT,
        payment_reference TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id)
      )
    `);

    // External platform integrations
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS delivery_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        branch_id INTEGER,
        api_key TEXT,
        api_secret TEXT,
        store_id TEXT,
        webhook_url TEXT,
        is_active INTEGER DEFAULT 0,
        auto_accept INTEGER DEFAULT 0,
        sync_menu INTEGER DEFAULT 0,
        last_sync_at DATETIME,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      )
    `);

    logger.info('Delivery tables initialized');
    return true;
  } catch (error) {
    logger.error('Error initializing delivery tables:', error);
    throw error;
  }
};

// =============================================
// DRIVER MANAGEMENT
// =============================================

const generateDriverCode = () => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DRV-${random}`;
};

export const getDrivers = async (req, res) => {
  try {
    const { status, branch_id, active_only = true, include_stats = false } = req.query;

    let query = `
      SELECT
        d.*,
        b.name as home_branch_name,
        u.email as user_email
      FROM delivery_drivers d
      LEFT JOIN branches b ON d.home_branch_id = b.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true' || active_only === true) {
      query += ' AND d.is_active = 1';
    }

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    if (branch_id) {
      query += ' AND d.home_branch_id = ?';
      params.push(branch_id);
    }

    query += ' ORDER BY d.status, d.first_name';

    const drivers = await dbService.raw(query, params);

    // Add current deliveries count if requested
    if (include_stats === 'true') {
      for (const driver of drivers) {
        const activeDeliveries = await dbService.raw(`
          SELECT COUNT(*) as count
          FROM deliveries
          WHERE driver_id = ? AND status IN ('assigned', 'picking_up', 'in_transit')
        `, [driver.id]);
        driver.active_deliveries = activeDeliveries[0]?.count || 0;

        const todayStats = await dbService.raw(`
          SELECT
            COUNT(*) as deliveries_today,
            COALESCE(SUM(driver_commission), 0) as earnings_today
          FROM deliveries
          WHERE driver_id = ? AND DATE(created_at) = DATE('now') AND status = 'delivered'
        `, [driver.id]);
        driver.today_stats = todayStats[0] || { deliveries_today: 0, earnings_today: 0 };
      }
    }

    res.json({ success: true, data: drivers });
  } catch (error) {
    logger.error('Error getting drivers:', error);
    res.status(500).json({ success: false, message: 'Error al obtener repartidores' });
  }
};

export const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;

    const drivers = await dbService.raw(`
      SELECT
        d.*,
        b.name as home_branch_name
      FROM delivery_drivers d
      LEFT JOIN branches b ON d.home_branch_id = b.id
      WHERE d.id = ?
    `, [id]);

    if (!drivers.length) {
      return res.status(404).json({ success: false, message: 'Repartidor no encontrado' });
    }

    const driver = drivers[0];

    // Get active deliveries
    const activeDeliveries = await dbService.raw(`
      SELECT
        del.*,
        s.sale_number
      FROM deliveries del
      JOIN sales s ON del.sale_id = s.id
      WHERE del.driver_id = ? AND del.status IN ('assigned', 'picking_up', 'in_transit')
      ORDER BY del.created_at
    `, [id]);
    driver.active_deliveries = activeDeliveries;

    // Get recent deliveries
    const recentDeliveries = await dbService.raw(`
      SELECT
        del.*,
        s.sale_number
      FROM deliveries del
      JOIN sales s ON del.sale_id = s.id
      WHERE del.driver_id = ?
      ORDER BY del.created_at DESC
      LIMIT 20
    `, [id]);
    driver.recent_deliveries = recentDeliveries;

    // Get performance stats
    const stats = await dbService.raw(`
      SELECT
        COUNT(*) as total_deliveries,
        AVG(customer_rating) as avg_rating,
        SUM(driver_commission) as total_earnings,
        SUM(driver_tip) as total_tips,
        AVG(
          CASE WHEN actual_delivery_at IS NOT NULL AND actual_pickup_at IS NOT NULL
          THEN (julianday(actual_delivery_at) - julianday(actual_pickup_at)) * 24 * 60
          END
        ) as avg_delivery_minutes
      FROM deliveries
      WHERE driver_id = ? AND status = 'delivered'
    `, [id]);
    driver.performance = stats[0] || {};

    res.json({ success: true, data: driver });
  } catch (error) {
    logger.error('Error getting driver:', error);
    res.status(500).json({ success: false, message: 'Error al obtener repartidor' });
  }
};

export const createDriver = async (req, res) => {
  try {
    const driverData = req.body;

    if (!driverData.first_name || !driverData.last_name || !driverData.phone) {
      return res.status(400).json({
        success: false,
        message: 'first_name, last_name y phone son requeridos'
      });
    }

    driverData.code = generateDriverCode();

    const driver = await dbService.create('delivery_drivers', driverData);

    logger.info(`Driver created: ${driver.code}`);
    res.status(201).json({ success: true, data: driver, message: 'Repartidor creado' });
  } catch (error) {
    logger.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: 'Error al crear repartidor' });
  }
};

export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.code; // Don't allow code change
    delete updates.total_deliveries;
    delete updates.total_earnings;

    await dbService.update('delivery_drivers', id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const driver = await dbService.findById('delivery_drivers', id);
    res.json({ success: true, data: driver, message: 'Repartidor actualizado' });
  } catch (error) {
    logger.error('Error updating driver:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar repartidor' });
  }
};

export const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!DRIVER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    await dbService.update('delivery_drivers', id, {
      status,
      updated_at: new Date().toISOString()
    });

    // Emit real-time update
    emitToRoom('delivery', 'driver_status_changed', {
      driver_id: parseInt(id),
      status,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Estado actualizado' });
  } catch (error) {
    logger.error('Error updating driver status:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado' });
  }
};

export const updateDriverLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, speed, heading, battery_level, delivery_id } = req.body;

    // Update driver's current location
    await dbService.update('delivery_drivers', id, {
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_at: new Date().toISOString()
    });

    // Log location history
    await dbService.create('driver_locations', {
      driver_id: id,
      delivery_id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      battery_level
    });

    // Emit real-time location update
    emitToRoom('delivery', 'driver_location_updated', {
      driver_id: parseInt(id),
      delivery_id,
      latitude,
      longitude,
      speed,
      heading,
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating driver location:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar ubicación' });
  }
};

// =============================================
// DELIVERY ZONES
// =============================================

export const getDeliveryZones = async (req, res) => {
  try {
    const { branch_id, active_only = true } = req.query;

    let query = `
      SELECT
        z.*,
        b.name as branch_name
      FROM delivery_zones z
      LEFT JOIN branches b ON z.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true') {
      query += ' AND z.is_active = 1';
    }

    if (branch_id) {
      query += ' AND z.branch_id = ?';
      params.push(branch_id);
    }

    query += ' ORDER BY z.priority DESC, z.name';

    const zones = await dbService.raw(query, params);

    res.json({ success: true, data: zones });
  } catch (error) {
    logger.error('Error getting delivery zones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener zonas' });
  }
};

export const createDeliveryZone = async (req, res) => {
  try {
    const zoneData = req.body;

    if (!zoneData.name) {
      return res.status(400).json({ success: false, message: 'name es requerido' });
    }

    zoneData.code = zoneData.code || zoneData.name.toUpperCase().replace(/\s+/g, '_').substring(0, 10);

    const zone = await dbService.create('delivery_zones', zoneData);

    logger.info(`Delivery zone created: ${zone.name}`);
    res.status(201).json({ success: true, data: zone, message: 'Zona creada' });
  } catch (error) {
    logger.error('Error creating zone:', error);
    res.status(500).json({ success: false, message: 'Error al crear zona' });
  }
};

export const updateDeliveryZone = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await dbService.update('delivery_zones', id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const zone = await dbService.findById('delivery_zones', id);
    res.json({ success: true, data: zone, message: 'Zona actualizada' });
  } catch (error) {
    logger.error('Error updating zone:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar zona' });
  }
};

export const calculateDeliveryFee = async (req, res) => {
  try {
    const { latitude, longitude, branch_id, order_total } = req.body;

    // Find matching zone
    let zone = null;
    const zones = await dbService.findMany('delivery_zones', {
      branch_id,
      is_active: 1
    });

    // Simple distance-based zone matching (in production, use polygon)
    for (const z of zones) {
      if (z.center_latitude && z.center_longitude && z.radius_km) {
        const distance = calculateDistance(
          latitude, longitude,
          z.center_latitude, z.center_longitude
        );
        if (distance <= z.radius_km) {
          zone = z;
          break;
        }
      }
    }

    if (!zone) {
      return res.status(400).json({
        success: false,
        message: 'Dirección fuera de zona de cobertura',
        data: { covered: false }
      });
    }

    // Check minimum order
    if (order_total < zone.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Pedido mínimo: $${zone.min_order_amount.toLocaleString('es-CL')}`,
        data: {
          covered: true,
          zone_id: zone.id,
          min_order: zone.min_order_amount
        }
      });
    }

    // Calculate fee
    let deliveryFee = zone.delivery_fee;
    if (zone.free_delivery_min && order_total >= zone.free_delivery_min) {
      deliveryFee = 0;
    }

    res.json({
      success: true,
      data: {
        covered: true,
        zone_id: zone.id,
        zone_name: zone.name,
        delivery_fee: deliveryFee,
        estimated_time: zone.estimated_time_minutes,
        free_delivery_min: zone.free_delivery_min
      }
    });
  } catch (error) {
    logger.error('Error calculating delivery fee:', error);
    res.status(500).json({ success: false, message: 'Error al calcular envío' });
  }
};

// =============================================
// DELIVERY MANAGEMENT
// =============================================

const generateDeliveryNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEL-${dateStr}-${random}`;
};

export const createDelivery = async (req, res) => {
  try {
    const {
      sale_id,
      branch_id,
      customer_name,
      customer_phone,
      customer_address,
      customer_address_detail,
      customer_commune,
      customer_city,
      customer_latitude,
      customer_longitude,
      customer_notes,
      zone_id,
      delivery_fee,
      payment_method,
      requires_change_for,
      is_scheduled,
      scheduled_for,
      priority
    } = req.body;

    if (!sale_id || !branch_id || !customer_address) {
      return res.status(400).json({
        success: false,
        message: 'sale_id, branch_id y customer_address son requeridos'
      });
    }

    const delivery_number = generateDeliveryNumber();

    // Calculate estimated times
    const zone = zone_id ? await dbService.findById('delivery_zones', zone_id) : null;
    const estimatedMinutes = zone?.estimated_time_minutes || 30;
    const now = new Date();
    const estimated_pickup_at = new Date(now.getTime() + 15 * 60000); // 15 min prep
    const estimated_delivery_at = new Date(estimated_pickup_at.getTime() + estimatedMinutes * 60000);

    const delivery = await dbService.create('deliveries', {
      delivery_number,
      sale_id,
      branch_id,
      zone_id,
      status: 'pending',
      priority: priority || 'normal',
      customer_name,
      customer_phone,
      customer_address,
      customer_address_detail,
      customer_commune,
      customer_city: customer_city || 'Santiago',
      customer_latitude,
      customer_longitude,
      customer_notes,
      estimated_pickup_at: estimated_pickup_at.toISOString(),
      estimated_delivery_at: estimated_delivery_at.toISOString(),
      delivery_fee: delivery_fee || 0,
      payment_method: payment_method || 'prepaid',
      requires_change_for,
      is_scheduled: is_scheduled ? 1 : 0,
      scheduled_for
    });

    // Log status change
    await dbService.create('delivery_status_history', {
      delivery_id: delivery.id,
      status: 'pending',
      notes: 'Delivery created'
    });

    // Emit new delivery notification
    emitToRoom('delivery', 'new_delivery', {
      delivery_id: delivery.id,
      delivery_number,
      branch_id,
      customer_address,
      priority,
      timestamp: new Date()
    });

    logger.info(`Delivery created: ${delivery_number}`);

    res.status(201).json({
      success: true,
      data: delivery,
      message: 'Delivery creado'
    });
  } catch (error) {
    logger.error('Error creating delivery:', error);
    res.status(500).json({ success: false, message: 'Error al crear delivery' });
  }
};

export const getDeliveries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      branch_id,
      driver_id,
      date,
      start_date,
      end_date
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        d.*,
        b.name as branch_name,
        dr.first_name || ' ' || dr.last_name as driver_name,
        dr.phone as driver_phone,
        dr.current_latitude as driver_latitude,
        dr.current_longitude as driver_longitude,
        s.sale_number,
        s.total as order_total
      FROM deliveries d
      JOIN branches b ON d.branch_id = b.id
      LEFT JOIN delivery_drivers dr ON d.driver_id = dr.id
      JOIN sales s ON d.sale_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      const statuses = status.split(',');
      query += ` AND d.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    if (branch_id) {
      query += ' AND d.branch_id = ?';
      params.push(branch_id);
    }

    if (driver_id) {
      query += ' AND d.driver_id = ?';
      params.push(driver_id);
    }

    if (date) {
      query += ' AND DATE(d.created_at) = ?';
      params.push(date);
    }

    if (start_date) {
      query += ' AND DATE(d.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(d.created_at) <= ?';
      params.push(end_date);
    }

    const countQuery = query.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await dbService.raw(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const deliveries = await dbService.raw(query, params);

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting deliveries:', error);
    res.status(500).json({ success: false, message: 'Error al obtener deliveries' });
  }
};

export const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveries = await dbService.raw(`
      SELECT
        d.*,
        b.name as branch_name,
        b.address as branch_address,
        b.phone as branch_phone,
        dr.first_name || ' ' || dr.last_name as driver_name,
        dr.phone as driver_phone,
        dr.vehicle_type,
        dr.vehicle_plate,
        dr.current_latitude as driver_latitude,
        dr.current_longitude as driver_longitude,
        s.sale_number,
        s.total as order_total,
        z.name as zone_name
      FROM deliveries d
      JOIN branches b ON d.branch_id = b.id
      LEFT JOIN delivery_drivers dr ON d.driver_id = dr.id
      JOIN sales s ON d.sale_id = s.id
      LEFT JOIN delivery_zones z ON d.zone_id = z.id
      WHERE d.id = ?
    `, [id]);

    if (!deliveries.length) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }

    const delivery = deliveries[0];

    // Get status history
    const history = await dbService.raw(`
      SELECT * FROM delivery_status_history
      WHERE delivery_id = ?
      ORDER BY changed_at DESC
    `, [id]);
    delivery.status_history = history;

    // Get driver route (last 20 locations)
    if (delivery.driver_id) {
      const route = await dbService.raw(`
        SELECT latitude, longitude, recorded_at
        FROM driver_locations
        WHERE delivery_id = ?
        ORDER BY recorded_at DESC
        LIMIT 50
      `, [id]);
      delivery.driver_route = route.reverse();
    }

    res.json({ success: true, data: delivery });
  } catch (error) {
    logger.error('Error getting delivery:', error);
    res.status(500).json({ success: false, message: 'Error al obtener delivery' });
  }
};

export const assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    const delivery = await dbService.findById('deliveries', id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }

    const driver = await dbService.findById('delivery_drivers', driver_id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Repartidor no encontrado' });
    }

    if (driver.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Repartidor no disponible' });
    }

    // Calculate commission
    const commission = driver.commission_type === 'percentage'
      ? (delivery.delivery_fee * driver.commission_value / 100)
      : driver.commission_value;

    await dbService.update('deliveries', id, {
      driver_id,
      status: 'assigned',
      driver_commission: commission,
      updated_at: new Date().toISOString()
    });

    // Update driver status
    await dbService.update('delivery_drivers', driver_id, {
      status: 'busy',
      current_delivery_id: id
    });

    // Log status change
    await dbService.create('delivery_status_history', {
      delivery_id: id,
      status: 'assigned',
      previous_status: delivery.status,
      notes: `Asignado a ${driver.first_name} ${driver.last_name}`,
      changed_by: req.user?.id
    });

    // Emit notifications
    emitToRoom('delivery', 'delivery_assigned', {
      delivery_id: parseInt(id),
      driver_id,
      driver_name: `${driver.first_name} ${driver.last_name}`,
      timestamp: new Date()
    });

    logger.info(`Delivery ${id} assigned to driver ${driver_id}`);

    res.json({ success: true, message: 'Repartidor asignado' });
  } catch (error) {
    logger.error('Error assigning driver:', error);
    res.status(500).json({ success: false, message: 'Error al asignar repartidor' });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, latitude, longitude, proof_photo_url, signature_url, payment_collected } = req.body;

    if (!DELIVERY_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    const delivery = await dbService.findById('deliveries', id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'picking_up') {
      updateData.actual_pickup_at = new Date().toISOString();
    }

    if (status === 'delivered') {
      updateData.actual_delivery_at = new Date().toISOString();
      if (proof_photo_url) updateData.proof_photo_url = proof_photo_url;
      if (signature_url) updateData.signature_url = signature_url;
      if (payment_collected) updateData.payment_collected = payment_collected;

      // Update driver stats
      if (delivery.driver_id) {
        const driver = await dbService.findById('delivery_drivers', delivery.driver_id);
        await dbService.update('delivery_drivers', delivery.driver_id, {
          status: 'available',
          current_delivery_id: null,
          total_deliveries: (driver.total_deliveries || 0) + 1,
          total_earnings: (driver.total_earnings || 0) + (delivery.driver_commission || 0)
        });
      }
    }

    if (status === 'cancelled' || status === 'failed') {
      updateData.driver_notes = notes;
      if (status === 'failed') updateData.failed_reason = notes;

      // Free up driver
      if (delivery.driver_id) {
        await dbService.update('delivery_drivers', delivery.driver_id, {
          status: 'available',
          current_delivery_id: null
        });
      }
    }

    await dbService.update('deliveries', id, updateData);

    // Log status change
    await dbService.create('delivery_status_history', {
      delivery_id: id,
      status,
      previous_status: delivery.status,
      latitude,
      longitude,
      notes,
      changed_by: req.user?.id
    });

    // Emit status update
    emitToRoom('delivery', 'delivery_status_updated', {
      delivery_id: parseInt(id),
      status,
      previous_status: delivery.status,
      latitude,
      longitude,
      timestamp: new Date()
    });

    logger.info(`Delivery ${id} status updated to ${status}`);

    res.json({ success: true, message: 'Estado actualizado' });
  } catch (error) {
    logger.error('Error updating delivery status:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado' });
  }
};

export const rateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating debe ser entre 1 y 5' });
    }

    const delivery = await dbService.findById('deliveries', id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }

    await dbService.update('deliveries', id, {
      customer_rating: rating,
      customer_feedback: feedback
    });

    // Update driver rating
    if (delivery.driver_id) {
      const driver = await dbService.findById('delivery_drivers', delivery.driver_id);
      const newTotalRatings = (driver.total_ratings || 0) + 1;
      const newAverage = ((driver.rating_average || 5) * (driver.total_ratings || 0) + rating) / newTotalRatings;

      await dbService.update('delivery_drivers', delivery.driver_id, {
        rating_average: Math.round(newAverage * 10) / 10,
        total_ratings: newTotalRatings
      });
    }

    res.json({ success: true, message: 'Calificación registrada' });
  } catch (error) {
    logger.error('Error rating delivery:', error);
    res.status(500).json({ success: false, message: 'Error al calificar' });
  }
};

// =============================================
// AUTO-ASSIGNMENT
// =============================================

export const autoAssignDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await dbService.findById('deliveries', id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery no encontrado' });
    }

    // Find available drivers from same branch, sorted by distance/rating
    const availableDrivers = await dbService.raw(`
      SELECT
        d.*,
        CASE
          WHEN d.current_latitude IS NOT NULL AND ? IS NOT NULL
          THEN (
            (d.current_latitude - ?) * (d.current_latitude - ?) +
            (d.current_longitude - ?) * (d.current_longitude - ?)
          )
          ELSE 999999
        END as distance_score
      FROM delivery_drivers d
      WHERE d.is_active = 1
        AND d.status = 'available'
        AND (d.home_branch_id = ? OR d.home_branch_id IS NULL)
      ORDER BY distance_score ASC, d.rating_average DESC
      LIMIT 1
    `, [
      delivery.customer_latitude,
      delivery.customer_latitude, delivery.customer_latitude,
      delivery.customer_longitude, delivery.customer_longitude,
      delivery.branch_id
    ]);

    if (availableDrivers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay repartidores disponibles'
      });
    }

    const driver = availableDrivers[0];

    // Assign
    req.body = { driver_id: driver.id };
    return assignDriver(req, res);
  } catch (error) {
    logger.error('Error auto-assigning driver:', error);
    res.status(500).json({ success: false, message: 'Error en asignación automática' });
  }
};

// =============================================
// DASHBOARD & ANALYTICS
// =============================================

export const getDeliveryDashboard = async (req, res) => {
  try {
    const { branch_id } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    let branchFilter = '';
    const params = [today];
    if (branch_id) {
      branchFilter = 'AND d.branch_id = ?';
      params.push(branch_id);
    }

    // Today's stats
    const todayStats = await dbService.raw(`
      SELECT
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('assigned', 'picking_up', 'in_transit') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COALESCE(SUM(delivery_fee), 0) as total_fees,
        COALESCE(SUM(driver_tip), 0) as total_tips,
        COALESCE(AVG(customer_rating), 0) as avg_rating
      FROM deliveries d
      WHERE DATE(d.created_at) = ? ${branchFilter}
    `, params);

    // Active deliveries
    const activeDeliveries = await dbService.raw(`
      SELECT
        d.*,
        dr.first_name || ' ' || dr.last_name as driver_name,
        dr.current_latitude as driver_lat,
        dr.current_longitude as driver_lng
      FROM deliveries d
      LEFT JOIN delivery_drivers dr ON d.driver_id = dr.id
      WHERE d.status IN ('pending', 'assigned', 'picking_up', 'in_transit')
        ${branchFilter.replace('d.', 'd.')}
      ORDER BY d.created_at ASC
    `, branch_id ? [branch_id] : []);

    // Available drivers
    const availableDrivers = await dbService.raw(`
      SELECT
        d.*,
        (SELECT COUNT(*) FROM deliveries WHERE driver_id = d.id AND status IN ('assigned', 'picking_up', 'in_transit')) as active_count
      FROM delivery_drivers d
      WHERE d.is_active = 1 AND d.status IN ('available', 'busy')
      ORDER BY d.status, d.first_name
    `);

    // Hourly distribution
    const hourlyStats = await dbService.raw(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as count
      FROM deliveries d
      WHERE DATE(d.created_at) = ? ${branchFilter}
      GROUP BY hour
      ORDER BY hour
    `, params);

    res.json({
      success: true,
      data: {
        today_stats: todayStats[0] || {},
        active_deliveries: activeDeliveries,
        available_drivers: availableDrivers,
        hourly_distribution: hourlyStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting delivery dashboard:', error);
    res.status(500).json({ success: false, message: 'Error al obtener dashboard' });
  }
};

export const getDriverPerformance = async (req, res) => {
  try {
    const { start_date, end_date, driver_id } = req.query;

    let dateFilter = "DATE(d.created_at) = DATE('now')";
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'DATE(d.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    let driverFilter = '';
    if (driver_id) {
      driverFilter = 'AND d.driver_id = ?';
      params.push(driver_id);
    }

    const performance = await dbService.raw(`
      SELECT
        dr.id,
        dr.code,
        dr.first_name || ' ' || dr.last_name as name,
        COUNT(d.id) as total_deliveries,
        SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN d.status = 'cancelled' OR d.status = 'failed' THEN 1 ELSE 0 END) as failed,
        COALESCE(AVG(d.customer_rating), 0) as avg_rating,
        COALESCE(SUM(d.driver_commission), 0) as total_commissions,
        COALESCE(SUM(d.driver_tip), 0) as total_tips,
        COALESCE(SUM(d.distance_km), 0) as total_distance,
        AVG(
          CASE WHEN d.actual_delivery_at IS NOT NULL AND d.actual_pickup_at IS NOT NULL
          THEN (julianday(d.actual_delivery_at) - julianday(d.actual_pickup_at)) * 24 * 60
          END
        ) as avg_delivery_minutes
      FROM delivery_drivers dr
      LEFT JOIN deliveries d ON dr.id = d.driver_id AND ${dateFilter} ${driverFilter}
      WHERE dr.is_active = 1
      GROUP BY dr.id
      ORDER BY completed DESC
    `, params);

    res.json({ success: true, data: performance });
  } catch (error) {
    logger.error('Error getting driver performance:', error);
    res.status(500).json({ success: false, message: 'Error al obtener rendimiento' });
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
