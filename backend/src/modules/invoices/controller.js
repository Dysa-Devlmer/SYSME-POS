/**
 * Invoices Controller - Sistema de Facturación con Series
 * Handles invoice generation, series management, and legal compliance
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

/**
 * Get all invoice series
 */
export const getInvoiceSeries = async (req, res) => {
  try {
    const series = await dbService.findMany('invoice_series', { is_active: 1 });

    res.json({
      success: true,
      data: series,
      message: 'Series obtenidas exitosamente'
    });
  } catch (error) {
    logger.error('Error fetching invoice series:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener series de facturación'
    });
  }
};

/**
 * Get next invoice number for a series
 */
export const getNextInvoiceNumber = async (req, res) => {
  try {
    const { series_id } = req.params;

    const series = await dbService.findById('invoice_series', series_id);
    if (!series) {
      return res.status(404).json({
        success: false,
        message: 'Serie no encontrada'
      });
    }

    const nextNumber = (series.current_number || 0) + 1;
    const prefix = series.prefix || '';
    const paddedNumber = String(nextNumber).padStart(6, '0');
    const fullNumber = `${prefix}${series.series_code}-${paddedNumber}`;

    res.json({
      success: true,
      data: {
        next_number: nextNumber,
        full_invoice_number: fullNumber,
        series_code: series.series_code,
        prefix: series.prefix
      }
    });
  } catch (error) {
    logger.error('Error getting next invoice number:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener siguiente número'
    });
  }
};

/**
 * Generate invoice from sale
 */
export const generateInvoiceFromSale = async (req, res) => {
  try {
    const {
      sale_id,
      series_id,
      customer_name,
      customer_tax_id,
      customer_address,
      customer_email,
      customer_phone,
      notes
    } = req.body;

    const userId = req.user.id;

    // Validate sale exists and hasn't been invoiced
    const sale = await dbService.findById('sales', sale_id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    if (sale.invoice_id) {
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya tiene una factura generada'
      });
    }

    if (sale.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden facturar ventas completadas'
      });
    }

    // Get series
    const series = await dbService.findById('invoice_series', series_id);
    if (!series || !series.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Serie de facturación no válida'
      });
    }

    // Validate tax ID requirement
    if (series.requires_tax_id && !customer_tax_id) {
      return res.status(400).json({
        success: false,
        message: `La serie ${series.series_name} requiere RUT/NIT del cliente`
      });
    }

    // Get sale items
    const saleItems = await dbService.findMany('sale_items', { sale_id });
    if (!saleItems || saleItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La venta no tiene items'
      });
    }

    // Start transaction
    const result = await dbService.transaction(async () => {
      // Increment series number
      const nextNumber = (series.current_number || 0) + 1;

      // Check if we've reached the end number
      if (series.end_number && nextNumber > series.end_number) {
        throw new Error(`Serie ${series.series_code} ha alcanzado su límite de numeración`);
      }

      await dbService.update('invoice_series', series_id, {
        current_number: nextNumber,
        updated_at: new Date()
      });

      // Generate invoice number
      const prefix = series.prefix || '';
      const paddedNumber = String(nextNumber).padStart(6, '0');
      const invoiceNumber = `${prefix}${series.series_code}-${paddedNumber}`;

      // Create invoice
      const invoice = await dbService.create('invoices', {
        invoice_number: invoiceNumber,
        series_id,
        sale_id,
        cash_session_id: sale.cash_session_id,
        document_type: series.document_type,
        invoice_date: new Date().toISOString().split('T')[0],
        customer_name,
        customer_tax_id: customer_tax_id || null,
        customer_address: customer_address || null,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        subtotal: sale.subtotal || 0,
        tax_amount: sale.tax || 0,
        discount_amount: sale.discount || 0,
        total_amount: sale.total,
        payment_method: sale.payment_method,
        payment_status: 'paid',
        status: 'active',
        folio_number: nextNumber,
        issued_by: userId,
        notes: notes || null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Copy sale items to invoice items
      for (const item of saleItems) {
        await dbService.create('invoice_items', {
          invoice_id: invoice.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount || 0,
          tax_percent: item.tax_percent || 0,
          tax_amount: item.tax_amount || 0,
          subtotal: item.subtotal,
          total: item.total,
          notes: item.notes || null,
          created_at: new Date()
        });
      }

      // Update sale with invoice reference
      await dbService.update('sales', sale_id, {
        invoice_id: invoice.id,
        updated_at: new Date()
      });

      logger.info(`Invoice ${invoiceNumber} generated for sale ${sale_id} by user ${userId}`);

      return invoice;
    });

    res.json({
      success: true,
      data: result,
      message: `Factura ${result.invoice_number} generada exitosamente`
    });

  } catch (error) {
    logger.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al generar factura'
    });
  }
};

/**
 * Get all invoices with filters
 */
export const getInvoices = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      series_id,
      customer_tax_id,
      status,
      document_type,
      page = 1,
      limit = 50
    } = req.query;

    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (start_date) {
      query += ' AND invoice_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND invoice_date <= ?';
      params.push(end_date);
    }

    if (series_id) {
      query += ' AND series_id = ?';
      params.push(series_id);
    }

    if (customer_tax_id) {
      query += ' AND customer_tax_id = ?';
      params.push(customer_tax_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (document_type) {
      query += ' AND document_type = ?';
      params.push(document_type);
    }

    query += ' ORDER BY created_at DESC';

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const invoices = await dbService.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM invoices WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset

    if (start_date) countQuery += ' AND invoice_date >= ?';
    if (end_date) countQuery += ' AND invoice_date <= ?';
    if (series_id) countQuery += ' AND series_id = ?';
    if (customer_tax_id) countQuery += ' AND customer_tax_id = ?';
    if (status) countQuery += ' AND status = ?';
    if (document_type) countQuery += ' AND document_type = ?';

    const countResult = await dbService.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener facturas'
    });
  }
};

/**
 * Get invoice by ID with items
 */
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await dbService.findById('invoices', id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Get items
    const items = await dbService.findMany('invoice_items', { invoice_id: id });

    // Get series info
    const series = await dbService.findById('invoice_series', invoice.series_id);

    res.json({
      success: true,
      data: {
        ...invoice,
        items,
        series
      }
    });
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener factura'
    });
  }
};

/**
 * Cancel invoice (requires credit note)
 */
export const cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    const userId = req.user.id;

    const invoice = await dbService.findById('invoices', id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está anulada'
      });
    }

    // In a real system, this would generate a credit note
    // For now, we just mark as cancelled
    await dbService.update('invoices', id, {
      status: 'cancelled',
      cancelled_at: new Date(),
      cancelled_by: userId,
      cancellation_reason: cancellation_reason || 'Sin motivo especificado',
      updated_at: new Date()
    });

    logger.info(`Invoice ${invoice.invoice_number} cancelled by user ${userId}`);

    res.json({
      success: true,
      message: 'Factura anulada exitosamente'
    });
  } catch (error) {
    logger.error('Error cancelling invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error al anular factura'
    });
  }
};

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE invoice_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    const stats = await dbService.query(`
      SELECT
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_invoices,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_invoices,
        SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END) as total_amount,
        document_type,
        COUNT(*) as count_by_type
      FROM invoices
      ${dateFilter}
      GROUP BY document_type
    `, params);

    const totalStats = await dbService.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END) as total_amount
      FROM invoices
      ${dateFilter}
    `, params);

    res.json({
      success: true,
      data: {
        summary: totalStats[0] || {},
        by_document_type: stats || []
      }
    });
  } catch (error) {
    logger.error('Error fetching invoice stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};
