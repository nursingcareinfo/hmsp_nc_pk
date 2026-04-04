/**
 * Patient-Staff Matching Algorithm
 * 
 * Matches patients to optimal staff based on:
 * 1. District proximity (highest weight)
 * 2. Category/Skill match
 * 3. Availability status
 * 4. Shift compatibility
 * 5. Experience level
 * 6. Gender preference (optional)
 * 
 * Returns ranked list of best-matching staff members.
 */

import { Staff, Patient, District } from '../types';

// ============================================
// CONFIGURATION
// ============================================

const WEIGHTS = {
  district: 35,        // Must be in same district
  category: 25,        // Skill match (nurse vs attendant)
  availability: 15,    // Immediate availability
  shift: 10,           // Day/Night/24hr compatibility
  experience: 10,      // More experience = higher score
  gender: 5,           // Patient preference for gender
};

// Service type to staff category mapping
const SERVICE_TO_CATEGORY: Record<string, string[]> = {
  '24/7 Nursing Care': ['Nurses'],
  '12/7 Nursing Care': ['Nurses'],
  'Attendant Service': ['Attendants'],
  'Physiotherapy': ['Doctors', 'Technical'],
  'Baby Sitting': ['Attendants'],
  'Midwife Service': ['Midwives'],
};

// Service type to shift preference mapping
const SERVICE_TO_SHIFT: Record<string, string[]> = {
  '24/7 Nursing Care': ['24 hrs', 'Day', 'Night'],
  '12/7 Nursing Care': ['Day', 'Night'],
  'Attendant Service': ['Day', 'Night', '24 hrs'],
  'Physiotherapy': ['Day'],
};

// ============================================
// DISTRICT NORMALIZATION
// ============================================

// Normalize district names for matching
const DISTRICT_ALIASES: Record<string, string> = {
  'Karachi South': 'Karachi South',
  'South': 'Karachi South',
  'Karachi Central': 'Karachi Central',
  'Central': 'Karachi Central',
  'Karachi East': 'Karachi East',
  'East': 'Karachi East',
  'Karachi West': 'Karachi West',
  'West': 'Karachi West',
  'Gulshan-e-Iqbal': 'Gulshan-e-Iqbal',
  'Gulshan': 'Gulshan-e-Iqbal',
  'Korangi': 'Korangi',
  'Malir': 'Malir',
  'Keamari': 'Keamari',
  'Nazimabad': 'Nazimabad',
  'Orangi Town': 'Orangi Town',
  'Orangi': 'Orangi Town',
};

function normalizeDistrict(district: string): string {
  return DISTRICT_ALIASES[district] || district;
}

// ============================================
// SCORING FUNCTIONS
// ============================================

function scoreDistrict(staff: Staff, patient: Patient): number {
  const staffDistrict = normalizeDistrict(staff.official_district || '');
  const patientDistrict = normalizeDistrict(patient.district || '');
  
  if (!staffDistrict || !patientDistrict) return 0;
  
  // Exact match = full points
  if (staffDistrict === patientDistrict) return WEIGHTS.district;
  
  // Adjacent districts get partial points (simplified)
  const adjacentMap: Record<string, string[]> = {
    'Karachi South': ['Karachi Central', 'Keamari'],
    'Karachi Central': ['Karachi South', 'Karachi East', 'Nazimabad'],
    'Karachi East': ['Karachi Central', 'Korangi', 'Gulshan-e-Iqbal'],
    'Korangi': ['Karachi East', 'Malir'],
    'Malir': ['Korangi', 'Karachi East'],
    'Keamari': ['Karachi South', 'Karachi West'],
    'Karachi West': ['Keamari', 'Orangi Town'],
    'Nazimabad': ['Karachi Central', 'Orangi Town'],
    'Orangi Town': ['Nazimabad', 'Karachi West'],
    'Gulshan-e-Iqbal': ['Karachi East'],
  };
  
  const adjacent = adjacentMap[patientDistrict] || [];
  if (adjacent.includes(staffDistrict)) {
    return WEIGHTS.district * 0.5; // 50% for adjacent districts
  }
  
  return 0; // No match
}

function scoreCategory(staff: Staff, patient: Patient): number {
  const serviceType = patient.service_type || '';
  const requiredCategories = SERVICE_TO_CATEGORY[serviceType] || [];
  
  if (requiredCategories.length === 0) return WEIGHTS.category * 0.5; // Partial if unknown service
  
  const staffCategory = staff.category || '';
  
  if (requiredCategories.includes(staffCategory)) {
    return WEIGHTS.category;
  }
  
  // Partial match: Attendants can sometimes substitute for Nurses (lower skill)
  if (staffCategory === 'Attendants' && requiredCategories.includes('Nurses')) {
    return WEIGHTS.category * 0.3;
  }
  
  return 0;
}

function scoreAvailability(staff: Staff): number {
  if (staff.status !== 'Active') return 0;
  
  const availability = staff.availability || 'Immediate';
  
  switch (availability) {
    case 'Immediate': return WEIGHTS.availability;
    case '2 Weeks': return WEIGHTS.availability * 0.5;
    case '1 Month': return WEIGHTS.availability * 0.25;
    default: return WEIGHTS.availability * 0.5;
  }
}

