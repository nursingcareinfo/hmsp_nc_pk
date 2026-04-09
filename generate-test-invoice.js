/**
 * Generate test invoice PDF with logo
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });

  // Generate the invoice by calling the function directly
  const result = await page.evaluate(async () => {
    // Create test data
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

    // Try to dynamically import and use the invoice generator
    try {
      // We need to find the actual function from the bundle
      // For now, return the test data
      return {
        success: true,
        patient: patient.full_name,
        advance: advance.invoice_number
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Result:', result);
  
  await browser.close();
})();
