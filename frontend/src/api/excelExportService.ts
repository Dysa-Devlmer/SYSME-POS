/**
 * Excel Export Service
 * Servicio para exportar datos a formato Excel (.xlsx)
 * Usa SheetJS (xlsx) para generar archivos Excel del lado del cliente
 */

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'currency';
  format?: string;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: any[];
  includeHeader?: boolean;
  headerStyle?: {
    bold?: boolean;
    backgroundColor?: string;
    textColor?: string;
  };
  autoFilter?: boolean;
  freezeHeader?: boolean;
}

/**
 * Exportar datos a Excel
 */
export const exportToExcel = async (options: ExcelExportOptions): Promise<void> => {
  try {
    // Dynamic import para reducir bundle size
    const XLSX = await import('xlsx');

    const {
      filename,
      sheetName = 'Datos',
      columns,
      data,
      includeHeader = true,
      autoFilter = true,
      freezeHeader = true
    } = options;

    // Preparar datos para Excel
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
      columns.map(col => {
        const value = item[col.key];

        // Formatear según tipo
        if (col.type === 'currency' && typeof value === 'number') {
          return value;
        }
        if (col.type === 'date' && value) {
          return new Date(value);
        }

        return value ?? '';
      })
    );

    // Crear worksheet
    const worksheetData = includeHeader ? [headers, ...rows] : rows;
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Configurar anchos de columna
    const colWidths = columns.map(col => ({
      wch: col.width || Math.max(col.header.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    // Aplicar auto-filtro
    if (autoFilter && includeHeader) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }

    // Congelar encabezado
    if (freezeHeader && includeHeader) {
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Descargar archivo
    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, finalFilename);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Error al exportar a Excel. Asegúrese de tener las dependencias instaladas.');
  }
};

/**
 * Exportar múltiples hojas a un solo archivo Excel
 */
export const exportMultiSheetExcel = async (
  filename: string,
  sheets: Array<{
    name: string;
    columns: ExcelColumn[];
    data: any[];
  }>
): Promise<void> => {
  try {
    const XLSX = await import('xlsx');

    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const headers = sheet.columns.map(col => col.header);
      const rows = sheet.data.map(item =>
        sheet.columns.map(col => item[col.key] ?? '')
      );

      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Configurar anchos
      worksheet['!cols'] = sheet.columns.map(col => ({
        wch: col.width || 15
      }));

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    }

    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(workbook, finalFilename);

  } catch (error) {
    console.error('Error exporting multi-sheet Excel:', error);
    throw new Error('Error al exportar a Excel');
  }
};

/**
 * Exportar ventas a Excel
 */
export const exportSalesToExcel = async (
  sales: any[],
  dateRange: { start: string; end: string }
): Promise<void> => {
  const columns: ExcelColumn[] = [
    { header: 'N° Venta', key: 'sale_number', width: 15 },
    { header: 'Fecha', key: 'created_at', width: 20, type: 'date' },
    { header: 'Mesa', key: 'table_number', width: 10 },
    { header: 'Cliente', key: 'customer_name', width: 25 },
    { header: 'Subtotal', key: 'subtotal', width: 15, type: 'currency' },
    { header: 'IVA', key: 'tax_amount', width: 12, type: 'currency' },
    { header: 'Descuento', key: 'discount_amount', width: 12, type: 'currency' },
    { header: 'Total', key: 'total', width: 15, type: 'currency' },
    { header: 'Método Pago', key: 'payment_method', width: 15 },
    { header: 'Estado', key: 'status', width: 12 },
    { header: 'Vendedor', key: 'user_name', width: 20 }
  ];

  await exportToExcel({
    filename: `ventas_${dateRange.start}_${dateRange.end}`,
    sheetName: 'Ventas',
    columns,
    data: sales
  });
};

/**
 * Exportar inventario a Excel
 */
export const exportInventoryToExcel = async (products: any[]): Promise<void> => {
  const columns: ExcelColumn[] = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Código Barras', key: 'barcode', width: 18 },
    { header: 'Producto', key: 'name', width: 35 },
    { header: 'Categoría', key: 'category_name', width: 20 },
    { header: 'Stock', key: 'stock', width: 10, type: 'number' },
    { header: 'Stock Mínimo', key: 'min_stock', width: 12, type: 'number' },
    { header: 'Costo', key: 'cost', width: 12, type: 'currency' },
    { header: 'Precio', key: 'price', width: 12, type: 'currency' },
    { header: 'Valor Stock', key: 'stock_value', width: 15, type: 'currency' },
    { header: 'Estado', key: 'is_active', width: 10 }
  ];

  // Calcular valor de stock
  const dataWithValue = products.map(p => ({
    ...p,
    stock_value: (p.stock || 0) * (p.cost || 0),
    is_active: p.is_active ? 'Activo' : 'Inactivo'
  }));

  await exportToExcel({
    filename: `inventario_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Inventario',
    columns,
    data: dataWithValue
  });
};

/**
 * Exportar clientes a Excel
 */
export const exportCustomersToExcel = async (customers: any[]): Promise<void> => {
  const columns: ExcelColumn[] = [
    { header: 'RUT', key: 'rut', width: 15 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Dirección', key: 'address', width: 40 },
    { header: 'Ciudad', key: 'city', width: 20 },
    { header: 'Total Compras', key: 'total_purchases', width: 15, type: 'currency' },
    { header: 'Puntos', key: 'loyalty_points', width: 10, type: 'number' },
    { header: 'Última Compra', key: 'last_purchase_date', width: 15, type: 'date' },
    { header: 'Estado', key: 'is_active', width: 10 }
  ];

  const dataFormatted = customers.map(c => ({
    ...c,
    is_active: c.is_active ? 'Activo' : 'Inactivo'
  }));

  await exportToExcel({
    filename: `clientes_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Clientes',
    columns,
    data: dataFormatted
  });
};

