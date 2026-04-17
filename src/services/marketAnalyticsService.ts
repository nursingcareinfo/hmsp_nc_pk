import { supabase } from '../lib/supabase';
import { ServiceCategory, District, AcuityLevel, MarketAnalytics, CompetencyReference, StaffCompetency } from '../types';

export const marketAnalyticsService = {
  async getServiceCategoryStats(): Promise<{ category: ServiceCategory; count: number; avgRate: number }[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('patients')
      .select('service_category, billing_rate')
      .not('service_category', 'is', null);

    if (error) {
      console.error('Failed to get service category stats:', error);
      return [];
    }

    const stats = new Map<ServiceCategory, { count: number; totalRate: number }>();
    
    for (const row of data) {
      if (!row.service_category) continue;
      const category = row.service_category as ServiceCategory;
      const existing = stats.get(category) || { count: 0, totalRate: 0 };
      stats.set(category, {
        count: existing.count + 1,
        totalRate: existing.totalRate + (row.billing_rate || 0),
      });
    }

    return Array.from(stats.entries()).map(([category, { count, totalRate }]) => ({
      category,
      count,
      avgRate: count > 0 ? Math.round(totalRate / count) : 0,
    }));
  },

  async getAcuityDistribution(): Promise<{ level: AcuityLevel; count: number }[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('patients')
      .select('acuity_level')
      .not('acuity_level', 'is', null);

    if (error) {
      console.error('Failed to get acuity distribution:', error);
      return [];
    }

    const counts = new Map<AcuityLevel, number>();
    for (const row of data) {
      const level = row.acuity_level as AcuityLevel;
      counts.set(level, (counts.get(level) || 0) + 1);
    }

    return ([1, 2, 3, 4, 5] as AcuityLevel[]).map(level => ({
      level,
      count: counts.get(level) || 0,
    }));
  },

  async getDistrictDemand(): Promise<{ district: District; activePatients: number; activeStaff: number; demandScore: number }[]> {
    if (!supabase) return [];

    const [{ data: patients }, { data: staff }] = await Promise.all([
      supabase.from('patients').select('district').eq('status', 'Active'),
      supabase.from('staff').select('official_district').eq('status', 'Active'),
    ]);

    if (!patients || !staff) return [];

    const patientCounts = new Map<District, number>();
    const staffCounts = new Map<District, number>();

    for (const p of patients) {
      const d = p.district as District;
      patientCounts.set(d, (patientCounts.get(d) || 0) + 1);
    }

    for (const s of staff) {
      const d = s.official_district as District;
      staffCounts.set(d, (staffCounts.get(d) || 0) + 1);
    }

    const allDistricts = new Set([...patientCounts.keys(), ...staffCounts.keys()]);
    
    return Array.from(allDistricts).map(district => {
      const activePatients = patientCounts.get(district) || 0;
      const activeStaff = staffCounts.get(district) || 0;
      const demandScore = activeStaff > 0 
        ? Math.round((activePatients / activeStaff) * 100) 
        : activePatients * 100;
      
      return { district, activePatients, activeStaff, demandScore };
    }).sort((a, b) => b.demandScore - a.demandScore);
  },

  async getCompetencyGaps(): Promise<{ competency: CompetencyReference; demandCount: number; supplyCount: number; gapScore: number }[]> {
    if (!supabase) return [];

    const [{ data: competencies }, { data: staffCompetencies }, { data: patients }] = await Promise.all([
      supabase.from('competency_reference').select('*').eq('is_active', true),
      supabase.from('staff_competencies').select('competency_code'),
      supabase.from('patients').select('special_equipment'),
    ]);

    if (!competencies || !staffCompetencies || !patients) return [];

    const competencyDemand = new Map<string, number>();
    for (const p of patients) {
      if (p.special_equipment) {
        for (const eq of p.special_equipment) {
          const code = eq.toUpperCase().replace(/[^A-Z]/g, '_');
          competencyDemand.set(code, (competencyDemand.get(code) || 0) + 1);
        }
      }
    }

    const competencySupply = new Map<string, number>();
    for (const sc of staffCompetencies) {
      competencySupply.set(sc.competency_code, (competencySupply.get(sc.competency_code) || 0) + 1);
    }

    return competencies.map(comp => {
      const demandCount = competencyDemand.get(comp.code) || 0;
      const supplyCount = competencySupply.get(comp.code) || 0;
      const gapScore = demandCount - supplyCount;
      
      return {
        competency: comp,
        demandCount,
        supplyCount,
        gapScore,
      };
    }).filter(c => c.demandCount > 0 || c.supplyCount > 0)
      .sort((a, b) => b.gapScore - a.gapScore);
  },

  async getMarketOverview(): Promise<{
    totalPatients: number;
    totalStaff: number;
    categorizedPatients: number;
    acuityCovered: number;
    avgBillingRate: number;
    topServiceCategory: ServiceCategory | null;
    underservedDistricts: District[];
  }> {
    if (!supabase) {
      return {
        totalPatients: 0,
        totalStaff: 0,
        categorizedPatients: 0,
        acuityCovered: 0,
        avgBillingRate: 0,
        topServiceCategory: null,
        underservedDistricts: [],
      };
    }

    const [{ data: patients }, { data: staff }] = await Promise.all([
      supabase.from('patients').select('service_category, acuity_level, billing_rate, district'),
      supabase.from('staff').select('official_district'),
    ]);

    if (!patients || !staff) {
      return {
        totalPatients: 0,
        totalStaff: 0,
        categorizedPatients: 0,
        acuityCovered: 0,
        avgBillingRate: 0,
        topServiceCategory: null,
        underservedDistricts: [],
      };
    }

    const categorizedPatients = patients.filter(p => p.service_category).length;
    const acuityCovered = patients.filter(p => p.acuity_level).length;
    const totalBilling = patients.reduce((sum, p) => sum + (p.billing_rate || 0), 0);
    const avgBillingRate = patients.length > 0 ? Math.round(totalBilling / patients.length) : 0;

    const categoryCounts = new Map<ServiceCategory, number>();
    for (const p of patients) {
      if (p.service_category) {
        categoryCounts.set(p.service_category as ServiceCategory, (categoryCounts.get(p.service_category as ServiceCategory) || 0) + 1);
      }
    }

    let topServiceCategory: ServiceCategory | null = null;
    let maxCount = 0;
    for (const [cat, count] of categoryCounts) {
      if (count > maxCount) {
        maxCount = count;
        topServiceCategory = cat;
      }
    }

    const patientDistricts = new Set(patients.map(p => p.district as District));
    const staffDistricts = new Set(staff.map(s => s.official_district as District));
    const underservedDistricts = Array.from(patientDistricts).filter(d => !staffDistricts.has(d));

    return {
      totalPatients: patients.length,
      totalStaff: staff.length,
      categorizedPatients,
      acuityCovered,
      avgBillingRate,
      topServiceCategory,
      underservedDistricts,
    };
  },
};
