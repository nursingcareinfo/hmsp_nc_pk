
import { dataService } from './src/dataService';
import { format } from 'date-fns';

async function runTest() {
  console.log('🚀 Starting Supabase Remote Update Test...');

  // Mock localStorage for Node.js
  if (typeof global.localStorage === 'undefined') {
    (global as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };
  }

  try {
    // 1. Add a Test Staff Member
    const testStaff = {
      full_name: "Test Staff (Karachi)",
      cnic: "42101-9999999-9",
      contact_1: "0300-1234567",
      designation: "Registered Nurse (R/N)",
      category: "Nurses",
      official_district: "Karachi South",
      gender: "Female",
      religion: "Islam",
      marital_status: "Single",
      residential_area: "DHA",
      address: "Phase 6, Karachi",
      qualification: "BSc Nursing",
      experience_years: 5,
      salary: 45000,
      shift_rate: 2500,
      status: "Active",
      availability: "Immediate",
      hire_date: new Date().toISOString().split('T')[0]
    };

    console.log('Adding test staff...');
    const staffResult = await dataService.addStaff(testStaff as any);
    console.log('✅ Staff added successfully:', staffResult.full_name, 'ID:', staffResult.assigned_id);

    // 2. Add a Test Patient
    const testPatient = {
      full_name: "Test Patient (Clifton)",
      cnic: "42101-8888888-8",
      contact: "0321-7654321",
      address: "House 123, Block 5, Clifton, Karachi",
      district: "South",
      medical_condition: "Post-Surgery Recovery",
      service_type: "24/7 Nursing",
      billing_rate: 75000,
      billing_package: "Premium",
      status: "Pending",
      admission_date: new Date().toISOString().split('T')[0],
      guardian_name: "Test Guardian",
      guardian_contact: "0333-1112223"
    };

    console.log('Adding test patient...');
    const patientResult = await dataService.addPatient(testPatient as any);
    console.log('✅ Patient added successfully:', patientResult.full_name);

    console.log('\n✨ Test Complete! Check your Dashboard or Supabase Dashboard to see the new entries.');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

runTest();
