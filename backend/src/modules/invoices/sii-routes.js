/**
 * Rutas de Facturación Electrónica SII Chile
 */

import express from 'express';
import { siiService, DTE_TYPES } from '../../services/sii-chile.js';
import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

const router = express.Router();

/**
 * GET /api/v1/invoices/sii/status
 * Verificar estado de configuración SII
 */
router.get('/status', (req, res) => {
  try {
    const status = siiService.getConfigStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting SII status:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado del SII'
    });
  }
});

/**
 * GET /api/v1/invoices/sii/info
 * Obtener información del ambiente SII
 */
router.get('/info', (req, res) => {
  try {
    const info = siiService.getEnvironmentInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    logger.error('Error getting SII info:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información del SII'
    });
  }
});

/**
 * POST /api/v1/invoices/sii/validate-rut
 * Validar RUT chileno
 */
router.post('/validate-rut', (req, res) => {
  try {
    const { rut } = req.body;

    if (!rut) {
      return res.status(400).json({
        success: false,
        message: 'RUT es requerido'
      });
    }

    const isValid = siiService.validateRUT(rut);
    const formatted = isValid ? siiService.formatRUT(rut) : null;

    res.json({
      success: true,
      data: {
        rut_original: rut,
        rut_formatted: formatted,
        is_valid: isValid
      }
    });
  } catch (error) {
    logger.error('Error validating RUT:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando RUT'
    });
  }
});

/**
 * POST /api/v1/invoices/sii/boleta
 * Generar Boleta Electrónica
 */
router.post('/boleta', async (req, res) => {
  try {
    const { sale_id, customer } = req.body;

    // Obtener venta
    const sale = await dbService.findById('sales', sale_id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Obtener items de la venta
    const items = await dbService.findMany('sale_items', { sale_id });

    // Generar boleta
    const result = await siiService.generateBoleta({
      sale,
      items,
      customer: customer || {}
    });

    // Guardar en base de datos
    const dteRecord = {
      sale_id,
      tipo_dte: result.tipo_dte,
      folio: result.folio,
      fecha_emision: result.fecha_emision,
      monto_neto: result.totales.neto,
      monto_iva: result.totales.iva,
      monto_total: result.totales.total,
      estado: result.estado,
      xml_content: result.xml,
      created_by: req.user?.id || 1,
      created_at: new Date().toISOString()
    };

    const dteId = await dbService.create('documentos_tributarios', dteRecord);

    // Actualizar venta con referencia al DTE
    await dbService.update('sales', sale_id, {
      dte_id: dteId,
      dte_tipo: result.tipo_dte,
      dte_folio: result.folio
    });

    res.json({
      success: true,
      data: {
        dte_id: dteId,
        tipo: 'BOLETA_ELECTRONICA',
        folio: result.folio,
        fecha: result.fecha_emision,
        totales: result.totales,
        estado: result.estado
      },
      message: 'Boleta electrónica generada exitosamente'
    });

  } catch (error) {
    logger.error('Error generating boleta:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generando boleta electrónica'
    });
  }
});

/**
 * POST /api/v1/invoices/sii/factura
 * Generar Factura Electrónica
 */
router.post('/factura', async (req, res) => {
  try {
    const { sale_id, customer } = req.body;

    // Validar datos del cliente
    if (!customer?.rut) {
      return res.status(400).json({
        success: false,
        message: 'RUT del cliente es requerido para factura'
      });
    }

    if (!customer?.name && !customer?.razon_social) {
      return res.status(400).json({
        success: false,
        message: 'Razón social del cliente es requerida'
      });
    }

    // Obtener venta
    const sale = await dbService.findById('sales', sale_id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Obtener items de la venta
    const items = await dbService.findMany('sale_items', { sale_id });

    // Generar factura
    const result = await siiService.generateFactura({
      sale,
      items,
      customer
    });

    // Guardar en base de datos
    const dteRecord = {
      sale_id,
      tipo_dte: result.tipo_dte,
      folio: result.folio,
      fecha_emision: result.fecha_emision,
      receptor_rut: customer.rut,
      receptor_razon_social: customer.name || customer.razon_social,
      receptor_giro: customer.giro,
      receptor_direccion: customer.address || customer.direccion,
      monto_neto: result.totales.neto,
      monto_iva: result.totales.iva,
      monto_total: result.totales.total,
      estado: result.estado,
      xml_content: result.xml,
      created_by: req.user?.id || 1,
      created_at: new Date().toISOString()
    };

    const dteId = await dbService.create('documentos_tributarios', dteRecord);

    // Actualizar venta
    await dbService.update('sales', sale_id, {
      dte_id: dteId,
      dte_tipo: result.tipo_dte,
      dte_folio: result.folio
    });

    res.json({
      success: true,
      data: {
        dte_id: dteId,
        tipo: 'FACTURA_ELECTRONICA',
        folio: result.folio,
        fecha: result.fecha_emision,
        receptor: {
          rut: customer.rut,
          razon_social: customer.name || customer.razon_social
        },
        totales: result.totales,
        estado: result.estado
      },
      message: 'Factura electrónica generada exitosamente'
    });

  } catch (error) {
    logger.error('Error generating factura:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generando factura electrónica'
    });
  }
});

