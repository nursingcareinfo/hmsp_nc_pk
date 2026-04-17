import { Staff, Patient, District, Designation, AppUser } from './types';
import { INITIAL_STAFF } from './staffData';
import { supabase } from './lib/supabase';
import { SUPER_ADMIN_EMAIL, MAX_ADMINS, DEMO_MODE, DEMO_MAX_PATIENTS, DEMO_MAX_STAFF } from './constants';
import { DEMO_STAFF, DEMO_PATIENTS } from './demoData';
import { toast } from 'sonner';

// Track connection state to avoid repeated toasts
let connectionLostToastShown = false;

/**
 * Supabase-first data service.
 * - Reads: Try Supabase → on failure, show toast + return localStorage cache (stale)
 * - Writes: Try Supabase → on failure, throw error with toast (NO silent fallback)
 */
export const dataService = {
  getStaff: async (): Promise<Staff[]> => {
    // Demo mode - return mock data
    if (DEMO_MODE) {
      return DEMO_STAFF;
    }

    if (supabase) {
      const seenIds = new Set<string>();
      let allStaff: any[] = [];
      let from = 0;
      const batchSize = 1000;

      try {
        while (true) {
          const { data, error } = await supabase
            .from('staff')
            .select('id, assigned_id, full_name, father_husband_name, cnic, contact_1, contact_2, whatsapp, email, category, designation, gender, religion, marital_status, official_district, residential_area, area_town, city, address, status, hire_date, qualification, experience_years, salary, shift_rate, shift_preference, availability, photo_url, created_at, updated_at')
            .order('created_at', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) {
            throw error;
          }
          if (!data || data.length === 0) break;

          const newRecords = data.filter(r => !seenIds.has(r.id));
          newRecords.forEach(r => seenIds.add(r.id));
          allStaff = allStaff.concat(newRecords);

          if (data.length < batchSize) break;
          from += batchSize;
        }

        connectionLostToastShown = false; // Reset on success

        // Fetch reliability scores
        let scoreMap = new Map<string, number>();
        try {
          const { data: scores, error: scoresError } = await supabase
            .from('staff_reliability_scores')
            .select('staff_id, reliability_score');
          if (!scoresError && scores) {
            scoreMap = new Map(scores.map(s => [s.staff_id, s.reliability_score]));
          }
        } catch {
          // Gracefully ignore if view doesn't exist yet
        }

        return allStaff.map(s => ({
          ...s,
          shift_rate: s.shift_rate || (s.salary ? Math.round(s.salary / 30) : 1000),
          reliability_score: scoreMap.get(s.id) ?? 0
        }));
      } catch (error: any) {
        if (!connectionLostToastShown) {
          toast.warning('Database connection issue — showing cached data', {
            description: 'Some data may be out of date. Check your internet connection.'
          });
          connectionLostToastShown = true;
        }
      }
    }

    // Fallback: localStorage cache (stale — already warned user via toast)
    const stored = localStorage.getItem('nc_staff');
    if (stored) {
      const parsed = JSON.parse(stored) as Staff[];
      return parsed.map(s => ({
        ...s,
        shift_rate: s.shift_rate || (s.salary ? Math.round(s.salary / 30) : 1000),
        reliability_score: s.reliability_score ?? 0
      }));
    }
    return INITIAL_STAFF.map(s => ({
      ...s,
      shift_rate: s.shift_rate || (s.salary ? Math.round(s.salary / 30) : 1000),
      reliability_score: (s as Staff).reliability_score ?? 0
    }));
  },
  
  addStaff: async (staff: Omit<Staff, 'id' | 'assigned_id'>): Promise<Staff> => {
    // Demo mode - use localStorage with limit
    if (DEMO_MODE) {
      const stored = localStorage.getItem('nc_demo_staff');
      const existingStaff: Staff[] = stored ? JSON.parse(stored) : [...DEMO_STAFF];
      
      if (existingStaff.length >= DEMO_MAX_STAFF) {
        toast.error('Demo limit reached', {
          description: `Maximum of ${DEMO_MAX_STAFF} staff allowed in demo mode.`
        });
        throw new Error(`Demo limit: maximum ${DEMO_MAX_STAFF} staff allowed`);
      }
      
      const newStaff: Staff = {
        ...staff,
        id: `DEMO-USER-${Date.now()}`,
        assigned_id: `NC-KHI-D${String(existingStaff.length + 1).padStart(3, '0')}`,
      } as Staff;
      
      const updatedStaff = [...existingStaff, newStaff];
      localStorage.setItem('nc_demo_staff', JSON.stringify(updatedStaff));
      toast.success('Staff added in demo mode');
      return newStaff;
    }

    if (!supabase) {
      toast.error('Database not configured');
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('staff')
      .insert([staff])
      .select()
      .single();

    if (error) {
      // Retry once on unique constraint violation (sequence gap edge case)
      if (error.code === '23505') {
        const { data: retryData, error: retryError } = await supabase
          .from('staff')
          .insert([staff])
          .select()
          .single();
        if (!retryError && retryData) return retryData as Staff;
        toast.error('Failed to add staff: duplicate ID');
        throw new Error(`Failed to save staff: ${retryError?.message}`);
      }
      toast.error('Failed to add staff', { description: error.message });
      throw new Error(`Failed to save staff: ${error.message}`);
    }
    return data as Staff;
  },
  
  updateStaff: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
    if (!supabase) {
      toast.error('Database not configured');
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('staff')
      .update(staff)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update staff', { description: error.message });
      throw new Error(`Failed to update staff: ${error.message}`);
    }
    return data as Staff;
  },
  
  getPatients: async (): Promise<Patient[]> => {
    // Demo mode - return mock data
    if (DEMO_MODE) {
      return DEMO_PATIENTS;
    }

    if (supabase) {
      let allPatients: any[] = [];
      let from = 0;
      const batchSize = 1000;

      try {
        while (true) {
          const { data, error } = await supabase
            .from('patients')
            .select('id, patient_id_assigned, full_name, cnic, contact, alt_contact, email, whatsapp, address, area, city, district, status, admission_date, date_of_birth, gender, blood_group, marital_status, guardian_name, guardian_contact, guardian_cnic, guardian_relationship, medical_condition, primary_diagnosis, current_condition, current_medications, allergies, medical_requirements, equipment_requirements, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, doctor_name, doctor_specialty, doctor_hospital, doctor_phone, doctor_notes, special_requirements, service_type, frequency, duration, billing_package, billing_rate, payment_method, advance_payment_received, advance_payment_date, assigned_staff_id, created_at, updated_at')
            .order('created_at', { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          allPatients = allPatients.concat(data);
          if (data.length < batchSize) break;
          from += batchSize;
        }

        connectionLostToastShown = false;
        return allPatients as Patient[];
      } catch (error: any) {
        if (!connectionLostToastShown) {
          toast.warning('Database connection issue — showing cached data', {
            description: 'Some data may be out of date. Check your internet connection.'
          });
          connectionLostToastShown = true;
        }
      }
    }

    // Fallback: localStorage cache (stale)
    const stored = localStorage.getItem('nc_patients');
    if (stored) return JSON.parse(stored);
    return [];
  },
  
  addPatient: async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
    // Demo mode - use localStorage with limit
    if (DEMO_MODE) {
      const stored = localStorage.getItem('nc_demo_patients');
      const existingPatients: Patient[] = stored ? JSON.parse(stored) : [...DEMO_PATIENTS];
      
      if (existingPatients.length >= DEMO_MAX_PATIENTS) {
        toast.error('Demo limit reached', {
          description: `Maximum of ${DEMO_MAX_PATIENTS} patients allowed in demo mode.`
        });
        throw new Error(`Demo limit: maximum ${DEMO_MAX_PATIENTS} patients allowed`);
      }
      
      const nextId = existingPatients.length + 1;
      const newPatient: Patient = {
        ...patient,
        id: `DEMO-PAT-${Date.now()}`,
        patient_id_assigned: `NC-PAT-${String(nextId).padStart(4, '0')}`,
      } as Patient;
      
      const updatedPatients = [...existingPatients, newPatient];
      localStorage.setItem('nc_demo_patients', JSON.stringify(updatedPatients));
      toast.success('Patient registered in demo mode');
      return newPatient;
    }

    if (!supabase) {
      toast.error('Database not configured');
      throw new Error('Supabase not configured');
    }

    const { id, ...patientData } = patient as any;

    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single();

    if (error) {
      toast.error('Failed to register patient', { description: error.message });
      throw new Error(`Failed to save patient: ${error.message}`);
    }
    return data as Patient;
  },
  
  updatePatient: async (id: string, patient: Partial<Patient>): Promise<Patient> => {
    if (!supabase) {
      toast.error('Database not configured');
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('patients')
      .update(patient)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update patient', { description: error.message });
      throw new Error(`Failed to update patient: ${error.message}`);
    }
    return data as Patient;
  },

  deleteStaff: async (id: string): Promise<void> => {
    if (!supabase) {
      toast.error('Database not configured');
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete staff', { description: error.message });
      throw new Error(`Failed to delete staff: ${error.message}`);
    }
  },

  deletePatient: async (id: string): Promise<void> => {
    if (!supabase) {
      toast.error('Database not configured');
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete patient', { description: error.message });
      throw new Error(`Failed to delete patient: ${error.message}`);
    }
  },
  
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase) {
      return { 
        success: false, 
        message: 'Database connection not configured. Environment variables required.' 
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
