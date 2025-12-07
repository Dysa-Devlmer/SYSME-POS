/**
 * QR Ordering System Controller
 * Sistema de pedidos por código QR para SYSME-POS
 *
 * Funcionalidades:
 * - Generación dinámica de QR por mesa
 * - Menú digital para clientes
 * - Gestión de sesiones por mesa
 * - Carrito de compras
 * - Split bill (dividir cuenta)
 * - Llamar mesero
 * - Integración directa con KDS
 * - WebSocket en tiempo real
 */

import dbService from '../../services/dbService.js';
import { emitToRoom, emitToAll } from '../../websockets/socketHandler.js';
import crypto from 'crypto';

// ============================================
// INICIALIZACIÓN DE TABLAS
// ============================================

export const initQROrderingTables = () => {
  const db = dbService.getDatabase();

  // Códigos QR por mesa
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      short_url TEXT,
      is_active INTEGER DEFAULT 1,
      scan_count INTEGER DEFAULT 0,
      last_scanned_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);

  // Sesiones de mesa (cuando clientes escanean QR)
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      guest_count INTEGER DEFAULT 1,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      total_amount INTEGER DEFAULT 0,
      tip_amount INTEGER DEFAULT 0,
      tip_percentage REAL,
      language TEXT DEFAULT 'es',
      device_info TEXT,
      FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);

  // Participantes de la sesión (para split bill)
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_session_guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      guest_name TEXT,
      guest_token TEXT UNIQUE NOT NULL,
      is_host INTEGER DEFAULT 0,
      subtotal INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES qr_sessions(id)
    )
  `);

  // Pedidos desde QR
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      guest_id INTEGER,
      sale_id INTEGER,
      order_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      subtotal INTEGER DEFAULT 0,
      tax_amount INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (session_id) REFERENCES qr_sessions(id),
      FOREIGN KEY (guest_id) REFERENCES qr_session_guests(id),
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    )
  `);

  // Items del pedido QR
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      guest_id INTEGER,
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      modifiers TEXT,
      special_instructions TEXT,
      status TEXT DEFAULT 'pending',
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qr_order_id) REFERENCES qr_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (guest_id) REFERENCES qr_session_guests(id)
    )
  `);

  // Carrito temporal (antes de confirmar pedido)
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      guest_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      modifiers TEXT,
      special_instructions TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES qr_sessions(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (guest_id) REFERENCES qr_session_guests(id)
    )
  `);

  // Llamadas al mesero
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_waiter_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      call_type TEXT DEFAULT 'assistance',
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT,
      responded_by INTEGER,
      FOREIGN KEY (session_id) REFERENCES qr_sessions(id),
      FOREIGN KEY (table_id) REFERENCES tables(id),
      FOREIGN KEY (responded_by) REFERENCES users(id)
    )
  `);

  // Solicitudes de cuenta
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_bill_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      table_id INTEGER NOT NULL,
      request_type TEXT DEFAULT 'full',
      split_method TEXT,
      tip_percentage REAL,
      tip_amount INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      processed_by INTEGER,
      FOREIGN KEY (session_id) REFERENCES qr_sessions(id),
      FOREIGN KEY (table_id) REFERENCES tables(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )
  `);

  // Configuración del menú digital
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_menu_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      logo_url TEXT,
      banner_url TEXT,
      primary_color TEXT DEFAULT '#E53935',
      secondary_color TEXT DEFAULT '#1976D2',
      font_family TEXT DEFAULT 'Inter',
      welcome_message TEXT DEFAULT '¡Bienvenido! Escanea para ver nuestro menú',
      footer_message TEXT,
      show_prices INTEGER DEFAULT 1,
      show_descriptions INTEGER DEFAULT 1,
      show_images INTEGER DEFAULT 1,
      show_allergens INTEGER DEFAULT 1,
      show_calories INTEGER DEFAULT 0,
      allow_ordering INTEGER DEFAULT 1,
      allow_waiter_call INTEGER DEFAULT 1,
      allow_bill_request INTEGER DEFAULT 1,
      allow_tips INTEGER DEFAULT 1,
      default_tip_percentages TEXT DEFAULT '[10, 15, 20]',
      min_order_amount INTEGER DEFAULT 0,
      languages TEXT DEFAULT '["es", "en"]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categorías visibles en menú digital
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      custom_name TEXT,
      custom_description TEXT,
      custom_image_url TEXT,
      available_from TEXT,
      available_until TEXT,
      available_days TEXT DEFAULT '[1,2,3,4,5,6,7]',
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Analytics de uso QR
  db.exec(`
    CREATE TABLE IF NOT EXISTS qr_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id INTEGER,
      session_id INTEGER,
      event_type TEXT NOT NULL,
      event_data TEXT,
      device_type TEXT,
      browser TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
      FOREIGN KEY (session_id) REFERENCES qr_sessions(id)
    )
  `);

  // Índices para performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_qr_codes_table ON qr_codes(table_id);
    CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
    CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_qr_sessions_table ON qr_sessions(table_id);
    CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_qr_orders_session ON qr_orders(session_id);
    CREATE INDEX IF NOT EXISTS idx_qr_cart_session ON qr_cart_items(session_id);
    CREATE INDEX IF NOT EXISTS idx_qr_waiter_calls_status ON qr_waiter_calls(status);
    CREATE INDEX IF NOT EXISTS idx_qr_analytics_event ON qr_analytics(event_type);
  `);

  // Insertar configuración por defecto si no existe
  const configExists = db.prepare('SELECT id FROM qr_menu_config LIMIT 1').get();
  if (!configExists) {
    db.prepare(`
      INSERT INTO qr_menu_config (
        welcome_message,
        footer_message,
        default_tip_percentages
      ) VALUES (?, ?, ?)
    `).run(
      '¡Bienvenido! Escanea el código QR de tu mesa para ver nuestro menú',
      'Gracias por tu visita - SYSME POS',
      '[10, 15, 20]'
    );
  }

  console.log('✅ QR Ordering tables initialized');
};

// Inicializar tablas al cargar el módulo
initQROrderingTables();

// ============================================
// GENERACIÓN DE CÓDIGOS QR
// ============================================

// Generar código único
const generateQRCode = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Generar token de sesión
const generateSessionToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generar token de invitado
const generateGuestToken = () => {
  return crypto.randomBytes(12).toString('hex');
};

// Crear QR para una mesa
export const createQRForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const db = dbService.getDatabase();

    // Verificar que la mesa existe
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);
    if (!table) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }

    // Desactivar QR anterior si existe
    db.prepare(`
      UPDATE qr_codes SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE table_id = ? AND is_active = 1
    `).run(tableId);

    // Crear nuevo código QR
    const code = generateQRCode();
    const baseUrl = process.env.QR_BASE_URL || 'https://menu.sysme.cl';
    const shortUrl = `${baseUrl}/m/${code}`;

    const result = db.prepare(`
      INSERT INTO qr_codes (table_id, code, short_url)
      VALUES (?, ?, ?)
    `).run(tableId, code, shortUrl);

    const qrCode = db.prepare('SELECT * FROM qr_codes WHERE id = ?').get(result.lastInsertRowid);

    // Registrar evento
    db.prepare(`
      INSERT INTO qr_analytics (qr_code_id, event_type, event_data)
      VALUES (?, 'qr_created', ?)
    `).run(qrCode.id, JSON.stringify({ table_id: tableId, table_number: table.number }));

    res.json({
      success: true,
      qrCode: {
        ...qrCode,
        table_number: table.number,
        table_name: table.name,
        qr_url: shortUrl
      }
    });

  } catch (error) {
    console.error('Error creating QR code:', error);
    res.status(500).json({ error: 'Error al crear código QR' });
  }
};

// Obtener QR de una mesa
export const getQRForTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const db = dbService.getDatabase();

    const qrCode = db.prepare(`
      SELECT qc.*, t.number as table_number, t.name as table_name
      FROM qr_codes qc
      JOIN tables t ON t.id = qc.table_id
      WHERE qc.table_id = ? AND qc.is_active = 1
    `).get(tableId);

    if (!qrCode) {
      return res.status(404).json({ error: 'No hay código QR activo para esta mesa' });
    }

    res.json({ qrCode });

  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ error: 'Error al obtener código QR' });
  }
};

// Obtener todos los QRs activos
export const getAllActiveQRs = async (req, res) => {
  try {
    const db = dbService.getDatabase();

    const qrCodes = db.prepare(`
      SELECT qc.*, t.number as table_number, t.name as table_name,
             (SELECT COUNT(*) FROM qr_sessions WHERE qr_code_id = qc.id AND status = 'active') as active_sessions
      FROM qr_codes qc
      JOIN tables t ON t.id = qc.table_id
      WHERE qc.is_active = 1
      ORDER BY t.number
    `).all();

    res.json({ qrCodes });

  } catch (error) {
    console.error('Error getting QR codes:', error);
    res.status(500).json({ error: 'Error al obtener códigos QR' });
  }
};

// Regenerar QR para todas las mesas
export const regenerateAllQRs = async (req, res) => {
  try {
    const db = dbService.getDatabase();

    // Obtener todas las mesas
    const tables = db.prepare('SELECT id, number, name FROM tables WHERE is_active = 1').all();

    const results = [];
    const baseUrl = process.env.QR_BASE_URL || 'https://menu.sysme.cl';

    for (const table of tables) {
      // Desactivar QR anterior
      db.prepare(`
        UPDATE qr_codes SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE table_id = ? AND is_active = 1
      `).run(table.id);

      // Crear nuevo
      const code = generateQRCode();
      const shortUrl = `${baseUrl}/m/${code}`;

      const result = db.prepare(`
        INSERT INTO qr_codes (table_id, code, short_url)
        VALUES (?, ?, ?)
      `).run(table.id, code, shortUrl);

      results.push({
        table_id: table.id,
        table_number: table.number,
        table_name: table.name,
        qr_code: code,
        qr_url: shortUrl
      });
    }

    res.json({
      success: true,
      message: `${results.length} códigos QR regenerados`,
      qrCodes: results
    });

  } catch (error) {
    console.error('Error regenerating QR codes:', error);
    res.status(500).json({ error: 'Error al regenerar códigos QR' });
  }
};

// ============================================
// ESCANEO Y SESIONES
// ============================================

// Escanear QR (endpoint público para clientes)
export const scanQR = async (req, res) => {
  try {
    const { code } = req.params;
    const { guestCount, language, deviceInfo } = req.body;
    const db = dbService.getDatabase();

    // Buscar código QR
    const qrCode = db.prepare(`
      SELECT qc.*, t.number as table_number, t.name as table_name, t.id as table_id
      FROM qr_codes qc
      JOIN tables t ON t.id = qc.table_id
      WHERE qc.code = ? AND qc.is_active = 1
    `).get(code);

    if (!qrCode) {
      return res.status(404).json({ error: 'Código QR inválido o expirado' });
    }

    // Actualizar contador de escaneos
    db.prepare(`
      UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(qrCode.id);

    // Verificar si hay sesión activa para esta mesa
    let session = db.prepare(`
      SELECT * FROM qr_sessions
      WHERE qr_code_id = ? AND status = 'active'
      ORDER BY started_at DESC LIMIT 1
    `).get(qrCode.id);

    let isNewSession = false;
    let guestToken = null;

    if (!session) {
      // Crear nueva sesión
      const sessionToken = generateSessionToken();
      guestToken = generateGuestToken();

      const result = db.prepare(`
        INSERT INTO qr_sessions (qr_code_id, table_id, session_token, guest_count, language, device_info)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        qrCode.id,
        qrCode.table_id,
        sessionToken,
        guestCount || 1,
        language || 'es',
        deviceInfo ? JSON.stringify(deviceInfo) : null
      );

      session = db.prepare('SELECT * FROM qr_sessions WHERE id = ?').get(result.lastInsertRowid);

      // Crear guest host
      db.prepare(`
        INSERT INTO qr_session_guests (session_id, guest_name, guest_token, is_host)
        VALUES (?, ?, ?, 1)
      `).run(session.id, 'Anfitrión', guestToken);

      isNewSession = true;

      // Notificar al dashboard
      emitToAll('qr:new_session', {
        session_id: session.id,
        table_id: qrCode.table_id,
        table_number: qrCode.table_number,
        guest_count: guestCount || 1
      });

    } else {
      // Unirse a sesión existente como nuevo guest
      guestToken = generateGuestToken();
      const guestNumber = db.prepare(
        'SELECT COUNT(*) as count FROM qr_session_guests WHERE session_id = ?'
      ).get(session.id).count + 1;

      db.prepare(`
        INSERT INTO qr_session_guests (session_id, guest_name, guest_token, is_host)
        VALUES (?, ?, ?, 0)
      `).run(session.id, `Comensal ${guestNumber}`, guestToken);
    }

    // Registrar analytics
    db.prepare(`
      INSERT INTO qr_analytics (qr_code_id, session_id, event_type, event_data, device_type)
      VALUES (?, ?, 'scan', ?, ?)
    `).run(
      qrCode.id,
      session.id,
      JSON.stringify({ is_new_session: isNewSession }),
      deviceInfo?.type || 'unknown'
    );

    // Obtener configuración del menú
    const menuConfig = db.prepare('SELECT * FROM qr_menu_config LIMIT 1').get();

    res.json({
      success: true,
      session: {
        id: session.id,
        token: session.session_token,
        guest_token: guestToken,
        is_new: isNewSession,
        table_number: qrCode.table_number,
        table_name: qrCode.table_name
      },
      config: menuConfig
    });

  } catch (error) {
    console.error('Error scanning QR:', error);
    res.status(500).json({ error: 'Error al procesar código QR' });
  }
};

// Obtener sesión actual
export const getSession = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT qs.*, t.number as table_number, t.name as table_name
      FROM qr_sessions qs
      JOIN tables t ON t.id = qs.table_id
      WHERE qs.session_token = ? AND qs.status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada o expirada' });
    }

    // Obtener guests
    const guests = db.prepare(`
      SELECT * FROM qr_session_guests WHERE session_id = ? ORDER BY joined_at
    `).all(session.id);

    // Obtener pedidos de la sesión
    const orders = db.prepare(`
      SELECT * FROM qr_orders WHERE session_id = ? ORDER BY created_at DESC
    `).all(session.id);

    res.json({
      session,
      guests,
      orders
    });

  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
};

// Cerrar sesión
export const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const db = dbService.getDatabase();

    db.prepare(`
      UPDATE qr_sessions
      SET status = 'closed', ended_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sessionId);

    // Limpiar carrito
    db.prepare('DELETE FROM qr_cart_items WHERE session_id = ?').run(sessionId);

    // Notificar
    emitToAll('qr:session_closed', { session_id: sessionId });

    res.json({ success: true, message: 'Sesión cerrada' });

  } catch (error) {
    console.error('Error closing session:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

// ============================================
// MENÚ DIGITAL
// ============================================

// Obtener menú digital (público)
export const getDigitalMenu = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const { language } = req.query;
    const db = dbService.getDatabase();

    // Verificar sesión
    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    // Obtener configuración
    const config = db.prepare('SELECT * FROM qr_menu_config LIMIT 1').get();

    // Obtener categorías visibles
    const categories = db.prepare(`
      SELECT c.*, qmc.display_order, qmc.custom_name, qmc.custom_description, qmc.custom_image_url
      FROM categories c
      LEFT JOIN qr_menu_categories qmc ON qmc.category_id = c.id
      WHERE c.is_active = 1
        AND (qmc.is_visible = 1 OR qmc.is_visible IS NULL)
      ORDER BY COALESCE(qmc.display_order, c.display_order, 999), c.name
    `).all();

    // Obtener productos por categoría
    const menu = categories.map(category => {
      const products = db.prepare(`
        SELECT p.*,
               (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
        FROM products p
        WHERE p.category_id = ? AND p.is_active = 1 AND p.available_for_sale = 1
        ORDER BY p.name
      `).all(category.id);

      return {
        id: category.id,
        name: category.custom_name || category.name,
        description: category.custom_description || category.description,
        image_url: category.custom_image_url || category.image_url,
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url,
          allergens: p.allergens ? JSON.parse(p.allergens) : [],
          dietary_info: p.dietary_info ? JSON.parse(p.dietary_info) : [],
          calories: p.calories,
          preparation_time: p.preparation_time
        }))
      };
    });

    // Registrar vista del menú
    db.prepare(`
      INSERT INTO qr_analytics (session_id, event_type, event_data)
      VALUES (?, 'menu_view', ?)
    `).run(session.id, JSON.stringify({ language: language || 'es' }));

    res.json({
      config: {
        logo_url: config.logo_url,
        banner_url: config.banner_url,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
        welcome_message: config.welcome_message,
        show_prices: config.show_prices,
        show_descriptions: config.show_descriptions,
        show_images: config.show_images,
        show_allergens: config.show_allergens,
        show_calories: config.show_calories,
        allow_ordering: config.allow_ordering,
        allow_waiter_call: config.allow_waiter_call,
        allow_bill_request: config.allow_bill_request
      },
      menu
    });

  } catch (error) {
    console.error('Error getting digital menu:', error);
    res.status(500).json({ error: 'Error al obtener menú' });
  }
};

