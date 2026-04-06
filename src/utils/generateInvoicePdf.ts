/**
 * Invoice PDF Generator — H.M.S.P Advance Payment Receipt
 * Professional PDF with business branding, red color scheme, and logo.
 * Generated client-side using jsPDF.
 */

import { jsPDF } from 'jspdf';
import { Patient, PatientAdvance } from '../types';

// =====================
// BRAND COLORS
// =====================
const RED_PRIMARY = '#DC2626';    // Red brand
const RED_DARK = '#991B1B';
const RED_LIGHT = '#FEF2F2';
const RED_SUBTLE = '#FEE2E2';
const GRAY_900 = '#111827';
const GRAY_600 = '#4B5563';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_100 = '#F3F4F6';
const WHITE = '#FFFFFF';
const GREEN = '#059669';

// =====================
// TYPES
// =====================
export interface InvoiceData {
  patient: Patient;
  advance: PatientAdvance;
}

// =====================
// HELPERS
// =====================
function formatPKR(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function drawRoundRect(
  doc: jsPDF, x: number, y: number, w: number, h: number, r: number,
  fill: string, stroke?: string, lineWidth?: number
) {
  doc.setFillColor(fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
  if (stroke) {
    doc.setDrawColor(stroke);
    doc.setLineWidth(lineWidth || 0.3);
    doc.roundedRect(x, y, w, h, r, r, 'S');
  }
}

function drawFieldLabel(doc: jsPDF, label: string, x: number, y: number) {
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);
}

function drawFieldValue(doc: jsPDF, value: string, x: number, y: number, opts?: { bold?: boolean; color?: string; size?: number }) {
  doc.setFontSize(opts?.size || 10);
  doc.setTextColor(opts?.color || GRAY_900);
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
  doc.text(value, x, y);
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, contentWidth: number) {
  doc.setFontSize(11);
  doc.setTextColor(RED_DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x, y);

  y += 2;
  doc.setDrawColor(RED_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + contentWidth, y);
  return y + 7;
}

async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// =====================
// MAIN GENERATOR
// =====================
export async function generateAdvanceInvoice(data: InvoiceData): Promise<string> {
  const { patient, advance } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 20; // margin
  const CW = W - M * 2; // content width
  let y = 0;

  // ===========================
  // 1. HEADER RED BAR
  // ===========================
  doc.setFillColor(RED_PRIMARY);
  doc.rect(0, 0, W, 48, 'F');

  // Try loading logo
  let logoLoaded = false;
  try {
    const logoDataUrl = await loadImageAsBase64('/assets/nursing-care-logo.png');
    doc.addImage(logoDataUrl, 'PNG', M, 8, 32, 32);
    logoLoaded = true;
  } catch {
    // Fallback: minimal logo placeholder
    drawRoundRect(doc, M, 8, 32, 32, 4, WHITE);
    doc.setFontSize(9);
    doc.setTextColor(RED_PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.text('H.M.S.P', M + 16, 24, { align: 'center' });
    doc.setFontSize(5);
    doc.text('KARACHI', M + 16, 30, { align: 'center' });
  }

  // Brand text — right aligned
  doc.setFontSize(26);
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('H.M.S.P', W - M, 18, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Healthcare Management System Portal', W - M, 26, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Professional Home Nursing Care — Karachi, Pakistan', W - M, 33, { align: 'right' });

  // Thin accent line
  doc.setDrawColor(RED_DARK);
  doc.setLineWidth(0.3);
  doc.line(M, 44, W - M, 44);

  y = 56;

  // ===========================
  // 2. DOCUMENT TITLE
  // ===========================
  doc.setFontSize(22);
  doc.setTextColor(RED_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('ADVANCE PAYMENT RECEIPT', W / 2, y, { align: 'center' });

  y += 6;
  doc.setDrawColor(RED_PRIMARY);
  doc.setLineWidth(1);
  doc.line(W / 2 - 40, y, W / 2 + 40, y);

  y += 10;

  // ===========================
  // 3. INVOICE META BAR
  // ===========================
  const metaH = 22;
  drawRoundRect(doc, M, y, CW, metaH, 4, RED_LIGHT, RED_SUBTLE, 0.3);

  doc.setFontSize(10);
  doc.setTextColor(GRAY_900);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${advance.invoice_number}`, M + 8, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_500);
  doc.text(`Date: ${formatDate(advance.advance_date)}`, M + 8, y + 17);

  // PAID stamp
  doc.setFontSize(14);
  doc.setTextColor(RED_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIVED', W - M - 8, y + 14, { align: 'right' });

  y += metaH + 10;

  // ===========================
  // 4. PATIENT INFORMATION
  // ===========================
  y = drawSectionHeader(doc, 'PATIENT INFORMATION', M, y, CW);

  const patientId = patient.patient_id_assigned || patient.id.substring(0, 8).toUpperCase();

  // Two-column layout
  const col1X = M + 8;
  const col2X = W / 2 + 4;

  const patientFields: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Patient Name', value: patient.full_name, bold: true },
    { label: 'Patient ID', value: patientId },
    { label: 'CNIC', value: patient.cnic || '—' },
    { label: 'Contact', value: patient.contact || '—' },
    { label: 'Address', value: [patient.address, patient.area, patient.district].filter(Boolean).join(', ') || '—' },
  ];

  patientFields.forEach((f, i) => {
    const rowY = y + i * 9;
    drawFieldLabel(doc, f.label, col1X, rowY);
    drawFieldValue(doc, f.value, col2X - 4, rowY, { bold: f.bold });
  });

  // Status badge on right
  const badgeX = W - M - 30;
  drawRoundRect(doc, badgeX, y - 3, 30, 8, 2, patient.status === 'Active' ? '#D1FAE5' : RED_LIGHT);
  doc.setFontSize(7);
  doc.setTextColor(patient.status === 'Active' ? GREEN : RED_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.status.toUpperCase(), badgeX + 15, y + 2.5, { align: 'center' });

  y += patientFields.length * 9 + 8;

  // ===========================
  // 5. PAYMENT DETAILS
  // ===========================
  y = drawSectionHeader(doc, 'PAYMENT DETAILS', M, y, CW);

  const paymentFields: Array<{ label: string; value: string; bold?: boolean; color?: string }> = [
    { label: 'Payment Method', value: advance.payment_method },
    { label: 'Advance Date', value: formatDate(advance.advance_date) },
    { label: 'Reason', value: advance.reason || '—' },
  ];

  paymentFields.forEach((f, i) => {
    const rowY = y + i * 9;
    drawFieldLabel(doc, f.label, col1X, rowY);
    drawFieldValue(doc, f.value, col2X - 4, rowY, { bold: f.bold, color: f.color });
  });

  if (advance.notes) {
    const rowY = y + paymentFields.length * 9;
    drawFieldLabel(doc, 'Notes', col1X, rowY);
    doc.setFontSize(9);
    doc.setTextColor(GRAY_600);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(advance.notes, CW / 2 - 12);
    doc.text(noteLines, col2X - 4, rowY);
    y += noteLines.length * 5 + 4;
  } else {
    y += paymentFields.length * 9 + 8;
  }

  // ===========================
  // 6. AMOUNT BOX (prominent)
  // ===========================
  const boxH = 26;
  drawRoundRect(doc, M, y, CW, boxH, 5, RED_PRIMARY, undefined, 0);

  // Subtle pattern: lighter red inner rect
  drawRoundRect(doc, M + 2, y + 2, CW - 4, boxH - 4, 3, RED_DARK);

  doc.setFontSize(11);
  doc.setTextColor('#FCA5A5');
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL ADVANCE RECEIVED', W / 2, y + 10, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPKR(advance.amount), W / 2, y + 21, { align: 'center' });

  y += boxH + 12;

  // ===========================
  // 7. DIVIDER + TERMS
  // ===========================
  y = Math.max(y, H - 50);

  doc.setDrawColor(GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);

  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(GRAY_400);
  doc.setFont('helvetica', 'italic');

  const terms = [
    'This receipt acknowledges the advance payment received for home nursing care services.',
    'The advance amount will be adjusted against future service invoices.',
    'For queries, contact H.M.S.P Karachi Portal — Professional Home Nursing Care.',
  ];
  terms.forEach((term) => {
    doc.text(term, W / 2, y, { align: 'center' });
    y += 4;
  });

  // ===========================
  // 8. FOOTER RED BAR
  // ===========================
  doc.setFillColor(RED_PRIMARY);
  doc.rect(0, H - 14, W, 14, 'F');

  doc.setFontSize(8);
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('H.M.S.P — Healthcare Management System Portal', W / 2, H - 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text('Karachi, Pakistan | Professional Home Nursing Care', W / 2, H - 3, { align: 'center' });

  // ===========================
  // 9. SAVE
  // ===========================
  const patientNameSafe = patient.full_name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  const fileName = `HMSp-Invoice-${advance.invoice_number}-${patientNameSafe}.pdf`;
  doc.save(fileName);

  return advance.invoice_number;
}
