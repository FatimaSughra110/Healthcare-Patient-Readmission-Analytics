export type YesNo = "yes" | "no";

export interface PatientRecord {
  patient_id: string;
  age: number;
  gender: string;
  admission_date: string; // ISO yyyy-mm-dd
  discharge_date: string;
  length_of_stay: number;
  primary_diagnosis: string;
  num_prior_admissions: number;
  num_medications: number;
  num_lab_procedures: number;
  num_diagnoses: number;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_heart_disease: boolean;
  insurance_type: string;
  discharge_disposition: string;
  readmitted_30_days: boolean;
}

export type RiskTier = "Low" | "Medium" | "High";

export interface ScoredPatient extends PatientRecord {
  risk_score: number;
  risk_tier: RiskTier;
  risk_factors: string[];
}

export interface Filters {
  from: string;
  to: string;
  ageGroup: string;
  diagnosis: string;
  tier: string;
  insurance: string;
}

export const emptyFilters: Filters = {
  from: "",
  to: "",
  ageGroup: "all",
  diagnosis: "all",
  tier: "all",
  insurance: "all",
};

export const AGE_GROUPS = ["0-17", "18-34", "35-49", "50-64", "65-79", "80+"] as const;

export function ageGroupOf(age: number): string {
  if (age < 18) return "0-17";
  if (age < 35) return "18-34";
  if (age < 50) return "35-49";
  if (age < 65) return "50-64";
  if (age < 80) return "65-79";
  return "80+";
}
