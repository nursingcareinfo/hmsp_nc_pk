/**
 * Advances service — CRUD operations for staff advances
 */

import { supabase } from '../lib/supabase';
import { AdvanceRecord, Staff } from '../types';

export const advancesService = {
  // Fetch all advance records
  getAll: async (): Promise<AdvanceRecord[]> => {
    if (!supabase) return [];

    let allRecords: AdvanceRecord[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('staff_advances')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Error fetching advances:', error);
        break;
      }
      if (!data || data.length === 0) break;

      allRecords = allRecords.concat(data as AdvanceRecord[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return allRecords;
  },

  // Fetch advances for a specific staff member
  getByStaff: async (staffId: string): Promise<AdvanceRecord[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('staff_advances')
      .select('*')
      .eq('staff_id', staffId)
      .order('advance_date', { ascending: false });

    if (error) {
      console.error('Error fetching staff advances:', error);
      return [];
    }
    return (data || []) as AdvanceRecord[];
  },

  // Create a new advance record
  create: async (record: Omit<AdvanceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<AdvanceRecord> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('staff_advances')
      .insert({
        staff_id: record.staff_id,
        staff_name: record.staff_name,
        staff_assigned_id: record.staff_assigned_id,
        staff_designation: record.staff_designation,
        staff_district: record.staff_district,
        staff_salary: record.staff_salary,
        amount: record.amount,
        advance_date: record.advance_date,
        reason: record.reason,
        payment_method: record.payment_method || 'Cash',
        notes: record.notes,
        status: record.status || 'Pending',
        deducted_from_salary: 0,
        created_by: record.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AdvanceRecord;
  },

  // Update an advance record
  update: async (id: string, updates: Partial<AdvanceRecord>): Promise<AdvanceRecord> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('staff_advances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AdvanceRecord;
  },

  // Delete an advance record
  delete: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('staff_advances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get summary statistics
  getSummary: async (staff: Staff[]) => {
    const advances = await advancesService.getAll();

    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    const pendingAdvances = advances.filter(a => a.status === 'Pending').reduce((sum, a) => sum + a.amount, 0);
    const approvedAdvances = advances.filter(a => a.status === 'Approved').reduce((sum, a) => sum + a.amount, 0);
    const deductedAdvances = advances.filter(a => a.status === 'Deducted').reduce((sum, a) => sum + a.amount, 0);
    const cancelledAdvances = advances.filter(a => a.status === 'Cancelled').reduce((sum, a) => sum + a.amount, 0);

    // Staff with most outstanding advances
    const staffAdvancesMap = new Map<string, { name: string; total: number; pending: number; count: number }>();
    advances.forEach(a => {
      if (!staffAdvancesMap.has(a.staff_id)) {
        staffAdvancesMap.set(a.staff_id, { name: a.staff_name, total: 0, pending: 0, count: 0 });
      }
      const entry = staffAdvancesMap.get(a.staff_id)!;
      entry.total += a.amount;
      if (a.status === 'Pending') entry.pending += a.amount;
      entry.count++;
    });

    const topDebtors = Array.from(staffAdvancesMap.entries())
      .sort((a, b) => b[1].pending - a[1].pending)
      .slice(0, 10)
      .map(([id, data]) => ({ staff_id: id, ...data }));

    return {
      totalAdvances,
      pendingAdvances,
      approvedAdvances,
      deductedAdvances,
      cancelledAdvances,
      topDebtors,
    };
  },
};
