/**
 * Invoice PDF Generator — H.M.S.P Payment Invoice
 * Professional PDF with business branding, red color scheme, and logo.
 * Generated client-side using jsPDF.
 */

import { jsPDF } from 'jspdf';
import { Patient, PatientAdvance } from '../types';
import logoImage from '../assets/nursing-care-logo.png';

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
  // Red background bar
  drawRoundRect(doc, x, y - 4, contentWidth, 10, 2, RED_PRIMARY);
  
  doc.setFontSize(9);
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), x + 4, y + 3);
  
  return y + 12;
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
  // 0. RED BORDER around entire page
  // ===========================
  doc.setDrawColor(RED_PRIMARY);
  doc.setLineWidth(1.5);
  doc.roundedRect(8, 8, W - 16, H - 16, 4, 4);

  // ===========================
  // 1. HEADER — Large centered logo + subtitle
  // ===========================
  const LOGO_H = 16; // mm — logo height
  const LOGO_W = 50; // mm — logo width (aspect ratio ~2.2:1)
  const logoX = (W - LOGO_W) / 2; // center

  // Try loading logo — centered, large
  try {
    const logoDataUrl = await loadImageAsBase64(logoImage);
    doc.addImage(logoDataUrl, 'PNG', logoX, 15, LOGO_W, LOGO_H);
  } catch {
    // Fallback: text placeholder
    drawRoundRect(doc, logoX, 15, LOGO_W, LOGO_H, 4, GRAY_100);
    doc.setFontSize(12);
    doc.setTextColor(GRAY_600);
    doc.setFont('helvetica', 'bold');
    doc.text('NURSING CARE', W / 2, 25, { align: 'center' });
  }

  // Subtitle under logo
  doc.setFontSize(9);
  doc.setTextColor(GRAY_600);
  doc.setFont('helvetica', 'normal');
  doc.text('H.M.S.P — Home Medical Service Provider', W / 2, 15 + LOGO_H + 5, { align: 'center' });

  // Divider line
  doc.setDrawColor(GRAY_200);
  doc.setLineWidth(0.5);
  doc.line(M, 15 + LOGO_H + 10, W - M, 15 + LOGO_H + 10);

  y = 15 + LOGO_H + 20;

  // ===========================
  // 2. DOCUMENT TITLE
  // ===========================
  doc.setFontSize(14);
  doc.setTextColor(GRAY_900);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Invoice', W / 2, y, { align: 'center' });

  y += 5;
  doc.setDrawColor(GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 25, y, W / 2 + 25, y);

  y += 10;

  // ===========================
  // 3. INVOICE META BAR — Subtle gray
  // ===========================
  const metaH = 18;
  drawRoundRect(doc, M, y, CW, metaH, 4, GRAY_100, GRAY_200, 0.3);

  doc.setFontSize(9);
  doc.setTextColor(GRAY_600);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No:`, M + 8, y + 8);

  doc.setTextColor(GRAY_900);
  doc.setFont('helvetica', 'bold');
  doc.text(advance.invoice_number, M + 28, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY_600);
  doc.text(`Date: ${formatDate(advance.advance_date)}`, M + 8, y + 15);

  // RECEIVED stamp — green instead of red
  doc.setFontSize(11);
  doc.setTextColor(GREEN);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ RECEIVED', W - M - 8, y + 12, { align: 'right' });

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
  // 6. AMOUNT BOX — Clean gray with subtle red accent
  // ===========================
  const boxH = 28;
  drawRoundRect(doc, M, y, CW, boxH, 5, GRAY_100, GRAY_200, 0.3);

  // Red accent line on left
  doc.setFillColor(RED_PRIMARY);
  doc.roundedRect(M + 2, y + 4, 3, boxH - 8, 1.5, 1.5, 'F');

  doc.setFontSize(10);
  doc.setTextColor(GRAY_500);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL AMOUNT', W / 2, y + 11, { align: 'center' });

  doc.setFontSize(24);
  doc.setTextColor(GRAY_900);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPKR(advance.amount), W / 2, y + 23, { align: 'center' });

  y += boxH + 12;

  // ===========================
  // 7. DIVIDER + TERMS
  // ===========================
  // Ensure terms don't overlap - push to bottom if content is long
  y = Math.max(y, H - 55);

  doc.setDrawColor(GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);

  y += 7;
  doc.setFontSize(8);
  doc.setTextColor(GRAY_400);
  doc.setFont('helvetica', 'italic');

  const terms = [
    'This receipt acknowledges the payment received for home nursing care services.',
    'The amount will be adjusted against future service invoices.',
    'For queries, contact H.M.S.P — Home Medical Service Provider.',
  ];
  terms.forEach((term) => {
    doc.text(term, W / 2, y, { align: 'center' });
    y += 4;
  });

  // ===========================
  // 8. FOOTER — Minimal gray line
  // ===========================
  doc.setDrawColor(GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(M, H - 18, W - M, H - 18);

  doc.setFontSize(7);
  doc.setTextColor(GRAY_400);
  doc.setFont('helvetica', 'normal');
  doc.text('H.M.S.P — Home Medical Service Provider', W / 2, H - 10, { align: 'center' });

  doc.text('Karachi, Pakistan', W / 2, H - 5, { align: 'center' });

  // ===========================
  // 9. SAVE
  // ===========================
  const patientNameSafe = patient.full_name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  const fileName = `HMSp-Invoice-${advance.invoice_number}-${patientNameSafe}.pdf`;
  doc.save(fileName);

  return advance.invoice_number;
}
