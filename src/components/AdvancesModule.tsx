import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Users,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  ReceiptText,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Check,
  Ban
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Staff, AdvanceRecord } from '../types';
import { advancesService } from '../services/advancesService';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// STAT CARD
// ============================================

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: any) => (
  <div className="bg-white dark:bg-slate-900 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          trend >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
        )}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend !== 0 ? `${trend > 0 ? '+' : ''}${trend}%` : '—'}
        </div>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

// ============================================
// ADVANCES MODULE
// ============================================

export const AdvancesModule = ({ staff }: { staff: Staff[] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch advances
  const { data: advances = [], isLoading, refetch } = useQuery({
    queryKey: ['advances'],
    queryFn: advancesService.getAll,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['advances-summary', staff.length],
    queryFn: () => advancesService.getSummary(staff),
    staleTime: 5 * 60 * 1000,
  });

  // Filtered advances
  const filteredAdvances = advances.filter(a => {
    const matchesSearch = searchQuery === '' ||
      a.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.staff_assigned_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group by staff
  const advancesByStaff = filteredAdvances.reduce((acc, a) => {
    if (!acc[a.staff_id]) acc[a.staff_id] = [];
    acc[a.staff_id].push(a);
    return acc;
  }, {} as Record<string, AdvanceRecord[]>);

  const formatPKR = (amount: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      Approved: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      Deducted: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      Cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    };
    const icons: Record<string, React.ReactNode> = {
      Pending: <Clock size={12} />,
      Approved: <CheckCircle size={12} />,
      Deducted: <TrendingUp size={12} />,
      Cancelled: <Ban size={12} />,
    };
    return (
      <span className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold", styles[status])}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const handleStatusChange = async (advance: AdvanceRecord, newStatus: AdvanceRecord['status']) => {
    try {
      await advancesService.update(advance.id, { status: newStatus });
      toast.success(`Advance ${newStatus.toLowerCase()}`);
      refetch();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (advance: AdvanceRecord) => {
    try {
      await advancesService.delete(advance.id);
      toast.success('Advance deleted');
      refetch();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Advance Payments</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track and manage staff advances before salary deduction
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-100 dark:shadow-teal-900/20 hover:scale-105 transition-all"
        >
          <Plus size={18} />
          Record Advance
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Advances"
          value={formatPKR(summary?.totalAdvances || 0)}
          subtitle={`${advances.length} records`}
          icon={Wallet}
          color="bg-teal-600"
        />
        <StatCard
          title="Pending"
          value={formatPKR(summary?.pendingAdvances || 0)}
          subtitle={`${advances.filter(a => a.status === 'Pending').length} advances`}
          icon={Clock}
          color="bg-amber-600"
        />
        <StatCard
          title="Approved"
          value={formatPKR(summary?.approvedAdvances || 0)}
          subtitle={`${advances.filter(a => a.status === 'Approved').length} advances`}
          icon={CheckCircle}
          color="bg-emerald-600"
        />
        <StatCard
          title="Deducted from Salary"
          value={formatPKR(summary?.deductedAdvances || 0)}
          subtitle={`${advances.filter(a => a.status === 'Deducted').length} advances`}
          icon={TrendingUp}
          color="bg-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filters:</span>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Deducted">Deducted</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by staff name, ID, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white shadow-sm"
          />
        </div>

        <div className="text-xs font-bold text-slate-400">
          {filteredAdvances.length} record{filteredAdvances.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Advances List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={32} />
          <span className="ml-3 text-slate-500 font-medium">Loading advances...</span>
        </div>
      ) : filteredAdvances.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 text-center">
          <ReceiptText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Advances Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {advances.length === 0
              ? 'No advance payments have been recorded yet. Click "Record Advance" to get started.'
              : 'No advances match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(advancesByStaff).map(([staffId, staffAdvances]) => {
            const isExpanded = expandedStaff === staffId;
            const totalOutstanding = staffAdvances
              .filter(a => a.status === 'Pending' || a.status === 'Approved')
              .reduce((sum, a) => sum + a.amount, 0);

            return (
              <div
                key={staffId}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Staff header */}
                <button
                  onClick={() => setExpandedStaff(isExpanded ? null : staffId)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-lg">
                      {staffAdvances[0].staff_name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-900 dark:text-white">{staffAdvances[0].staff_name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {staffAdvances[0].staff_assigned_id} • {staffAdvances[0].staff_designation} • {staffAdvances[0].staff_district}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold">Outstanding</p>
                      <p className="text-lg font-black text-amber-600 dark:text-amber-400">{formatPKR(totalOutstanding)}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                      {staffAdvances.length} advance{staffAdvances.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded advances */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                        {staffAdvances.map(advance => (
                          <div
                            key={advance.id}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl"
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                advance.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                advance.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                                advance.status === 'Deducted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              )}>
                                <DollarSign size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatPKR(advance.amount)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDate(advance.advance_date)} • {advance.reason}
                                </p>
                                {advance.notes && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{advance.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {statusBadge(advance.status)}
                              {/* Status actions */}
                              {advance.status === 'Pending' && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleStatusChange(advance, 'Approved')}
                                    className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                    title="Approve"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(advance, 'Cancelled')}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                              {advance.status === 'Approved' && (
                                <button
                                  onClick={() => handleStatusChange(advance, 'Deducted')}
                                  className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs font-bold"
                                >
                                  Mark Deducted
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(advance)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Advance Modal */}
      <AddAdvanceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        staff={staff}
        onSuccess={() => {
          refetch();
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
};

// ============================================
// ADD ADVANCE MODAL
// ============================================

interface AddAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff[];
  onSuccess: () => void;
}

const AddAdvanceModal: React.FC<AddAdvanceModalProps> = ({ isOpen, onClose, staff, onSuccess }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  const existingAdvances = advancesService.getByStaff(selectedStaffId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !amount || !reason) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await advancesService.create({
        staff_id: selectedStaffId,
        staff_name: selectedStaff!.full_name,
        staff_assigned_id: selectedStaff!.assigned_id,
        staff_designation: selectedStaff!.designation,
        staff_district: selectedStaff!.official_district,
        staff_salary: selectedStaff!.salary,
        amount: parseFloat(amount),
        advance_date: advanceDate,
        reason,
        payment_method: paymentMethod,
        notes: notes || undefined,
        status: 'Pending',
        deducted_from_salary: 0,
      });

      toast.success(`Advance of ${formatPKR(parseFloat(amount))} recorded for ${selectedStaff!.full_name}`);
      onSuccess();
      resetForm();
    } catch (error) {
      toast.error('Failed to record advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedStaffId('');
    setAmount('');
    setAdvanceDate(new Date().toISOString().split('T')[0]);
    setReason('');
    setPaymentMethod('Cash');
    setNotes('');
  };

  const formatPKR = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { onClose(); resetForm(); }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-600 to-sky-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight">Record Advance Payment</h2>
            <p className="text-teal-100 text-xs font-medium">Track advance given to staff before salary</p>
          </div>
          <button onClick={() => { onClose(); resetForm(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Staff selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Staff Member *
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
              required
            >
              <option value="">Select staff member...</option>
              {staff
                .filter(s => s.status === 'Active')
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.assigned_id}) — {s.designation}
                  </option>
                ))}
            </select>
          </div>

          {/* Staff info card */}
          {selectedStaff && (
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase">Salary</p>
                  <p className="text-sm font-black text-teal-900 dark:text-teal-400">{formatPKR(selectedStaff.salary)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase">District</p>
                  <p className="text-sm font-black text-teal-900 dark:text-teal-400">{selectedStaff.official_district || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase">Contact</p>
                  <p className="text-xs font-bold text-teal-900 dark:text-teal-400">{selectedStaff.contact_1 || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Advance Amount (PKR) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
              min="1"
              required
            />
            {amount && selectedStaff && (
              <p className="text-xs text-slate-400 mt-2">
                {((parseFloat(amount) / selectedStaff.salary) * 100).toFixed(1)}% of monthly salary ({formatPKR(selectedStaff.salary)})
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Advance Date *
            </label>
            <input
              type="date"
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Reason *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical emergency, Family need, Personal loan"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
              required
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="JazzCash">JazzCash</option>
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white min-h-[80px] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedStaffId}
            className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-200 dark:shadow-teal-900/20 hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <CheckCircle size={18} />
                Record Advance
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
