import { Staff, Patient, District, Designation, AppUser } from './types';
import { INITIAL_STAFF } from './staffData';
import { supabase } from './lib/supabase';
import { SUPER_ADMIN_EMAIL, MAX_ADMINS } from './constants';

const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    full_name: 'Zubair Ali',
    gender: 'Male' as any,
    cnic: '42201-1234567-1',
    contact: '03123456789',
    address: 'DHA Phase 6, Karachi',
    district: 'Karachi South' as District,
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
    needs_day_shift: true,
    needs_night_shift: true,
  },
  {
    id: '2',
    full_name: 'Mrs. Fatima Khan',
    gender: 'Female' as any,
    cnic: '42101-9876543-2',
    contact: '03331234567',
    address: 'Gulshan-e-Iqbal Block 4, Karachi',
    district: 'Karachi East' as District,
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
    needs_day_shift: true,
    needs_night_shift: false,
  }
];

export const dataService = {
  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      // Supabase Cloud limits responses to 1000 rows per request.
      // We fetch in batches of 1000 until we get fewer than 1000 back.
      const seenIds = new Set<string>();
      let allStaff: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('staff')
          .select('id, assigned_id, full_name, father_husband_name, cnic, contact_1, contact_2, whatsapp, email, category, designation, gender, religion, marital_status, official_district, residential_area, area_town, city, address, status, hire_date, qualification, experience_years, salary, shift_rate, shift_preference, availability, photo_url, created_at, updated_at')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('Supabase getStaff error:', error);
          break;
        }
        if (!data || data.length === 0) break;

        // Deduplicate by ID to prevent any overlap between batches
        const newRecords = data.filter(r => !seenIds.has(r.id));
        newRecords.forEach(r => seenIds.add(r.id));
        allStaff = allStaff.concat(newRecords);

        if (data.length < batchSize) break; // Got all records
        from += batchSize;
      }

      return allStaff.map(s => ({
        ...s,
        shift_rate: s.shift_rate || Math.round((s.salary || 30000) / 30)
      }));
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
      // Don't generate assigned_id here — the database trigger auto-generates it
      // via the trg_generate_assigned_id trigger using a PostgreSQL sequence
      const { data, error } = await supabase
        .from('staff')
        .insert([staff])
        .select()
        .single();

      if (!error && data) return data as Staff;
      if (error) {
        console.error('Error adding staff to Supabase:', error);
        // If UNIQUE constraint violated, retry once (sequence gap edge case)
        if (error.code === '23505') {
          const { data: retryData, error: retryError } = await supabase
            .from('staff')
            .insert([staff])
            .select()
            .single();
          if (!retryError && retryData) return retryData as Staff;
        }
      }
    }

    // Fallback: localStorage (for offline/dev)
    const currentStaff = await dataService.getStaff();
    // Generate next ID locally (less reliable than DB sequence)
    const maxId = currentStaff.reduce((max, s) => {
      const match = s.assigned_id?.match(/NC-KHI-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    const nextId = (maxId + 1).toString().padStart(3, '0');
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
      // Supabase Cloud limits responses to 1000 rows per request.
      // We fetch in batches of 1000 until we get fewer than 1000 back.
      let allPatients: any[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('patients')
          .select('id, full_name, cnic, contact, alt_contact, email, whatsapp, address, area, city, district, status, admission_date, date_of_birth, gender, blood_group, marital_status, guardian_name, guardian_contact, guardian_cnic, guardian_relationship, medical_condition, primary_diagnosis, current_condition, current_medications, allergies, medical_requirements, equipment_requirements, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, doctor_name, doctor_specialty, doctor_hospital, doctor_phone, doctor_notes, special_requirements, service_type, frequency, duration, billing_package, billing_rate, payment_method, advance_payment_received, advance_payment_date, assigned_staff_id, created_at, updated_at')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('Supabase getPatients error:', error);
          break;
        }
        if (!data || data.length === 0) break;

        allPatients = allPatients.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }

      return allPatients as Patient[];
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
  
  // --- User Management (Supabase) ---

  getUsers: async (): Promise<AppUser[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, photo_url, role, created_at, last_login')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(u => ({
        uid: u.id,
        email: u.email,
        displayName: u.display_name,
        photoURL: u.photo_url,
        role: u.role,
        createdAt: u.created_at,
        lastLogin: u.last_login
      }));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  getUserProfile: async (uid: string): Promise<AppUser | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) return null;
      return { ...data, uid: data.id };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  syncUserProfile: async (user: any): Promise<AppUser> => {
    if (!supabase) {
      return {
        uid: user.id,
        email: user.email,
        displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: user.email === SUPER_ADMIN_EMAIL ? 'admin' : 'viewer',
        photoURL: user.user_metadata?.avatar_url,
        createdAt: user.created_at,
        lastLogin: new Date().toISOString()
      };
    }

    // Check if user exists in users table
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const userData = {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      photo_url: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!existing) {
      // New user - insert into users table
      const newUser = {
        ...userData,
        role: user.email === SUPER_ADMIN_EMAIL ? 'admin' : 'viewer',
        created_at: new Date().toISOString(),
      };
      await supabase.from('users').insert([newUser]);
      return {
        uid: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        photoURL: newUser.photo_url,
        role: newUser.role as 'admin' | 'staff' | 'viewer',
        createdAt: newUser.created_at,
        lastLogin: newUser.last_login
      };
    } else {
      // Existing user - update last login
      await supabase.from('users').update(userData).eq('id', user.id);
      return {
        uid: existing.id,
        email: existing.email,
        displayName: existing.display_name || userData.display_name,
        photoURL: existing.photo_url || userData.photo_url,
        role: existing.role as 'admin' | 'staff' | 'viewer',
        createdAt: existing.created_at,
        lastLogin: userData.last_login
      };
    }
  },

  updateUserRole: async (uid: string, role: 'admin' | 'staff' | 'viewer'): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      if (role === 'admin') {
        const users = await dataService.getUsers();
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount >= MAX_ADMINS) {
          throw new Error(`Maximum limit of ${MAX_ADMINS} administrators reached. Please revoke admin access from another user first.`);
        }
      }
      const { error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', uid);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  deleteUser: async (uid: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', uid);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
};