// Obtener producto con detalles y modificadores
export const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const db = dbService.getDatabase();

    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? AND p.is_active = 1
    `).get(productId);

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Obtener imágenes
    const images = db.prepare(`
      SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order
    `).all(productId);

    // Obtener modificadores disponibles
    const modifiers = db.prepare(`
      SELECT mg.*,
             (SELECT json_group_array(json_object(
               'id', mo.id,
               'name', mo.name,
               'price', mo.price,
               'is_default', mo.is_default
             )) FROM modifier_options mo WHERE mo.group_id = mg.id AND mo.is_active = 1) as options
      FROM modifier_groups mg
      JOIN product_modifiers pm ON pm.modifier_group_id = mg.id
      WHERE pm.product_id = ? AND mg.is_active = 1
      ORDER BY mg.display_order
    `).all(productId);

    res.json({
      product: {
        ...product,
        allergens: product.allergens ? JSON.parse(product.allergens) : [],
        dietary_info: product.dietary_info ? JSON.parse(product.dietary_info) : [],
        images,
        modifiers: modifiers.map(m => ({
          ...m,
          options: JSON.parse(m.options || '[]')
        }))
      }
    });

  } catch (error) {
    console.error('Error getting product details:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// ============================================
// CARRITO DE COMPRAS
// ============================================

// Agregar al carrito
export const addToCart = async (req, res) => {
  try {
    const { sessionToken, guestToken, productId, quantity, modifiers, specialInstructions } = req.body;
    const db = dbService.getDatabase();

    // Verificar sesión
    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    // Verificar guest
    const guest = db.prepare(`
      SELECT * FROM qr_session_guests WHERE session_id = ? AND guest_token = ?
    `).get(session.id, guestToken);

    if (!guest) {
      return res.status(404).json({ error: 'Comensal no encontrado' });
    }

    // Verificar producto
    const product = db.prepare(`
      SELECT * FROM products WHERE id = ? AND is_active = 1 AND available_for_sale = 1
    `).get(productId);

    if (!product) {
      return res.status(404).json({ error: 'Producto no disponible' });
    }

    // Calcular precio con modificadores
    let unitPrice = product.price;
    if (modifiers && modifiers.length > 0) {
      for (const mod of modifiers) {
        const option = db.prepare('SELECT price FROM modifier_options WHERE id = ?').get(mod.optionId);
        if (option) {
          unitPrice += option.price;
        }
      }
    }

    // Agregar al carrito
    const result = db.prepare(`
      INSERT INTO qr_cart_items (session_id, guest_id, product_id, quantity, unit_price, modifiers, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      guest.id,
      productId,
      quantity || 1,
      unitPrice,
      modifiers ? JSON.stringify(modifiers) : null,
      specialInstructions
    );

    // Obtener carrito actualizado
    const cart = await getCartItems(session.id);

    // Notificar actualización
    emitToRoom(`session-${session.session_token}`, 'cart:updated', cart);

    // Analytics
    db.prepare(`
      INSERT INTO qr_analytics (session_id, event_type, event_data)
      VALUES (?, 'add_to_cart', ?)
    `).run(session.id, JSON.stringify({ product_id: productId, quantity }));

    res.json({ success: true, cart });

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
};

