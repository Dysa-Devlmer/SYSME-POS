/**
 * PDF Export Service
 * Servicio para exportar documentos como PDF
 * Usa la API del backend para generar PDFs
 */

import apiClient from './client';

export interface ExportPDFOptions {
  paperSize?: 'A4' | 'letter' | 'ticket';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeFooter?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface SaleExportData {
  sale_id: number;
  include_logo?: boolean;
  include_signature?: boolean;
  document_type: 'receipt' | 'invoice' | 'quote' | 'delivery_note';
}

export interface ReportExportData {
  report_type: 'sales' | 'inventory' | 'customers' | 'employees' | 'expenses';
  start_date: string;
  end_date: string;
  filters?: Record<string, any>;
}

/**
 * Exportar venta como PDF
 */
export const exportSalePDF = async (
  data: SaleExportData,
  options?: ExportPDFOptions
): Promise<Blob> => {
  const response = await apiClient.post('/exports/sale/pdf', {
    ...data,
    options
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Exportar reporte como PDF
 */
export const exportReportPDF = async (
  data: ReportExportData,
  options?: ExportPDFOptions
): Promise<Blob> => {
  const response = await apiClient.post('/exports/report/pdf', {
    ...data,
    options
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Exportar lista de productos como PDF
 */
export const exportProductsPDF = async (
  filters?: {
    category_id?: number;
    active_only?: boolean;
    low_stock?: boolean;
  },
  options?: ExportPDFOptions
): Promise<Blob> => {
  const response = await apiClient.post('/exports/products/pdf', {
    filters,
    options
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Exportar inventario como PDF
 */
export const exportInventoryPDF = async (
  warehouse_id?: number,
  options?: ExportPDFOptions
): Promise<Blob> => {
  const response = await apiClient.post('/exports/inventory/pdf', {
    warehouse_id,
    options
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Exportar cierre de caja como PDF
 */
export const exportCashClosePDF = async (
  cash_session_id: number,
  options?: ExportPDFOptions
): Promise<Blob> => {
  const response = await apiClient.post('/exports/cash-close/pdf', {
    cash_session_id,
    options
  }, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Descargar PDF generado
 */
export const downloadPDF = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Abrir PDF en nueva ventana para imprimir
 */
export const printPDF = (blob: Blob): void => {
  const url = window.URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

/**
 * Generar PDF del lado del cliente (sin backend)
 * Usa html2canvas + jspdf para generar PDF de elementos HTML
 */
export const generateClientPDF = async (
  element: HTMLElement,
  filename: string,
  options?: {
    scale?: number;
    useCORS?: boolean;
  }
): Promise<void> => {
  try {
    // Dynamic imports para reducir bundle size
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(element, {
      scale: options?.scale || 2,
      useCORS: options?.useCORS ?? true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Error generating client-side PDF:', error);
    throw new Error('Error al generar PDF. Asegúrese de tener las dependencias instaladas.');
  }
};

/**
 * Exportar tabla HTML como PDF
 */
export const exportTablePDF = async (
  tableElement: HTMLTableElement,
  title: string,
  filename: string
): Promise<void> => {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const pdf = new jsPDF();

    // Título
    pdf.setFontSize(18);
    pdf.text(title, 14, 22);

    // Fecha
    pdf.setFontSize(10);
    pdf.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 14, 30);

    // Tabla
    autoTable(pdf, {
      html: tableElement,
      startY: 35,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting table to PDF:', error);
    throw new Error('Error al exportar tabla a PDF');
  }
};

export default {
  exportSalePDF,
  exportReportPDF,
  exportProductsPDF,
  exportInventoryPDF,
  exportCashClosePDF,
  downloadPDF,
  printPDF,
  generateClientPDF,
  exportTablePDF
};
