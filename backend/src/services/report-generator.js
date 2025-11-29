/**
 * Servicio de Generación de Reportes
 * Genera reportes PDF, Excel y otros formatos
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const db = require('../config/database');
const cacheManager = require('./cache-manager');
const auditService = require('./audit-service');
const notificationService = require('./notification-service');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const schedule = require('node-schedule');

class ReportGeneratorService {
  constructor() {
    this.reportsPath = path.join(__dirname, '../../reports');
    this.templatesPath = path.join(__dirname, '../../templates/reports');
    this.scheduledJobs = new Map();
    this.generationQueue = [];
    this.isProcessing = false;

    // Configuración de tipos de reporte
    this.REPORT_TYPES = {
      DAILY_SALES: 'daily_sales',
      INVENTORY: 'inventory',
      FINANCIAL: 'financial',
      CUSTOMERS: 'customers',
      PERFORMANCE: 'performance',
      CUSTOM: 'custom'
    };

    // Formatos soportados
    this.FORMATS = {
      PDF: 'pdf',
      EXCEL: 'excel',
      CSV: 'csv',
      HTML: 'html'
    };

    // Configuración de programación
    this.SCHEDULE_CONFIGS = {
      daily: '0 0 1 * * *',     // 1:00 AM todos los días
      weekly: '0 0 2 * * 1',    // 2:00 AM los lunes
      monthly: '0 0 3 1 * *',   // 3:00 AM el primer día del mes
      quarterly: '0 0 4 1 */3 *' // 4:00 AM cada 3 meses
    };

    this.initialize();
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    try {
      // Crear directorios si no existen
      await this.ensureDirectories();

      // Cargar plantillas
      await this.loadTemplates();

      // Registrar helpers de Handlebars
      this.registerHandlebarsHelpers();

      // Cargar reportes programados
      await this.loadScheduledReports();

      // Iniciar procesamiento de cola
      this.startQueueProcessor();

      console.log('✅ Servicio de generación de reportes inicializado');
    } catch (error) {
      console.error('Error inicializando servicio de reportes:', error);
    }
  }

  /**
   * Genera un reporte
   */
  async generateReport(options) {
    try {
      const {
        type = this.REPORT_TYPES.DAILY_SALES,
        format = this.FORMATS.PDF,
        dateRange = this.getDefaultDateRange(),
        filters = {},
        template = null,
        userId = null,
        email = null
      } = options;

      // Validar formato
      if (!Object.values(this.FORMATS).includes(format)) {
        throw new Error(`Formato no soportado: ${format}`);
      }

      // Agregar a la cola
      const reportId = this.generateReportId();
      const reportJob = {
        id: reportId,
        type,
        format,
        dateRange,
        filters,
        template,
        userId,
        email,
        status: 'pending',
        createdAt: new Date(),
        progress: 0
      };

      this.generationQueue.push(reportJob);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId,
        action: 'REPORT_REQUESTED',
        resource: 'reports',
        details: { reportId, type, format }
      });

      // Procesar cola si no está procesando
      if (!this.isProcessing) {
        this.processQueue();
      }

      return {
        reportId,
        message: 'Reporte agregado a la cola de generación',
        estimatedTime: this.estimateGenerationTime(type)
      };
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  }

  /**
   * Procesa la cola de generación
   */
  async processQueue() {
    if (this.generationQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.generationQueue.length > 0) {
      const job = this.generationQueue.shift();

      try {
        await this.processReportJob(job);
      } catch (error) {
        console.error(`Error procesando reporte ${job.id}:`, error);
        job.status = 'failed';
        job.error = error.message;

        // Notificar error si hay email
        if (job.email) {
          await this.notifyReportError(job);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Procesa un trabajo de reporte
   */
  async processReportJob(job) {
    try {
      job.status = 'processing';
      job.startedAt = new Date();

      console.log(`📊 Generando reporte ${job.id} (${job.type}/${job.format})`);

      // Obtener datos del reporte
      job.progress = 20;
      const data = await this.fetchReportData(job.type, job.dateRange, job.filters);

      // Generar reporte según formato
      job.progress = 50;
      let reportPath;

      switch (job.format) {
        case this.FORMATS.PDF:
          reportPath = await this.generatePDF(job, data);
          break;

        case this.FORMATS.EXCEL:
          reportPath = await this.generateExcel(job, data);
          break;

        case this.FORMATS.CSV:
          reportPath = await this.generateCSV(job, data);
          break;

        case this.FORMATS.HTML:
          reportPath = await this.generateHTML(job, data);
          break;

        default:
          throw new Error(`Formato no implementado: ${job.format}`);
      }

      job.progress = 90;

      // Guardar metadatos
      await this.saveReportMetadata(job, reportPath);

      // Enviar por email si se solicitó
      if (job.email) {
        await this.sendReportByEmail(job, reportPath);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.filePath = reportPath;
      job.progress = 100;

      console.log(`✅ Reporte ${job.id} generado exitosamente`);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: job.userId,
        action: 'REPORT_GENERATED',
        resource: 'reports',
        details: {
          reportId: job.id,
          type: job.type,
          format: job.format,
          duration: Date.now() - job.startedAt.getTime()
        }
      });

      return reportPath;
    } catch (error) {
      console.error(`Error procesando reporte ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Genera reporte PDF
   */
  async generatePDF(job, data) {
    try {
      const fileName = `${job.type}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
      const filePath = path.join(this.reportsPath, fileName);

      // Si hay template HTML, usar Puppeteer
      if (job.template || this.hasHTMLTemplate(job.type)) {
        return await this.generatePDFFromHTML(job, data, filePath);
      }

      // Generar PDF con PDFKit
      return await this.generatePDFWithKit(job, data, filePath);
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    }
  }

  /**
   * Genera PDF usando PDFKit
   */
  async generatePDFWithKit(job, data, filePath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: this.getReportTitle(job.type),
            Author: 'SYSME POS',
            Subject: `Reporte ${job.type}`,
            CreationDate: new Date()
          }
        });

        const stream = require('fs').createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        this.addPDFHeader(doc, job);

        // Título
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(this.getReportTitle(job.type), { align: 'center' });

        doc.moveDown();

        // Período
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Período: ${moment(job.dateRange.start).format('DD/MM/YYYY')} - ${moment(job.dateRange.end).format('DD/MM/YYYY')}`, {
             align: 'center'
           });

        doc.moveDown(2);

        // Contenido según tipo de reporte
        switch (job.type) {
          case this.REPORT_TYPES.DAILY_SALES:
            this.addSalesContent(doc, data);
            break;

          case this.REPORT_TYPES.INVENTORY:
            this.addInventoryContent(doc, data);
            break;

          case this.REPORT_TYPES.FINANCIAL:
            this.addFinancialContent(doc, data);
            break;

          case this.REPORT_TYPES.CUSTOMERS:
            this.addCustomersContent(doc, data);
            break;

          case this.REPORT_TYPES.PERFORMANCE:
            this.addPerformanceContent(doc, data);
            break;

          default:
            this.addGenericContent(doc, data);
        }

        // Footer
        this.addPDFFooter(doc, job);

        // Finalizar
        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Genera PDF desde HTML usando Puppeteer
   */
  async generatePDFFromHTML(job, data, filePath) {
    try {
      // Generar HTML
      const html = await this.generateHTMLContent(job, data);

      // Lanzar navegador
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Establecer contenido HTML
      await page.setContent(html, { waitUntil: 'networkidle2' });

      // Generar PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: this.getPDFHeaderTemplate(),
        footerTemplate: this.getPDFFooterTemplate()
      });

      await browser.close();

      return filePath;
    } catch (error) {
      console.error('Error generando PDF desde HTML:', error);
      throw error;
    }
  }

  /**
   * Genera contenido HTML
   */
  async generateHTMLContent(job, data) {
    try {
      // Cargar template
      const templateName = job.template || `${job.type}.hbs`;
      const templatePath = path.join(this.templatesPath, templateName);

      let template;
      try {
        template = await fs.readFile(templatePath, 'utf8');
      } catch {
        // Si no existe template específico, usar genérico
        template = await this.getGenericTemplate();
      }

      // Compilar con Handlebars
      const compiledTemplate = Handlebars.compile(template);

      // Preparar contexto
      const context = {
        title: this.getReportTitle(job.type),
        type: job.type,
        generatedAt: moment().format('DD/MM/YYYY HH:mm'),
        period: {
          start: moment(job.dateRange.start).format('DD/MM/YYYY'),
          end: moment(job.dateRange.end).format('DD/MM/YYYY')
        },
        data,
        company: {
          name: 'SYSME POS',
          address: 'Dirección de la empresa',
          phone: 'Teléfono',
          email: 'email@empresa.com'
        },
        ...this.getAdditionalContext(job.type, data)
      };

      return compiledTemplate(context);
    } catch (error) {
      console.error('Error generando contenido HTML:', error);
      throw error;
    }
  }

  /**
   * Genera reporte Excel
   */
  async generateExcel(job, data) {
    try {
      const fileName = `${job.type}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
      const filePath = path.join(this.reportsPath, fileName);

      const workbook = new ExcelJS.Workbook();

      // Metadata
      workbook.creator = 'SYSME POS';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Agregar hojas según tipo de reporte
      switch (job.type) {
        case this.REPORT_TYPES.DAILY_SALES:
          await this.addSalesSheets(workbook, data);
          break;

        case this.REPORT_TYPES.INVENTORY:
          await this.addInventorySheets(workbook, data);
          break;

        case this.REPORT_TYPES.FINANCIAL:
          await this.addFinancialSheets(workbook, data);
          break;

        case this.REPORT_TYPES.CUSTOMERS:
          await this.addCustomersSheets(workbook, data);
          break;

        default:
          await this.addGenericSheet(workbook, data);
      }

      // Guardar archivo
      await workbook.xlsx.writeFile(filePath);

      return filePath;
    } catch (error) {
      console.error('Error generando Excel:', error);
      throw error;
    }
  }

  /**
   * Agrega hojas de ventas a Excel
   */
  async addSalesSheets(workbook, data) {
    // Hoja de resumen
    const summarySheet = workbook.addWorksheet('Resumen');

    // Estilos
    const headerStyle = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A90E2' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Encabezados
    summarySheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
      { header: 'Variación', key: 'change', width: 15 },
      { header: 'Objetivo', key: 'target', width: 15 }
    ];

    // Aplicar estilos a encabezados
    summarySheet.getRow(1).font = headerStyle.font;
    summarySheet.getRow(1).fill = headerStyle.fill;
    summarySheet.getRow(1).alignment = headerStyle.alignment;

    // Agregar datos
    summarySheet.addRows([
      { metric: 'Ventas Totales', value: data.totalSales, change: data.salesGrowth, target: data.salesTarget },
      { metric: 'Transacciones', value: data.totalTransactions, change: data.transactionGrowth },
      { metric: 'Ticket Promedio', value: data.averageTicket, change: data.ticketGrowth },
      { metric: 'Clientes Únicos', value: data.uniqueCustomers },
      { metric: 'Productos Vendidos', value: data.totalProducts }
    ]);

    // Hoja de detalle
    const detailSheet = workbook.addWorksheet('Detalle de Ventas');

    detailSheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Hora', key: 'time', width: 10 },
      { header: 'ID Venta', key: 'saleId', width: 15 },
      { header: 'Cliente', key: 'customer', width: 25 },
      { header: 'Productos', key: 'products', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Impuesto', key: 'tax', width: 12 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Método Pago', key: 'paymentMethod', width: 15 }
    ];

    // Agregar ventas detalladas
    if (data.sales && Array.isArray(data.sales)) {
      detailSheet.addRows(data.sales);
    }

    // Hoja de productos más vendidos
    const productsSheet = workbook.addWorksheet('Productos Top');

    productsSheet.columns = [
      { header: 'Ranking', key: 'rank', width: 10 },
      { header: 'Producto', key: 'name', width: 30 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Cantidad', key: 'quantity', width: 12 },
      { header: 'Ventas', key: 'sales', width: 15 },
      { header: '% del Total', key: 'percentage', width: 12 }
    ];

    if (data.topProducts && Array.isArray(data.topProducts)) {
      data.topProducts.forEach((product, index) => {
        productsSheet.addRow({
          rank: index + 1,
          ...product
        });
      });
    }

    // Aplicar formato condicional
    this.applyConditionalFormatting(summarySheet);
    this.applyConditionalFormatting(productsSheet);
  }

  /**
   * Genera reporte CSV
   */
  async generateCSV(job, data) {
    try {
      const fileName = `${job.type}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
      const filePath = path.join(this.reportsPath, fileName);

      // Convertir datos a CSV
      const csvContent = this.convertToCSV(data);

      // Guardar archivo
      await fs.writeFile(filePath, csvContent, 'utf8');

      return filePath;
    } catch (error) {
      console.error('Error generando CSV:', error);
      throw error;
    }
  }

  /**
   * Convierte datos a formato CSV
   */
  convertToCSV(data) {
    const lines = [];

    // Si es un array de objetos
    if (Array.isArray(data) && data.length > 0) {
      // Headers
      const headers = Object.keys(data[0]);
      lines.push(headers.join(','));

      // Rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene comas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        lines.push(values.join(','));
      });
    } else if (typeof data === 'object') {
      // Si es un objeto, convertir a pares clave-valor
      lines.push('Clave,Valor');
      for (const [key, value] of Object.entries(data)) {
        lines.push(`"${key}","${value}"`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Obtiene datos para el reporte
   */
  async fetchReportData(type, dateRange, filters) {
    try {
      // Intentar obtener de caché
      const cacheKey = `report_data:${type}:${JSON.stringify(dateRange)}:${JSON.stringify(filters)}`;
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      let data;

      switch (type) {
        case this.REPORT_TYPES.DAILY_SALES:
          data = await this.fetchSalesData(dateRange, filters);
          break;

        case this.REPORT_TYPES.INVENTORY:
          data = await this.fetchInventoryData(dateRange, filters);
          break;

        case this.REPORT_TYPES.FINANCIAL:
          data = await this.fetchFinancialData(dateRange, filters);
          break;

        case this.REPORT_TYPES.CUSTOMERS:
          data = await this.fetchCustomersData(dateRange, filters);
          break;

        case this.REPORT_TYPES.PERFORMANCE:
          data = await this.fetchPerformanceData(dateRange, filters);
          break;

        default:
          data = await this.fetchGenericData(dateRange, filters);
      }

      // Guardar en caché por 5 minutos
      await cacheManager.set(cacheKey, data, 300);

      return data;
    } catch (error) {
      console.error('Error obteniendo datos del reporte:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos de ventas
   */
  async fetchSalesData(dateRange, filters) {
    const { start, end } = dateRange;

    // Métricas principales
    const metrics = await db('sales')
      .sum('total as totalSales')
      .count('id as totalTransactions')
      .avg('total as averageTicket')
      .countDistinct('customer_id as uniqueCustomers')
      .whereBetween('created_at', [start, end])
      .first();

    // Ventas por día
    const dailySales = await db('sales')
      .select(db.raw('DATE(created_at) as date'))
      .sum('total as total')
      .count('id as transactions')
      .whereBetween('created_at', [start, end])
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    // Productos más vendidos
    const topProducts = await db('sales_items')
      .select('products.name', 'categories.name as category')
      .sum('sales_items.quantity as quantity')
      .sum('sales_items.total as sales')
      .join('products', 'sales_items.product_id', 'products.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .join('sales', 'sales_items.sale_id', 'sales.id')
      .whereBetween('sales.created_at', [start, end])
      .groupBy('products.id', 'products.name', 'categories.name')
      .orderBy('sales', 'desc')
      .limit(20);

    // Ventas por categoría
    const salesByCategory = await db('sales_items')
      .select('categories.name as category')
      .sum('sales_items.total as total')
      .join('products', 'sales_items.product_id', 'products.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .join('sales', 'sales_items.sale_id', 'sales.id')
      .whereBetween('sales.created_at', [start, end])
      .groupBy('categories.id', 'categories.name');

    // Ventas por hora
    const salesByHour = await db('sales')
      .select(db.raw('HOUR(created_at) as hour'))
      .sum('total as total')
      .count('id as transactions')
      .whereBetween('created_at', [start, end])
      .groupBy(db.raw('HOUR(created_at)'))
      .orderBy('hour');

    // Métodos de pago
    const paymentMethods = await db('sales')
      .select('payment_method')
      .count('id as count')
      .sum('total as total')
      .whereBetween('created_at', [start, end])
      .groupBy('payment_method');

    return {
      ...metrics,
      dailySales,
      topProducts,
      salesByCategory,
      salesByHour,
      paymentMethods,
      period: { start, end }
    };
  }

  /**
   * Programa un reporte
   */
  async scheduleReport(config) {
    try {
      const {
        name,
        type,
        format,
        schedule,
        filters = {},
        recipients = [],
        enabled = true
      } = config;

      const scheduleId = this.generateScheduleId();

      // Crear job con node-schedule
      const job = schedule.scheduleJob(
        this.SCHEDULE_CONFIGS[schedule] || schedule,
        async () => {
          if (!enabled) return;

          console.log(`⏰ Ejecutando reporte programado: ${name}`);

          try {
            // Generar reporte
            const reportId = await this.generateReport({
              type,
              format,
              filters,
              dateRange: this.getScheduleDateRange(schedule)
            });

            // Enviar a destinatarios
            for (const recipient of recipients) {
              await this.sendScheduledReport(reportId, recipient);
            }

            // Auditar
            await auditService.log({
              level: 'INFO',
              action: 'SCHEDULED_REPORT_EXECUTED',
              resource: 'reports',
              details: { scheduleId, name, type, recipients: recipients.length }
            });
          } catch (error) {
            console.error(`Error ejecutando reporte programado ${name}:`, error);

            // Notificar error
            await notificationService.notify({
              type: 'REPORT_ERROR',
              title: 'Error en Reporte Programado',
              message: `Falló la generación del reporte programado: ${name}`,
              severity: 'error',
              data: { error: error.message }
            });
          }
        }
      );

      // Guardar configuración
      this.scheduledJobs.set(scheduleId, {
        ...config,
        id: scheduleId,
        job,
        createdAt: new Date()
      });

      console.log(`📅 Reporte programado creado: ${name} (${schedule})`);

      return scheduleId;
    } catch (error) {
      console.error('Error programando reporte:', error);
      throw error;
    }
  }

  /**
   * Cancela un reporte programado
   */
  cancelScheduledReport(scheduleId) {
    const scheduled = this.scheduledJobs.get(scheduleId);

    if (!scheduled) {
      throw new Error('Reporte programado no encontrado');
    }

    // Cancelar job
    scheduled.job.cancel();

    // Eliminar de la lista
    this.scheduledJobs.delete(scheduleId);

    console.log(`🛑 Reporte programado cancelado: ${scheduled.name}`);
  }

  /**
   * Envía reporte por email
   */
  async sendReportByEmail(job, filePath) {
    try {
      const subject = `Reporte ${this.getReportTitle(job.type)} - ${moment().format('DD/MM/YYYY')}`;

      const html = `
        <h2>Reporte Generado</h2>
        <p>Se ha generado exitosamente el reporte solicitado.</p>
        <ul>
          <li><strong>Tipo:</strong> ${this.getReportTitle(job.type)}</li>
          <li><strong>Formato:</strong> ${job.format.toUpperCase()}</li>
          <li><strong>Período:</strong> ${moment(job.dateRange.start).format('DD/MM/YYYY')} - ${moment(job.dateRange.end).format('DD/MM/YYYY')}</li>
          <li><strong>Generado:</strong> ${moment().format('DD/MM/YYYY HH:mm')}</li>
        </ul>
        <p>El reporte se encuentra adjunto a este correo.</p>
      `;

      await notificationService.sendEmail({
        to: job.email,
        subject,
        html,
        attachments: [{
          filename: path.basename(filePath),
          path: filePath
        }]
      });

      console.log(`📧 Reporte enviado por email a: ${job.email}`);
    } catch (error) {
      console.error('Error enviando reporte por email:', error);
      throw error;
    }
  }

  // Métodos auxiliares

  getReportTitle(type) {
    const titles = {
      [this.REPORT_TYPES.DAILY_SALES]: 'Reporte de Ventas',
      [this.REPORT_TYPES.INVENTORY]: 'Reporte de Inventario',
      [this.REPORT_TYPES.FINANCIAL]: 'Reporte Financiero',
      [this.REPORT_TYPES.CUSTOMERS]: 'Reporte de Clientes',
      [this.REPORT_TYPES.PERFORMANCE]: 'Reporte de Rendimiento'
    };

    return titles[type] || 'Reporte';
  }

  getDefaultDateRange() {
    return {
      start: moment().startOf('month').toDate(),
      end: moment().endOf('month').toDate()
    };
  }

  getScheduleDateRange(schedule) {
    const now = moment();

    switch (schedule) {
      case 'daily':
        return {
          start: now.clone().subtract(1, 'day').startOf('day').toDate(),
          end: now.clone().subtract(1, 'day').endOf('day').toDate()
        };

      case 'weekly':
        return {
          start: now.clone().subtract(1, 'week').startOf('week').toDate(),
          end: now.clone().subtract(1, 'week').endOf('week').toDate()
        };

      case 'monthly':
        return {
          start: now.clone().subtract(1, 'month').startOf('month').toDate(),
          end: now.clone().subtract(1, 'month').endOf('month').toDate()
        };

      default:
        return this.getDefaultDateRange();
    }
  }

  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateScheduleId() {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  estimateGenerationTime(type) {
    const estimates = {
      [this.REPORT_TYPES.DAILY_SALES]: 10,
      [this.REPORT_TYPES.INVENTORY]: 15,
      [this.REPORT_TYPES.FINANCIAL]: 20,
      [this.REPORT_TYPES.CUSTOMERS]: 12,
      [this.REPORT_TYPES.PERFORMANCE]: 8
    };

    return estimates[type] || 15; // segundos
  }

  async ensureDirectories() {
    const dirs = [this.reportsPath, this.templatesPath];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  async loadTemplates() {
    // Cargar templates disponibles
    try {
      const files = await fs.readdir(this.templatesPath);
      this.availableTemplates = files.filter(f => f.endsWith('.hbs'));
      console.log(`📄 ${this.availableTemplates.length} plantillas de reporte cargadas`);
    } catch {
      this.availableTemplates = [];
    }
  }

  registerHandlebarsHelpers() {
    // Helper para formatear moneda
    Handlebars.registerHelper('currency', (value) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value || 0);
    });

    // Helper para formatear fecha
    Handlebars.registerHelper('date', (date, format) => {
      return moment(date).format(format || 'DD/MM/YYYY');
    });

    // Helper para formatear porcentaje
    Handlebars.registerHelper('percentage', (value) => {
      return `${(value || 0).toFixed(2)}%`;
    });

    // Helper para comparación
    Handlebars.registerHelper('compare', (v1, operator, v2, options) => {
      switch (operator) {
        case '==': return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===': return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=': return v1 != v2 ? options.fn(this) : options.inverse(this);
        case '<': return v1 < v2 ? options.fn(this) : options.inverse(this);
        case '<=': return v1 <= v2 ? options.fn(this) : options.inverse(this);
        case '>': return v1 > v2 ? options.fn(this) : options.inverse(this);
        case '>=': return v1 >= v2 ? options.fn(this) : options.inverse(this);
        default: return options.inverse(this);
      }
    });
  }

  async loadScheduledReports() {
    // Cargar reportes programados desde base de datos o configuración
    // Por ahora crear algunos por defecto

    const defaultSchedules = [
      {
        name: 'Reporte Diario de Ventas',
        type: this.REPORT_TYPES.DAILY_SALES,
        format: this.FORMATS.PDF,
        schedule: 'daily',
        enabled: false
      },
      {
        name: 'Reporte Semanal de Inventario',
        type: this.REPORT_TYPES.INVENTORY,
        format: this.FORMATS.EXCEL,
        schedule: 'weekly',
        enabled: false
      }
    ];

    for (const schedule of defaultSchedules) {
      if (schedule.enabled) {
        await this.scheduleReport(schedule);
      }
    }
  }

  startQueueProcessor() {
    // Procesar cola cada 5 segundos
    setInterval(() => {
      if (!this.isProcessing && this.generationQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    return {
      queueLength: this.generationQueue.length,
      isProcessing: this.isProcessing,
      scheduledReports: this.scheduledJobs.size,
      availableTemplates: this.availableTemplates.length
    };
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    // Cancelar todos los reportes programados
    this.scheduledJobs.forEach((scheduled) => {
      scheduled.job.cancel();
    });

    console.log('🛑 Servicio de generación de reportes detenido');
  }
}

// Singleton
const reportGenerator = new ReportGeneratorService();

module.exports = reportGenerator;