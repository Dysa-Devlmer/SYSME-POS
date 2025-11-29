/**
 * Kitchen Ticket Template Generator
 * Genera tickets de cocina con formato óptimo para impresoras térmicas
 */

/**
 * Formatea la hora en formato HH:MM
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Centra texto (40 caracteres de ancho para impresora térmica)
 */
function center(text, width = 40) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text + '\n';
}

/**
 * Línea separadora
 */
function separator(char = '=', width = 40) {
  return char.repeat(width) + '\n';
}

/**
 * Genera el ticket de cocina en formato texto
 * @param {Object} order - Datos de la orden
 * @param {number} order.id - ID de la venta
 * @param {string} order.table_number - Número de mesa
 * @param {string} order.waiter_name - Nombre del mesero
 * @param {string} order.created_at - Fecha de creación
 * @param {string} order.notes - Notas de la orden
 * @param {Array} order.items - Items de la orden
 * @returns {string} - Ticket formateado
 */
export function generateKitchenTicket(order) {
  let ticket = '\n';

  // Header
  ticket += separator('=');
  ticket += center('ORDEN DE COCINA');
  ticket += separator('=');
  ticket += '\n';

  // Info básica
  ticket += `MESA: ${order.table_number || 'N/A'}`.padEnd(20);
  ticket += `HORA: ${formatTime(order.created_at)}\n`;
  ticket += `ORDEN: #${order.id}\n`;

  if (order.waiter_name) {
    ticket += `MESERO: ${order.waiter_name}\n`;
  }

  ticket += separator('-');

  // Items
  order.items.forEach((item, index) => {
    if (index > 0) {
      ticket += '\n';
    }

    // Producto principal (en mayúsculas y negrita simulada con >>)
    ticket += `\n>> ${item.product_name.toUpperCase()} x${item.quantity}\n`;
    ticket += '\n';

    // Modificadores
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        ticket += `   🔧 ${mod.modifier_name.toUpperCase()}\n`;
      });
    } else {
      ticket += `   SIN MODIFICADORES\n`;
    }

    // Notas del item
    if (item.notes && item.notes.trim()) {
      ticket += `\n   NOTA: ${item.notes.toUpperCase()}\n`;
    }

    ticket += separator('-');
  });

  // Notas generales de la orden
  if (order.notes && order.notes.trim()) {
    ticket += `\n*** NOTAS ESPECIALES ***\n`;
    ticket += `${order.notes.toUpperCase()}\n`;
    ticket += separator('-');
  }

  // Footer
  ticket += '\n';
  ticket += center('*** PREPARAR ***');
  ticket += '\n\n\n\n'; // Espacio para cortar papel

  return ticket;
}

/**
 * Genera comando ESC/POS para impresoras térmicas
 * ESC/POS es el estándar para impresoras de tickets
 */
export function generateKitchenTicketESCPOS(order) {
  const ESC = '\x1B';
  const GS = '\x1D';

  let escpos = '';

  // Inicializar impresora
  escpos += ESC + '@'; // Reset

  // Header - Texto grande y centrado
  escpos += ESC + 'a' + '\x01'; // Centrar
  escpos += GS + '!' + '\x11'; // Doble tamaño
  escpos += 'ORDEN DE COCINA\n';
  escpos += GS + '!' + '\x00'; // Tamaño normal
  escpos += '========================================\n';

  // Alinear izquierda
  escpos += ESC + 'a' + '\x00';

  // Info básica
  escpos += `MESA: ${order.table_number || 'N/A'}`.padEnd(20);
  escpos += `HORA: ${formatTime(order.created_at)}\n`;
  escpos += `ORDEN: #${order.id}\n`;

  if (order.waiter_name) {
    escpos += `MESERO: ${order.waiter_name}\n`;
  }

  escpos += '----------------------------------------\n';

  // Items - Énfasis en productos
  order.items.forEach((item, index) => {
    if (index > 0) {
      escpos += '\n';
    }

    // Producto en negrita y grande
    escpos += ESC + 'E' + '\x01'; // Negrita ON
    escpos += GS + '!' + '\x01'; // Ancho doble
    escpos += `${item.product_name.toUpperCase()} x${item.quantity}\n`;
    escpos += GS + '!' + '\x00'; // Tamaño normal
    escpos += ESC + 'E' + '\x00'; // Negrita OFF

    escpos += '\n';

    // Modificadores
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        escpos += `   + ${mod.modifier_name.toUpperCase()}\n`;
      });
    } else {
      escpos += `   SIN MODIFICADORES\n`;
    }

    // Notas del item
    if (item.notes && item.notes.trim()) {
      escpos += '\n';
      escpos += ESC + 'E' + '\x01'; // Negrita para notas
      escpos += `   NOTA: ${item.notes.toUpperCase()}\n`;
      escpos += ESC + 'E' + '\x00';
    }

    escpos += '----------------------------------------\n';
  });

  // Notas generales
  if (order.notes && order.notes.trim()) {
    escpos += '\n';
    escpos += ESC + 'E' + '\x01'; // Negrita
    escpos += '*** NOTAS ESPECIALES ***\n';
    escpos += `${order.notes.toUpperCase()}\n`;
    escpos += ESC + 'E' + '\x00';
    escpos += '----------------------------------------\n';
  }

  // Footer
  escpos += '\n';
  escpos += ESC + 'a' + '\x01'; // Centrar
  escpos += ESC + 'E' + '\x01'; // Negrita
  escpos += GS + '!' + '\x11'; // Doble tamaño
  escpos += '*** PREPARAR ***\n';
  escpos += GS + '!' + '\x00'; // Tamaño normal
  escpos += ESC + 'E' + '\x00'; // Negrita OFF

  // Cortar papel
  escpos += '\n\n\n';
  escpos += GS + 'V' + '\x41' + '\x03'; // Corte parcial

  return Buffer.from(escpos, 'binary');
}

export default {
  generateKitchenTicket,
  generateKitchenTicketESCPOS
};