/**
 * POST /api/v1/invoices/sii/nota-credito
 * Generar Nota de Crédito Electrónica
 */
router.post('/nota-credito', async (req, res) => {
  try {
    const { dte_referencia_id, items, motivo } = req.body;

    // Obtener DTE de referencia
    const dteRef = await dbService.findById('documentos_tributarios', dte_referencia_id);
    if (!dteRef) {
      return res.status(404).json({
        success: false,
        message: 'Documento de referencia no encontrado'
      });
    }

    // Generar nota de crédito
    const result = await siiService.generateNotaCredito({
      folio: Date.now(), // En producción, obtener del CAF
      documento_referencia: {
        tipo_dte: dteRef.tipo_dte,
        folio: dteRef.folio,
        fecha: dteRef.fecha_emision,
        receptor: {
          rut: dteRef.receptor_rut,
          razon_social: dteRef.receptor_razon_social,
          giro: dteRef.receptor_giro,
          direccion: dteRef.receptor_direccion
        }
      },
      items,
      motivo
    });

    // Guardar nota de crédito
    const ncRecord = {
      sale_id: dteRef.sale_id,
      tipo_dte: result.tipo_dte,
      folio: result.folio,
      fecha_emision: new Date().toISOString().split('T')[0],
      receptor_rut: dteRef.receptor_rut,
      receptor_razon_social: dteRef.receptor_razon_social,
      monto_neto: result.totales.neto,
      monto_iva: result.totales.iva,
      monto_total: result.totales.total,
      estado: result.estado,
      xml_content: result.xml,
      referencia_dte_id: dte_referencia_id,
      motivo_anulacion: motivo,
      created_by: req.user?.id || 1,
      created_at: new Date().toISOString()
    };

    const ncId = await dbService.create('documentos_tributarios', ncRecord);

    res.json({
      success: true,
      data: {
        dte_id: ncId,
        tipo: 'NOTA_CREDITO',
        folio: result.folio,
        totales: result.totales,
        documento_referencia: {
          tipo: dteRef.tipo_dte,
          folio: dteRef.folio
        },
        estado: result.estado
      },
      message: 'Nota de crédito generada exitosamente'
    });

  } catch (error) {
    logger.error('Error generating nota credito:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generando nota de crédito'
    });
  }
});

/**
 * GET /api/v1/invoices/sii/documentos
 * Listar documentos tributarios
 */
router.get('/documentos', async (req, res) => {
  try {
    const { tipo, estado, desde, hasta, page = 1, limit = 20 } = req.query;

    let query = {};

    if (tipo) query.tipo_dte = tipo;
    if (estado) query.estado = estado;

    const documentos = await dbService.findMany('documentos_tributarios', query, {
      orderBy: 'created_at',
      orderDir: 'DESC',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await dbService.count('documentos_tributarios', query);

    res.json({
      success: true,
      data: {
        documentos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Error listing documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando documentos tributarios'
    });
  }
});

/**
 * GET /api/v1/invoices/sii/documentos/:id
 * Obtener detalle de documento tributario
 */
router.get('/documentos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const documento = await dbService.findById('documentos_tributarios', id);
    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    res.json({
      success: true,
      data: documento
    });

  } catch (error) {
    logger.error('Error getting documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo documento'
    });
  }
});

/**
 * GET /api/v1/invoices/sii/documentos/:id/pdf
 * Descargar PDF del documento (representación impresa)
 */
router.get('/documentos/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const documento = await dbService.findById('documentos_tributarios', id);
    if (!documento) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // TODO: Implementar generación de PDF
    // Por ahora, retornamos el XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="DTE_${documento.tipo_dte}_${documento.folio}.xml"`);
    res.send(documento.xml_content);

  } catch (error) {
    logger.error('Error downloading documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error descargando documento'
    });
  }
});

export default router;