// Actualizar cantidad en carrito
export const updateCartItem = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { quantity, sessionToken } = req.body;
    const db = dbService.getDatabase();

    // Verificar sesión
    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    if (quantity <= 0) {
      // Eliminar item
      db.prepare('DELETE FROM qr_cart_items WHERE id = ? AND session_id = ?').run(cartItemId, session.id);
    } else {
      db.prepare(`
        UPDATE qr_cart_items SET quantity = ? WHERE id = ? AND session_id = ?
      `).run(quantity, cartItemId, session.id);
    }

    const cart = await getCartItems(session.id);
    emitToRoom(`session-${session.session_token}`, 'cart:updated', cart);

    res.json({ success: true, cart });

  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Error al actualizar carrito' });
  }
};

// Eliminar del carrito
export const removeFromCart = async (req, res) => {
  try {
    const { cartItemId } = req.params;
    const { sessionToken } = req.body;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    db.prepare('DELETE FROM qr_cart_items WHERE id = ? AND session_id = ?').run(cartItemId, session.id);

    const cart = await getCartItems(session.id);
    emitToRoom(`session-${session.session_token}`, 'cart:updated', cart);

    res.json({ success: true, cart });

  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: 'Error al eliminar del carrito' });
  }
};

// Obtener carrito
export const getCart = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    const cart = await getCartItems(session.id);
    res.json({ cart });

  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
};

