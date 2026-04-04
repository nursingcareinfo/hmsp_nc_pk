import { Staff, Patient, District, Designation, AppUser } from './types';
import { INITIAL_STAFF } from './staffData';
import { supabase } from './lib/supabase';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    full_name: 'Zubair Ali',
    gender: 'Male',
    cnic: '42201-1234567-1',
    contact: '03123456789',
    address: 'DHA Phase 6, Karachi',
    district: 'Karachi South',
    status: 'Active',
    admission_date: '2024-03-15',
    guardian_name: 'Ali Raza',
    guardian_contact: '03219876543',
    guardian_cnic: '42201-7654321-2',
    guardian_relationship: 'Son',
    medical_condition: 'Post-surgery recovery',
    service_type: '24/7 Nursing Care',
    frequency: 'Daily',
    duration: '30 Days',
    assigned_staff_id: '2',
    billing_package: 'Premium',
    billing_rate: 85000,
    payment_method: 'Bank Transfer',
    advance_payment_received: true,
    advance_payment_date: '2024-03-14',
  },
  {
    id: '2',
    full_name: 'Mrs. Fatima Khan',
    gender: 'Female',
    cnic: '42101-9876543-2',
    contact: '03331234567',
    address: 'Gulshan-e-Iqbal Block 4, Karachi',
    district: 'Karachi East',
    status: 'Active',
    admission_date: '2024-02-28',
    guardian_name: 'Ahmed Khan',
    guardian_contact: '03451234567',
    guardian_cnic: '42101-1234567-3',
    guardian_relationship: 'Husband',
    medical_condition: 'Diabetes Management',
    service_type: '12/7 Nursing Care',
    frequency: 'Daily',
    duration: 'Ongoing',
    assigned_staff_id: '4',
    billing_package: 'Standard',
    billing_rate: 45000,
    payment_method: 'Cash',
    advance_payment_received: false,
  }
];

