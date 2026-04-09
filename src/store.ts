import { create } from 'zustand';
import { Staff, Patient, Notification, District, Designation, StaffStatus, PatientStatus, Payroll, StaffCategory } from './types';

interface UIState {
  activeTab: 'dashboard' | 'staff' | 'patients' | 'scheduling' | 'notifications' | 'payroll' | 'advances' | 'settings' | 'market' | 'hr';
  setActiveTab: (tab: 'dashboard' | 'staff' | 'patients' | 'scheduling' | 'notifications' | 'payroll' | 'advances' | 'settings' | 'market' | 'hr') => void;
  
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  staffFilters: {
    category: StaffCategory | 'All';
    designation: Designation | 'All';
    district: District | 'All';
    status: StaffStatus | 'All';
  };
  setStaffFilters: (filters: Partial<UIState['staffFilters']>) => void;
  
  patientFilters: {
    district: District | 'All';
    status: PatientStatus | 'All';
  };
  setPatientFilters: (filters: Partial<UIState['patientFilters']>) => void;
  
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;

  payrolls: Payroll[];
  setPayrolls: (payrolls: Payroll[]) => void;
  addPayroll: (payroll: Payroll) => void;
  updatePayrollStatus: (id: string, status: Payroll['status']) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  staffFilters: {
    category: 'All',
    designation: 'All',
    district: 'All',
    status: 'All',
  },
  setStaffFilters: (filters) => set((state) => ({ 
    staffFilters: { ...state.staffFilters, ...filters } 
  })),
  
  patientFilters: {
    district: 'All',
    status: 'All',
  },
  setPatientFilters: (filters) => set((state) => ({ 
    patientFilters: { ...state.patientFilters, ...filters } 
  })),
  
  notifications: [
    {
      id: '1',
      title: 'PNC Expiry Alert',
      message: 'Nurse Aaliya Siddiqui\'s PNC license expires in 15 days.',
      type: 'warning',
      timestamp: new Date().toISOString(),
      read: false,
    },
    {
      id: '2',
      title: 'New Patient Admission',
      message: 'Zubair Ali has been admitted in Karachi South.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    }
  ],
  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...state.notifications,
    ],
  })),
  markNotificationAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => 
      n.id === id ? { ...n, read: true } : n
    ),
  })),
  clearNotifications: () => set({ notifications: [] }),

  payrolls: [],
  setPayrolls: (payrolls) => set({ payrolls }),
  addPayroll: (payroll) => set((state) => ({ payrolls: [payroll, ...state.payrolls] })),
  updatePayrollStatus: (id, status) => set((state) => ({
    payrolls: state.payrolls.map((p) => p.id === id ? { ...p, status } : p)
  })),
}));
