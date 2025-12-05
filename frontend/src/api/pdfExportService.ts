/**
 * PDF Export Service
 * Generate PDF documents for tickets, invoices, and reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
}

export interface TicketData {
  ticketNumber: string;
  date: string;
  table: string;
  waiter: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
}

class PDFExportService {
  private readonly companyInfo: CompanyInfo = {
    name: 'SYSME Restaurant',
    address: 'Av. Principal 123, Santiago, Chile',
    phone: '+56 2 1234 5678',
    email: 'info@sysme.cl',
    taxId: '76.123.456-7'
  };

  /**
   * Generate ticket PDF
   */
  generateTicket(data: TicketData): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Thermal printer size
    });

    let yPos = 10;

    // Company info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(this.companyInfo.name, 40, yPos, { align: 'center' });
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(this.companyInfo.address, 40, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`Tel: ${this.companyInfo.phone}`, 40, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`RUT: ${this.companyInfo.taxId}`, 40, yPos, { align: 'center' });
    yPos += 8;

    // Ticket info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TICKET N°: ${data.ticketNumber}`, 40, yPos, { align: 'center' });
    yPos += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${data.date}`, 5, yPos);
    yPos += 4;
    doc.text(`Mesa: ${data.table}`, 5, yPos);
    yPos += 4;
    doc.text(`Mesero: ${data.waiter}`, 5, yPos);
    yPos += 6;

    // Line separator
    doc.line(5, yPos, 75, yPos);
    yPos += 4;

    // Items table
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CANT', 5, yPos);
    doc.text('PRODUCTO', 15, yPos);
    doc.text('TOTAL', 65, yPos, { align: 'right' });
    yPos += 4;

    doc.line(5, yPos, 75, yPos);
    yPos += 4;

    // Items
    doc.setFont('helvetica', 'normal');
    data.items.forEach(item => {
      doc.text(String(item.quantity), 5, yPos);

      // Wrap long product names
      const productLines = doc.splitTextToSize(item.name, 40);
      productLines.forEach((line: string, index: number) => {
        doc.text(line, 15, yPos + (index * 4));
      });

      doc.text(`$${item.total.toLocaleString()}`, 75, yPos, { align: 'right' });
      yPos += Math.max(4, productLines.length * 4);
    });

    yPos += 2;
    doc.line(5, yPos, 75, yPos);
    yPos += 4;

    // Totals
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 40, yPos);
    doc.text(`$${data.subtotal.toLocaleString()}`, 75, yPos, { align: 'right' });
    yPos += 4;

    doc.text('IVA (19%):', 40, yPos);
    doc.text(`$${data.tax.toLocaleString()}`, 75, yPos, { align: 'right' });
    yPos += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', 40, yPos);
    doc.text(`$${data.total.toLocaleString()}`, 75, yPos, { align: 'right' });
    yPos += 6;

    // Payment method
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pago: ${data.paymentMethod}`, 40, yPos, { align: 'center' });
    yPos += 8;

    // Footer
    doc.text('¡Gracias por su preferencia!', 40, yPos, { align: 'center' });

    // Save PDF
    doc.save(`ticket_${data.ticketNumber}.pdf`);
  }

  /**
   * Generate invoice PDF
   */
  generateInvoice(invoiceData: any): void {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', 105, 20, { align: 'center' });

    // Company info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(this.companyInfo.name, 20, 35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.companyInfo.address, 20, 40);
    doc.text(`Tel: ${this.companyInfo.phone}`, 20, 45);
    doc.text(`Email: ${this.companyInfo.email}`, 20, 50);
    doc.text(`RUT: ${this.companyInfo.taxId}`, 20, 55);

    // Invoice info
    doc.setFont('helvetica', 'bold');
    doc.text(`N° Factura: ${invoiceData.invoiceNumber}`, 140, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${invoiceData.date}`, 140, 40);
    doc.text(`Vencimiento: ${invoiceData.dueDate}`, 140, 45);

    // Customer info
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.customer.name, 20, 75);
    doc.text(invoiceData.customer.taxId, 20, 80);
    doc.text(invoiceData.customer.address, 20, 85);

    // Items table
    autoTable(doc, {
      startY: 95,
      head: [['Cant.', 'Producto', 'Precio Unit.', 'Descuento', 'Total']],
      body: invoiceData.items.map((item: any) => [
        item.quantity,
        item.name,
        `$${item.unitPrice.toLocaleString()}`,
        `${item.discount}%`,
        `$${item.total.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || 95;

    // Totals
    const totalsX = 140;
    let totalsY = finalY + 10;

    doc.text('Subtotal:', totalsX, totalsY);
    doc.text(`$${invoiceData.subtotal.toLocaleString()}`, 190, totalsY, { align: 'right' });

    totalsY += 6;
    doc.text('Descuento:', totalsX, totalsY);
    doc.text(`$${invoiceData.discount.toLocaleString()}`, 190, totalsY, { align: 'right' });

    totalsY += 6;
    doc.text('IVA (19%):', totalsX, totalsY);
    doc.text(`$${invoiceData.tax.toLocaleString()}`, 190, totalsY, { align: 'right' });

    totalsY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, totalsY);
    doc.text(`$${invoiceData.total.toLocaleString()}`, 190, totalsY, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Documento generado electrónicamente', 105, 280, { align: 'center' });

    // Save
    doc.save(`factura_${invoiceData.invoiceNumber}.pdf`);
  }

  /**
   * Generate sales report PDF
   */
  generateSalesReport(reportData: any): void {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE VENTAS', 105, 20, { align: 'center' });

    // Period
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${reportData.startDate} - ${reportData.endDate}`, 105, 30, { align: 'center' });

    // Summary boxes
    const boxY = 40;
    const boxHeight = 20;
    const boxWidth = 45;

    // Total Sales
    doc.setFillColor(66, 139, 202);
    doc.rect(20, boxY, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Ventas Totales', 42.5, boxY + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${reportData.totalSales.toLocaleString()}`, 42.5, boxY + 16, { align: 'center' });

    // Transaction Count
    doc.setFillColor(92, 184, 92);
    doc.rect(75, boxY, boxWidth, boxHeight, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Transacciones', 97.5, boxY + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(reportData.transactionCount), 97.5, boxY + 16, { align: 'center' });

    // Average Ticket
    doc.setFillColor(240, 173, 78);
    doc.rect(130, boxY, boxWidth, boxHeight, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Ticket Promedio', 152.5, boxY + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${reportData.averageTicket.toLocaleString()}`, 152.5, boxY + 16, { align: 'center' });

    // Sales by date table
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 70,
      head: [['Fecha', 'Ventas', 'Transacciones', 'Promedio']],
      body: reportData.dailySales.map((day: any) => [
        day.date,
        `$${day.sales.toLocaleString()}`,
        day.transactions,
        `$${day.average.toLocaleString()}`
      ]),
      theme: 'grid'
    });

    // Save
    doc.save(`reporte_ventas_${this.getTimestamp()}.pdf`);
  }

  /**
   * Get current timestamp for filename
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }
}

export default new PDFExportService();
