/**
 * Attendance Service
 * Track staff daily attendance, calendar view, and shift-based payroll
 */

import { supabase } from '../lib/supabase';
import { Staff } from '../types';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  shift_type?: 'day' | 'night';
  duty_assignment_id?: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  notes?: string;
  marked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDayDays: number;
  onLeaveDays: number;
  dayShifts: number;
  nightShifts: number;
  totalHours: number;
  estimatedSalary: number;
  shiftRate: number;
}

export const attendanceService = {
  // Get attendance records for a staff member in a date range
  getStaffAttendance: async (
    staffId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<AttendanceRecord[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('staff_id', staffId)
      .gte('attendance_date', dateFrom)
      .lte('attendance_date', dateTo)
      .order('attendance_date', { ascending: true });

    if (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
    return (data || []) as AttendanceRecord[];
  },

  // Mark attendance for a staff member on a specific date
  markAttendance: async (
    staffId: string,
    date: string,
    status: AttendanceStatus,
    options?: {
      shiftType?: 'day' | 'night';
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
      markedBy?: string;
    }
  ): Promise<AttendanceRecord> => {
    if (!supabase) throw new Error('Supabase not configured');

    const record = {
      staff_id: staffId,
      attendance_date: date,
      status,
      shift_type: options?.shiftType,
      check_in_time: options?.checkInTime,
      check_out_time: options?.checkOutTime,
      notes: options?.notes,
      marked_by: options?.markedBy,
    };

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(record, { onConflict: 'staff_id,attendance_date' })
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceRecord;
  },

  // Bulk mark attendance for multiple staff on a date
  markBulkAttendance: async (
    records: { staffId: string; status: AttendanceStatus; shiftType?: 'day' | 'night'; notes?: string }[],
    date: string,
    markedBy?: string
  ): Promise<AttendanceRecord[]> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(
        records.map(r => ({
          staff_id: r.staffId,
          attendance_date: date,
          status: r.status,
          shift_type: r.shiftType,
          marked_by: markedBy,
        })),
        { onConflict: 'staff_id,attendance_date' }
      )
      .select();

    if (error) throw error;
    return (data || []) as AttendanceRecord[];
  },

  // Calculate attendance summary and estimated salary for a month
  calculateMonthlySummary: async (
    staff: Staff,
    year: number,
    month: number // 0-indexed (0 = January)
  ): Promise<AttendanceSummary> => {
    if (!supabase) {
      return { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDayDays: 0, onLeaveDays: 0, dayShifts: 0, nightShifts: 0, totalHours: 0, estimatedSalary: 0, shiftRate: 0 };
    }

    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const records = await attendanceService.getStaffAttendance(staff.id, dateFrom, dateTo);

    const summary: AttendanceSummary = {
      totalDays: records.length,
      presentDays: records.filter(r => r.status === 'present').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      lateDays: records.filter(r => r.status === 'late').length,
      halfDayDays: records.filter(r => r.status === 'half_day').length,
      onLeaveDays: records.filter(r => r.status === 'on_leave').length,
      dayShifts: records.filter(r => r.shift_type === 'day').length,
      nightShifts: records.filter(r => r.shift_type === 'night').length,
      totalHours: records.reduce((sum, r) => sum + (r.total_hours || 0), 0),
      shiftRate: staff.shift_rate || Math.round(staff.salary / 30),
      estimatedSalary: 0,
    };

    // Calculate estimated salary: every completed day = 1 shift credit
    // No premiums, no allowances — simple: shifts × rate
    const shiftCredits = summary.presentDays + (summary.halfDayDays * 0.5) + (summary.lateDays * 0.75);
    summary.estimatedSalary = Math.round(shiftCredits * summary.shiftRate);

    return summary;
  },

  // Get calendar data for a month (all staff attendance for a date range)
  getCalendarData: async (
    staffId: string,
    year: number,
    month: number
  ): Promise<Map<string, AttendanceRecord>> => {
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const records = await attendanceService.getStaffAttendance(staffId, dateFrom, dateTo);

    const calendarMap = new Map<string, AttendanceRecord>();
    records.forEach(r => calendarMap.set(r.attendance_date, r));

    return calendarMap;
  },

  // Delete attendance record
  deleteAttendance: async (id: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('attendance_records').delete().eq('id', id);
    if (error) throw error;
  },
};
