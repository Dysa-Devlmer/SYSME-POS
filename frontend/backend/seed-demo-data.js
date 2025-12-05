#!/usr/bin/env node

/**
 * =====================================================
 * SYSME POS - Demo Data Seeder
 * =====================================================
 * Creates realistic demo data for testing and demonstrations
 *
 * Usage:
 *   node seed-demo-data.js
 *   node seed-demo-data.js --clear  (clears existing data first)
 *
 * @author SYSME POS Team
 * @date 2025-11-20
 * =====================================================
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Configuration
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, 'database.sqlite');
const CLEAR_DATA = process.argv.includes('--clear');
const BCRYPT_ROUNDS = 10;

// Connect to database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('🌱 SYSME POS - Demo Data Seeder');
console.log('================================\n');

/**
 * Clear existing data if requested
 */
function clearData() {
  if (!CLEAR_DATA) return;

  console.log('🗑️  Clearing existing data...');

  const tables = [
    'order_items', 'orders', 'payments',
    'inventory_adjustments', 'inventory_transfers',
    'customer_addresses', 'loyalty_points', 'customers',
    'products', 'product_categories',
    'reservations', 'promotions',
    'suppliers'
  ];

  tables.forEach(table => {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
      console.log(`   ✓ Cleared ${table}`);
    } catch (error) {
      // Table might not exist
    }
  });

  console.log('✅ Data cleared\n');
}

/**
 * Seed product categories
 */
function seedCategories() {
  console.log('📁 Seeding product categories...');

  const categories = [
    { name: 'Pizzas', description: 'Delicious Italian pizzas', icon: '🍕', color: '#FF6B6B', sort_order: 1 },
    { name: 'Burgers', description: 'Gourmet burgers', icon: '🍔', color: '#4ECDC4', sort_order: 2 },
    { name: 'Pasta', description: 'Fresh pasta dishes', icon: '🍝', color: '#FFE66D', sort_order: 3 },
    { name: 'Salads', description: 'Fresh and healthy salads', icon: '🥗', color: '#95E1D3', sort_order: 4 },
    { name: 'Desserts', description: 'Sweet treats', icon: '🍰', color: '#F38181', sort_order: 5 },
    { name: 'Beverages', description: 'Drinks and beverages', icon: '🥤', color: '#AA96DA', sort_order: 6 },
    { name: 'Appetizers', description: 'Start your meal right', icon: '🥙', color: '#FCBAD3', sort_order: 7 },
    { name: 'Breakfast', description: 'Morning favorites', icon: '🍳', color: '#FFFFD2', sort_order: 8 },
  ];

  const stmt = db.prepare(`
    INSERT INTO product_categories (name, description, icon, color, sort_order, is_active, company_id)
    VALUES (?, ?, ?, ?, ?, 1, 1)
  `);

  categories.forEach(cat => {
    stmt.run(cat.name, cat.description, cat.icon, cat.color, cat.sort_order);
    console.log(`   ✓ ${cat.icon} ${cat.name}`);
  });

  console.log('✅ Categories seeded\n');
}

/**
 * Seed products
 */
