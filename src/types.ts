export type District = 
  | 'Karachi Central'
  | 'Karachi East'
  | 'Karachi South'
  | 'Karachi West'
  | 'Korangi'
  | 'Malir'
  | 'Keamari'
  | 'Gulshan-e-Iqbal'
  | 'Orangi Town'
  | 'Nazimabad'
  | 'Lyari'
  | 'Baldia Town'
  | 'Landhi'
  | 'PECHS'
  | 'Clifton'
  | 'Mehmoodabad'
  | 'Azam Town'
  | 'Akhtar Colony'
  | 'Garden'
  | 'Jamshed Road'
  | 'North Nazimabad'
  | 'Surjani Town'
  | 'Mirpurkhas'
  | 'Sialkot'
  | 'Board Office'
  | 'Latif Town'
  | 'Hijrat Colony'
  | 'Shafi Pump'
  | 'Gao Line'
  | 'Azeem Khan Goth'
  | 'KDA Scheme'
  | 'Shanti Nagar'
  | 'Mehran Town'
  | 'Railway Colony'
  | 'Nasir Colony'
  | 'Water Pump'
  | 'Christian Colony'
  | 'Other';

export type StaffStatus = 'Active' | 'On Leave' | 'Inactive';
export type PatientStatus = 'Active' | 'Discharged' | 'Pending';

export type StaffCategory = 
  | 'Management'
  | 'Nurses'
  | 'Midwives'
  | 'Attendants'
  | 'Doctors'
  | 'Technical'
  | 'Other';

export type Designation = 
  | 'Doctor'
  | 'Registered Nurse (R/N)'
  | 'BSN Nurse'
  | 'Nurse Assistant'
  | 'Mid Wife'
  | 'Attendant'
  | 'Baby Sitter'
  | 'Physiotherapist'
  | 'Technician'
  | 'CEO & Managing Director'
  | 'Office Coordinator & HR Manager'
  | 'Manager'
  | 'Office Boy'
  | 'Staff Nurse'
  | 'EMT Tech'
  | 'NGA'
  | 'ICU technician'
  | 'Community Midwife'
  | 'HCA'
  | 'Nursing Staff'
  | 'Aid Nurse'
  | 'Nurse Aid'
  | 'CCT + O.T. Tech'
  | 'R.N.R.M'
  | 'Medical'
  | 'CEO/Admin'
  | 'IT AI Expert'
  | 'Office Co-ordinator'
  | 'Other';

export interface Education {
  degree: string;
  institution: string;
  year: string;
  marks: string;
}

export interface EmploymentHistory {
  employer: string;
  position: string;
  duration: string;
  reason: string;
}

export interface AdvancePayment {
  id: string;
  staff_id: string;
  amount: number;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Deducted' | 'Cancelled';
}

export interface AdvanceRecord {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_assigned_id: string;
  staff_designation: string;
  staff_district: string;
  staff_salary: number;
  amount: number;
  advance_date: string;
  reason: string;
  payment_method: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Deducted' | 'Cancelled';
  deducted_from_salary: number;
  deducted_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  assigned_id: string; // NC-KHI-XXX
  full_name: string;
  father_husband_name?: string;
  date_of_birth?: string;
  cnic: string;
  contact_1: string;
  contact_2?: string;
  alt_number?: string;
  email?: string;
  whatsapp?: string;
  category?: StaffCategory;
  designation: Designation;
  gender: 'Male' | 'Female';
  religion: string;
  marital_status: string;
  official_district: District;
  residential_area: string;
  area_town?: string;
  city?: string;
  address: string;
  status: StaffStatus;
  hire_date: string;
  qualification: string;
  experience_years: number;
  relevant_experience?: string;
  pnc_number?: string;
  guarantor_name?: string;
  guarantor_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_alt_phone?: string;
  emergency_contact_relationship?: string;
  preferred_payment?: string;
  bank_name?: string;
  account_title?: string;
  account_number?: string;
  iban?: string;
  salary: number;
  shift_rate?: number;
  shift_preference?: 'Day' | 'Night' | '24 hrs';
  expected_salary?: number;
  availability?: 'Immediate' | '2 Weeks' | '1 Month';
  education?: Education[];
  employment_history?: EmploymentHistory[];
  advances?: AdvancePayment[];
  photo_url?: string;
  cnic_image_urls?: string[];
  form_image_urls?: string[];
}

export interface Patient {
  id: string;
  full_name: string;
  cnic: string;
  contact: string;
  alt_contact?: string;
  email?: string;
  whatsapp?: string;
  address: string;
  area?: string;
  city?: string;
  district: District;
  status: PatientStatus;
  admission_date: string;
  date_of_birth?: string;
  gender: 'Male' | 'Female';
  blood_group?: string;
  marital_status?: string;
  guardian_name: string;
  guardian_contact: string;
  guardian_cnic: string;
  guardian_relationship: string;
  medical_condition: string;
  primary_diagnosis?: string;
  current_condition?: string;
  current_medications?: string;
  allergies?: string;
  medical_requirements?: string[]; // Oxygen, Suction, etc.
  equipment_requirements?: string[]; // Ventilator, BIPAP, etc.
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_hospital?: string;
  doctor_phone?: string;
  doctor_notes?: string;
  special_requirements?: string;
  service_type: string;
  frequency: string;
  duration: string;
  assigned_staff_id?: string;
  billing_package: string;
  billing_rate: number;
  payment_method: string;
  advance_payment_received: boolean;
  advance_payment_date?: string;
  cnic_image_urls?: string[];
  form_image_urls?: string[];
  // Shift preferences
  needs_day_shift: boolean;
  needs_night_shift: boolean;
  day_shift_start?: string;
  day_shift_end?: string;
  night_shift_start?: string;
  night_shift_end?: string;
  shift_instructions?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'staff' | 'viewer';
  createdAt: string;
  lastLogin: string;
}

export interface Payroll {
  id: string;
  staff_id: string;
  staff_name: string;
  designation: Designation;
  period_start: string;
  period_end: string;
  shifts_worked: number;
  shift_rate: number;
  base_salary: number;
  allowances: number;
  deductions: number;
  deductions_advances?: number;
  net_salary: number;
  status: 'Pending' | 'Paid' | 'Cancelled';
  payment_date?: string;
  day_shifts_completed: number;
  night_shifts_completed: number;
  night_premium_total: number;
}

export interface DutyAssignment {
  id: string;
  patient_id: string;
  staff_id: string;
  shift_type: 'day' | 'night';
  duty_date: string;
  shift_start?: string;
  shift_end?: string;
  status: 'assigned' | 'confirmed' | 'completed' | 'absent' | 'no_show' | 'cancelled';
  clock_in_time?: string;
  clock_out_time?: string;
  clock_in_location?: string;
  clock_out_location?: string;
  notes?: string;
  admin_notes?: string;
  is_payroll_processed: boolean;
  assigned_by?: string;
  assigned_at: string;
  updated_at: string;
}
