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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dataService } from '../dataService';
import { AppUser } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const SettingsModule = ({ currentUser }: { currentUser: AppUser | null }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
  const isSuperAdmin = currentUser?.email === 'nursingcareinfo21@gmail.com';

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h2>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              adminCount >= 2 
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800" 
                : "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800"
            }`}>
              {adminCount} / 2 Admins
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage admin access and user permissions</p>
        </div>
        
        <div className="flex items-center gap-3">
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
            disabled={adminCount >= 2}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-lg ${
              adminCount >= 2 
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none" 
                : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-100 dark:shadow-teal-900/20"
            }`}
          >
            <UserPlus size={18} />
            {adminCount >= 2 ? "Limit Reached" : "Add Admin"}
          </button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 p-6 rounded-3xl animate-pulse">
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
                className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
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
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-0.5 border border-slate-100 overflow-hidden shadow-inner">
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-full h-full object-cover rounded-[14px]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{user.displayName}</h4>
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
                        disabled={adminCount >= 2}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                          adminCount >= 2 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white"
                        }`}
                        title={adminCount >= 2 ? "Maximum 2 admins allowed" : "Make Admin"}
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
              className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Add New Admin</h3>
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
    </div>
  );
};
