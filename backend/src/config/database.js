/**
 * Database Configuration
 * Modern database connection with Knex.js and connection pooling
 */

import knex from 'knex';
import { logger } from './logger.js';

let db = null;

// Multi-environment database configuration
const getDbConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  const dbType = process.env.DB_TYPE || 'sqlite';

  // Base configuration
  const baseConfig = {
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    },
    acquireConnectionTimeout: 60000,
  };

  // Database-specific configurations
  if (dbType === 'mysql') {
    return {
      ...baseConfig,
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'sysme_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sysme_production',
        charset: 'utf8mb4',
        timezone: 'UTC',
        ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false
      },
      pool: {
        ...baseConfig.pool,
        afterCreate: function (conn, done) {
          // Set timezone and other MySQL settings
          conn.query("SET time_zone = '+00:00';", function (err) {
            done(err, conn);
          });
        }
      }
    };
  } else {
    // SQLite for development
    return {
      ...baseConfig,
      client: 'sqlite3',
      connection: {
        filename: process.env.DB_PATH || './data/sysme.db'
      },
      useNullAsDefault: true
    };
  }
};

const dbConfig = getDbConfig();

export const connectDatabase = async () => {
  try {
    if (db) {
      return db;
    }

    // Ensure data directory exists
    import('fs').then(fs => {
      const dataDir = './data';
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info('Created data directory');
      }
    });

    db = knex(dbConfig);

    // Test the connection and initialize if needed
    try {
      await db.raw('SELECT 1 as result');

      // Check if tables exist
      const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      if (!tables || tables.length === 0) {
        logger.info('Database tables not found, initializing...');
        await initializeTables();
      }
    } catch (error) {
      logger.info('Database file not found, creating...');
      await initializeTables();
    }

    logger.info('Database connection established successfully');
    
    // Setup connection event handlers
    db.client.pool.on('createSuccess', () => {
      logger.debug('Database connection created');
    });
    
    db.client.pool.on('createFail', (err) => {
      logger.error('Database connection failed:', err);
    });
    
    return db;
    
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
};

export const closeDatabase = async () => {
  if (db) {
    await db.destroy();
    db = null;
    logger.info('Database connection closed');
  }
};

// Database helper functions
export class DatabaseService {
  constructor() {
    this.db = getDatabase();
  }

  // Generic CRUD operations
  async findById(table, id) {
    return await this.db(table).where('id', id).first();
  }

  async findByField(table, field, value) {
    return await this.db(table).where(field, value).first();
  }

  async findOne(table, conditions = {}) {
    let query = this.db(table);

    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle range queries like {'>': value, '<': value}
        Object.entries(value).forEach(([operator, operatorValue]) => {
          query = query.where(key, operator, operatorValue);
        });
      } else if (Array.isArray(value)) {
        query = query.whereIn(key, value);
      } else {
        query = query.where(key, value);
      }
    });

    return await query.first();
  }

  async findMany(table, conditions = {}, options = {}) {
    let query = this.db(table);
    
    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.whereIn(key, value);
      } else {
        query = query.where(key, value);
      }
    });
    
    // Apply ordering
    if (options.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  async create(table, data) {
    const [id] = await this.db(table).insert(data);
    return await this.findById(table, id);
  }

  async update(table, id, data) {
    await this.db(table).where('id', id).update({
      ...data,
      updated_at: new Date()
    });
    return await this.findById(table, id);
  }

  async delete(table, id) {
    return await this.db(table).where('id', id).del();
  }

  async count(table, conditions = {}) {
    let query = this.db(table);
    
    Object.entries(conditions).forEach(([key, value]) => {
      query = query.where(key, value);
    });
    
    const result = await query.count('* as count').first();
    return parseInt(result.count);
  }

  // Transaction support
  async transaction(callback) {
    return await this.db.transaction(callback);
  }

  // Raw query execution
  async raw(query, bindings = []) {
    return await this.db.raw(query, bindings);
  }

  // Custom query execution (alias for raw)
  async query(query, bindings = []) {
    const result = await this.db.raw(query, bindings);
    // For SQLite, raw returns array directly, for MySQL it's result[0]
    return Array.isArray(result) ? result : result[0] || [];
  }
}

