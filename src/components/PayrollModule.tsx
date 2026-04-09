import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { useUIStore } from '../store';
import { Payroll, Staff } from '../types';
import { dutyService } from '../services/dutyService';
import { advancesService } from '../services/advancesService';
import { format, addDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatPKR, formatPKDate } from '../lib/utils';
import { toast } from 'sonner';

export const PayrollModule = ({ staff }: { staff: Staff[] }) => {
  const { payrolls, addPayroll, updatePayrollStatus } = useUIStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePayroll = async () => {
    setIsGenerating(true);

    try {
      const today = new Date();
      const periodStart = format(today, 'yyyy-MM-01');
      const periodEnd = format(today, 'yyyy-MM-dd');

      // Fetch all advances once (instead of per-staff)
      const allAdvances = await advancesService.getAll();
      let paidCount = 0;
      let pendingCount = 0;

      // Generate payroll for each active staff member
      for (const member of staff) {
        if (member.status !== 'Active') continue;

        // Fetch real completed shifts from duty_assignments
        const payrollData = await dutyService.calculateStaffPayroll(member, periodStart, periodEnd);

        // Find approved advances for this staff member
        const approvedAdvances = allAdvances.filter(
          a => a.staff_id === member.id && a.status === 'Approved'
        );
        const totalAdvances = approvedAdvances.reduce((sum, a) => sum + a.amount, 0);

        // Flat rate: (completed_shifts × shift_rate) - advances
        // No allowances, no deductions, no premiums
        const netSalary = payrollData.total_earnings - totalAdvances;

        const newPayroll: Payroll = {
          id: Math.random().toString(36).substring(7),
          staff_id: member.id,
          staff_name: member.full_name,
          designation: member.designation,
          period_start: periodStart,
          period_end: periodEnd,
          shifts_worked: payrollData.total_shifts,
          shift_rate: payrollData.shift_rate,
          base_salary: payrollData.total_earnings,
          allowances: 0,
          deductions: 0,
          deductions_advances: totalAdvances,
          net_salary: netSalary,
          status: 'Pending',
          day_shifts_completed: payrollData.day_shifts,
          night_shifts_completed: payrollData.night_shifts,
        };

        addPayroll(newPayroll);
        pendingCount++;

        // Mark advances as deducted since payroll is being generated
        for (const advance of approvedAdvances) {
          await advancesService.update(advance.id, { status: 'Deducted' });
        }
      }

      toast.success(`Payroll generated: ${pendingCount} staff members, period ${formatPKDate(periodStart)} – ${formatPKDate(periodEnd)}`);
    } catch (error) {
      console.error('Payroll generation error:', error);
      toast.error('Failed to generate payroll. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Payroll Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage 15-day salary cycles and disbursements</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generatePayroll}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-100 dark:shadow-teal-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            Generate 15-Day Payroll
          </button>
          <button className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(() => {
          const paidRecords = payrolls.filter(r => r.status === 'Paid');
          const pendingRecords = payrolls.filter(r => r.status === 'Pending');
          const paidTotal = paidRecords.reduce((sum, r) => sum + r.net_salary, 0);
          const pendingTotal = pendingRecords.reduce((sum, r) => sum + r.net_salary, 0);
          const allShifts = payrolls.reduce((sum, r) => sum + r.shifts_worked, 0);
          const activeStaff = new Set(payrolls.map(r => r.staff_id)).size;

          return (
            <>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-emerald-900 dark:text-emerald-400 font-bold">Paid This Period</span>
          </div>
          <p className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{formatPKR(paidTotal)}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">{paidRecords.length} Staff Members</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-600 rounded-xl text-white">
              <Clock size={20} />
            </div>
            <span className="text-amber-900 dark:text-amber-400 font-bold">Pending Approval</span>
          </div>
          <p className="text-3xl font-black text-amber-900 dark:text-amber-100">{formatPKR(pendingTotal)}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">{pendingRecords.length} Staff Members</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-600 rounded-xl text-white">
              <DollarSign size={20} />
            </div>
            <span className="text-slate-900 dark:text-slate-100 font-bold">Total Budget</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{formatPKR(paidTotal + pendingTotal)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">{allShifts} shifts · {activeStaff} staff</p>
        </div>
            </>
          );
        })()}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search payroll records..."
              className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all">
              <Filter size={16} />
              Status
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all">
              <Calendar size={16} />
              Period
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Salary</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <DollarSign size={32} />
                      </div>
                      <p className="text-slate-400 font-medium">No payroll records found. Generate payroll to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payrolls.map((record) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={record.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                          {record.staff_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{record.staff_name}</p>
                          <p className="text-xs text-slate-500">{record.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">
                          {formatPKDate(record.period_start)} - {formatPKDate(record.period_end)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">15-Day Cycle</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-black text-slate-900 dark:text-white">{formatPKR(record.net_salary)}</p>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                            ☀️{record.day_shifts_completed} 🌙{record.night_shifts_completed} = {record.shifts_worked} shifts @ {formatPKR(record.shift_rate)}
                          </span>
                          {record.deductions_advances && record.deductions_advances > 0 && (
                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">
                              − {formatPKR(record.deductions_advances)} (advances)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        record.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                        record.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {record.status === 'Pending' && (
                          <button 
                            onClick={() => {
                              updatePayrollStatus(record.id, 'Paid');
                              toast.success(`Payment disbursed to ${record.staff_name}`);
                            }}
                            className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-100 hover:scale-105 transition-all"
                          >
                            Disburse
                          </button>
                        )}
                        <button className="p-2 text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100 rounded-xl transition-all">
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
