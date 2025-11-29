/**
 * Receipt Ticket Template Generator
 * Genera tickets de venta con formato legal para Chile
 */

/**
 * Formatea fecha completa
 */
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Centra texto
 */
function center(text, width = 40) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text + '\n';
}

/**
 * Alinea a la derecha
 */
function rightAlign(text, width = 40) {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text + '\n';
}

/**
 * Línea con dos columnas
 */
function twoColumn(left, right, width = 40) {
  const rightText = right.toString();
  const availableLeft = width - rightText.length - 1;
  const leftText = left.length > availableLeft
    ? left.substring(0, availableLeft)
    : left.padEnd(availableLeft);

  return leftText + ' ' + rightText + '\n';
}

/**
 * Separador
 */
function separator(char = '=', width = 40) {
  return char.repeat(width) + '\n';
}

/**
 * Configur ación de la empresa (debería venir de configuración)
 */
const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || 'RESTAURANTE SYSME',
  rut: process.env.COMPANY_RUT || '76.XXX.XXX-X',
  address: process.env.COMPANY_ADDRESS || 'Av. Principal 123',
  city: process.env.COMPANY_CITY || 'Santiago, Chile',
  phone: process.env.COMPANY_PHONE || '+56 2 2XXX XXXX',
  website: process.env.COMPANY_WEBSITE || 'www.sysme.cl',
  slogan: process.env.COMPANY_SLOGAN || '¡Gracias por su visita!'
};

/**
 * Genera ticket de venta (recibo) en formato texto
 */
export function generateReceiptTicket(sale) {
  let ticket = '\n';

  // Header - Empresa
  ticket += separator('=');
  ticket += center(COMPANY_INFO.name);
  ticket += center(`RUT: ${COMPANY_INFO.rut}`);
  ticket += center(COMPANY_INFO.address);
  ticket += center(COMPANY_INFO.city);
  ticket += center(COMPANY_INFO.phone);
  ticket += separator('=');

  // Información de la venta
  ticket += '\n';
  ticket += `Ticket Nº: ${sale.sale_number || sale.id}\n`;
  ticket += `Fecha: ${formatDateTime(sale.created_at)}\n`;

  if (sale.table_number) {
    ticket += `Mesa: ${sale.table_number}\n`;
  }

  if (sale.waiter_name || sale.user_name) {
    ticket += `Atendido por: ${sale.waiter_name || sale.user_name}\n`;
  }

  ticket += separator('-');

  // Items
  ticket += '\n';
  ticket += 'CANT  DESCRIPCION            TOTAL\n';
  ticket += separator('-');

  sale.items.forEach(item => {
    // Producto principal
    const qty = item.quantity.toString().padEnd(4);
    const name = item.product_name.length > 18
      ? item.product_name.substring(0, 18)
      : item.product_name.padEnd(18);
    const price = `$${(item.total_price || item.total).toLocaleString()}`;

    ticket += `${qty}  ${name}  ${price.padStart(9)}\n`;

    // Modificadores
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        const modName = mod.modifier_name.length > 22
          ? mod.modifier_name.substring(0, 22)
          : mod.modifier_name;

        ticket += `      + ${modName}`;

        if (mod.modifier_price && mod.modifier_price !== 0) {
          ticket += ` +$${mod.modifier_price.toLocaleString()}`;
        }

        ticket += '\n';
      });
    }

    // Notas del item
    if (item.notes && item.notes.trim()) {
      ticket += `      Nota: ${item.notes}\n`;
    }
  });

  ticket += separator('-');

  // Totales
  ticket += '\n';
  ticket += twoColumn('SUBTOTAL:', `$${sale.subtotal.toLocaleString()}`);

  if (sale.discount_amount && sale.discount_amount > 0) {
    ticket += twoColumn('DESCUENTO:', `-$${sale.discount_amount.toLocaleString()}`);
  }

  ticket += twoColumn('IVA (19%):', `$${(sale.tax_amount || 0).toLocaleString()}`);
  ticket += separator('-');
  ticket += twoColumn('TOTAL:', `$${sale.total.toLocaleString()}`, 40);
  ticket += separator('=');

  // Método de pago
  ticket += '\n';

  if (sale.payment_method === 'mixed' && sale.payment_details) {
    ticket += 'FORMA DE PAGO:\n';

    const paymentDetails = typeof sale.payment_details === 'string'
      ? JSON.parse(sale.payment_details)
      : sale.payment_details;

    paymentDetails.payments.forEach(p => {
      const methodName = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia',
        check: 'Cheque',
        other: 'Otro'
      }[p.method] || p.method;

      ticket += twoColumn(`  ${methodName}:`, `$${p.amount.toLocaleString()}`);
    });

    if (paymentDetails.change && paymentDetails.change > 0) {
      ticket += separator('-');
      ticket += twoColumn('CAMBIO:', `$${paymentDetails.change.toLocaleString()}`);
    }
  } else {
    const paymentMethodName = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      check: 'Cheque'
    }[sale.payment_method] || sale.payment_method;

    ticket += twoColumn('FORMA DE PAGO:', paymentMethodName);
  }

  // Notas de la venta
  if (sale.notes && sale.notes.trim()) {
    ticket += separator('-');
    ticket += '\nNOTAS:\n';
    ticket += `${sale.notes}\n`;
  }

  // Footer
  ticket += '\n';
  ticket += separator('=');
  ticket += center(COMPANY_INFO.slogan);
  ticket += center(COMPANY_INFO.website);
  ticket += separator('=');

  // Información legal
  ticket += '\n';
  ticket += center('DOCUMENTO NO FISCAL');
  ticket += center('Para uso interno');
  ticket += '\n\n\n\n'; // Espacio para cortar

  return ticket;
}

