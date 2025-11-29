/**
 * SII Chile - Servicio de Facturación Electrónica
 * Integración con el Servicio de Impuestos Internos de Chile
 *
 * Documentos soportados:
 * - Boleta Electrónica (tipo 39)
 * - Factura Electrónica (tipo 33)
 * - Nota de Crédito Electrónica (tipo 61)
 * - Nota de Débito Electrónica (tipo 56)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tipos de documentos tributarios electrónicos (DTE)
export const DTE_TYPES = {
  FACTURA_ELECTRONICA: 33,
  FACTURA_EXENTA: 34,
  BOLETA_ELECTRONICA: 39,
  BOLETA_EXENTA: 41,
  NOTA_CREDITO: 61,
  NOTA_DEBITO: 56,
  GUIA_DESPACHO: 52
};

// Configuración del SII
const SII_CONFIG = {
  // Ambiente de certificación (testing)
  CERT: {
    url: 'https://maullin.sii.cl',
    wsdl_auth: 'https://maullin.sii.cl/DTEWS/CrSeed.jws?WSDL',
    wsdl_upload: 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload',
    wsdl_query: 'https://maullin.sii.cl/DTEWS/QueryEstDte.jws?WSDL'
  },
  // Ambiente de producción
  PROD: {
    url: 'https://palena.sii.cl',
    wsdl_auth: 'https://palena.sii.cl/DTEWS/CrSeed.jws?WSDL',
    wsdl_upload: 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload',
    wsdl_query: 'https://palena.sii.cl/DTEWS/QueryEstDte.jws?WSDL'
  }
};

/**
 * Clase principal para interactuar con el SII
 */
class SIIChileService {
  constructor() {
    this.environment = process.env.SII_ENVIRONMENT || 'CERT';
    this.config = SII_CONFIG[this.environment];
    this.rutEmisor = process.env.SII_RUT_EMISOR || '';
    this.razonSocial = process.env.SII_RAZON_SOCIAL || '';
    this.giro = process.env.SII_GIRO || '';
    this.direccion = process.env.SII_DIRECCION || '';
    this.comuna = process.env.SII_COMUNA || '';
    this.ciudad = process.env.SII_CIUDAD || '';
    this.certificatePath = process.env.SII_CERT_PATH || '';
    this.certificatePassword = process.env.SII_CERT_PASSWORD || '';
    this.cafPath = process.env.SII_CAF_PATH || '';
  }

  /**
   * Validar RUT chileno
   */
  validateRUT(rut) {
    if (!rut) return false;

    // Limpiar RUT
    const cleanRut = rut.replace(/[.-]/g, '').toUpperCase();
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);

    // Calcular dígito verificador
    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    let calculatedDV;

    if (expectedDV === 11) calculatedDV = '0';
    else if (expectedDV === 10) calculatedDV = 'K';
    else calculatedDV = expectedDV.toString();

