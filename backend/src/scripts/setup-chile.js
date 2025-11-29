/**
 * Script para Configurar SYSME para Restaurantes Chilenos
 * Aplica productos, usuarios y configuraciones típicas de Chile
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbService, connectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import { chileConfig } from '../config/chile-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChileSetup {
  constructor() {
    this.setupComplete = false;
  }

  async initialize() {
    try {
      logger.info('🇨🇱 Iniciando configuración para restaurantes chilenos...');

      // Conectar a la base de datos
      await connectDatabase();

      // Ejecutar configuraciones
      await this.setupChileProducts();
      await this.setupChileUsers();
      await this.setupChileSettings();
      await this.setupChileTables();

      this.setupComplete = true;
      logger.info('✅ Configuración chilena completada exitosamente');

      return {
        success: true,
        message: 'SYSME configurado para restaurantes chilenos',
        config: {
          locale: chileConfig.locale,
          timezone: chileConfig.timezone,
          currency: chileConfig.currency.code,
          productsLoaded: true,
          usersCreated: true,
          tablesSetup: true
        }
      };

    } catch (error) {
      logger.error('❌ Error en configuración chilena:', error);
      throw error;
    }
  }

  async setupChileProducts() {
    try {
      logger.info('📦 Configurando productos típicos chilenos...');

      const sqlFile = path.join(__dirname, '../database/seeds/productos-chilenos.sql');
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');

      // Ejecutar el SQL por partes (SQLite no soporta múltiples statements)
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('insert') ||
            statement.toLowerCase().includes('update') ||
            statement.toLowerCase().includes('delete')) {
          try {
            await dbService.raw(statement);
          } catch (error) {
            // Ignorar errores de duplicados
            if (!error.message.includes('UNIQUE constraint failed')) {
              logger.warn('Warning en SQL:', error.message);
            }
          }
        }
      }

      // Verificar productos cargados
      const productCount = await dbService.raw('SELECT COUNT(*) as count FROM products');
      const categoryCount = await dbService.raw('SELECT COUNT(*) as count FROM categories');

      logger.info(`✅ Productos chilenos configurados: ${productCount[0].count} productos, ${categoryCount[0].count} categorías`);

    } catch (error) {
      logger.error('Error configurando productos chilenos:', error);
      throw error;
    }
  }

  async setupChileUsers() {
    try {
      logger.info('👥 Configurando usuarios típicos de restaurante chileno...');

      const chileUsers = [
        {
          username: 'admin_chile',
          email: 'admin@restaurante.cl',
          password: 'admin123',
          first_name: 'Administrador',
          last_name: 'Sistema',
          role: 'admin',
          phone: '+56912345678',
          is_active: 1
        },
        {
          username: 'encargado',
          email: 'encargado@restaurante.cl',
          password: 'encargado123',
          first_name: 'Juan Carlos',
          last_name: 'Pérez',
          role: 'manager',
          phone: '+56987654321',
          is_active: 1
        },
        {
          username: 'garzon_mesa',
          email: 'garzon@restaurante.cl',
          password: 'garzon123',
          first_name: 'María',
          last_name: 'González',
          role: 'waiter',
          phone: '+56923456789',
          is_active: 1
        },
        {
          username: 'cocinero',
          email: 'cocina@restaurante.cl',
          password: 'cocina123',
          first_name: 'Carlos',
          last_name: 'Mendoza',
          role: 'kitchen',
          phone: '+56934567890',
          is_active: 1
        },
        {
          username: 'cajero',
          email: 'caja@restaurante.cl',
          password: 'caja123',
          first_name: 'Ana',
          last_name: 'Vargas',
          role: 'cashier',
          phone: '+56945678901',
          is_active: 1
        }
      ];

      for (const user of chileUsers) {
        try {
          // Verificar si el usuario ya existe
          const existing = await dbService.findOne('users', { username: user.username });

          if (!existing) {
            await dbService.create('users', user);
            logger.info(`✅ Usuario creado: ${user.username} (${user.role})`);
          } else {
            logger.info(`ℹ️ Usuario ya existe: ${user.username}`);
          }
        } catch (error) {
          if (!error.message.includes('UNIQUE constraint failed')) {
            logger.warn(`Warning creando usuario ${user.username}:`, error.message);
          }
        }
      }

    } catch (error) {
      logger.error('Error configurando usuarios chilenos:', error);
      throw error;
    }
  }

  async setupChileSettings() {
    try {
      logger.info('⚙️ Configurando ajustes para Chile...');

      const chileSettings = [
        {
          key: 'country',
          value: 'Chile',
          description: 'País del restaurante'
        },
        {
          key: 'currency',
          value: 'CLP',
          description: 'Moneda local'
        },
        {
          key: 'timezone',
          value: 'America/Santiago',
          description: 'Zona horaria'
        },
        {
          key: 'language',
          value: 'es-CL',
          description: 'Idioma del sistema'
        },
        {
          key: 'tax_rate',
          value: '19',
          description: 'Tasa de IVA (%)'
        },
        {
          key: 'restaurant_name',
          value: 'Restaurante La Mesa Chilena',
          description: 'Nombre del restaurante'
        },
        {
          key: 'restaurant_address',
          value: 'Av. Providencia 1234, Providencia, Santiago',
          description: 'Dirección del restaurante'
        },
        {
          key: 'restaurant_phone',
          value: '+56 2 2234 5678',
          description: 'Teléfono del restaurante'
        },
        {
          key: 'business_hours_almuerzo',
          value: '12:00-15:30',
          description: 'Horario de almuerzo'
        },
        {
          key: 'business_hours_once',
          value: '16:00-19:30',
          description: 'Horario de once'
        },
        {
          key: 'business_hours_cena',
          value: '20:00-23:30',
          description: 'Horario de cena'
        }
      ];

      for (const setting of chileSettings) {
        try {
          // Verificar si la configuración ya existe
          const existing = await dbService.findOne('settings', { key: setting.key });

          if (!existing) {
            await dbService.create('settings', setting);
            logger.info(`✅ Configuración creada: ${setting.key} = ${setting.value}`);
          } else {
            // Actualizar valor existente
            await dbService.update('settings', existing.id, { value: setting.value });
            logger.info(`🔄 Configuración actualizada: ${setting.key} = ${setting.value}`);
          }
        } catch (error) {
          logger.warn(`Warning configurando ${setting.key}:`, error.message);
        }
      }

    } catch (error) {
      logger.error('Error configurando ajustes chilenos:', error);
      throw error;
    }
  }

  async setupChileTables() {
    try {
      logger.info('🪑 Configurando mesas típicas de restaurante chileno...');

      const chileTables = [
        // Mesas del salón principal
        { number: 1, capacity: 2, section: 'Salón Principal', status: 'available' },
        { number: 2, capacity: 4, section: 'Salón Principal', status: 'available' },
        { number: 3, capacity: 4, section: 'Salón Principal', status: 'available' },
        { number: 4, capacity: 6, section: 'Salón Principal', status: 'available' },
        { number: 5, capacity: 2, section: 'Salón Principal', status: 'available' },
        { number: 6, capacity: 4, section: 'Salón Principal', status: 'available' },
        { number: 7, capacity: 8, section: 'Salón Principal', status: 'available' },
        { number: 8, capacity: 4, section: 'Salón Principal', status: 'available' },

        // Mesas de la terraza
        { number: 9, capacity: 2, section: 'Terraza', status: 'available' },
        { number: 10, capacity: 4, section: 'Terraza', status: 'available' },
        { number: 11, capacity: 4, section: 'Terraza', status: 'available' },
        { number: 12, capacity: 6, section: 'Terraza', status: 'available' },

        // Salón privado
        { number: 13, capacity: 10, section: 'Salón Privado', status: 'available' },
        { number: 14, capacity: 12, section: 'Salón Privado', status: 'available' },

        // Barra
        { number: 15, capacity: 1, section: 'Barra', status: 'available' },
        { number: 16, capacity: 1, section: 'Barra', status: 'available' },
        { number: 17, capacity: 1, section: 'Barra', status: 'available' },
        { number: 18, capacity: 1, section: 'Barra', status: 'available' }
      ];

      for (const table of chileTables) {
        try {
          // Verificar si la mesa ya existe
          const existing = await dbService.findOne('tables', { number: table.number });

          if (!existing) {
            await dbService.create('tables', {
              ...table,
              created_at: new Date(),
              updated_at: new Date()
            });
            logger.info(`✅ Mesa creada: Mesa ${table.number} (${table.capacity} personas, ${table.section})`);
          } else {
            logger.info(`ℹ️ Mesa ya existe: Mesa ${table.number}`);
          }
        } catch (error) {
          if (!error.message.includes('UNIQUE constraint failed')) {
            logger.warn(`Warning creando mesa ${table.number}:`, error.message);
          }
        }
      }

    } catch (error) {
      logger.error('Error configurando mesas chilenas:', error);
      throw error;
    }
  }

  async getSetupStatus() {
    try {
      const productCount = await dbService.raw('SELECT COUNT(*) as count FROM products');
      const categoryCount = await dbService.raw('SELECT COUNT(*) as count FROM categories');
      const userCount = await dbService.raw('SELECT COUNT(*) as count FROM users');
      const tableCount = await dbService.raw('SELECT COUNT(*) as count FROM tables');
      const settingCount = await dbService.raw('SELECT COUNT(*) as count FROM settings');

      return {
        setup_complete: this.setupComplete,
        products: productCount[0].count,
        categories: categoryCount[0].count,
        users: userCount[0].count,
        tables: tableCount[0].count,
        settings: settingCount[0].count,
        config: chileConfig
      };

    } catch (error) {
      logger.error('Error obteniendo estado de configuración:', error);
      throw error;
    }
  }
}

// Función principal para ejecutar desde línea de comandos
async function runChileSetup() {
  try {
    const setup = new ChileSetup();
    const result = await setup.initialize();

    console.log('\n🇨🇱 CONFIGURACIÓN CHILENA COMPLETADA 🇨🇱');
    console.log('======================================');
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en configuración:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runChileSetup();
}

export { ChileSetup };
export default ChileSetup;