/**
 * Exportar cierre de caja a Excel
 */
export const exportCashCloseToExcel = async (
  sessionData: any,
  movements: any[],
  salesSummary: any
): Promise<void> => {
  const sheets = [
    {
      name: 'Resumen',
      columns: [
        { header: 'Concepto', key: 'concept', width: 30 },
        { header: 'Valor', key: 'value', width: 20 }
      ] as ExcelColumn[],
      data: [
        { concept: 'Cajero', value: sessionData.user_name },
        { concept: 'Fecha Apertura', value: sessionData.opened_at },
        { concept: 'Fecha Cierre', value: sessionData.closed_at },
        { concept: 'Monto Inicial', value: sessionData.opening_amount },
        { concept: 'Ventas Efectivo', value: salesSummary.cash_sales },
        { concept: 'Ventas Tarjeta', value: salesSummary.card_sales },
        { concept: 'Total Ventas', value: salesSummary.total_sales },
        { concept: 'Ingresos', value: sessionData.total_income },
        { concept: 'Egresos', value: sessionData.total_expense },
        { concept: 'Monto Esperado', value: sessionData.expected_amount },
        { concept: 'Monto Real', value: sessionData.actual_amount },
        { concept: 'Diferencia', value: sessionData.difference }
      ]
    },
    {
      name: 'Movimientos',
      columns: [
        { header: 'Hora', key: 'created_at', width: 15 },
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Concepto', key: 'description', width: 35 },
        { header: 'Monto', key: 'amount', width: 15 }
      ] as ExcelColumn[],
      data: movements
    }
  ];

  await exportMultiSheetExcel(
    `cierre_caja_${sessionData.id}_${new Date().toISOString().split('T')[0]}`,
    sheets
  );
};

export default {
  exportToExcel,
  exportMultiSheetExcel,
  exportSalesToExcel,
  exportInventoryToExcel,
  exportCustomersToExcel,
  exportCashCloseToExcel
};
