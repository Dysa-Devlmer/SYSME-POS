/**
 * Excel Export Service
 * Export data to Excel files using XLSX library
 */

import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
  includeFilters?: boolean;
  filters?: Record<string, any>;
}

class ExcelExportService {
  /**
   * Export data to Excel file
   */
  exportToExcel(options: ExportOptions): void {
    const {
      filename,
      sheetName = 'Datos',
      columns,
      data,
      includeFilters = false,
      filters = {}
    } = options;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare headers
    const headers = columns.map(col => col.label);

    // Prepare data rows
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key];
        return this.formatCellValue(value);
      })
    );

    // Combine headers and data
    const worksheetData = [headers, ...rows];

    // Add filters information if requested
    if (includeFilters && Object.keys(filters).length > 0) {
      const filterRows: string[][] = [];
      filterRows.push(['FILTROS APLICADOS']);
      Object.entries(filters).forEach(([key, value]) => {
        filterRows.push([key, String(value)]);
      });
      filterRows.push([]); // Empty row
      worksheetData.unshift(...filterRows);
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const colWidths = columns.map(col => ({
      wch: col.width || 15
    }));
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  /**
   * Export sales to Excel
   */
  exportSales(sales: any[], filters?: Record<string, any>): void {
    this.exportToExcel({
      filename: `ventas_${this.getTimestamp()}`,
      sheetName: 'Ventas',
      columns: [
        { key: 'sale_number', label: 'N° Venta', width: 12 },
        { key: 'date', label: 'Fecha', width: 12 },
        { key: 'table_number', label: 'Mesa', width: 10 },
        { key: 'customer_name', label: 'Cliente', width: 20 },
        { key: 'waiter_name', label: 'Mesero', width: 18 },
        { key: 'subtotal', label: 'Subtotal', width: 12 },
        { key: 'tax_amount', label: 'IVA', width: 12 },
        { key: 'total', label: 'Total', width: 12 },
        { key: 'payment_method', label: 'Método Pago', width: 15 },
        { key: 'status', label: 'Estado', width: 12 }
      ],
      data: sales,
      includeFilters: true,
      filters
    });
  }

  /**
   * Export products to Excel
   */
  exportProducts(products: any[]): void {
    this.exportToExcel({
      filename: `productos_${this.getTimestamp()}`,
      sheetName: 'Productos',
      columns: [
        { key: 'sku', label: 'SKU', width: 12 },
        { key: 'name', label: 'Nombre', width: 25 },
        { key: 'category_name', label: 'Categoría', width: 15 },
        { key: 'price', label: 'Precio', width: 12 },
        { key: 'cost', label: 'Costo', width: 12 },
        { key: 'stock_quantity', label: 'Stock', width: 10 },
        { key: 'min_stock', label: 'Stock Mín', width: 10 },
        { key: 'active', label: 'Activo', width: 8 }
      ],
      data: products
    });
  }

  /**
   * Export inventory to Excel
   */
  exportInventory(inventory: any[]): void {
    this.exportToExcel({
      filename: `inventario_${this.getTimestamp()}`,
      sheetName: 'Inventario',
      columns: [
        { key: 'product_name', label: 'Producto', width: 25 },
        { key: 'sku', label: 'SKU', width: 12 },
        { key: 'warehouse_name', label: 'Bodega', width: 18 },
        { key: 'quantity', label: 'Cantidad', width: 10 },
        { key: 'unit_cost', label: 'Costo Unit.', width: 12 },
        { key: 'total_value', label: 'Valor Total', width: 15 },
        { key: 'last_updated', label: 'Última Act.', width: 15 }
      ],
      data: inventory
    });
  }

  /**
   * Export customers to Excel
   */
  exportCustomers(customers: any[]): void {
    this.exportToExcel({
      filename: `clientes_${this.getTimestamp()}`,
      sheetName: 'Clientes',
      columns: [
        { key: 'customer_number', label: 'N° Cliente', width: 12 },
        { key: 'name', label: 'Nombre', width: 25 },
        { key: 'tax_id', label: 'RUT/DNI', width: 15 },
        { key: 'email', label: 'Email', width: 25 },
        { key: 'phone', label: 'Teléfono', width: 15 },
        { key: 'address', label: 'Dirección', width: 30 },
        { key: 'city', label: 'Ciudad', width: 15 },
        { key: 'total_purchases', label: 'Compras Tot.', width: 12 },
        { key: 'active', label: 'Activo', width: 8 }
      ],
      data: customers
    });
  }

  /**
   * Export cash sessions to Excel
   */
  exportCashSessions(sessions: any[]): void {
    this.exportToExcel({
      filename: `cierres_caja_${this.getTimestamp()}`,
      sheetName: 'Cierres de Caja',
      columns: [
        { key: 'session_number', label: 'N° Sesión', width: 12 },
        { key: 'opened_at', label: 'Apertura', width: 18 },
        { key: 'closed_at', label: 'Cierre', width: 18 },
        { key: 'user_name', label: 'Usuario', width: 18 },
        { key: 'opening_amount', label: 'Monto Inicial', width: 15 },
        { key: 'expected_amount', label: 'Esperado', width: 15 },
        { key: 'actual_amount', label: 'Real', width: 15 },
        { key: 'difference', label: 'Diferencia', width: 15 },
        { key: 'total_sales', label: 'N° Ventas', width: 10 }
      ],
      data: sessions
    });
  }

  /**
   * Export daily summary to Excel
   */
  exportDailySummary(summary: any): void {
    const summaryData = [
      { concepto: 'Ventas Totales', valor: summary.total_sales },
      { concepto: 'Ventas en Efectivo', valor: summary.cash_sales },
      { concepto: 'Ventas con Tarjeta', valor: summary.card_sales },
      { concepto: 'Cantidad de Transacciones', valor: summary.transaction_count },
      { concepto: 'Ticket Promedio', valor: summary.average_ticket },
      { concepto: 'IVA Recaudado', valor: summary.total_tax },
      { concepto: 'Descuentos Aplicados', valor: summary.total_discounts }
    ];

    this.exportToExcel({
      filename: `resumen_diario_${this.getTimestamp()}`,
      sheetName: 'Resumen Diario',
      columns: [
        { key: 'concepto', label: 'Concepto', width: 30 },
        { key: 'valor', label: 'Valor', width: 20 }
      ],
      data: summaryData
    });
  }

  /**
   * Format cell value for Excel
   */
  private formatCellValue(value: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    if (typeof value === 'number') {
      return value;
    }

    return String(value);
  }

  /**
   * Format date for Excel
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Get current timestamp for filename
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}_${hours}${minutes}`;
  }
}

export default new ExcelExportService();
