/**
 * Duty Assignments Service
 * Manual shift assignment: staff → patient → day/night shift → date
 * Payroll: (completed_shifts × shift_rate) + allowances - advances
 */

import { supabase } from '../lib/supabase';
import { DutyAssignment, Staff, Patient } from '../types';
import { getKarachiToday, getCurrentShift, getKarachiTime, toKarachiISO } from '../utils/dateUtils';

export const dutyService = {
  // Fetch all duty assignments (paginated)
  getAll: async (filters?: {
    dateFrom?: string;
    dateTo?: string;
    staffId?: string;
    patientId?: string;
    shiftType?: 'day' | 'night';
    status?: string;
  }): Promise<DutyAssignment[]> => {
    if (!supabase) return [];

    let query = supabase.from('duty_assignments').select('*').order('duty_date', { ascending: false });

    if (filters?.dateFrom) query = query.gte('duty_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('duty_date', filters.dateTo);
    if (filters?.staffId) query = query.eq('staff_id', filters.staffId);
    if (filters?.patientId) query = query.eq('patient_id', filters.patientId);
    if (filters?.shiftType) query = query.eq('shift_type', filters.shiftType);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching duty assignments:', error);
      return [];
    }
    return (data || []) as DutyAssignment[];
  },

  // Get today's duty roster
  getTodayRoster: async (date: string = getKarachiToday()): Promise<{
    dayShifts: DutyAssignment[];
    nightShifts: DutyAssignment[];
  }> => {
    // To get the COMPLETE roster for "today", we actually need:
    // 1. Day shifts for today
    // 2. Night shifts for today (starts 7PM)
    // 3. Night shifts for YESTERDAY (ends 7AM today)
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().split('T')[0];
    
    const [allToday, allYesterday] = await Promise.all([
      dutyService.getAll({ dateFrom: date, dateTo: date }),
      dutyService.getAll({ dateFrom: yesterday, dateTo: yesterday, shiftType: 'night' })
    ]);

    return {
      dayShifts: allToday.filter(a => a.shift_type === 'day'),
      nightShifts: [...allToday.filter(a => a.shift_type === 'night'), ...allYesterday],
    };
  },

  /**
   * Helper specifically for dashboard 'On Duty' count.
   * Considers the CURRENT shift in Karachi.
   */
  getCurrentlyOnDutyCount: async (): Promise<number> => {
    if (!supabase) return 0;
    
    const today = getKarachiToday();
    const currentShift = getCurrentShift();
    
    let queryDate = today;
    let queryShift = currentShift;

    // Logic: If it's currently "night" in Karachi and it's before 7 AM, 
    // the active shift actually started "yesterday".
    const time = getKarachiTime();
    const hour = parseInt(time.split(':')[0], 10);
    
    if (currentShift === 'night' && hour < 7) {
      // Robust way to get "yesterday in Karachi" regardless of system local time
      const karachiTodayStr = getKarachiToday();
      const [year, month, day] = karachiTodayStr.split('-').map(Number);
      const karachiDate = new Date(year, month - 1, day);
      karachiDate.setDate(karachiDate.getDate() - 1);
      queryDate = toKarachiISO(karachiDate);
    }

    const { data, error } = await supabase
      .from('duty_assignments')
      .select('staff_id')
      .eq('duty_date', queryDate)
      .eq('shift_type', queryShift)
      .in('status', ['assigned', 'confirmed', 'completed']);

    if (error || !data) return 0;
    
    // Count unique staff IDs
    return new Set(data.map(d => d.staff_id)).size;
  },

  // Get duty assignments for a specific staff member
  getStaffDuties: async (staffId: string, dateFrom?: string, dateTo?: string): Promise<DutyAssignment[]> => {
    return dutyService.getAll({ staffId, dateFrom, dateTo });
  },

  // Get duty assignments for a specific patient
  getPatientDuties: async (patientId: string, dateFrom?: string, dateTo?: string): Promise<DutyAssignment[]> => {
    return dutyService.getAll({ patientId, dateFrom, dateTo });
  },

  // Create a new duty assignment
  create: async (assignment: Omit<DutyAssignment, 'id' | 'assigned_at' | 'updated_at'>): Promise<DutyAssignment> => {
    if (!supabase) throw new Error('Supabase not configured');

    // Guard: staff must be Active
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, full_name, status')
      .eq('id', assignment.staff_id)
      .single();

    if (staffData && staffData.status !== 'Active') {
      throw new Error(`Cannot assign ${staffData.full_name}: staff status is '${staffData.status}' (must be Active)`);
    }

    const { data, error } = await supabase
      .from('duty_assignments')
      .insert({
        patient_id: assignment.patient_id,
        staff_id: assignment.staff_id,
        shift_type: assignment.shift_type,
        duty_date: assignment.duty_date,
        shift_start: assignment.shift_start,
        shift_end: assignment.shift_end,
        status: assignment.status || 'assigned',
        notes: assignment.notes,
        admin_notes: assignment.admin_notes,
        assigned_by: assignment.assigned_by,
        is_payroll_processed: false,
        rate_per_shift: assignment.rate_per_shift,
        rate_notes: assignment.rate_notes,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate constraint (same staff, date, shift type)
      if (error.code === '23505') {
        throw new Error(`${assignment.shift_type === 'day' ? 'Day' : 'Night'} shift already assigned to this staff on this date`);
      }
      throw error;
    }
    return data as DutyAssignment;
  },

  // Batch create multiple assignments
  createBatch: async (assignments: Omit<DutyAssignment, 'id' | 'assigned_at' | 'updated_at'>[]): Promise<DutyAssignment[]> => {
    if (!supabase) throw new Error('Supabase not configured');

    // Guard: all staff must be Active
    const staffIds = [...new Set(assignments.map(a => a.staff_id))];
    const { data: staffList } = await supabase
      .from('staff')
      .select('id, full_name, status')
      .in('id', staffIds);

    for (const s of staffList || []) {
      if (s.status !== 'Active') {
        throw new Error(`Cannot assign ${s.full_name}: staff status is '${s.status}' (must be Active)`);
      }
    }

    const { data, error } = await supabase
      .from('duty_assignments')
      .insert(assignments.map(a => ({
        patient_id: a.patient_id,
        staff_id: a.staff_id,
        shift_type: a.shift_type,
        duty_date: a.duty_date,
        shift_start: a.shift_start,
        shift_end: a.shift_end,
        status: a.status || 'assigned',
        notes: a.notes,
        assigned_by: a.assigned_by,
        is_payroll_processed: false,
      })))
      .select();

    if (error) throw error;
    return (data || []) as DutyAssignment[];
  },

  // Update a duty assignment
  update: async (id: string, updates: Partial<DutyAssignment>): Promise<DutyAssignment> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('duty_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DutyAssignment;
  },

  /**
   * Update the per-shift rate override for a specific duty assignment.
   * Only affects this patient-staff pairing, not the staff's global shift_rate.
   * Passing null/undefined clears the override (falls back to staff.shift_rate).
   */
  updateShiftRate: async (
    assignmentId: string,
    rate: number | null,
    notes?: string
  ): Promise<DutyAssignment> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('duty_assignments')
      .update({
        rate_per_shift: rate,
        rate_notes: notes || undefined,
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data as DutyAssignment;
  },

  // Clock in a staff member
  clockIn: async (id: string, location?: string): Promise<DutyAssignment> => {
    return dutyService.update(id, {
      status: 'confirmed',
      clock_in_time: new Date().toISOString(),
      clock_in_location: location,
    });
  },

  // Clock out a staff member and mark completed
  clockOut: async (id: string, location?: string): Promise<DutyAssignment> => {
    return dutyService.update(id, {
      status: 'completed',
      clock_out_time: new Date().toISOString(),
      clock_out_location: location,
    });
  },

  // Mark staff as absent
  markAbsent: async (id: string): Promise<DutyAssignment> => {
    return dutyService.update(id, { status: 'absent' });
  },

  // Cancel an assignment
  cancel: async (id: string): Promise<DutyAssignment> => {
    return dutyService.update(id, { status: 'cancelled' });
  },

  // Delete an assignment
  delete: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.from('duty_assignments').delete().eq('id', id);
    if (error) throw error;
  },

  // Calculate payroll for a staff member based on completed shifts
  // Uses COALESCE: duty_assignments.rate_per_shift → staff.shift_rate → salary/30
  calculateStaffPayroll: async (
    staff: Staff,
    periodStart: string,
    periodEnd: string
  ): Promise<{
    staff_id: string;
    staff_name: string;
    designation: string;
    day_shifts: number;
    night_shifts: number;
    total_shifts: number;
    day_earnings: number;
    night_earnings: number;
    night_premium: number;
    total_earnings: number;
    base_salary: number;
    shift_rate: number;
  }> => {
    if (!supabase) throw new Error('Supabase not configured');

    // Fetch completed shifts with their per-assignment rate override
    const { data: completedShifts, error } = await supabase
      .from('duty_assignments')
      .select('shift_type, rate_per_shift, rate_notes')
      .eq('staff_id', staff.id)
      .eq('status', 'completed')
      .gte('duty_date', periodStart)
      .lte('duty_date', periodEnd);

    if (error) throw error;

    const salary = staff.salary || 0;
    const baseRate = staff.shift_rate || (salary > 0 ? Math.round(salary / 30) : 1000); // Fallback to 1000 PKR/shift if both zero

    // COALESCE: use assignment override rate, fall back to staff base rate
    const calcRate = (override: number | null) => override ?? baseRate;

    const dayShifts = completedShifts?.filter(s => s.shift_type === 'day') || [];
    const nightShifts = completedShifts?.filter(s => s.shift_type === 'night') || [];

    const dayEarnings = dayShifts.reduce((sum, s) => sum + calcRate(s.rate_per_shift), 0);
    const nightEarnings = nightShifts.reduce((sum, s) => sum + calcRate(s.rate_per_shift), 0);
    const totalEarnings = dayEarnings + nightEarnings;

    return {
      staff_id: staff.id,
      staff_name: staff.full_name,
      designation: staff.designation,
      day_shifts: dayShifts.length,
      night_shifts: nightShifts.length,
      total_shifts: dayShifts.length + nightShifts.length,
      day_earnings: dayEarnings,
      night_earnings: nightEarnings,
      night_premium: 0,
      total_earnings: totalEarnings,
      base_salary: staff.salary,
      shift_rate: baseRate,
    };
  },

  // Get summary statistics for a date range
  getSummary: async (dateFrom: string, dateTo: string): Promise<{
    totalAssignments: number;
    completed: number;
    absent: number;
    noShow: number;
    pending: number;
    dayShifts: number;
    nightShifts: number;
  }> => {
    const all = await dutyService.getAll({ dateFrom, dateTo });
    return {
      totalAssignments: all.length,
      completed: all.filter(a => a.status === 'completed').length,
      absent: all.filter(a => a.status === 'absent').length,
      noShow: all.filter(a => a.status === 'no_show').length,
      pending: all.filter(a => a.status === 'assigned' || a.status === 'confirmed').length,
      dayShifts: all.filter(a => a.shift_type === 'day').length,
      nightShifts: all.filter(a => a.shift_type === 'night').length,
    };
  },

  // --- Shift Assignment Helpers (for "Assign Now" button) ---

  /**
   * Get all staff assigned to a patient's shifts today.
   * Returns { day: Staff[], night: Staff[] } with up to 2 per shift.
   */
  getTodayPatientShiftAssignments: async (
    patientId: string,
    allStaff: Staff[]
  ): Promise<{ day: Staff[]; night: Staff[] }> => {
    if (!supabase) return { day: [], night: [] };
    const today = getKarachiToday();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select('staff_id, shift_type')
      .eq('patient_id', patientId)
      .eq('duty_date', today)
      .in('status', ['assigned', 'confirmed', 'completed']);

    if (error || !data) return { day: [], night: [] };

    const dayStaffIds = data.filter(a => a.shift_type === 'day').map(a => a.staff_id);
    const nightStaffIds = data.filter(a => a.shift_type === 'night').map(a => a.staff_id);

    return {
      day: allStaff.filter(s => dayStaffIds.includes(s.id)),
      night: allStaff.filter(s => nightStaffIds.includes(s.id)),
    };
  },

  /**
   * Check if a staff member is already assigned to ANY patient today (double-booking check).
   * Returns { day: boolean, night: boolean } indicating which shifts are taken.
   */
  getStaffTodayAssignments: async (
    staffId: string
  ): Promise<{ day: boolean; night: boolean }> => {
    if (!supabase) return { day: false, night: false };
    const today = getKarachiToday();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select('shift_type')
      .eq('staff_id', staffId)
      .eq('duty_date', today)
      .in('status', ['assigned', 'confirmed', 'completed']);

    if (error || !data) return { day: false, night: false };

    return {
      day: data.some(a => a.shift_type === 'day'),
      night: data.some(a => a.shift_type === 'night'),
    };
  },

  /**
   * Count how many staff are assigned to a patient's shift today.
   * Used to enforce max 2 staff per patient per shift.
   */
  getPatientShiftCount: async (
    patientId: string,
    shiftType: 'day' | 'night'
  ): Promise<number> => {
    if (!supabase) return 0;
    const today = getKarachiToday();

    const { data, error } = await supabase
      .from('duty_assignments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('duty_date', today)
      .eq('shift_type', shiftType)
      .in('status', ['assigned', 'confirmed', 'completed']);

    if (error || !data) return 0;
    return data.length;
  },

  /**
   * Unified assignment: creates duty_assignments record(s) AND updates patient.assigned_staff_id.
   * 
   * Business rules:
   * - 12-hour shifts: Day (7AM-7PM), Night (7PM-7AM)
   * - Max 2 staff per patient per shift
   * - Prevents cross-patient double-booking (same staff, same shift, same date)
   * - Updates patients.assigned_staff_id for backward compatibility (uses first assigned staff)
   * 
   * @param patient - The patient to assign staff to
   * @param staff - The staff member to assign
   * @param shifts - Array of shift types to assign: ['day'], ['night'], or ['day', 'night']
   * @param assignedBy - Email of the user making the assignment
   * @returns Array of created duty assignments
   */
  assignStaffToShifts: async (
    patient: Patient,
    staff: Staff,
    shifts: ('day' | 'night')[],
    assignedBy?: string,
    rateOverride?: number,
    rateNotes?: string
  ): Promise<DutyAssignment[]> => {
    if (!supabase) throw new Error('Supabase not configured');

    // Guard: staff must be Active
    if (staff.status !== 'Active') {
      throw new Error(`Cannot assign ${staff.full_name}: staff status is '${staff.status}' (must be Active)`);
    }

    const today = getKarachiToday();
    const created: DutyAssignment[] = [];

    for (const shiftType of shifts) {
      // Rule: Max 2 staff per patient per shift
      const currentCount = await dutyService.getPatientShiftCount(patient.id, shiftType);
      if (currentCount >= 2) {
        throw new Error(`Already ${currentCount} staff assigned to ${shiftType} shift for this patient (max 2)`);
      }

      // Rule: No cross-patient double-booking
      const staffToday = await dutyService.getStaffTodayAssignments(staff.id);
      if (staffToday[shiftType]) {
        throw new Error(`${staff.full_name} is already assigned to a ${shiftType} shift today`);
      }

      // Create duty assignment
      const shiftStart = shiftType === 'day' ? '07:00:00' : '19:00:00';
      const shiftEnd = shiftType === 'day' ? '19:00:00' : '07:00:00';

      const assignment = await dutyService.create({
        patient_id: patient.id,
        staff_id: staff.id,
        shift_type: shiftType,
        duty_date: today,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        status: 'assigned',
        assigned_by: assignedBy,
        is_payroll_processed: false,
        rate_per_shift: rateOverride || undefined,
        rate_notes: rateNotes || undefined,
      });

      created.push(assignment);
    }

    // Backward compatibility: update patients.assigned_staff_id with first assigned staff
    if (created.length > 0) {
      const { error: patientError } = await supabase
        .from('patients')
        .update({ assigned_staff_id: staff.id })
        .eq('id', patient.id);

      if (patientError) {
        console.warn('Failed to update patient.assigned_staff_id:', patientError);
      }
    }

    return created;
  },

  /**
   * Unassign staff from a patient's shift today.
   * Deletes the duty_assignments record and clears assigned_staff_id if it was the last one.
   */
  unassignStaffFromShift: async (
    patientId: string,
    staffId: string,
    shiftType: 'day' | 'night'
  ): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = getKarachiToday();

    // Delete duty assignment
    const { error } = await supabase
      .from('duty_assignments')
      .delete()
      .eq('patient_id', patientId)
      .eq('staff_id', staffId)
      .eq('duty_date', today)
      .eq('shift_type', shiftType);

    if (error) throw error;

    // Check if any staff remain assigned to this patient
    const { data: remainingAssignments } = await supabase
      .from('duty_assignments')
      .select('staff_id')
      .eq('patient_id', patientId)
      .eq('duty_date', today)
      .in('status', ['assigned', 'confirmed', 'completed'])
      .limit(1);

    // If no staff remain, clear assigned_staff_id
    if (!remainingAssignments || remainingAssignments.length === 0) {
      await supabase
        .from('patients')
        .update({ assigned_staff_id: null })
        .eq('id', patientId);
    }
  },
};