// Database initialization function
const initializeTables = async () => {
  try {
    logger.info('Initializing database tables...');

    // Create tables directly using Knex schema builder
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 50).unique().notNullable();
      table.string('email', 100).unique().notNullable();
      table.string('password', 255).notNullable();
      table.string('first_name', 50).notNullable();
      table.string('last_name', 50).notNullable();
      table.enum('role', ['admin', 'manager', 'cashier', 'waiter', 'kitchen']).defaultTo('cashier');
      table.boolean('is_active').defaultTo(true);
      table.string('phone', 20);

      // Legacy compatibility fields (replicating camareros table)
      table.string('pin_code', 255); // bcrypt hashed PIN (equivalent to clavecamarero)
      table.string('assigned_tpv', 20).defaultTo('TPV1'); // Punto de venta asignado
      table.string('assigned_almacen', 50).defaultTo('Local'); // Almacén asignado
      table.json('permissions').defaultTo('{}'); // Permisos específicos (borrarlinea, modtiquet, etc.)
      table.boolean('active').defaultTo(true); // Campo legacy para compatibilidad

      table.timestamps(true, true);
    });

    await db.schema.createTable('categories', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.text('description');
      table.string('color', 7).defaultTo('#6366f1');
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    });

    // Tables for hospitality/restaurant functionality (replicating legacy)
    await db.schema.createTable('salons', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable(); // Equivalent to salon.nombre
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    await db.schema.createTable('tarifas', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable(); // Nombre de la tarifa
      table.text('description');
      table.decimal('multiplier', 4, 2).defaultTo(1.00); // Multiplicador de precio
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    await db.schema.createTable('tables', (table) => {
      table.increments('id').primary();
      table.string('table_number', 20).notNullable(); // Equivalent to mesa.Num_Mesa
      table.string('description', 100); // Descripción de la mesa
      table.integer('salon_id').unsigned().references('id').inTable('salons').onDelete('SET NULL'); // id_salon
      table.integer('tarifa_id').unsigned().references('id').inTable('tarifas').onDelete('SET NULL'); // id_tarifa
      table.integer('max_capacity').defaultTo(4); // Capacidad máxima
      table.enum('status', ['free', 'occupied', 'reserved', 'maintenance']).defaultTo('free');
      table.decimal('position_x', 8, 2).defaultTo(0); // Posición X en el mapa
      table.decimal('position_y', 8, 2).defaultTo(0); // Posición Y en el mapa
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.unique(['table_number', 'salon_id']); // Una mesa por número por salón
    });

    await db.schema.createTable('products', (table) => {
      table.increments('id').primary();
      table.string('name', 150).notNullable();
      table.text('description');
      table.decimal('price', 10, 2).notNullable();
      table.decimal('cost', 10, 2).defaultTo(0);
      table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('SET NULL');
      table.integer('stock').defaultTo(0);
      table.integer('min_stock').defaultTo(5);
      table.string('sku', 50).unique();
      table.string('barcode', 100);
      table.string('image_url', 255);
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_trackable').defaultTo(true);
      table.decimal('weight', 8, 2);
      table.integer('preparation_time').defaultTo(10);
      table.timestamps(true, true);
    });

    await db.schema.createTable('sales', (table) => {
      table.increments('id').primary();
      table.string('sale_number', 50).unique().notNullable();
      table.integer('customer_id').unsigned();
      table.string('table_number', 10);
      table.integer('user_id').unsigned().notNullable();
      table.decimal('subtotal', 10, 2).notNullable();
      table.decimal('tax_amount', 10, 2).defaultTo(0);
      table.decimal('discount_amount', 10, 2).defaultTo(0);
      table.decimal('total', 10, 2).notNullable();
      table.string('payment_method', 50).notNullable();
      table.enum('payment_status', ['pending', 'paid', 'refunded', 'partial']).defaultTo('paid');
      table.enum('status', ['draft', 'completed', 'cancelled', 'refunded']).defaultTo('completed');
      table.text('notes');
      table.boolean('receipt_printed').defaultTo(false);
      table.boolean('kitchen_printed').defaultTo(false);
      table.timestamps(true, true);
    });

    await db.schema.createTable('sale_items', (table) => {
      table.increments('id').primary();
      table.integer('sale_id').unsigned().notNullable().references('id').inTable('sales').onDelete('CASCADE');
      table.integer('product_id').unsigned().notNullable();
      table.string('product_name', 150).notNullable();
      table.decimal('quantity', 8, 2).notNullable();
      table.decimal('unit_price', 10, 2).notNullable();
      table.decimal('total_price', 10, 2).notNullable();
      table.text('notes');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });

    await db.schema.createTable('settings', (table) => {
      table.increments('id').primary();
      table.string('key', 100).unique().notNullable();
      table.text('value').notNullable();
      table.string('category', 50).defaultTo('general');
      table.text('description');
      table.enum('data_type', ['string', 'number', 'boolean', 'json']).defaultTo('string');
      table.boolean('is_public').defaultTo(false);
      table.timestamps(true, true);
    });

    // Insert default admin user (password: admin123)
    await db('users').insert({
      username: 'admin',
      email: 'admin@sysme.local',
      password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    });

    // Insert POS employees with PINs (replicating camareros table)
    // PIN: 1234 = $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG (bcrypt hash)
    await db('users').insert([
      {
        username: 'maria_camarera',
        email: 'maria@restaurant.local',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG',
        first_name: 'María',
        last_name: 'García',
        role: 'waiter',
        pin_code: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // PIN: 1234
        assigned_tpv: 'TPV1',
        assigned_almacen: 'Salon Principal',
        permissions: JSON.stringify({
          borrarlinea: true,
          modtiquet: true,
          descuentos: false,
          abrircajon: true
        }),
        is_active: true,
        active: true
      },
      {
        username: 'carlos_camarero',
        email: 'carlos@restaurant.local',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG',
        first_name: 'Carlos',
        last_name: 'López',
        role: 'waiter',
        pin_code: '$2b$12$i0qpEuwLGJGhAm1gtOIvCOLKV05qJKxT5r5pJQZS9u.yp8JrMCQqG', // PIN: 5678
        assigned_tpv: 'TPV2',
        assigned_almacen: 'Salon Terraza',
        permissions: JSON.stringify({
          borrarlinea: true,
          modtiquet: true,
          descuentos: true,
          abrircajon: true
        }),
        is_active: true,
        active: true
      },
      {
        username: 'ana_cocina',
        email: 'ana@restaurant.local',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG',
        first_name: 'Ana',
        last_name: 'Martínez',
        role: 'kitchen',
        pin_code: '$2b$12$0TbMmx8Vz7JjqvkNfLzb3.Wm5GV1i8nQaEkm8L5Z4C3iRt9S6Y7zA', // PIN: 9999
        assigned_tpv: 'COCINA',
        assigned_almacen: 'Cocina',
        permissions: JSON.stringify({
          borrarlinea: false,
          modtiquet: false,
          descuentos: false,
          abrircajon: false
        }),
        is_active: true,
        active: true
      },
      {
        username: 'luis_gerente',
        email: 'luis@restaurant.local',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG',
        first_name: 'Luis',
        last_name: 'Rodríguez',
        role: 'manager',
        pin_code: '$2b$12$B4jZzFu2V3qYqL1Nt8Mu3OaE6Z9R7C5iAx0QW8S2J4M6P7K1L9Hy', // PIN: 0000
        assigned_tpv: 'TPV_MASTER',
        assigned_almacen: 'Administracion',
        permissions: JSON.stringify({
          borrarlinea: true,
          modtiquet: true,
          descuentos: true,
          abrircajon: true,
          reportes: true,
          configuracion: true
        }),
        is_active: true,
        active: true
      }
    ]);

    // Insert default categories
    await db('categories').insert([
      { name: 'Bebidas', description: 'Bebidas frías y calientes', color: '#3b82f6' },
      { name: 'Platos Principales', description: 'Platos principales del menú', color: '#ef4444' },
      { name: 'Postres', description: 'Postres y dulces', color: '#f59e0b' },
      { name: 'Aperitivos', description: 'Entradas y aperitivos', color: '#10b981' },
      { name: 'Ensaladas', description: 'Ensaladas frescas', color: '#22c55e' }
    ]);

    // Insert default salons (restaurant areas)
    await db('salons').insert([
      { name: 'Salon Principal', description: 'Área principal del restaurante' },
      { name: 'Terraza', description: 'Terraza exterior con vista' },
      { name: 'Sala Privada', description: 'Sala privada para eventos' },
      { name: 'Barra', description: 'Área de barra y tapas' }
    ]);

    // Insert default tarifas (pricing tiers)
    await db('tarifas').insert([
      { name: 'Tarifa Normal', description: 'Precios estándar', multiplier: 1.00 },
      { name: 'Tarifa Terraza', description: 'Precios para terraza', multiplier: 1.10 },
      { name: 'Happy Hour', description: 'Precios reducidos', multiplier: 0.85 },
      { name: 'Eventos', description: 'Precios para eventos especiales', multiplier: 1.20 }
    ]);

    // Insert sample tables
    await db('tables').insert([
      // Salon Principal (id: 1)
      { table_number: '1', description: 'Mesa principal 1', salon_id: 1, tarifa_id: 1, max_capacity: 4, position_x: 100, position_y: 100 },
      { table_number: '2', description: 'Mesa principal 2', salon_id: 1, tarifa_id: 1, max_capacity: 6, position_x: 200, position_y: 100 },
      { table_number: '3', description: 'Mesa principal 3', salon_id: 1, tarifa_id: 1, max_capacity: 2, position_x: 300, position_y: 100 },
      { table_number: '4', description: 'Mesa principal 4', salon_id: 1, tarifa_id: 1, max_capacity: 4, position_x: 100, position_y: 200 },
      { table_number: '5', description: 'Mesa principal 5', salon_id: 1, tarifa_id: 1, max_capacity: 8, position_x: 200, position_y: 200 },

      // Terraza (id: 2)
      { table_number: 'T1', description: 'Mesa terraza 1', salon_id: 2, tarifa_id: 2, max_capacity: 4, position_x: 50, position_y: 50 },
      { table_number: 'T2', description: 'Mesa terraza 2', salon_id: 2, tarifa_id: 2, max_capacity: 4, position_x: 150, position_y: 50 },
      { table_number: 'T3', description: 'Mesa terraza 3', salon_id: 2, tarifa_id: 2, max_capacity: 6, position_x: 250, position_y: 50 },
      { table_number: 'T4', description: 'Mesa terraza 4', salon_id: 2, tarifa_id: 2, max_capacity: 2, position_x: 50, position_y: 150 },

      // Sala Privada (id: 3)
      { table_number: 'P1', description: 'Mesa privada grande', salon_id: 3, tarifa_id: 4, max_capacity: 12, position_x: 200, position_y: 200 },

      // Barra (id: 4)
      { table_number: 'B1', description: 'Barra lado izquierdo', salon_id: 4, tarifa_id: 1, max_capacity: 8, position_x: 50, position_y: 300 },
      { table_number: 'B2', description: 'Barra lado derecho', salon_id: 4, tarifa_id: 1, max_capacity: 8, position_x: 250, position_y: 300 }
    ]);

    // Insert sample products
    await db('products').insert([
      { name: 'Café Americano', description: 'Café americano tradicional', price: 2.50, category_id: 1, stock: 100, sku: 'CAF001' },
      { name: 'Café con Leche', description: 'Café con leche cremoso', price: 3.00, category_id: 1, stock: 100, sku: 'CAF002' },
      { name: 'Agua Mineral', description: 'Agua mineral natural', price: 1.50, category_id: 1, stock: 50, sku: 'BEB001' },
      { name: 'Hamburguesa Clásica', description: 'Hamburguesa con carne, lechuga, tomate', price: 12.90, category_id: 2, stock: 25, sku: 'HAM001' },
      { name: 'Pizza Margarita', description: 'Pizza con tomate, mozzarella y albahaca', price: 11.50, category_id: 2, stock: 20, sku: 'PIZ001' },
      { name: 'Ensalada César', description: 'Ensalada con pollo, crutones y parmesano', price: 8.90, category_id: 5, stock: 30, sku: 'ENS001' },
      { name: 'Tarta de Chocolate', description: 'Deliciosa tarta de chocolate casera', price: 4.50, category_id: 3, stock: 15, sku: 'POS001' }
    ]);

    // Insert default settings
    await db('settings').insert([
      { key: 'company_name', value: 'SYSME Restaurant', category: 'general', description: 'Nombre de la empresa', is_public: true },
      { key: 'tax_rate', value: '21', category: 'pos', description: 'Porcentaje de IVA', data_type: 'number', is_public: true },
      { key: 'currency', value: 'EUR', category: 'pos', description: 'Moneda del sistema', is_public: true }
    ]);

    logger.info('✅ Database tables created and initialized with sample data');

  } catch (error) {
    logger.error('❌ Error initializing database tables:', error);
    throw error;
  }
};

// Export singleton instance (will be initialized after database connection)
export let dbService = null;

export const initializeDbService = () => {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
};

export default { connectDatabase, getDatabase, closeDatabase, DatabaseService, initializeDbService };