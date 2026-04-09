/**
 * Test script to generate an invoice PDF
 */
const { jsPDF } = require('jspdf');

// Brand colors
const RED_PRIMARY = '#DC2626';
const RED_DARK = '#991B1B';
const RED_LIGHT = '#FEF2F2';
const RED_SUBTLE = '#FEE2E2';
const GRAY_900 = '#111827';
const GRAY_600 = '#4B5563';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const WHITE = '#FFFFFF';
const GREEN = '#059669';

function formatPKR(amount) {
  return 'Rs. ' + amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function drawRoundRect(doc, x, y, w, h, r, fill, stroke, lineWidth) {
  doc.setFillColor(fill);
  doc.roundedRect(x, y, w, h, r, r, 'F');
  if (stroke) {
    doc.setDrawColor(stroke);
    doc.setLineWidth(lineWidth || 0.3);
    doc.roundedRect(x, y, w, h, r, r, 'S');
  }
}

function drawFieldLabel(doc, label, x, y) {
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);
}

function drawFieldValue(doc, value, x, y, opts) {
  opts = opts || {};
  doc.setFontSize(opts.size || 10);
  doc.setTextColor(opts.color || GRAY_900);
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.text(value, x, y);
}

function drawSectionHeader(doc, title, x, y, contentWidth) {
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

// Test data
const patient = {
  id: 'test-123',
  full_name: 'Fatima Ahmed',
  patient_id_assigned: 'PAT-0001',
  cnic: '42101-1234567-1',
  contact: '+92 300 1234567',
  address: 'House 123, Street 5',
  area: 'Gulshan-e-Iqbal',
  district: 'Karachi',
  status: 'Active'
};

const advance = {
  id: 'adv-123',
  patient_id: 'test-123',
  amount: 15000,
  advance_date: '2026-04-06',
  payment_method: 'JazzCash',
  reason: 'Advance for nursing services',
  notes: 'To be adjusted against monthly billing',
  status: 'received',
  invoice_number: 'INV-20260406-0001',
  invoice_generated: false,
  created_by: 'admin'
};

// Generate PDF
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const W = 210;
const H = 297;
const M = 20;
const CW = W - M * 2;
let y = 0;

// 1. HEADER RED BAR
doc.setFillColor(RED_PRIMARY);
doc.rect(0, 0, W, 48, 'F');

// Logo placeholder (no image, just text)
drawRoundRect(doc, M, 8, 32, 32, 4, WHITE);
doc.setFontSize(9);
doc.setTextColor(RED_PRIMARY);
doc.setFont('helvetica', 'bold');
doc.text('H.M.S.P', M + 16, 22, { align: 'center' });
doc.setFontSize(5);
doc.text('KARACHI', M + 16, 28, { align: 'center' });

// Brand text
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

doc.setDrawColor(RED_DARK);
doc.setLineWidth(0.3);
doc.line(M, 44, W - M, 44);

y = 56;

// 2. DOCUMENT TITLE
doc.setFontSize(22);
doc.setTextColor(RED_PRIMARY);
doc.setFont('helvetica', 'bold');
doc.text('ADVANCE PAYMENT RECEIPT', W / 2, y, { align: 'center' });

y += 6;
doc.setDrawColor(RED_PRIMARY);
doc.setLineWidth(1);
doc.line(W / 2 - 40, y, W / 2 + 40, y);

y += 10;

// 3. INVOICE META BAR
const metaH = 22;
drawRoundRect(doc, M, y, CW, metaH, 4, RED_LIGHT, RED_SUBTLE, 0.3);

doc.setFontSize(10);
doc.setTextColor(GRAY_900);
doc.setFont('helvetica', 'bold');
doc.text('Invoice No: ' + advance.invoice_number, M + 8, y + 9);

doc.setFont('helvetica', 'normal');
doc.setTextColor(GRAY_500);
doc.text('Date: ' + formatDate(advance.advance_date), M + 8, y + 17);

doc.setFontSize(14);
doc.setTextColor(RED_PRIMARY);
doc.setFont('helvetica', 'bold');
doc.text('RECEIVED', W - M - 8, y + 14, { align: 'right' });

y += metaH + 10;

// 4. PATIENT INFORMATION
y = drawSectionHeader(doc, 'PATIENT INFORMATION', M, y, CW);

const col1X = M + 8;
const col2X = W / 2 + 4;

const patientFields = [
  { label: 'Patient Name', value: patient.full_name, bold: true },
  { label: 'Patient ID', value: patient.patient_id_assigned },
  { label: 'CNIC', value: patient.cnic },
  { label: 'Contact', value: patient.contact },
  { label: 'Address', value: [patient.address, patient.area, patient.district].join(', ') },
];

patientFields.forEach((f, i) => {
  const rowY = y + i * 9;
  drawFieldLabel(doc, f.label, col1X, rowY);
  drawFieldValue(doc, f.value, col2X - 4, rowY, { bold: f.bold });
});

const badgeX = W - M - 30;
drawRoundRect(doc, badgeX, y - 3, 30, 8, 2, '#D1FAE5');
doc.setFontSize(7);
doc.setTextColor(GREEN);
doc.setFont('helvetica', 'bold');
doc.text('ACTIVE', badgeX + 15, y + 2.5, { align: 'center' });

y += patientFields.length * 9 + 8;

// 5. PAYMENT DETAILS
y = drawSectionHeader(doc, 'PAYMENT DETAILS', M, y, CW);

const paymentFields = [
  { label: 'Payment Method', value: advance.payment_method },
  { label: 'Advance Date', value: formatDate(advance.advance_date) },
  { label: 'Reason', value: advance.reason },
];

paymentFields.forEach((f, i) => {
  const rowY = y + i * 9;
  drawFieldLabel(doc, f.label, col1X, rowY);
  drawFieldValue(doc, f.value, col2X - 4, rowY);
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

// 6. AMOUNT BOX
const boxH = 26;
drawRoundRect(doc, M, y, CW, boxH, 5, RED_PRIMARY);
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

// 7. TERMS
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

// 8. FOOTER RED BAR
doc.setFillColor(RED_PRIMARY);
doc.rect(0, H - 14, W, 14, 'F');

doc.setFontSize(8);
doc.setTextColor(WHITE);
doc.setFont('helvetica', 'bold');
doc.text('H.M.S.P — Healthcare Management System Portal', W / 2, H - 7, { align: 'center' });

doc.setFont('helvetica', 'normal');
doc.text('Karachi, Pakistan | Professional Home Nursing Care', W / 2, H - 3, { align: 'center' });

// Save
const fileName = 'test-invoice-INV-20260406-0001-Fatima-Ahmed.pdf';
doc.save(fileName);
console.log('Invoice PDF generated: ' + fileName);
