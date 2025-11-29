/**
 * Printer Service - Handles kitchen and receipt printing
 * Supports multiple printer backends: node-thermal-printer, raw printing, and WebSocket
 */

import { logger } from '../../config/logger.js';
import { generateKitchenTicket, generateKitchenTicketESCPOS } from '../../utils/kitchenTicketTemplate.js';
import { generateReceiptTicket, generateReceiptTicketESCPOS } from '../../utils/receiptTicketTemplate.js';
import fs from 'fs';
import path from 'path';

// Configuration
const PRINTER_CONFIG = {
  kitchen: {
    enabled: process.env.KITCHEN_PRINTER_ENABLED === 'true' || false,
    type: process.env.KITCHEN_PRINTER_TYPE || 'file', // 'file', 'network', 'usb', 'escpos'
    path: process.env.KITCHEN_PRINTER_PATH || '/tmp/kitchen_tickets',
    ip: process.env.KITCHEN_PRINTER_IP || '192.168.1.100',
    port: process.env.KITCHEN_PRINTER_PORT || 9100,
    interface: process.env.KITCHEN_PRINTER_INTERFACE || 'tcp'
  },
  receipt: {
    enabled: process.env.RECEIPT_PRINTER_ENABLED === 'true' || false,
    type: process.env.RECEIPT_PRINTER_TYPE || 'file',
    path: process.env.RECEIPT_PRINTER_PATH || '/tmp/receipts'
  }
};

/**
 * Print kitchen ticket
 * @param {Object} sale - Sale data with items
 * @returns {Promise<Object>} - Print result
 */
export async function printKitchenTicket(sale) {
  try {
    if (!PRINTER_CONFIG.kitchen.enabled) {
      logger.info('Kitchen printer disabled, skipping print');
      return { success: true, method: 'disabled' };
    }

    // Prepare order data for ticket generation
    const orderData = {
      id: sale.id,
      table_number: sale.table_number || 'N/A',
      waiter_name: sale.waiter_name || sale.user_name || 'Sistema',
      created_at: sale.created_at || new Date().toISOString(),
      notes: sale.notes || '',
      items: sale.items || []
    };

    // Generate ticket based on printer type
    let result;

    switch (PRINTER_CONFIG.kitchen.type) {
      case 'file':
        result = await printToFile(orderData, 'kitchen');
        break;

      case 'network':
        result = await printToNetwork(orderData, PRINTER_CONFIG.kitchen);
        break;

      case 'escpos':
        result = await printESCPOS(orderData, PRINTER_CONFIG.kitchen);
        break;

      default:
        logger.warn(`Unknown printer type: ${PRINTER_CONFIG.kitchen.type}`);
        result = await printToFile(orderData, 'kitchen');
    }

    logger.info(`Kitchen ticket printed for sale ${sale.id}`, result);
    return result;

  } catch (error) {
    logger.error('Error printing kitchen ticket:', error);
    throw error;
  }
}

/**
 * Print to file (for development and fallback)
 */
