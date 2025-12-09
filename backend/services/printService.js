/**
 * Print Service
 * Handles ticket printing and reprinting
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class PrintService {
    /**
     * Get last sale for user
     */
    async getLastSale(userId) {
        try {
            const sale = await db('sales')
                .where({ user_id: userId })
                .orderBy('created_at', 'desc')
                .first();

            if (!sale) {
                throw new Error('No se encontró ninguna venta');
            }

            // Get sale items
            const items = await db('sale_items')
                .where({ sale_id: sale.id })
                .join('products', 'sale_items.product_id', 'products.id')
                .select(
                    'sale_items.*',
                    'products.name as product_name',
                    'products.sku'
                );

            return {
                ...sale,
                items
            };

        } catch (error) {
            logger.error('Error getting last sale:', error);
            throw error;
        }
    }

    /**
     * Print ticket
     */
    async printTicket(saleId, options = {}) {
        try {
            const { reprint = false, printer = 'default' } = options;

            // Get sale data
            const sale = await db('sales')
                .where({ id: saleId })
                .first();

            if (!sale) {
                throw new Error('Venta no encontrada');
            }

            // Get items
            const items = await db('sale_items')
                .where({ sale_id: saleId })
                .join('products', 'sale_items.product_id', 'products.id')
                .select(
                    'sale_items.*',
                    'products.name as product_name',
                    'products.sku'
                );

            // Get company info
            const company = await db('company_settings').first();

            // Generate ticket data
            const ticketData = this.generateTicketData(sale, items, company, reprint);

            // Send to printer
            await this.sendToPrinter(ticketData, printer);

            // Log print action
            await db('print_log').insert({
                sale_id: saleId,
                print_type: reprint ? 'reprint' : 'original',
                printer,
                printed_at: new Date(),
                printed_by: sale.user_id
            });

            logger.info(`Ticket ${reprint ? 'reimpreso' : 'impreso'} para venta ${saleId}`);

            return {
                success: true,
                message: 'Ticket enviado a imprimir'
            };

        } catch (error) {
            logger.error('Error printing ticket:', error);
            throw error;
        }
    }

    /**
     * Generate ticket data
     */
    generateTicketData(sale, items, company, reprint = false) {
        const ticket = {
            // Header
            company: {
                name: company?.name || 'RESTAURANTE',
                address: company?.address || '',
                phone: company?.phone || '',
                rut: company?.tax_id || ''
            },

            // Sale info
            sale: {
                number: sale.sale_number || sale.id,
                date: sale.created_at,
                table: sale.table_number,
                waiter: sale.user_name,
                type: reprint ? 'REIMPRESIÓN' : 'ORIGINAL'
            },

            // Items
            items: items.map(item => ({
                quantity: item.quantity,
                name: item.product_name,
                price: item.unit_price,
                subtotal: item.subtotal,
                notes: item.notes
            })),

            // Totals
            totals: {
                subtotal: sale.subtotal,
                tax: sale.tax,
                discount: sale.discount || 0,
                tip: sale.tip || 0,
                total: sale.total
            },

            // Payment
            payment: {
                method: sale.payment_method,
                paid: sale.amount_paid,
                change: sale.change_amount || 0
            },

            // Footer
            footer: {
                message: company?.ticket_footer || '¡Gracias por su preferencia!',
                timestamp: new Date()
            }
        };

        return ticket;
    }

    /**
     * Send to printer
     */
    async sendToPrinter(ticketData, printer = 'default') {
        // TODO: Implement actual printer integration
        // This is a placeholder that would connect to:
        // - Thermal printer via USB
        // - Network printer
        // - ESC/POS commands
        // - Star Micronics printer
        // etc.

        logger.info('Sending to printer:', printer);
        logger.debug('Ticket data:', ticketData);

        // For now, we'll just format and log the ticket
        const formattedTicket = this.formatTicket(ticketData);
        console.log('\n' + '='.repeat(40));
        console.log(formattedTicket);
        console.log('='.repeat(40) + '\n');

        return true;
    }

    /**
     * Format ticket for printing
     */
    formatTicket(data) {
        const width = 40;
        const center = (text) => {
            const padding = Math.max(0, Math.floor((width - text.length) / 2));
            return ' '.repeat(padding) + text;
        };

        const line = '-'.repeat(width);
        const doubleLine = '='.repeat(width);

        let ticket = '';

        // Header
        ticket += doubleLine + '\n';
        ticket += center(data.company.name) + '\n';
        ticket += center(data.company.address) + '\n';
        ticket += center(`Tel: ${data.company.phone}`) + '\n';
        ticket += center(`RUT: ${data.company.rut}`) + '\n';
        ticket += doubleLine + '\n';

        // Sale info
        if (data.sale.type === 'REIMPRESIÓN') {
            ticket += center('*** REIMPRESIÓN ***') + '\n';
        }
        ticket += `Ticket #: ${data.sale.number}\n`;
        ticket += `Fecha: ${new Date(data.sale.date).toLocaleString('es-CL')}\n`;
        if (data.sale.table) {
            ticket += `Mesa: ${data.sale.table}\n`;
        }
        ticket += `Mesero: ${data.sale.waiter}\n`;
        ticket += line + '\n';

        // Items
        ticket += 'CANT  PRODUCTO                    TOTAL\n';
        ticket += line + '\n';

        data.items.forEach(item => {
            const qty = String(item.quantity).padStart(4, ' ');
            const name = item.name.substring(0, 24).padEnd(24, ' ');
            const total = `$${item.subtotal.toLocaleString('es-CL')}`.padStart(8, ' ');
            ticket += `${qty}  ${name} ${total}\n`;

            if (item.notes) {
                ticket += `      Nota: ${item.notes}\n`;
            }
        });

        ticket += line + '\n';

        // Totals
        const formatTotal = (label, value) => {
            return label.padEnd(28, ' ') + `$${value.toLocaleString('es-CL')}`.padStart(12, ' ') + '\n';
        };

        ticket += formatTotal('Subtotal:', data.totals.subtotal);
        if (data.totals.discount > 0) {
            ticket += formatTotal('Descuento:', -data.totals.discount);
        }
        ticket += formatTotal('IVA:', data.totals.tax);
        if (data.totals.tip > 0) {
            ticket += formatTotal('Propina:', data.totals.tip);
        }
        ticket += line + '\n';
        ticket += formatTotal('TOTAL:', data.totals.total);
        ticket += doubleLine + '\n';

        // Payment
        ticket += `Pago: ${data.payment.method}\n`;
        ticket += formatTotal('Recibido:', data.payment.paid);
        if (data.payment.change > 0) {
            ticket += formatTotal('Cambio:', data.payment.change);
        }
        ticket += line + '\n';

        // Footer
        ticket += '\n';
        ticket += center(data.footer.message) + '\n';
        ticket += center(new Date(data.footer.timestamp).toLocaleString('es-CL')) + '\n';
        ticket += '\n';

        return ticket;
    }

    /**
     * Print kitchen order
     */
    async printKitchenOrder(orderId) {
        try {
            const order = await db('kitchen_orders')
                .where({ id: orderId })
                .first();

            if (!order) {
                throw new Error('Orden no encontrada');
            }

            const items = await db('kitchen_order_items')
                .where({ order_id: orderId })
                .join('products', 'kitchen_order_items.product_id', 'products.id')
                .select(
                    'kitchen_order_items.*',
                    'products.name as product_name'
                );

            const kitchenTicket = this.formatKitchenOrder(order, items);

            // Send to kitchen printer
            await this.sendToPrinter(kitchenTicket, 'kitchen');

            return { success: true };

        } catch (error) {
            logger.error('Error printing kitchen order:', error);
            throw error;
        }
    }

    /**
     * Format kitchen order
     */
    formatKitchenOrder(order, items) {
        const width = 40;
        const center = (text) => {
            const padding = Math.max(0, Math.floor((width - text.length) / 2));
            return ' '.repeat(padding) + text;
        };

        let ticket = '';

        ticket += '='.repeat(width) + '\n';
        ticket += center('*** ORDEN DE COCINA ***') + '\n';
        ticket += '='.repeat(width) + '\n';
        ticket += `Mesa: ${order.table_number || 'N/A'}\n`;
        ticket += `Hora: ${new Date(order.created_at).toLocaleTimeString('es-CL')}\n`;
        ticket += `Mesero: ${order.waiter_name}\n`;
        ticket += '-'.repeat(width) + '\n';

        items.forEach(item => {
            ticket += `\n${item.quantity}x ${item.product_name}\n`;
            if (item.notes) {
                ticket += `   >>> ${item.notes}\n`;
            }
        });

        ticket += '\n' + '='.repeat(width) + '\n';

        return {
            type: 'kitchen',
            content: ticket,
            timestamp: new Date()
        };
    }
}

module.exports = new PrintService();