// Helper: obtener items del carrito con detalles
const getCartItems = async (sessionId) => {
  const db = dbService.getDatabase();

  const items = db.prepare(`
    SELECT ci.*, p.name as product_name, p.description as product_description,
           (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as product_image,
           g.guest_name
    FROM qr_cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN qr_session_guests g ON g.id = ci.guest_id
    WHERE ci.session_id = ?
    ORDER BY ci.added_at
  `).all(sessionId);

  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const taxRate = 0.19; // 19% IVA Chile
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount;

  return {
    items: items.map(item => ({
      ...item,
      modifiers: item.modifiers ? JSON.parse(item.modifiers) : [],
      line_total: item.unit_price * item.quantity
    })),
    subtotal,
    tax_amount: taxAmount,
    tax_rate: taxRate,
    total,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0)
  };
};

// ============================================
// PEDIDOS
// ============================================

// Confirmar pedido (enviar a cocina)
export const confirmOrder = async (req, res) => {
  try {
    const { sessionToken, guestToken, notes } = req.body;
    const db = dbService.getDatabase();

    // Verificar sesión
    const session = db.prepare(`
      SELECT qs.*, t.number as table_number
      FROM qr_sessions qs
      JOIN tables t ON t.id = qs.table_id
      WHERE qs.session_token = ? AND qs.status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    // Obtener items del carrito
    const cartItems = db.prepare(`
      SELECT * FROM qr_cart_items WHERE session_id = ?
    `).all(session.id);

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Calcular totales
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;

    // Generar número de orden
    const orderCount = db.prepare(
      'SELECT COUNT(*) as count FROM qr_orders WHERE DATE(created_at) = DATE("now")'
    ).get().count;
    const orderNumber = `QR-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${String(orderCount + 1).padStart(4, '0')}`;

    // Crear orden QR
    const orderResult = db.prepare(`
      INSERT INTO qr_orders (session_id, order_number, subtotal, tax_amount, total, notes, status, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', CURRENT_TIMESTAMP)
    `).run(session.id, orderNumber, subtotal, taxAmount, total, notes);

    const orderId = orderResult.lastInsertRowid;

    // Crear items de la orden
    for (const item of cartItems) {
      db.prepare(`
        INSERT INTO qr_order_items (qr_order_id, product_id, guest_id, quantity, unit_price, modifiers, special_instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, item.product_id, item.guest_id, item.quantity, item.unit_price, item.modifiers, item.special_instructions);
    }

    // Crear venta en el sistema principal
    const saleResult = db.prepare(`
      INSERT INTO sales (table_id, subtotal, tax, total, status, order_type, source, created_at)
      VALUES (?, ?, ?, ?, 'pending', 'dine_in', 'qr_order', CURRENT_TIMESTAMP)
    `).run(session.table_id, subtotal, taxAmount, total);

    const saleId = saleResult.lastInsertRowid;

    // Vincular orden QR con venta
    db.prepare('UPDATE qr_orders SET sale_id = ? WHERE id = ?').run(saleId, orderId);

    // Crear items de venta
    for (const item of cartItems) {
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, modifiers, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity, item.modifiers, item.special_instructions);
    }

    // Limpiar carrito
    db.prepare('DELETE FROM qr_cart_items WHERE session_id = ?').run(session.id);

    // Actualizar total de sesión
    db.prepare(`
      UPDATE qr_sessions SET total_amount = total_amount + ? WHERE id = ?
    `).run(total, session.id);

    // Notificar a cocina (KDS)
    emitToAll('kds:new_order', {
      sale_id: saleId,
      order_number: orderNumber,
      table_number: session.table_number,
      source: 'QR',
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        modifiers: item.modifiers ? JSON.parse(item.modifiers) : [],
        special_instructions: item.special_instructions
      }))
    });

    // Notificar al dashboard
    emitToAll('qr:order_confirmed', {
      order_id: orderId,
      sale_id: saleId,
      order_number: orderNumber,
      table_id: session.table_id,
      table_number: session.table_number,
      total
    });

    // Notificar a la sesión
    emitToRoom(`session-${sessionToken}`, 'order:confirmed', {
      order_id: orderId,
      order_number: orderNumber,
      status: 'confirmed'
    });

    // Analytics
    db.prepare(`
      INSERT INTO qr_analytics (session_id, event_type, event_data)
      VALUES (?, 'order_confirmed', ?)
    `).run(session.id, JSON.stringify({ order_id: orderId, total, item_count: cartItems.length }));

    res.json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        sale_id: saleId,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: 'confirmed',
        message: '¡Pedido enviado a cocina!'
      }
    });

  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Error al confirmar pedido' });
  }
};