function seedProducts() {
  console.log('🍕 Seeding products...');

  const products = [
    // Pizzas
    { name: 'Margherita Pizza', sku: 'PIZZA-001', category_id: 1, price: 12.99, cost: 5.50, description: 'Classic tomato and mozzarella' },
    { name: 'Pepperoni Pizza', sku: 'PIZZA-002', category_id: 1, price: 14.99, cost: 6.50, description: 'With premium pepperoni' },
    { name: 'Hawaiian Pizza', sku: 'PIZZA-003', category_id: 1, price: 13.99, cost: 6.00, description: 'Ham and pineapple' },
    { name: 'Vegetarian Pizza', sku: 'PIZZA-004', category_id: 1, price: 13.49, cost: 5.80, description: 'Fresh vegetables' },

    // Burgers
    { name: 'Classic Burger', sku: 'BURG-001', category_id: 2, price: 9.99, cost: 4.50, description: 'Beef patty with classic toppings' },
    { name: 'Cheese Burger', sku: 'BURG-002', category_id: 2, price: 10.99, cost: 5.00, description: 'Double cheese burger' },
    { name: 'BBQ Bacon Burger', sku: 'BURG-003', category_id: 2, price: 12.99, cost: 6.00, description: 'With BBQ sauce and bacon' },
    { name: 'Veggie Burger', sku: 'BURG-004', category_id: 2, price: 9.49, cost: 4.20, description: 'Plant-based patty' },

    // Pasta
    { name: 'Spaghetti Carbonara', sku: 'PASTA-001', category_id: 3, price: 11.99, cost: 5.00, description: 'Creamy carbonara sauce' },
    { name: 'Fettuccine Alfredo', sku: 'PASTA-002', category_id: 3, price: 12.49, cost: 5.50, description: 'Rich alfredo sauce' },
    { name: 'Penne Arrabiata', sku: 'PASTA-003', category_id: 3, price: 10.99, cost: 4.80, description: 'Spicy tomato sauce' },

    // Salads
    { name: 'Caesar Salad', sku: 'SALAD-001', category_id: 4, price: 8.99, cost: 3.50, description: 'Classic Caesar with croutons' },
    { name: 'Greek Salad', sku: 'SALAD-002', category_id: 4, price: 9.49, cost: 3.80, description: 'Fresh Mediterranean flavors' },
    { name: 'Garden Salad', sku: 'SALAD-003', category_id: 4, price: 7.99, cost: 3.20, description: 'Mixed greens and vegetables' },

    // Desserts
    { name: 'Chocolate Cake', sku: 'DESS-001', category_id: 5, price: 6.99, cost: 2.50, description: 'Rich chocolate cake' },
    { name: 'Cheesecake', sku: 'DESS-002', category_id: 5, price: 7.49, cost: 2.80, description: 'New York style cheesecake' },
    { name: 'Tiramisu', sku: 'DESS-003', category_id: 5, price: 7.99, cost: 3.00, description: 'Italian coffee dessert' },

    // Beverages
    { name: 'Coca Cola', sku: 'BEV-001', category_id: 6, price: 2.49, cost: 0.50, description: 'Classic Coke' },
    { name: 'Orange Juice', sku: 'BEV-002', category_id: 6, price: 3.49, cost: 1.00, description: 'Fresh squeezed' },
    { name: 'Coffee', sku: 'BEV-003', category_id: 6, price: 2.99, cost: 0.60, description: 'Freshly brewed' },
    { name: 'Iced Tea', sku: 'BEV-004', category_id: 6, price: 2.49, cost: 0.50, description: 'Refreshing iced tea' },

    // Appetizers
    { name: 'Garlic Bread', sku: 'APP-001', category_id: 7, price: 4.99, cost: 1.50, description: 'Toasted with garlic butter' },
    { name: 'Mozzarella Sticks', sku: 'APP-002', category_id: 7, price: 6.99, cost: 2.50, description: 'Fried mozzarella' },
    { name: 'Chicken Wings', sku: 'APP-003', category_id: 7, price: 8.99, cost: 3.80, description: 'Spicy or BBQ' },

    // Breakfast
    { name: 'Pancakes', sku: 'BRK-001', category_id: 8, price: 7.99, cost: 2.50, description: 'Stack of 3 with syrup' },
    { name: 'Eggs Benedict', sku: 'BRK-002', category_id: 8, price: 10.99, cost: 4.50, description: 'Poached eggs with hollandaise' },
    { name: 'French Toast', sku: 'BRK-003', category_id: 8, price: 8.49, cost: 2.80, description: 'Classic French toast' },
  ];

  const stmt = db.prepare(`
    INSERT INTO products (name, sku, description, category_id, price, cost, unit_of_measure, is_active, company_id, min_stock_level, max_stock_level)
    VALUES (?, ?, ?, ?, ?, ?, 'unit', 1, 1, 10, 100)
  `);

  products.forEach(product => {
    stmt.run(product.name, product.sku, product.description, product.category_id, product.price, product.cost);
    console.log(`   ✓ ${product.name}`);
  });

  console.log('✅ Products seeded\n');
}

/**
 * Seed inventory
 */
function seedInventory() {
  console.log('📦 Seeding inventory...');

  const stmt = db.prepare(`
    INSERT INTO inventory (product_id, location_id, available_quantity, reserved_quantity, company_id)
    SELECT
      product_id,
      1 as location_id,
      CAST((RANDOM() & 127) + 20 AS INTEGER) as available_quantity,
      0 as reserved_quantity,
      1 as company_id
    FROM products
  `);

  const result = stmt.run();
  console.log(`   ✓ Added inventory for ${result.changes} products`);
  console.log('✅ Inventory seeded\n');
}

/**
 * Seed customers
 */