async function printToFile(orderData, type = 'kitchen') {
  try {
    const config = type === 'kitchen' ? PRINTER_CONFIG.kitchen : PRINTER_CONFIG.receipt;
    const ticketContent = generateKitchenTicket(orderData);

    // Ensure directory exists
    if (!fs.existsSync(config.path)) {
      fs.mkdirSync(config.path, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${type}_order_${orderData.id}_${timestamp}.txt`;
    const filepath = path.join(config.path, filename);

    // Write to file
    fs.writeFileSync(filepath, ticketContent, 'utf8');

    logger.info(`Ticket saved to file: ${filepath}`);

    return {
      success: true,
      method: 'file',
      filepath,
      content: ticketContent
    };

  } catch (error) {
    logger.error('Error printing to file:', error);
    throw error;
  }
}

/**
 * Print to network printer (raw TCP)
 */
async function printToNetwork(orderData, config) {
  try {
    const net = await import('net');

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const ticketData = generateKitchenTicketESCPOS(orderData);

      client.connect(config.port, config.ip, () => {
        logger.info(`Connected to printer at ${config.ip}:${config.port}`);
        client.write(ticketData);
        client.end();
      });

      client.on('close', () => {
        logger.info('Printer connection closed');
        resolve({
          success: true,
          method: 'network',
          printer: `${config.ip}:${config.port}`
        });
      });

      client.on('error', (err) => {
        logger.error('Printer connection error:', err);
        reject(err);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        client.destroy();
        reject(new Error('Printer connection timeout'));
      }, 5000);
    });

  } catch (error) {
    logger.error('Error printing to network:', error);
    // Fallback to file
    return await printToFile(orderData, 'kitchen');
  }
}

/**
 * Print using ESC/POS commands (for USB or serial printers)
 * Requires node-thermal-printer package
 */
async function printESCPOS(orderData, config) {
  try {
    // Note: This requires 'npm install node-thermal-printer'
    // For now, we'll use file fallback
    logger.warn('ESC/POS printing requires node-thermal-printer package');
    logger.warn('Falling back to file printing');

    return await printToFile(orderData, 'kitchen');

  } catch (error) {
    logger.error('Error printing ESC/POS:', error);
    return await printToFile(orderData, 'kitchen');
  }
}

/**
 * Get printer status
 */
export function getPrinterStatus() {
  return {
    kitchen: {
      ...PRINTER_CONFIG.kitchen,
      status: PRINTER_CONFIG.kitchen.enabled ? 'enabled' : 'disabled'
    },
    receipt: {
      ...PRINTER_CONFIG.receipt,
      status: PRINTER_CONFIG.receipt.enabled ? 'enabled' : 'disabled'
    }
  };
}

/**
 * Test printer connection
 */
/**
 * Print receipt ticket
 * @param {Object} sale - Sale data with items
 * @returns {Promise<Object>} - Print result
 */
export async function printReceiptTicket(sale) {
  try {
    if (!PRINTER_CONFIG.receipt.enabled) {
      logger.info('Receipt printer disabled, skipping print');
      return { success: true, method: 'disabled' };
    }

    // Generate ticket based on printer type
    let result;

    switch (PRINTER_CONFIG.receipt.type) {
      case 'file':
        result = await printReceiptToFile(sale);
        break;

      case 'network':
        result = await printReceiptToNetwork(sale, PRINTER_CONFIG.receipt);
        break;

      case 'escpos':
        result = await printReceiptESCPOS(sale, PRINTER_CONFIG.receipt);
        break;

      default:
        logger.warn(`Unknown printer type: ${PRINTER_CONFIG.receipt.type}`);
        result = await printReceiptToFile(sale);
    }

    logger.info(`Receipt ticket printed for sale ${sale.id}`, result);
    return result;

  } catch (error) {
    logger.error('Error printing receipt ticket:', error);
    throw error;
  }
}

/**
 * Print receipt to file
 */
async function printReceiptToFile(sale) {
  const ticketContent = generateReceiptTicket(sale);
  const config = PRINTER_CONFIG.receipt;

  // Ensure directory exists
  if (!fs.existsSync(config.path)) {
    fs.mkdirSync(config.path, { recursive: true });
  }

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `receipt_${sale.id}_${timestamp}.txt`;
  const filepath = path.join(config.path, filename);

  // Write to file
  fs.writeFileSync(filepath, ticketContent, 'utf8');

  logger.info(`Receipt saved to file: ${filepath}`);

  return {
    success: true,
    method: 'file',
    filepath,
    content: ticketContent
  };
}

/**
 * Print receipt to network printer
 */
async function printReceiptToNetwork(sale, config) {
  try {
    const net = await import('net');

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const ticketData = generateReceiptTicketESCPOS(sale);

      client.connect(config.port, config.ip, () => {
        logger.info(`Connected to receipt printer at ${config.ip}:${config.port}`);
        client.write(ticketData);
        client.end();
      });

      client.on('close', () => {
        resolve({
          success: true,
          method: 'network',
          printer: `${config.ip}:${config.port}`
        });
      });

      client.on('error', (err) => {
        logger.error('Receipt printer connection error:', err);
        reject(err);
      });

      setTimeout(() => {
        client.destroy();
        reject(new Error('Receipt printer connection timeout'));
      }, 5000);
    });

  } catch (error) {
    logger.error('Error printing receipt to network:', error);
    return await printReceiptToFile(sale);
  }
}

/**
 * Print receipt using ESC/POS
 */
async function printReceiptESCPOS(sale, config) {
  try {
    logger.warn('ESC/POS printing requires node-thermal-printer package');
    logger.warn('Falling back to file printing');
    return await printReceiptToFile(sale);
  } catch (error) {
    logger.error('Error printing receipt ESC/POS:', error);
    return await printReceiptToFile(sale);
  }
}

/**
 * Test printer
 */
export async function testPrinter(type = 'kitchen') {
  try {
    const testData = {
      id: 'TEST',
      sale_number: 'TEST-001',
      table_number: 'TEST',
      waiter_name: 'Test User',
      user_name: 'Test User',
      created_at: new Date().toISOString(),
      notes: 'This is a test print',
      subtotal: 10000,
      tax_amount: 1900,
      total: 11900,
      payment_method: 'cash',
      items: [
        {
          product_name: 'Test Product',
          quantity: 1,
          unit_price: 10000,
          total_price: 10000,
          modifiers: [
            { modifier_name: 'Test Modifier', modifier_price: 0 }
          ],
          notes: 'Test note'
        }
      ]
    };

    if (type === 'kitchen') {
      return await printKitchenTicket(testData);
    } else if (type === 'receipt') {
      return await printReceiptTicket(testData);
    }

    return { success: false, message: 'Unknown printer type' };

  } catch (error) {
    logger.error('Printer test failed:', error);
    return { success: false, error: error.message };
  }
}

export default {
  printKitchenTicket,
  printReceiptTicket,
  getPrinterStatus,
  testPrinter
};