function scoreShift(staff: Staff, patient: Patient): number {
  const serviceType = patient.service_type || '';
  const acceptableShifts = SERVICE_TO_SHIFT[serviceType] || ['Day', 'Night', '24 hrs'];
  
  const staffShift = staff.shift_preference || 'Day';
  
  if (acceptableShifts.includes(staffShift)) {
    return WEIGHTS.shift;
  }
  
  // Partial: Day shift can sometimes cover 24/7 with rotation
  if (staffShift === 'Day' && serviceType === '24/7 Nursing Care') {
    return WEIGHTS.shift * 0.3;
  }
  
  return 0;
}

function scoreExperience(staff: Staff): number {
  const years = staff.experience_years || 0;
  
  // Scale: 0-1 years = 20%, 1-3 = 50%, 3-5 = 80%, 5+ = 100%
  if (years >= 5) return WEIGHTS.experience;
  if (years >= 3) return WEIGHTS.experience * 0.8;
  if (years >= 1) return WEIGHTS.experience * 0.5;
  return WEIGHTS.experience * 0.2;
}

function scoreGender(staff: Staff, patient: Patient): number {
  // If patient has no gender preference, everyone gets full points
  const patientGender = patient.gender;
  const staffGender = staff.gender;
  
  if (!patientGender) {
    return WEIGHTS.gender;
  }
  
  if (staffGender === patientGender) {
    return WEIGHTS.gender;
  }
  
  return 0;
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export interface MatchResult {
  staff: Staff;
  score: number;          // 0-100
  maxScore: number;       // Maximum possible score
  percentage: number;     // Match percentage
  breakdown: {
    district: number;
    category: number;
    availability: number;
    shift: number;
    experience: number;
    gender: number;
  };
  reason: string;         // Human-readable match reason
}

export function matchStaffToPatient(
  patient: Patient,
  availableStaff: Staff[],
  options?: {
    minScore?: number;    // Minimum match score (0-100)
    limit?: number;       // Max results to return
    excludeAssigned?: boolean; // Exclude already assigned staff
  }
): MatchResult[] {
  const {
    minScore = 20,
    limit = 10,
    excludeAssigned = true,
  } = options || {};
  
  const maxPossibleScore = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  
  // Filter out already assigned staff if requested
  let candidates = availableStaff;
  if (excludeAssigned) {
    candidates = availableStaff.filter(s => s.status === 'Active');
  }
  
  // Score each candidate
  const results: MatchResult[] = candidates
    .map(staff => {
      const districtScore = scoreDistrict(staff, patient);
      const categoryScore = scoreCategory(staff, patient);
      const availabilityScore = scoreAvailability(staff);
      const shiftScore = scoreShift(staff, patient);
      const experienceScore = scoreExperience(staff);
      const genderScore = scoreGender(staff, patient);
      
      const totalScore = districtScore + categoryScore + availabilityScore + 
                         shiftScore + experienceScore + genderScore;
      const percentage = Math.round((totalScore / maxPossibleScore) * 100);
      
      // Generate reason
      const reasons: string[] = [];
      if (districtScore === WEIGHTS.district) reasons.push(`Same district (${staff.official_district})`);
      else if (districtScore > 0) reasons.push(`Adjacent district`);
      
      if (categoryScore === WEIGHTS.category) reasons.push(`Exact skill match`);
      else if (categoryScore > 0) reasons.push(`Partial skill match`);
      
      if (availabilityScore === WEIGHTS.availability) reasons.push('Available immediately');
      else if (availabilityScore > 0) reasons.push(`Available in ${staff.availability}`);
      
      if (experienceScore >= WEIGHTS.experience * 0.8) reasons.push(`Experienced (${staff.experience_years} years)`);
      else if (experienceScore > 0) reasons.push(`Junior (${staff.experience_years} years)`);
      
      return {
        staff,
        score: totalScore,
        maxScore: maxPossibleScore,
        percentage,
        breakdown: {
          district: districtScore,
          category: categoryScore,
          availability: availabilityScore,
          shift: shiftScore,
          experience: experienceScore,
          gender: genderScore,
        },
        reason: reasons.join(' • ') || 'Basic match',
      };
    })
    .filter(r => r.percentage >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return results;
}

// ============================================
// AUTO-ASSIGN FUNCTION
// ============================================

export function autoAssignStaff(
  patient: Patient,
  availableStaff: Staff[]
): MatchResult | null {
  const matches = matchStaffToPatient(patient, availableStaff, { 
    minScore: 40, // Minimum 40% match for auto-assignment
    limit: 1 
  });
  
  return matches.length > 0 ? matches[0] : null;
}

// ============================================
// STAFF UTILIZATION SUMMARY
// ============================================

export function getStaffUtilizationSummary(staff: Staff[]): {
  total: number;
  active: number;
  available: number;
  onLeave: number;
  inactive: number;
  byDistrict: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const summary = {
    total: staff.length,
    active: 0,
    available: 0,
    onLeave: 0,
    inactive: 0,
    byDistrict: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };
  
  staff.forEach(s => {
    // Status counts
    if (s.status === 'Active') summary.active++;
    else if (s.status === 'On Leave') summary.onLeave++;
    else summary.inactive++;
    
    // Available = Active + Immediate availability
    if (s.status === 'Active' && s.availability === 'Immediate') {
      summary.available++;
    }
    
    // District breakdown
    const district = s.official_district || 'Unknown';
    summary.byDistrict[district] = (summary.byDistrict[district] || 0) + 1;
    
    // Category breakdown
    const category = s.category || 'Other';
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
  });
  
  return summary;
}