/**
 * Genera ticket ESC/POS (para impresoras térmicas)
 */
export function generateReceiptTicketESCPOS(sale) {
  const ESC = '\x1B';
  const GS = '\x1D';

  let escpos = '';

  // Inicializar
  escpos += ESC + '@';

  // Header - Empresa
  escpos += ESC + 'a' + '\x01'; // Centrar
  escpos += ESC + 'E' + '\x01'; // Negrita
  escpos += GS + '!' + '\x11'; // Doble tamaño
  escpos += COMPANY_INFO.name + '\n';
  escpos += GS + '!' + '\x00'; // Normal
  escpos += `RUT: ${COMPANY_INFO.rut}\n`;
  escpos += COMPANY_INFO.address + '\n';
  escpos += COMPANY_INFO.city + '\n';
  escpos += COMPANY_INFO.phone + '\n';
  escpos += ESC + 'E' + '\x00'; // Negrita OFF
  escpos += '========================================\n';

  // Info venta
  escpos += ESC + 'a' + '\x00'; // Izquierda
  escpos += '\n';
  escpos += `Ticket Nº: ${sale.sale_number || sale.id}\n`;
  escpos += `Fecha: ${formatDateTime(sale.created_at)}\n`;

  if (sale.table_number) {
    escpos += `Mesa: ${sale.table_number}\n`;
  }

  if (sale.waiter_name || sale.user_name) {
    escpos += `Atendido por: ${sale.waiter_name || sale.user_name}\n`;
  }

  escpos += '----------------------------------------\n';

  // Items
  escpos += '\n';
  escpos += 'CANT  DESCRIPCION            TOTAL\n';
  escpos += '----------------------------------------\n';

  sale.items.forEach(item => {
    const qty = item.quantity.toString().padEnd(4);
    const name = item.product_name.length > 18
      ? item.product_name.substring(0, 18)
      : item.product_name.padEnd(18);
    const price = `$${(item.total_price || item.total).toLocaleString()}`;

    escpos += ESC + 'E' + '\x01'; // Negrita
    escpos += `${qty}  ${name}  ${price.padStart(9)}\n`;
    escpos += ESC + 'E' + '\x00'; // Normal

    // Modificadores
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        escpos += `      + ${mod.modifier_name}`;
        if (mod.modifier_price && mod.modifier_price !== 0) {
          escpos += ` +$${mod.modifier_price.toLocaleString()}`;
        }
        escpos += '\n';
      });
    }
  });

  escpos += '----------------------------------------\n';

  // Totales
  escpos += '\n';
  escpos += `SUBTOTAL:`.padEnd(30) + `$${sale.subtotal.toLocaleString()}`.padStart(10) + '\n';

  if (sale.discount_amount && sale.discount_amount > 0) {
    escpos += `DESCUENTO:`.padEnd(30) + `-$${sale.discount_amount.toLocaleString()}`.padStart(10) + '\n';
  }

  escpos += `IVA (19%):`.padEnd(30) + `$${(sale.tax_amount || 0).toLocaleString()}`.padStart(10) + '\n';
  escpos += '----------------------------------------\n';

  escpos += ESC + 'E' + '\x01'; // Negrita
  escpos += GS + '!' + '\x01'; // Ancho doble
  escpos += `TOTAL:`.padEnd(15) + `$${sale.total.toLocaleString()}`.padStart(15) + '\n';
  escpos += GS + '!' + '\x00'; // Normal
  escpos += ESC + 'E' + '\x00'; // Normal
  escpos += '========================================\n';

  // Método de pago
  escpos += '\n';
  escpos += 'FORMA DE PAGO:\n';

  if (sale.payment_method === 'mixed' && sale.payment_details) {
    const paymentDetails = typeof sale.payment_details === 'string'
      ? JSON.parse(sale.payment_details)
      : sale.payment_details;

    paymentDetails.payments.forEach(p => {
      const methodName = {
        cash: 'Efectivo',
        card: 'Tarjeta',
        transfer: 'Transferencia'
      }[p.method] || p.method;

      escpos += `  ${methodName}:`.padEnd(30) + `$${p.amount.toLocaleString()}`.padStart(10) + '\n';
    });

    if (paymentDetails.change && paymentDetails.change > 0) {
      escpos += 'CAMBIO:'.padEnd(30) + `$${paymentDetails.change.toLocaleString()}`.padStart(10) + '\n';
    }
  } else {
    const methodName = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia'
    }[sale.payment_method] || sale.payment_method;

    escpos += `${methodName}\n`;
  }

  // Footer
  escpos += '\n';
  escpos += '========================================\n';
  escpos += ESC + 'a' + '\x01'; // Centrar
  escpos += COMPANY_INFO.slogan + '\n';
  escpos += COMPANY_INFO.website + '\n';
  escpos += '========================================\n';
  escpos += 'DOCUMENTO NO FISCAL\n';
  escpos += 'Para uso interno\n';

  // Cortar papel
  escpos += '\n\n\n';
  escpos += GS + 'V' + '\x41' + '\x03'; // Corte parcial

  return Buffer.from(escpos, 'binary');
}

export default {
  generateReceiptTicket,
  generateReceiptTicketESCPOS
};
