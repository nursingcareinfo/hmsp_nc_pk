import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Trash2,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Search,
  Filter,
  UserCheck,
  UserX,
  Loader2,
  X,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dataService } from '../dataService';
import { AppUser } from '../types';
import { SUPER_ADMIN_EMAIL, MAX_ADMINS } from '../constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export const SettingsModule = ({ currentUser }: { currentUser: AppUser | null }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from current');
      return;
    }

    setIsChangingPassword(true);
    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser!.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        setIsChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      toast.success('Password changed successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'staff' | 'viewer') => {
    if (uid === currentUser?.uid) {
      toast.error("You cannot change your own role");
      return;
    }

    try {
      await dataService.updateUserRole(uid, newRole);
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      toast.error("You cannot delete yourself");
      return;
    }

    if (!window.confirm('Are you sure you want to remove this user? They will lose all access.')) return;

    try {
      await dataService.deleteUser(uid);
      setUsers(users.filter(u => u.uid !== uid));
      toast.success('User removed successfully');
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const isSuperAdmin = currentUser?.email === SUPER_ADMIN_EMAIL;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h2>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              adminCount >= MAX_ADMINS
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"
                : "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800"
            }`}>
              {adminCount} / {MAX_ADMINS} Admins
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage admin access and user permissions</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Change Password Button */}
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <KeyRound size={16} />
            Change Password
          </button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 w-64 text-sm focus:ring-2 focus:ring-teal-500 transition-all outline-none dark:text-white"
            />
          </div>
          <button
            onClick={() => setIsAddingUser(true)}
            disabled={adminCount >= MAX_ADMINS}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-lg ${
              adminCount >= MAX_ADMINS
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-100 dark:shadow-teal-900/20"
            }`}
          >
            <UserPlus size={18} />
            {adminCount >= MAX_ADMINS ? "Limit Reached" : "Add Admin"}
          </button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-slate-50 rounded-xl" />
              </div>
            ))
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <motion.div
                key={user.uid}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                {/* Role Badge */}
                <div className="absolute top-4 right-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    user.role === 'admin' 
                      ? "bg-teal-50 text-teal-600 border-teal-100" 
                      : user.role === 'staff'
                        ? "bg-sky-50 text-sky-600 border-sky-100"
                        : "bg-slate-50 text-slate-500 border-slate-100"
                  }`}>
                    {user.role}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-0.5 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-inner">
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-full h-full object-cover rounded-[14px]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{user.displayName}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Calendar size={12} />
                    Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Clock size={12} />
                    Last Login {format(new Date(user.lastLogin), 'MMM dd, hh:mm a')}
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                    {user.role !== 'admin' ? (
                      <button
                        onClick={() => handleUpdateRole(user.uid, 'admin')}
                        disabled={adminCount >= MAX_ADMINS}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                          adminCount >= MAX_ADMINS
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white"
                        }`}
                        title={adminCount >= MAX_ADMINS ? `Maximum ${MAX_ADMINS} admins allowed` : "Make Admin"}
                      >
                        <Shield size={14} />
                        Make Admin
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateRole(user.uid, 'viewer')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                      >
                        <UserX size={14} />
                        Revoke Admin
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteUser(user.uid)}
                      className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
              <UserX size={48} className="mb-4 opacity-20" />
              <p className="font-bold">No users found matching your search</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingUser(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Add New Admin</h3>
                  <button onClick={() => setIsAddingUser(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div className="flex gap-3">
                      <AlertCircle className="text-amber-600 shrink-0" size={20} />
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        To add an admin, they must first log in to the app with their Google account. Once they've logged in, you can find them in the user list and promote them to Admin.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 leading-relaxed">
                    Alternatively, you can share the app URL with them. After their first login, their profile will appear here automatically as a "Viewer".
                  </p>

                  <button 
                    onClick={() => setIsAddingUser(false)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Change Password</h3>
                    <p className="text-sm text-slate-500">Update your account password</p>
                  </div>
                  <button onClick={() => { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        placeholder="Enter new password (min 6 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                        className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Password strength indicator */}
                  {newPassword && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            newPassword.length >= 12 ? 'bg-emerald-500 w-full' :
                            newPassword.length >= 8 ? 'bg-teal-500 w-2/3' :
                            newPassword.length >= 6 ? 'bg-amber-500 w-1/3' :
                            'bg-rose-500 w-[10%]'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Good' : newPassword.length >= 6 ? 'Weak' : 'Too short'}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <KeyRound size={18} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