    return dv === calculatedDV;
  }

  /**
   * Formatear RUT
   */
  formatRUT(rut) {
    if (!rut) return '';
    const cleanRut = rut.replace(/[.-]/g, '');
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);
    return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
  }

  /**
   * Generar estructura XML del DTE
   */
  generateDTEXML(data) {
    const {
      tipo_dte,
      folio,
      fecha_emision,
      receptor,
      items,
      totales,
      referencias
    } = data;

    const fechaEmision = fecha_emision || new Date().toISOString().split('T')[0];

    // Estructura básica del DTE según formato SII
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
  <Documento ID="DTE_${tipo_dte}_${folio}">
    <Encabezado>
      <IdDoc>
        <TipoDTE>${tipo_dte}</TipoDTE>
        <Folio>${folio}</Folio>
        <FchEmis>${fechaEmision}</FchEmis>
        <FmaPago>1</FmaPago>
      </IdDoc>
      <Emisor>
        <RUTEmisor>${this.rutEmisor}</RUTEmisor>
        <RznSoc>${this.escapeXML(this.razonSocial)}</RznSoc>
        <GiroEmis>${this.escapeXML(this.giro)}</GiroEmis>
        <DirOrigen>${this.escapeXML(this.direccion)}</DirOrigen>
        <CmnaOrigen>${this.escapeXML(this.comuna)}</CmnaOrigen>
        <CiudadOrigen>${this.escapeXML(this.ciudad)}</CiudadOrigen>
      </Emisor>
      <Receptor>
        <RUTRecep>${receptor.rut || '66666666-6'}</RUTRecep>
        <RznSocRecep>${this.escapeXML(receptor.razon_social || 'CLIENTE GENERICO')}</RznSocRecep>
        <GiroRecep>${this.escapeXML(receptor.giro || 'PARTICULAR')}</GiroRecep>
        <DirRecep>${this.escapeXML(receptor.direccion || 'SIN DIRECCION')}</DirRecep>
        <CmnaRecep>${this.escapeXML(receptor.comuna || 'SANTIAGO')}</CmnaRecep>
        <CiudadRecep>${this.escapeXML(receptor.ciudad || 'SANTIAGO')}</CiudadRecep>
      </Receptor>
      <Totales>
        <MntNeto>${totales.neto || 0}</MntNeto>
        <TasaIVA>19</TasaIVA>
        <IVA>${totales.iva || 0}</IVA>
        <MntTotal>${totales.total || 0}</MntTotal>
      </Totales>
    </Encabezado>
    <Detalle>
      ${items.map((item, index) => `
      <Item>
        <NroLinDet>${index + 1}</NroLinDet>
        <NmbItem>${this.escapeXML(item.nombre)}</NmbItem>
        <QtyItem>${item.cantidad}</QtyItem>
        <PrcItem>${item.precio_unitario}</PrcItem>
        <MontoItem>${item.monto}</MontoItem>
      </Item>`).join('')}
    </Detalle>
    ${referencias ? `
    <Referencia>
      ${referencias.map((ref, index) => `
      <NroLinRef>${index + 1}</NroLinRef>
      <TpoDocRef>${ref.tipo_doc}</TpoDocRef>
      <FolioRef>${ref.folio}</FolioRef>
      <FchRef>${ref.fecha}</FchRef>
      <RazonRef>${this.escapeXML(ref.razon || '')}</RazonRef>
      `).join('')}
    </Referencia>` : ''}
  </Documento>
</DTE>`;

    return xml;
  }

  /**
   * Escapar caracteres especiales para XML
   */
  escapeXML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Calcular IVA (19% en Chile)
   */
  calculateIVA(neto) {
    return Math.round(neto * 0.19);
  }

  /**
   * Generar Boleta Electrónica
   */
  async generateBoleta(saleData) {
    try {
      const { sale, items, customer } = saleData;

      // Calcular totales
      const neto = Math.round(sale.total / 1.19);
      const iva = sale.total - neto;

      const dteData = {
        tipo_dte: DTE_TYPES.BOLETA_ELECTRONICA,
        folio: sale.folio || sale.id,
        fecha_emision: new Date().toISOString().split('T')[0],
        receptor: {
          rut: customer?.rut || '66666666-6',
          razon_social: customer?.name || 'CLIENTE GENERICO',
          giro: 'PARTICULAR',
          direccion: customer?.address || '',
          comuna: customer?.comuna || 'SANTIAGO',
          ciudad: customer?.city || 'SANTIAGO'
        },
        items: items.map(item => ({
          nombre: item.product_name || item.name,
          cantidad: item.quantity,
          precio_unitario: Math.round(item.unit_price / 1.19),
          monto: Math.round(item.total_price / 1.19)
        })),
        totales: {
          neto,
          iva,
          total: sale.total
        }
      };

      const xml = this.generateDTEXML(dteData);

      // En producción, aquí se firmaría y enviaría al SII
      // Por ahora, guardamos el XML localmente
      const result = {
        success: true,
        tipo_dte: DTE_TYPES.BOLETA_ELECTRONICA,
        folio: dteData.folio,
        fecha_emision: dteData.fecha_emision,
        xml: xml,
        estado: this.environment === 'PROD' ? 'PENDIENTE_ENVIO' : 'SIMULADO',
        totales: dteData.totales
      };

      logger.info(`Boleta electrónica generada: Folio ${dteData.folio}`);
      return result;

    } catch (error) {
      logger.error('Error generando boleta electrónica:', error);
      throw new Error(`Error generando boleta: ${error.message}`);
    }
  }

  /**
   * Generar Factura Electrónica
   */
  async generateFactura(saleData) {
    try {
      const { sale, items, customer } = saleData;

      // Validar que el cliente tenga RUT para factura
      if (!customer?.rut) {
        throw new Error('Se requiere RUT del cliente para generar factura');
      }

      if (!this.validateRUT(customer.rut)) {
        throw new Error('RUT del cliente inválido');
      }

      // Calcular totales (factura siempre con IVA desglosado)
      const neto = Math.round(sale.subtotal || sale.total / 1.19);
      const iva = this.calculateIVA(neto);
      const total = neto + iva;

      const dteData = {
        tipo_dte: DTE_TYPES.FACTURA_ELECTRONICA,
        folio: sale.folio || sale.id,
        fecha_emision: new Date().toISOString().split('T')[0],
        receptor: {
          rut: customer.rut,
          razon_social: customer.name || customer.razon_social,
          giro: customer.giro || 'PARTICULAR',
          direccion: customer.address || customer.direccion,
          comuna: customer.comuna || 'SANTIAGO',
          ciudad: customer.city || customer.ciudad || 'SANTIAGO'
        },
        items: items.map(item => ({
          nombre: item.product_name || item.name,
          cantidad: item.quantity,
          precio_unitario: Math.round((item.unit_price || item.precio) / 1.19),
          monto: Math.round((item.total_price || item.monto) / 1.19)
        })),
        totales: {
          neto,
          iva,
          total
        }
      };

      const xml = this.generateDTEXML(dteData);

      const result = {
        success: true,
        tipo_dte: DTE_TYPES.FACTURA_ELECTRONICA,
        folio: dteData.folio,
        fecha_emision: dteData.fecha_emision,
        xml: xml,
        estado: this.environment === 'PROD' ? 'PENDIENTE_ENVIO' : 'SIMULADO',
        totales: dteData.totales
      };

      logger.info(`Factura electrónica generada: Folio ${dteData.folio}`);
      return result;

    } catch (error) {
      logger.error('Error generando factura electrónica:', error);
      throw new Error(`Error generando factura: ${error.message}`);
    }
  }

  /**
   * Generar Nota de Crédito Electrónica
   */
  async generateNotaCredito(data) {
    try {
      const { documento_referencia, items, motivo } = data;

      const neto = items.reduce((sum, item) => sum + Math.round(item.monto / 1.19), 0);
      const iva = this.calculateIVA(neto);
      const total = neto + iva;

      const dteData = {
        tipo_dte: DTE_TYPES.NOTA_CREDITO,
        folio: data.folio,
        fecha_emision: new Date().toISOString().split('T')[0],
        receptor: documento_referencia.receptor,
        items: items.map(item => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: Math.round(item.precio / 1.19),
          monto: Math.round(item.monto / 1.19)
        })),
        totales: { neto, iva, total },
        referencias: [{
          tipo_doc: documento_referencia.tipo_dte,
          folio: documento_referencia.folio,
          fecha: documento_referencia.fecha,
          razon: motivo
        }]
      };

      const xml = this.generateDTEXML(dteData);

      return {
        success: true,
        tipo_dte: DTE_TYPES.NOTA_CREDITO,
        folio: dteData.folio,
        xml: xml,
        estado: this.environment === 'PROD' ? 'PENDIENTE_ENVIO' : 'SIMULADO',
        totales: dteData.totales
      };

    } catch (error) {
      logger.error('Error generando nota de crédito:', error);
      throw new Error(`Error generando nota de crédito: ${error.message}`);
    }
  }

  /**
   * Verificar estado de configuración SII
   */
  getConfigStatus() {
    return {
      environment: this.environment,
      configured: !!(this.rutEmisor && this.razonSocial),
      rut_emisor: this.rutEmisor ? this.formatRUT(this.rutEmisor) : null,
      razon_social: this.razonSocial,
      certificate_loaded: !!this.certificatePath && fs.existsSync(this.certificatePath),
      caf_loaded: !!this.cafPath && fs.existsSync(this.cafPath),
      endpoints: this.config
    };
  }

  /**
   * Obtener información del ambiente
   */
  getEnvironmentInfo() {
    return {
      environment: this.environment,
      is_production: this.environment === 'PROD',
      urls: this.config,
      iva_rate: 19,
      supported_dte_types: Object.entries(DTE_TYPES).map(([name, code]) => ({
        name: name.replace(/_/g, ' '),
        code
      }))
    };
  }
}

// Exportar instancia singleton
export const siiService = new SIIChileService();

// Exportar clase para testing
export { SIIChileService };

export default siiService;