export const dataService = {
  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        return (data as Staff[]).map(s => ({
          ...s,
          shift_rate: s.shift_rate || Math.round(s.salary / 30)
        }));
      }
      if (error) console.error('Supabase getStaff error:', error);
    }
    
    // Fallback to local storage
    const stored = localStorage.getItem('nc_staff');
    if (stored) {
      const parsed = JSON.parse(stored) as Staff[];
      return parsed.map(s => ({
        ...s,
        shift_rate: s.shift_rate || Math.round(s.salary / 30)
      }));
    }
    const initial = INITIAL_STAFF.map(s => ({
      ...s,
      shift_rate: s.shift_rate || Math.round(s.salary / 30)
    }));
    localStorage.setItem('nc_staff', JSON.stringify(initial));
    return initial;
  },
  
  addStaff: async (staff: Omit<Staff, 'id' | 'assigned_id'>): Promise<Staff> => {
    if (supabase) {
      // Get count for assigned_id
      const { count } = await supabase.from('staff').select('*', { count: 'exact', head: true });
      const nextId = ((count || 0) + 1).toString().padStart(3, '0');
      const assigned_id = `NC-KHI-${nextId}`;
      
      const { data, error } = await supabase
        .from('staff')
        .insert([{ ...staff, assigned_id }])
        .select()
        .single();
      
      if (!error && data) return data as Staff;
      if (error) console.error('Error adding staff to Supabase:', error);
    }
    
    const currentStaff = await dataService.getStaff();
    const nextId = (currentStaff.length + 1).toString().padStart(3, '0');
    const newStaff: Staff = {
      ...staff,
      id: Math.random().toString(36).substring(7),
      assigned_id: `NC-KHI-${nextId}`,
      shift_rate: staff.shift_rate || Math.round(staff.salary / 30),
    };
    const updated = [newStaff, ...currentStaff];
    localStorage.setItem('nc_staff', JSON.stringify(updated));
    return newStaff;
  },
  
  updateStaff: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('staff')
        .update(staff)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as Staff;
    }
    
    const currentStaff = await dataService.getStaff();
    const updated = currentStaff.map((s) => s.id === id ? { ...s, ...staff } : s);
    localStorage.setItem('nc_staff', JSON.stringify(updated));
    return updated.find((s) => s.id === id)!;
  },
  
  getPatients: async (): Promise<Patient[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) return data as Patient[];
      if (error) console.error('Supabase getPatients error:', error);
    }
    
    const stored = localStorage.getItem('nc_patients');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('nc_patients', JSON.stringify(MOCK_PATIENTS));
    return MOCK_PATIENTS;
  },
  
  addPatient: async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('patients')
        .insert([patient])
        .select()
        .single();
      
      if (!error && data) return data as Patient;
    }
    
    const currentPatients = await dataService.getPatients();
    const newPatient: Patient = {
      ...patient,
      id: Math.random().toString(36).substring(7),
    };
    const updated = [newPatient, ...currentPatients];
    localStorage.setItem('nc_patients', JSON.stringify(updated));
    return newPatient;
  },
  
  updatePatient: async (id: string, patient: Partial<Patient>): Promise<Patient> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('patients')
        .update(patient)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as Patient;
    }
    
    const currentPatients = await dataService.getPatients();
    const updated = currentPatients.map((p) => p.id === id ? { ...p, ...patient } : p);
    localStorage.setItem('nc_patients', JSON.stringify(updated));
    return updated.find((p) => p.id === id)!;
  },
  
  deleteStaff: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (!error) return;
    }
    const currentStaff = await dataService.getStaff();
    const updated = currentStaff.filter((s) => s.id !== id);
    localStorage.setItem('nc_staff', JSON.stringify(updated));
  },
  
  deletePatient: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (!error) return;
    }
    const currentPatients = await dataService.getPatients();
    const updated = currentPatients.filter((p) => p.id !== id);
    localStorage.setItem('nc_patients', JSON.stringify(updated));
  },
  
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase) {
      return { 
        success: false, 
        message: 'Supabase configuration missing. Please go to the Secrets panel in AI Studio and add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' 
      };
    }
    try {
      // Increased timeout to 10 seconds
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out (10s)')), 10000)
      );
      
      const fetchPromise = supabase.from('staff').select('id', { count: 'exact', head: true });
      
      const { error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) throw error;
      return { success: true, message: 'Successfully connected to Supabase!' };
    } catch (err: any) {
      console.error('Supabase Connection Test Failed:', err);
      let msg = err.message || 'Unknown error';
      
      if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        const url = import.meta.env.VITE_SUPABASE_URL || '';
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        msg = 'Network Error: Failed to fetch. ';
        
        if (!url.startsWith('https://')) {
          msg += 'Your Supabase URL must start with https://. ';
        }
        
        if (key && !key.startsWith('eyJ')) {
          msg += 'Your Supabase Anon Key looks invalid (it should start with "eyJ"). ';
        }
        
        msg += 'Common causes: 1) Incorrect URL/Key in Secrets. 2) Supabase project is paused. 3) AdBlocker/VPN is blocking the request. 4) The staff table does not exist in your public schema.';
      }
      
      return { success: false, message: `Connection failed: ${msg}` };
    }
  },
  
  // --- User Management (Firestore) ---
  
  getUsers: async (): Promise<AppUser[]> => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as AppUser[];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },
  
  getUserProfile: async (uid: string): Promise<AppUser | null> => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), uid: docSnap.id } as AppUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },
  
  syncUserProfile: async (user: any): Promise<AppUser> => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    const userData = {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`,
      lastLogin: new Date().toISOString(),
    };
    
    if (!docSnap.exists()) {
      // New user
      const newUser: any = {
        ...userData,
        role: user.email === 'nursingcareinfo21@gmail.com' ? 'admin' : 'viewer',
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, newUser);
      return { ...newUser, uid: user.uid };
    } else {
      // Existing user
      await updateDoc(docRef, userData);
      return { ...docSnap.data(), ...userData, uid: user.uid } as AppUser;
    }
  },
  
  updateUserRole: async (uid: string, role: 'admin' | 'staff' | 'viewer'): Promise<void> => {
    try {
      if (role === 'admin') {
        const users = await dataService.getUsers();
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount >= 2) {
          throw new Error('Maximum limit of 2 administrators reached. Please revoke admin access from another user first.');
        }
      }
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, { role });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },
  
  deleteUser: async (uid: string): Promise<void> => {
    try {
      const docRef = doc(db, 'users', uid);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
};
