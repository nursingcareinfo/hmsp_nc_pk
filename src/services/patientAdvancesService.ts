/**
 * Patient Advances Service
 * Tracks advance payments received FROM patients/clients
 * Auto-generates professional PDF invoices on creation
 */

import { supabase } from '../lib/supabase';
import { PatientAdvance } from '../types';
import { getKarachiToday } from '../utils/dateUtils';

export const patientAdvancesService = {
  // Fetch all patient advances (paginated)
  getAll: async (): Promise<PatientAdvance[]> => {
    if (!supabase) return [];

    let allRecords: PatientAdvance[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('patient_advances')
        .select('*')
        .order('advance_date', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Error fetching patient advances:', error);
        break;
      }
      if (!data || data.length === 0) break;

      allRecords = allRecords.concat(data as PatientAdvance[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return allRecords;
  },

  // Get advances for a specific patient
  getByPatient: async (patientId: string): Promise<PatientAdvance[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('patient_advances')
      .select('*')
      .eq('patient_id', patientId)
      .order('advance_date', { ascending: false });

    if (error) {
      console.error('Error fetching patient advances:', error);
      return [];
    }
    return (data || []) as PatientAdvance[];
  },

  // Create a new patient advance (triggers invoice generation)
  create: async (record: Omit<PatientAdvance, 'id' | 'created_at' | 'updated_at'>): Promise<PatientAdvance> => {
    if (!supabase) throw new Error('Supabase not configured');

    // Generate invoice number
    const dateStr = getKarachiToday().replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;

    const { data, error } = await supabase
      .from('patient_advances')
      .insert({
        patient_id: record.patient_id,
        amount: record.amount,
        advance_date: record.advance_date,
        payment_method: record.payment_method || 'Cash',
        reason: record.reason,
        notes: record.notes,
        status: record.status || 'received',
        invoice_number: invoiceNumber,
        invoice_generated: false,
        created_by: record.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PatientAdvance;
  },

  // Update a patient advance
  update: async (id: string, updates: Partial<PatientAdvance>): Promise<PatientAdvance> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('patient_advances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PatientAdvance;
  },

  // Mark invoice as generated
  markInvoiceGenerated: async (id: string): Promise<PatientAdvance> => {
    return patientAdvancesService.update(id, { invoice_generated: true });
  },

  // Delete a patient advance
  delete: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('patient_advances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get summary statistics
  getSummary: async () => {
    const advances = await patientAdvancesService.getAll();

    const totalReceived = advances.reduce((sum, a) => sum + a.amount, 0);
    const totalAdjusted = advances.filter(a => a.status === 'adjusted').reduce((sum, a) => sum + a.amount, 0);
    const totalOutstanding = advances.filter(a => a.status === 'received').reduce((sum, a) => sum + a.amount, 0);

    return {
      totalReceived,
      totalAdjusted,
      totalOutstanding,
      count: advances.length,
    };
  },
};