// Obtener estado del pedido
export const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = dbService.getDatabase();

    const order = db.prepare(`
      SELECT qo.*, s.status as sale_status
      FROM qr_orders qo
      LEFT JOIN sales s ON s.id = qo.sale_id
      WHERE qo.id = ?
    `).get(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const items = db.prepare(`
      SELECT qoi.*, p.name as product_name
      FROM qr_order_items qoi
      JOIN products p ON p.id = qoi.product_id
      WHERE qoi.qr_order_id = ?
    `).all(orderId);

    res.json({
      order: {
        ...order,
        items
      }
    });

  } catch (error) {
    console.error('Error getting order status:', error);
    res.status(500).json({ error: 'Error al obtener estado del pedido' });
  }
};

// Obtener historial de pedidos de la sesión
export const getSessionOrders = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ?
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const orders = db.prepare(`
      SELECT qo.*,
             (SELECT json_group_array(json_object(
               'id', qoi.id,
               'product_name', p.name,
               'quantity', qoi.quantity,
               'unit_price', qoi.unit_price,
               'status', qoi.status
             )) FROM qr_order_items qoi
             JOIN products p ON p.id = qoi.product_id
             WHERE qoi.qr_order_id = qo.id) as items
      FROM qr_orders qo
      WHERE qo.session_id = ?
      ORDER BY qo.created_at DESC
    `).all(session.id);

    res.json({
      orders: orders.map(o => ({
        ...o,
        items: JSON.parse(o.items || '[]')
      }))
    });

  } catch (error) {
    console.error('Error getting session orders:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

// ============================================
// LLAMAR MESERO
// ============================================

// Llamar mesero
export const callWaiter = async (req, res) => {
  try {
    const { sessionToken, callType, message } = req.body;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT qs.*, t.number as table_number
      FROM qr_sessions qs
      JOIN tables t ON t.id = qs.table_id
      WHERE qs.session_token = ? AND qs.status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    // Verificar si ya hay una llamada pendiente
    const pendingCall = db.prepare(`
      SELECT * FROM qr_waiter_calls
      WHERE session_id = ? AND status = 'pending'
    `).get(session.id);

    if (pendingCall) {
      return res.status(400).json({ error: 'Ya hay una llamada pendiente' });
    }

    // Crear llamada
    const result = db.prepare(`
      INSERT INTO qr_waiter_calls (session_id, table_id, call_type, message)
      VALUES (?, ?, ?, ?)
    `).run(session.id, session.table_id, callType || 'assistance', message);

    const call = db.prepare('SELECT * FROM qr_waiter_calls WHERE id = ?').get(result.lastInsertRowid);

    // Notificar al dashboard
    emitToAll('qr:waiter_call', {
      call_id: call.id,
      table_id: session.table_id,
      table_number: session.table_number,
      call_type: callType || 'assistance',
      message,
      created_at: call.created_at
    });

    // Analytics
    db.prepare(`
      INSERT INTO qr_analytics (session_id, event_type, event_data)
      VALUES (?, 'waiter_call', ?)
    `).run(session.id, JSON.stringify({ call_type: callType }));

    res.json({
      success: true,
      message: 'Mesero notificado',
      call
    });

  } catch (error) {
    console.error('Error calling waiter:', error);
    res.status(500).json({ error: 'Error al llamar mesero' });
  }
};

// Responder llamada de mesero
export const respondToWaiterCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user?.id;
    const db = dbService.getDatabase();

    db.prepare(`
      UPDATE qr_waiter_calls
      SET status = 'responded', responded_at = CURRENT_TIMESTAMP, responded_by = ?
      WHERE id = ?
    `).run(userId, callId);

    const call = db.prepare(`
      SELECT qwc.*, t.number as table_number
      FROM qr_waiter_calls qwc
      JOIN tables t ON t.id = qwc.table_id
      WHERE qwc.id = ?
    `).get(callId);

    // Notificar a la sesión
    const session = db.prepare('SELECT session_token FROM qr_sessions WHERE id = ?').get(call.session_id);
    if (session) {
      emitToRoom(`session-${session.session_token}`, 'waiter:responding', {
        message: 'Un mesero está en camino'
      });
    }

    res.json({ success: true, call });

  } catch (error) {
    console.error('Error responding to waiter call:', error);
    res.status(500).json({ error: 'Error al responder llamada' });
  }
};

