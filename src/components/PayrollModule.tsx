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
import { dataService } from '../dataService';
import { format, addDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

export const PayrollModule = ({ staff }: { staff: Staff[] }) => {
  const { payrolls, addPayroll, updatePayrollStatus } = useUIStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePayroll = () => {
    setIsGenerating(true);
    // Simulate generation for a 15-day period
    setTimeout(() => {
      const today = new Date();
      const periodStart = format(today, 'yyyy-MM-01');
      const periodEnd = format(addDays(today, 14), 'yyyy-MM-15');

      staff.forEach(member => {
        const shiftsWorked = Math.floor(Math.random() * 15) + 1; // Mock 1-15 shifts
        const shiftRate = member.shift_rate || (member.salary ? Math.round(member.salary / 30) : 1500);
        const baseSalary = shiftsWorked * shiftRate;
        
        // Calculate advance deductions
        const approvedAdvances = member.advances?.filter(a => a.status === 'Approved') || [];
        const totalAdvances = approvedAdvances.reduce((sum, a) => sum + a.amount, 0);
        
        const allowances = 2000;
        const deductions = 500;
        const netSalary = baseSalary + allowances - deductions - totalAdvances;
        
        const newPayroll: Payroll = {
          id: Math.random().toString(36).substring(7),
          staff_id: member.id,
          staff_name: member.full_name,
          designation: member.designation,
          period_start: periodStart,
          period_end: periodEnd,
          shifts_worked: shiftsWorked,
          shift_rate: shiftRate,
          base_salary: baseSalary,
          allowances: allowances,
          deductions: deductions,
          deductions_advances: totalAdvances,
          net_salary: netSalary,
          status: 'Pending'
        };
        addPayroll(newPayroll);

        // Mark advances as deducted if any
        if (totalAdvances > 0) {
          const updatedAdvances = member.advances?.map(a => 
            a.status === 'Approved' ? { ...a, status: 'Deducted' as const } : a
          );
          dataService.updateStaff(member.id, { advances: updatedAdvances });
        }
      });
      
      setIsGenerating(false);
      toast.success(`Payroll generated for ${staff.length} staff members`);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payroll Management</h2>
          <p className="text-slate-500 text-sm font-medium">Manage 15-day salary cycles and disbursements</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generatePayroll}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            Generate 15-Day Payroll
          </button>
          <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-emerald-900 font-bold">Paid This Period</span>
          </div>
          <p className="text-3xl font-black text-emerald-900">PKR 1.2M</p>
          <p className="text-xs text-emerald-600 font-bold mt-1">84 Staff Members</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-600 rounded-xl text-white">
              <Clock size={20} />
            </div>
            <span className="text-amber-900 font-bold">Pending Approval</span>
          </div>
          <p className="text-3xl font-black text-amber-900">PKR 450K</p>
          <p className="text-xs text-amber-600 font-bold mt-1">32 Staff Members</p>
        </div>
        <div className="bg-slate-100 border border-slate-200 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-600 rounded-xl text-white">
              <DollarSign size={20} />
            </div>
            <span className="text-slate-900 font-bold">Total Budget</span>
          </div>
          <p className="text-3xl font-black text-slate-900">PKR 2.8M</p>
          <p className="text-xs text-slate-500 font-bold mt-1">Next Cycle: April 15</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
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
                          {format(new Date(record.period_start), 'MMM dd')} - {format(new Date(record.period_end), 'MMM dd')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">15-Day Cycle</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-black text-slate-900">PKR {record.net_salary.toLocaleString()}</p>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {record.shifts_worked} Shifts @ PKR {record.shift_rate}
                          </span>
                          {record.deductions_advances && record.deductions_advances > 0 && (
                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter">
                              - PKR {record.deductions_advances.toLocaleString()} (Advance)
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
                        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
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
