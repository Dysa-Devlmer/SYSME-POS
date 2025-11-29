#!/usr/bin/env node

/**
 * SYSME Training Users Setup
 * Creates demo users and sample data for training purposes
 * 
 * Usage:
 *   node create-training-users.js [--env=staging] [--with-sample-data]
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// Configuration
const CONFIG = {
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'sysme_user',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sysme_staging'
  },
  WITH_SAMPLE_DATA: process.argv.includes('--with-sample-data'),
  ENV: process.argv.includes('--env=production') ? 'production' : 'staging'
};

class TrainingSetup {
  constructor() {
    this.db = null;
    this.createdUsers = [];
    this.createdCategories = [];
    this.createdProducts = [];
  }

  async connect() {
    try {
      console.log('🔌 Connecting to database...');
      this.db = await mysql.createConnection(CONFIG.DB);
      console.log('✅ Connected to database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async createTrainingUsers() {
    console.log('👥 Creating training users...');

    const trainingUsers = [
      {
        username: 'gerente_demo',
        email: 'gerente@sysme-demo.local',
        first_name: 'María',
        last_name: 'García',
        password: 'gerente123',
        role: 'manager'
      },
      {
        username: 'cajero1_demo',
        email: 'cajero1@sysme-demo.local',
        first_name: 'Carlos',
        last_name: 'Rodríguez',
        password: 'cajero123',
        role: 'cashier'
      },
      {
        username: 'cajero2_demo',
        email: 'cajero2@sysme-demo.local',
        first_name: 'Ana',
        last_name: 'López',
        password: 'cajero123',
        role: 'cashier'
      },
      {
        username: 'cocina_demo',
        email: 'cocina@sysme-demo.local',
        first_name: 'José',
        last_name: 'Martínez',
        password: 'cocina123',
        role: 'user'
      }
    ];

    for (const user of trainingUsers) {
      try {
        const passwordHash = await bcrypt.hash(user.password, 12);

        const [result] = await this.db.execute(`
          INSERT IGNORE INTO users (
            username, email, first_name, last_name, password_hash,
            role, is_active, email_verified
          ) VALUES (?, ?, ?, ?, ?, ?, true, true)
        `, [
          user.username,
          user.email,
          user.first_name,
          user.last_name,
          passwordHash,
          user.role
        ]);

        if (result.insertId) {
          this.createdUsers.push({
            id: result.insertId,
            ...user,
            passwordHash
          });
          console.log(`✅ Created user: ${user.username} (${user.role})`);
        } else {
          console.log(`ℹ️ User already exists: ${user.username}`);
        }

      } catch (error) {
        console.error(`❌ Failed to create user ${user.username}:`, error.message);
      }
    }

    // Print credentials summary
    console.log('\n📋 TRAINING USERS CREDENTIALS:');
    console.log('═'.repeat(50));
    trainingUsers.forEach(user => {
      console.log(`👤 ${user.role.toUpperCase()}: ${user.username} / ${user.password}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });
  }

  async createSampleCategories() {
    if (!CONFIG.WITH_SAMPLE_DATA) return;

    console.log('📂 Creating sample categories...');

    const categories = [
      { name: 'Entrantes', description: 'Aperitivos y entrantes', color: '#ef4444', sort_order: 1 },
      { name: 'Ensaladas', description: 'Ensaladas frescas', color: '#22c55e', sort_order: 2 },
      { name: 'Principales', description: 'Platos principales', color: '#f59e0b', sort_order: 3 },
      { name: 'Pizzas', description: 'Pizzas artesanales', color: '#8b5cf6', sort_order: 4 },
      { name: 'Postres', description: 'Postres caseros', color: '#ec4899', sort_order: 5 },
      { name: 'Bebidas', description: 'Bebidas frías y calientes', color: '#06b6d4', sort_order: 6 }
    ];

    for (const category of categories) {
      try {
        const [result] = await this.db.execute(`
          INSERT IGNORE INTO categories (name, description, color, sort_order, is_active)
          VALUES (?, ?, ?, ?, true)
        `, [category.name, category.description, category.color, category.sort_order]);

        if (result.insertId) {
          this.createdCategories.push({
            id: result.insertId,
            ...category
          });
          console.log(`✅ Created category: ${category.name}`);
        }

      } catch (error) {
        console.error(`❌ Failed to create category ${category.name}:`, error.message);
      }
    }
  }

  async createSampleProducts() {
    if (!CONFIG.WITH_SAMPLE_DATA) return;

    console.log('🛍️ Creating sample products...');

    // Get category IDs
    const categoryMap = new Map();
    this.createdCategories.forEach(cat => categoryMap.set(cat.name, cat.id));

    const products = [
      // Entrantes
      { name: 'Patatas Bravas', description: 'Patatas con salsa brava y alioli', price: 6.50, category: 'Entrantes', preparation_time: 10 },
      { name: 'Croquetas de Jamón', description: '6 croquetas caseras de jamón ibérico', price: 8.90, category: 'Entrantes', preparation_time: 8 },
      { name: 'Tabla de Quesos', description: 'Selección de quesos españoles', price: 12.50, category: 'Entrantes', preparation_time: 5 },
      
      // Ensaladas  
      { name: 'Ensalada César', description: 'Lechuga, pollo, parmesano, picatostes', price: 9.80, category: 'Ensaladas', preparation_time: 12 },
      { name: 'Ensalada Mixta', description: 'Tomate, lechuga, cebolla, atún, huevo', price: 7.50, category: 'Ensaladas', preparation_time: 8 },
      { name: 'Ensalada de Cabra', description: 'Rúcula, queso de cabra, nueces, miel', price: 10.90, category: 'Ensaladas', preparation_time: 10 },
      
      // Principales
      { name: 'Paella Valenciana', description: 'Paella tradicional para 2 personas', price: 24.50, category: 'Principales', preparation_time: 30 },
      { name: 'Salmón a la Plancha', description: 'Con verduras de temporada', price: 16.90, category: 'Principales', preparation_time: 18 },
      { name: 'Entrecot de Ternera', description: '300g con patatas y pimientos', price: 19.50, category: 'Principales', preparation_time: 20 },
      
      // Pizzas
      { name: 'Pizza Margarita', description: 'Tomate, mozzarella, albahaca', price: 11.50, category: 'Pizzas', preparation_time: 15 },
      { name: 'Pizza Quattro Stagioni', description: 'Jamón, champiñones, alcachofas, aceitunas', price: 14.90, category: 'Pizzas', preparation_time: 15 },
      { name: 'Pizza Prosciutto', description: 'Jamón serrano, rúcula, parmesano', price: 15.50, category: 'Pizzas', preparation_time: 15 },
      
      // Postres
      { name: 'Tiramisú', description: 'Postre italiano casero', price: 5.50, category: 'Postres', preparation_time: 3 },
      { name: 'Tarta de Chocolate', description: 'Con helado de vainilla', price: 6.20, category: 'Postres', preparation_time: 5 },
      { name: 'Flan de la Casa', description: 'Flan casero con nata', price: 4.80, category: 'Postres', preparation_time: 3 },
      
      // Bebidas
      { name: 'Agua Mineral', description: '50cl', price: 2.20, category: 'Bebidas', preparation_time: 1 },
      { name: 'Café Solo', description: 'Café espresso', price: 1.50, category: 'Bebidas', preparation_time: 2 },
      { name: 'Cerveza Estrella Galicia', description: '33cl', price: 2.80, category: 'Bebidas', preparation_time: 1 },
      { name: 'Vino de la Casa Tinto', description: 'Copa de vino tinto', price: 3.50, category: 'Bebidas', preparation_time: 1 }
    ];

    for (const product of products) {
      try {
        const categoryId = categoryMap.get(product.category);
        if (!categoryId) {
          console.warn(`⚠️ Category not found: ${product.category}`);
          continue;
        }

        // Determine stock status
        const stock = Math.floor(Math.random() * 50) + 10; // 10-60 units
        const minStock = 5;
        let stockStatus = 'in_stock';
        if (stock === 0) stockStatus = 'out_of_stock';
        else if (stock <= minStock) stockStatus = 'low_stock';

        const [result] = await this.db.execute(`
          INSERT IGNORE INTO products (
            name, description, price, stock, min_stock, stock_status,
            category_id, is_active, preparation_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, true, ?)
        `, [
          product.name,
          product.description,
          product.price,
          stock,
          minStock,
          stockStatus,
          categoryId,
          product.preparation_time
        ]);

        if (result.insertId) {
          this.createdProducts.push({
            id: result.insertId,
            ...product,
            categoryId,
            stock,
            stockStatus
          });
          console.log(`✅ Created product: ${product.name} (${product.category})`);
        }

      } catch (error) {
        console.error(`❌ Failed to create product ${product.name}:`, error.message);
      }
    }

    console.log(`📊 Created ${this.createdProducts.length} sample products`);
  }

  async createSampleSales() {
    if (!CONFIG.WITH_SAMPLE_DATA || this.createdProducts.length === 0) return;

    console.log('💰 Creating sample sales data...');

    const cashierUsers = this.createdUsers.filter(u => u.role === 'cashier');
    if (cashierUsers.length === 0) return;

    // Create sales for the last 30 days
    const salesCount = 50; // Create 50 sample sales
    
    for (let i = 0; i < salesCount; i++) {
      try {
        // Random date in last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const saleDate = new Date();
        saleDate.setDate(saleDate.getDate() - daysAgo);
        saleDate.setHours(Math.floor(Math.random() * 12) + 9); // 9 AM to 9 PM

        // Random cashier
        const cashier = cashierUsers[Math.floor(Math.random() * cashierUsers.length)];

        // Random payment method
        const paymentMethods = ['cash', 'card', 'transfer'];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

        // Generate invoice number
        const invoiceNumber = `DEMO-${Date.now()}-${i.toString().padStart(3, '0')}`;

        // Calculate totals (will be updated after adding items)
        let subtotal = 0;
        const discount = Math.random() < 0.3 ? Math.floor(Math.random() * 5) + 1 : 0; // 30% chance of discount
        const tax = 21; // 21% IVA

        // Create sale
        const [saleResult] = await this.db.execute(`
          INSERT INTO sales (
            invoice_number, sale_date, subtotal, discount, tax_percentage,
            total, user_id, payment_method, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `, [
          invoiceNumber,
          saleDate,
          0, // Will update after adding items
          discount,
          tax,
          0, // Will update after adding items
          cashier.id,
          paymentMethod
        ]);

        const saleId = saleResult.insertId;

        // Add random items to sale
        const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items per sale
        
        for (let j = 0; j < itemCount; j++) {
          const product = this.createdProducts[Math.floor(Math.random() * this.createdProducts.length)];
          const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
          const unitPrice = product.price;
          const itemSubtotal = quantity * unitPrice;

          await this.db.execute(`
            INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?)
          `, [saleId, product.id, quantity, unitPrice, itemSubtotal]);

          subtotal += itemSubtotal;
        }

        // Calculate final totals
        const discountAmount = (subtotal * discount) / 100;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * tax) / 100;
        const total = taxableAmount + taxAmount;

        // Update sale with correct totals
        await this.db.execute(`
          UPDATE sales 
          SET subtotal = ?, discount = ?, tax = ?, total = ?
          WHERE id = ?
        `, [subtotal, discountAmount, taxAmount, total, saleId]);

      } catch (error) {
        console.error(`❌ Failed to create sample sale ${i}:`, error.message);
      }
    }

    console.log(`📊 Created ${salesCount} sample sales`);
  }

  async createSystemSettings() {
    console.log('⚙️ Creating training system settings...');

    const trainingSettings = [
      ['training_mode', 'true', 'boolean', 'Enable training mode'],
      ['demo_data_created', new Date().toISOString(), 'string', 'Demo data creation timestamp'],
      ['training_expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), 'string', 'Training data expiry'],
      ['welcome_message', 'Bienvenido al sistema de entrenamiento SYSME 2.0', 'string', 'Welcome message for training'],
      ['training_tips_enabled', 'true', 'boolean', 'Show training tips'],
    ];

    for (const [key, value, type, description] of trainingSettings) {
      try {
        await this.db.execute(`
          INSERT INTO system_settings (key_name, value, data_type, description)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE value = ?, updated_at = CURRENT_TIMESTAMP
        `, [key, value, type, description, value]);

        console.log(`✅ Set training setting: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to create setting ${key}:`, error.message);
      }
    }
  }

  async generateTrainingGuide() {
    const guideContent = `
# 🎓 GUÍA DE USUARIOS DE ENTRENAMIENTO SYSME 2.0

## 👥 Credenciales de Acceso

### 🏢 GERENTE
- **Usuario**: gerente_demo
- **Password**: gerente123
- **Email**: gerente@sysme-demo.local
- **Permisos**: Gestión completa de productos, reportes, configuración

### 💰 CAJEROS
**Cajero 1:**
- **Usuario**: cajero1_demo
- **Password**: cajero123
- **Email**: cajero1@sysme-demo.local
- **Permisos**: Procesamiento de ventas, consulta productos

**Cajero 2:**
- **Usuario**: cajero2_demo  
- **Password**: cajero123
- **Email**: cajero2@sysme-demo.local
- **Permisos**: Procesamiento de ventas, consulta productos

### 👨‍🍳 COCINA
- **Usuario**: cocina_demo
- **Password**: cocina123
- **Email**: cocina@sysme-demo.local
- **Permisos**: Vista de pedidos, gestión de estados

## 📊 Datos de Prueba Incluidos

### Categorías Creadas (${this.createdCategories.length}):
${this.createdCategories.map(cat => `- ${cat.name}: ${cat.description}`).join('\n')}

### Productos Creados (${this.createdProducts.length}):
${this.createdProducts.slice(0, 10).map(prod => `- ${prod.name}: €${prod.price}`).join('\n')}
${this.createdProducts.length > 10 ? '... y más productos' : ''}

## 🧪 Escenarios de Prueba Sugeridos

### Para Gerentes:
1. **Gestión de Productos**: Crear, editar y eliminar productos
2. **Análisis de Ventas**: Revisar reportes y métricas
3. **Gestión de Usuarios**: Modificar permisos y roles
4. **Configuración**: Ajustar parámetros del sistema

### Para Cajeros:
1. **Venta Simple**: Procesar una venta con 1-3 productos
2. **Venta con Descuento**: Aplicar descuentos por porcentaje
3. **Pago Mixto**: Combinar efectivo y tarjeta
4. **Reimpresión**: Reimprimir tickets anteriores

### Para Cocina:
1. **Recepción de Pedidos**: Gestionar pedidos entrantes
2. **Actualización de Estados**: Cambiar estados de preparación
3. **Gestión de Tiempos**: Optimizar tiempos de entrega
4. **Pedidos Especiales**: Manejar notas y modificaciones

## ⚠️ Notas Importantes

- **Modo Training Activo**: Los datos son ficticios
- **Vencimiento**: Datos válidos por 30 días
- **Reset Diario**: Los datos se pueden restablecer
- **No Usar en Producción**: Solo para entrenamiento

## 📞 Soporte Durante Entrenamiento

- **Email**: soporte@sysme-demo.local  
- **Sistema**: Botón "Ayuda" en interfaz
- **Documentación**: Manual de usuario incluido

---
*Generado automáticamente el ${new Date().toLocaleDateString()}*
    `;

    const fs = require('fs').promises;
    const path = require('path');
    
    const guidePath = path.join(__dirname, '../docs/TRAINING_USERS_GUIDE.md');
    await fs.writeFile(guidePath, guideContent.trim());
    
    console.log(`📖 Training guide created: ${guidePath}`);
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      console.log('🔌 Database connection closed');
    }
  }

  async run() {
    try {
      console.log('🎓 Starting Training Setup for SYSME 2.0');
      console.log(`📍 Environment: ${CONFIG.ENV}`);
      console.log(`📊 Sample data: ${CONFIG.WITH_SAMPLE_DATA}`);

      await this.connect();
      await this.createTrainingUsers();
      
      if (CONFIG.WITH_SAMPLE_DATA) {
        await this.createSampleCategories();
        await this.createSampleProducts();
        await this.createSampleSales();
      }
      
      await this.createSystemSettings();
      await this.generateTrainingGuide();

      console.log('\n🎉 Training setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Review the training guide');
      console.log('2. Test login with demo users');
      console.log('3. Start training sessions');
      console.log('4. Evaluate user competency');

    } catch (error) {
      console.error('💥 Training setup failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new TrainingSetup();
  setup.run();
}

module.exports = TrainingSetup;