function seedCustomers() {
  console.log('👥 Seeding customers...');

  const customers = [
    { first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '555-0101', loyalty_points: 150 },
    { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', phone: '555-0102', loyalty_points: 280 },
    { first_name: 'Robert', last_name: 'Johnson', email: 'robert.j@example.com', phone: '555-0103', loyalty_points: 520 },
    { first_name: 'Emily', last_name: 'Williams', email: 'emily.w@example.com', phone: '555-0104', loyalty_points: 95 },
    { first_name: 'Michael', last_name: 'Brown', email: 'michael.b@example.com', phone: '555-0105', loyalty_points: 340 },
    { first_name: 'Sarah', last_name: 'Davis', email: 'sarah.d@example.com', phone: '555-0106', loyalty_points: 180 },
    { first_name: 'David', last_name: 'Miller', email: 'david.m@example.com', phone: '555-0107', loyalty_points: 425 },
    { first_name: 'Lisa', last_name: 'Wilson', email: 'lisa.w@example.com', phone: '555-0108', loyalty_points: 260 },
    { first_name: 'James', last_name: 'Moore', email: 'james.m@example.com', phone: '555-0109', loyalty_points: 310 },
    { first_name: 'Maria', last_name: 'Taylor', email: 'maria.t@example.com', phone: '555-0110', loyalty_points: 145 },
  ];

  const stmt = db.prepare(`
    INSERT INTO customers (first_name, last_name, email, phone, loyalty_points, company_id)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  customers.forEach(customer => {
    stmt.run(customer.first_name, customer.last_name, customer.email, customer.phone, customer.loyalty_points);
    console.log(`   ✓ ${customer.first_name} ${customer.last_name} (${customer.loyalty_points} pts)`);
  });

  console.log('✅ Customers seeded\n');
}

/**
 * Seed sample orders
 */
function seedOrders() {
  console.log('🛒 Seeding sample orders...');

  const orderStmt = db.prepare(`
    INSERT INTO orders (order_number, customer_id, location_id, user_id, order_type, subtotal, tax_amount, total_amount, status, company_id)
    VALUES (?, ?, 1, 1, ?, ?, ?, ?, 'completed', 1)
  `);

  const itemStmt = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `);

  const paymentStmt = db.prepare(`
    INSERT INTO payments (order_id, payment_method, amount, status, company_id)
    VALUES (?, 'cash', ?, 'completed', 1)
  `);

  for (let i = 1; i <= 20; i++) {
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(3, '0')}`;
    const customerId = Math.floor(Math.random() * 10) + 1;
    const orderType = ['dine-in', 'takeout', 'delivery'][Math.floor(Math.random() * 3)];

    // Calculate order total
    const numItems = Math.floor(Math.random() * 4) + 1;
    let subtotal = 0;

    const orderResult = orderStmt.run(orderNumber, customerId, orderType, 0, 0, 0);
    const orderId = orderResult.lastInsertRowid;

    // Add items to order
    for (let j = 0; j < numItems; j++) {
      const productId = Math.floor(Math.random() * 25) + 1;
      const quantity = Math.floor(Math.random() * 3) + 1;

      const product = db.prepare('SELECT price FROM products WHERE product_id = ?').get(productId);
      if (product) {
        const itemSubtotal = product.price * quantity;
        subtotal += itemSubtotal;
        itemStmt.run(orderId, productId, quantity, product.price, itemSubtotal);
      }
    }

    // Update order totals
    const taxAmount = subtotal * 0.08; // 8% tax
    const total = subtotal + taxAmount;

    db.prepare('UPDATE orders SET subtotal = ?, tax_amount = ?, total_amount = ? WHERE order_id = ?')
      .run(subtotal, taxAmount, total, orderId);

    // Add payment
    paymentStmt.run(orderId, total);

    console.log(`   ✓ Order ${orderNumber} - $${total.toFixed(2)}`);
  }

  console.log('✅ Orders seeded\n');
}

/**
 * Seed suppliers
 */
function seedSuppliers() {
  console.log('🚚 Seeding suppliers...');

  const suppliers = [
    { name: 'Fresh Foods Inc', contact_name: 'Tom Anderson', email: 'tom@freshfoods.com', phone: '555-2001' },
    { name: 'Dairy Delights', contact_name: 'Mary Johnson', email: 'mary@dairydelights.com', phone: '555-2002' },
    { name: 'Meat Masters', contact_name: 'Bob Wilson', email: 'bob@meatmasters.com', phone: '555-2003' },
    { name: 'Veggie Valley', contact_name: 'Lisa Green', email: 'lisa@veggievalley.com', phone: '555-2004' },
    { name: 'Beverage Bros', contact_name: 'Mike Brown', email: 'mike@beveragebros.com', phone: '555-2005' },
  ];

  const stmt = db.prepare(`
    INSERT INTO suppliers (name, contact_name, email, phone, is_active, company_id)
    VALUES (?, ?, ?, ?, 1, 1)
  `);

  suppliers.forEach(supplier => {
    stmt.run(supplier.name, supplier.contact_name, supplier.email, supplier.phone);
    console.log(`   ✓ ${supplier.name}`);
  });

  console.log('✅ Suppliers seeded\n');
}

/**
 * Main execution
 */
try {
  console.log(`📍 Database: ${DB_PATH}\n`);

  // Clear data if requested
  clearData();

  // Seed data
  seedCategories();
  seedProducts();
  seedInventory();
  seedCustomers();
  seedOrders();
  seedSuppliers();

  console.log('🎉 Demo data seeding completed successfully!\n');
  console.log('Summary:');
  console.log('  • 8 product categories');
  console.log('  • 25+ products');
  console.log('  • Inventory for all products');
  console.log('  • 10 customers with loyalty points');
  console.log('  • 20 sample orders');
  console.log('  • 5 suppliers');
  console.log('\n✅ Ready to test!\n');

} catch (error) {
  console.error('❌ Error seeding demo data:', error.message);
  process.exit(1);
} finally {
  db.close();
}