// Obtener llamadas pendientes
export const getPendingWaiterCalls = async (req, res) => {
  try {
    const db = dbService.getDatabase();

    const calls = db.prepare(`
      SELECT qwc.*, t.number as table_number, t.name as table_name
      FROM qr_waiter_calls qwc
      JOIN tables t ON t.id = qwc.table_id
      WHERE qwc.status = 'pending'
      ORDER BY qwc.created_at
    `).all();

    res.json({ calls });

  } catch (error) {
    console.error('Error getting waiter calls:', error);
    res.status(500).json({ error: 'Error al obtener llamadas' });
  }
};

// ============================================
// SOLICITAR CUENTA
// ============================================

// Solicitar cuenta
export const requestBill = async (req, res) => {
  try {
    const { sessionToken, requestType, splitMethod, tipPercentage } = req.body;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT qs.*, t.number as table_number
      FROM qr_sessions qs
      JOIN tables t ON t.id = qs.table_id
      WHERE qs.session_token = ? AND qs.status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    // Calcular propina
    const tipAmount = tipPercentage ? Math.round(session.total_amount * (tipPercentage / 100)) : 0;

    // Crear solicitud
    const result = db.prepare(`
      INSERT INTO qr_bill_requests (session_id, table_id, request_type, split_method, tip_percentage, tip_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(session.id, session.table_id, requestType || 'full', splitMethod, tipPercentage, tipAmount);

    const billRequest = db.prepare('SELECT * FROM qr_bill_requests WHERE id = ?').get(result.lastInsertRowid);

    // Actualizar propina en sesión
    if (tipAmount > 0) {
      db.prepare(`
        UPDATE qr_sessions SET tip_amount = ?, tip_percentage = ? WHERE id = ?
      `).run(tipAmount, tipPercentage, session.id);
    }

    // Notificar al dashboard
    emitToAll('qr:bill_request', {
      request_id: billRequest.id,
      table_id: session.table_id,
      table_number: session.table_number,
      total_amount: session.total_amount,
      tip_amount: tipAmount,
      grand_total: session.total_amount + tipAmount,
      request_type: requestType || 'full',
      split_method: splitMethod
    });

    // Analytics
    db.prepare(`
      INSERT INTO qr_analytics (session_id, event_type, event_data)
      VALUES (?, 'bill_request', ?)
    `).run(session.id, JSON.stringify({ tip_percentage: tipPercentage, request_type: requestType }));

    res.json({
      success: true,
      message: 'Cuenta solicitada',
      billRequest: {
        ...billRequest,
        total_amount: session.total_amount,
        tip_amount: tipAmount,
        grand_total: session.total_amount + tipAmount
      }
    });

  } catch (error) {
    console.error('Error requesting bill:', error);
    res.status(500).json({ error: 'Error al solicitar cuenta' });
  }
};

// Obtener solicitudes de cuenta pendientes
export const getPendingBillRequests = async (req, res) => {
  try {
    const db = dbService.getDatabase();

    const requests = db.prepare(`
      SELECT qbr.*, t.number as table_number, qs.total_amount
      FROM qr_bill_requests qbr
      JOIN tables t ON t.id = qbr.table_id
      JOIN qr_sessions qs ON qs.id = qbr.session_id
      WHERE qbr.status = 'pending'
      ORDER BY qbr.created_at
    `).all();

    res.json({
      requests: requests.map(r => ({
        ...r,
        grand_total: r.total_amount + (r.tip_amount || 0)
      }))
    });

  } catch (error) {
    console.error('Error getting bill requests:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// Procesar solicitud de cuenta
export const processBillRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;
    const db = dbService.getDatabase();

    db.prepare(`
      UPDATE qr_bill_requests
      SET status = 'processed', processed_at = CURRENT_TIMESTAMP, processed_by = ?
      WHERE id = ?
    `).run(userId, requestId);

    const request = db.prepare(`
      SELECT qbr.*, qs.session_token
      FROM qr_bill_requests qbr
      JOIN qr_sessions qs ON qs.id = qbr.session_id
      WHERE qbr.id = ?
    `).get(requestId);

    // Notificar a la sesión
    if (request) {
      emitToRoom(`session-${request.session_token}`, 'bill:ready', {
        message: 'Tu cuenta está lista'
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error processing bill request:', error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
};

// ============================================
// SPLIT BILL
// ============================================

// Obtener resumen para split bill
export const getSplitBillSummary = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    // Obtener guests con sus items
    const guests = db.prepare(`
      SELECT g.*,
             (SELECT COALESCE(SUM(qoi.unit_price * qoi.quantity), 0)
              FROM qr_order_items qoi
              JOIN qr_orders qo ON qo.id = qoi.qr_order_id
              WHERE qoi.guest_id = g.id AND qo.session_id = ?) as subtotal
      FROM qr_session_guests g
      WHERE g.session_id = ?
    `).all(session.id, session.id);

    // Items sin asignar
    const unassignedItems = db.prepare(`
      SELECT qoi.*, p.name as product_name
      FROM qr_order_items qoi
      JOIN qr_orders qo ON qo.id = qoi.qr_order_id
      JOIN products p ON p.id = qoi.product_id
      WHERE qo.session_id = ? AND qoi.guest_id IS NULL
    `).all(session.id);

    const totalAmount = session.total_amount;
    const equalSplit = Math.ceil(totalAmount / Math.max(guests.length, 1));

    res.json({
      session_total: totalAmount,
      guest_count: guests.length,
      equal_split_amount: equalSplit,
      guests: guests.map(g => ({
        ...g,
        tax_amount: Math.round(g.subtotal * 0.19),
        total: g.subtotal + Math.round(g.subtotal * 0.19)
      })),
      unassigned_items: unassignedItems
    });

  } catch (error) {
    console.error('Error getting split bill summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

// Asignar item a guest
export const assignItemToGuest = async (req, res) => {
  try {
    const { orderItemId, guestId, sessionToken } = req.body;
    const db = dbService.getDatabase();

    const session = db.prepare(`
      SELECT * FROM qr_sessions WHERE session_token = ? AND status = 'active'
    `).get(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'Sesión inválida' });
    }

    db.prepare(`
      UPDATE qr_order_items SET guest_id = ? WHERE id = ?
    `).run(guestId, orderItemId);

    // Recalcular subtotales de guests
    db.prepare(`
      UPDATE qr_session_guests SET subtotal = (
        SELECT COALESCE(SUM(qoi.unit_price * qoi.quantity), 0)
        FROM qr_order_items qoi
        JOIN qr_orders qo ON qo.id = qoi.qr_order_id
        WHERE qoi.guest_id = qr_session_guests.id AND qo.session_id = ?
      ) WHERE session_id = ?
    `).run(session.id, session.id);

    const summary = await getSplitBillData(session.id);
    emitToRoom(`session-${sessionToken}`, 'split:updated', summary);

    res.json({ success: true });

  } catch (error) {
    console.error('Error assigning item:', error);
    res.status(500).json({ error: 'Error al asignar item' });
  }
};

// Helper para datos de split
const getSplitBillData = async (sessionId) => {
  const db = dbService.getDatabase();

  const guests = db.prepare(`
    SELECT g.*,
           (SELECT COALESCE(SUM(qoi.unit_price * qoi.quantity), 0)
            FROM qr_order_items qoi
            JOIN qr_orders qo ON qo.id = qoi.qr_order_id
            WHERE qoi.guest_id = g.id AND qo.session_id = ?) as subtotal
    FROM qr_session_guests g
    WHERE g.session_id = ?
  `).all(sessionId, sessionId);

  return guests;
};

// ============================================
// CONFIGURACIÓN DEL MENÚ
// ============================================

// Obtener configuración
export const getMenuConfig = async (req, res) => {
  try {
    const db = dbService.getDatabase();
    const config = db.prepare('SELECT * FROM qr_menu_config LIMIT 1').get();

    res.json({ config });

  } catch (error) {
    console.error('Error getting menu config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

// Actualizar configuración
export const updateMenuConfig = async (req, res) => {
  try {
    const updates = req.body;
    const db = dbService.getDatabase();

    const allowedFields = [
      'logo_url', 'banner_url', 'primary_color', 'secondary_color', 'font_family',
      'welcome_message', 'footer_message', 'show_prices', 'show_descriptions',
      'show_images', 'show_allergens', 'show_calories', 'allow_ordering',
      'allow_waiter_call', 'allow_bill_request', 'allow_tips', 'default_tip_percentages',
      'min_order_amount', 'languages'
    ];

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length > 0) {
      setClause.push('updated_at = CURRENT_TIMESTAMP');
      db.prepare(`UPDATE qr_menu_config SET ${setClause.join(', ')} WHERE id = 1`).run(...values);
    }

    const config = db.prepare('SELECT * FROM qr_menu_config LIMIT 1').get();

    res.json({ success: true, config });

  } catch (error) {
    console.error('Error updating menu config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// ============================================
// ANALYTICS Y DASHBOARD
// ============================================

// Dashboard de QR Ordering
export const getQRDashboard = async (req, res) => {
  try {
    const db = dbService.getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    // Sesiones activas
    const activeSessions = db.prepare(`
      SELECT qs.*, t.number as table_number, t.name as table_name,
             (SELECT COUNT(*) FROM qr_orders WHERE session_id = qs.id) as order_count
      FROM qr_sessions qs
      JOIN tables t ON t.id = qs.table_id
      WHERE qs.status = 'active'
      ORDER BY qs.started_at DESC
    `).all();

    // Estadísticas del día
    const todayStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM qr_sessions WHERE DATE(started_at) = ?) as total_sessions,
        (SELECT COUNT(*) FROM qr_orders WHERE DATE(created_at) = ?) as total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM qr_orders WHERE DATE(created_at) = ? AND status != 'cancelled') as total_revenue,
        (SELECT COUNT(*) FROM qr_codes WHERE DATE(last_scanned_at) = ?) as qr_scans,
        (SELECT COUNT(*) FROM qr_waiter_calls WHERE DATE(created_at) = ?) as waiter_calls,
        (SELECT COUNT(*) FROM qr_bill_requests WHERE DATE(created_at) = ?) as bill_requests
    `).get(today, today, today, today, today, today);

    // Llamadas y solicitudes pendientes
    const pendingCalls = db.prepare(`
      SELECT qwc.*, t.number as table_number
      FROM qr_waiter_calls qwc
      JOIN tables t ON t.id = qwc.table_id
      WHERE qwc.status = 'pending'
      ORDER BY qwc.created_at
    `).all();

    const pendingBills = db.prepare(`
      SELECT qbr.*, t.number as table_number, qs.total_amount
      FROM qr_bill_requests qbr
      JOIN tables t ON t.id = qbr.table_id
      JOIN qr_sessions qs ON qs.id = qbr.session_id
      WHERE qbr.status = 'pending'
      ORDER BY qbr.created_at
    `).all();

    // Productos más pedidos via QR
    const topProducts = db.prepare(`
      SELECT p.name, SUM(qoi.quantity) as total_quantity, SUM(qoi.unit_price * qoi.quantity) as total_revenue
      FROM qr_order_items qoi
      JOIN products p ON p.id = qoi.product_id
      JOIN qr_orders qo ON qo.id = qoi.qr_order_id
      WHERE DATE(qo.created_at) = ?
      GROUP BY qoi.product_id
      ORDER BY total_quantity DESC
      LIMIT 10
    `).all(today);

    res.json({
      active_sessions: activeSessions,
      today_stats: todayStats,
      pending_waiter_calls: pendingCalls,
      pending_bill_requests: pendingBills.map(b => ({
        ...b,
        grand_total: b.total_amount + (b.tip_amount || 0)
      })),
      top_products: topProducts
    });

  } catch (error) {
    console.error('Error getting QR dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

// Analytics detallados
export const getQRAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = dbService.getDatabase();

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);

    // Tendencias diarias
    const dailyTrends = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as sessions,
        (SELECT COUNT(*) FROM qr_orders WHERE DATE(created_at) = DATE(qs.started_at)) as orders,
        (SELECT COALESCE(SUM(total), 0) FROM qr_orders WHERE DATE(created_at) = DATE(qs.started_at)) as revenue
      FROM qr_sessions qs
      WHERE DATE(started_at) BETWEEN ? AND ?
      GROUP BY DATE(started_at)
      ORDER BY date
    `).all(start, end);

    // Tiempo promedio de sesión
    const avgSessionTime = db.prepare(`
      SELECT AVG(
        CAST((julianday(COALESCE(ended_at, CURRENT_TIMESTAMP)) - julianday(started_at)) * 24 * 60 AS INTEGER)
      ) as avg_minutes
      FROM qr_sessions
      WHERE DATE(started_at) BETWEEN ? AND ?
    `).get(start, end);

    // Tasa de conversión (sesiones con pedidos / total sesiones)
    const conversionRate = db.prepare(`
      SELECT
        COUNT(DISTINCT qs.id) as total_sessions,
        COUNT(DISTINCT qo.session_id) as sessions_with_orders
      FROM qr_sessions qs
      LEFT JOIN qr_orders qo ON qo.session_id = qs.id
      WHERE DATE(qs.started_at) BETWEEN ? AND ?
    `).get(start, end);

    // Propinas promedio
    const avgTip = db.prepare(`
      SELECT
        AVG(tip_percentage) as avg_tip_percentage,
        AVG(tip_amount) as avg_tip_amount
      FROM qr_sessions
      WHERE tip_amount > 0 AND DATE(started_at) BETWEEN ? AND ?
    `).get(start, end);

    // Horarios más populares
    const peakHours = db.prepare(`
      SELECT
        strftime('%H', started_at) as hour,
        COUNT(*) as session_count
      FROM qr_sessions
      WHERE DATE(started_at) BETWEEN ? AND ?
      GROUP BY hour
      ORDER BY session_count DESC
    `).all(start, end);

    // Eventos de analytics
    const eventBreakdown = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM qr_analytics
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY event_type
      ORDER BY count DESC
    `).all(start, end);

    res.json({
      period: { start, end },
      daily_trends: dailyTrends,
      avg_session_minutes: avgSessionTime?.avg_minutes || 0,
      conversion_rate: conversionRate.total_sessions > 0
        ? (conversionRate.sessions_with_orders / conversionRate.total_sessions * 100).toFixed(1)
        : 0,
      avg_tip: avgTip,
      peak_hours: peakHours,
      event_breakdown: eventBreakdown
    });

  } catch (error) {
    console.error('Error getting QR analytics:', error);
    res.status(500).json({ error: 'Error al obtener analytics' });
  }
};

