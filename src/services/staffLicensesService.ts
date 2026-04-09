/**
 * Staff Licenses Service
 * Tracks PNC, SLC, BLS, ACLS, CNA, RN licenses for nursing staff.
 * Auto-alerts on approaching/expired licenses.
 */

import { supabase } from '../lib/supabase';
import { StaffLicense } from '../types';

export const staffLicensesService = {
  // Fetch all licenses (paginated)
  getAll: async (): Promise<StaffLicense[]> => {
    if (!supabase) return [];

    let allRecords: StaffLicense[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('staff_licenses')
        .select('*')
        .order('expiry_date', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Error fetching staff licenses:', error);
        break;
      }
      if (!data || data.length === 0) break;

      allRecords = allRecords.concat(data as StaffLicense[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return allRecords;
  },

  // Get licenses for a specific staff member
  getByStaff: async (staffId: string): Promise<StaffLicense[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('staff_licenses')
      .select('*')
      .eq('staff_id', staffId)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching staff licenses:', error);
      return [];
    }
    return (data || []) as StaffLicense[];
  },

  // Get all expiring licenses (within N days)
  getExpiring: async (daysAhead: number = 30): Promise<StaffLicense[]> => {
    if (!supabase) return [];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('staff_licenses')
      .select('*')
      .in('status', ['active', 'expiring_soon'])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring licenses:', error);
      return [];
    }
    return (data || []) as StaffLicense[];
  },

  // Get all expired licenses
  getExpired: async (): Promise<StaffLicense[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('staff_licenses')
      .select('*')
      .eq('status', 'expired')
      .order('expiry_date', { ascending: false });

    if (error) {
      console.error('Error fetching expired licenses:', error);
      return [];
    }
    return (data || []) as StaffLicense[];
  },

  // Create a new license record
  create: async (record: Omit<StaffLicense, 'id' | 'created_at' | 'updated_at'>): Promise<StaffLicense> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('staff_licenses')
      .insert({
        staff_id: record.staff_id,
        license_type: record.license_type,
        license_number: record.license_number,
        issuing_body: record.issuing_body || 'Pakistan Nursing Council',
        issue_date: record.issue_date,
        expiry_date: record.expiry_date,
        status: record.status || 'active',
        document_url: record.document_url,
        notes: record.notes,
        renewal_date: record.renewal_date,
        renewal_cost: record.renewal_cost,
        created_by: record.created_by,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`License number "${record.license_number}" already exists`);
      }
      throw error;
    }
    return data as StaffLicense;
  },

  // Update a license record
  update: async (id: string, updates: Partial<StaffLicense>): Promise<StaffLicense> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('staff_licenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as StaffLicense;
  },

  // Delete a license record
  delete: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('staff_licenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get summary statistics
  getSummary: async () => {
    const licenses = await staffLicensesService.getAll();

    const total = licenses.length;
    const active = licenses.filter(l => l.status === 'active').length;
    const expiringSoon = licenses.filter(l => l.status === 'expiring_soon').length;
    const expired = licenses.filter(l => l.status === 'expired').length;
    const renewed = licenses.filter(l => l.status === 'renewed').length;

    // By type
    const byType = new Map<string, number>();
    licenses.forEach(l => {
      byType.set(l.license_type, (byType.get(l.license_type) || 0) + 1);
    });

    return { total, active, expiringSoon, expired, renewed, byType: Object.fromEntries(byType) };
  },
};