// Obtener sesiones activas para monitor
export const getActiveSessions = async (req, res) => {
  try {
    const db = dbService.getDatabase();

    const sessions = db.prepare(`
      SELECT qs.*, t.number as table_number, t.name as table_name,
             (SELECT COUNT(*) FROM qr_session_guests WHERE session_id = qs.id) as guest_count,
             (SELECT COUNT(*) FROM qr_orders WHERE session_id = qs.id) as order_count,
             (SELECT COUNT(*) FROM qr_cart_items WHERE session_id = qs.id) as cart_items
      FROM qr_sessions qs
      JOIN tables t ON t.id = qs.table_id
      WHERE qs.status = 'active'
      ORDER BY qs.started_at DESC
    `).all();

    res.json({ sessions });

  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Error al obtener sesiones' });
  }
};

export default {
  initQROrderingTables,
  createQRForTable,
  getQRForTable,
  getAllActiveQRs,
  regenerateAllQRs,
  scanQR,
  getSession,
  closeSession,
  getDigitalMenu,
  getProductDetails,
  addToCart,
  updateCartItem,
  removeFromCart,
  getCart,
  confirmOrder,
  getOrderStatus,
  getSessionOrders,
  callWaiter,
  respondToWaiterCall,
  getPendingWaiterCalls,
  requestBill,
  getPendingBillRequests,
  processBillRequest,
  getSplitBillSummary,
  assignItemToGuest,
  getMenuConfig,
  updateMenuConfig,
  getQRDashboard,
  getQRAnalytics,
  getActiveSessions
};
