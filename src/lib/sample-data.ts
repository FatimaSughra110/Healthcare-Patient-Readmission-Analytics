import type { PatientRecord } from "./types";

const DIAGNOSES = [
  "Heart Failure",
  "COPD",
  "Pneumonia",
  "Diabetes Complications",
  "Acute Myocardial Infarction",
  "Sepsis",
  "Renal Failure",
  "Stroke",
  "Hip/Knee Replacement",
  "Cellulitis",
];

const INSURANCE = ["Medicare", "Medicaid", "Private", "Self-Pay"];
const DISPOSITIONS = [
  "Home",
  "Home Health Care",
  "Skilled Nursing Facility",
  "Another Facility",
  "Hospice",
];
const GENDERS = ["Female", "Male"];

/** Deterministic PRNG so the sample cohort is stable between loads. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[], weights?: number[]): T {
  if (!weights) return arr[Math.floor(rnd() * arr.length)] as T;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i] ?? 0;
    if (r <= 0) return arr[i] as T;
  }
  return arr[arr.length - 1] as T;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function generateSampleData(count = 560): PatientRecord[] {
  const rnd = mulberry32(20260906);
  const records: PatientRecord[] = [];
  const start = new Date("2025-01-05T00:00:00Z").getTime();
  const span = 365 * 24 * 3600 * 1000;

  for (let i = 0; i < count; i++) {
    const age = Math.min(
      97,
      Math.max(6, Math.round(38 + (rnd() + rnd() + rnd() - 1.5) * 34 + rnd() * 14)),
    );
    const gender = pick(rnd, GENDERS, [52, 48]);
    const admission = new Date(start + rnd() * span);
    const los = Math.max(1, Math.round(1 + Math.pow(rnd(), 2.1) * 17));
    const discharge = new Date(admission.getTime() + los * 24 * 3600 * 1000);
    const diagnosis = pick(rnd, DIAGNOSES, [14, 12, 12, 11, 9, 8, 9, 8, 9, 8]);

    const elderly = age >= 65;
    const has_diabetes = rnd() < (elderly ? 0.36 : 0.16);
    const has_hypertension = rnd() < (elderly ? 0.58 : 0.24);
    const has_heart_disease = rnd() < (elderly ? 0.34 : 0.1);
    const chronic = [has_diabetes, has_hypertension, has_heart_disease].filter(Boolean).length;

    const num_prior_admissions = Math.min(
      9,
      Math.round(Math.pow(rnd(), 2.4) * (5 + chronic * 2.2)),
    );
    const num_medications = Math.max(1, Math.round(4 + rnd() * 14 + chronic * 2.4));
    const num_lab_procedures = Math.max(1, Math.round(8 + rnd() * 46 + los * 0.9));
    const num_diagnoses = Math.max(1, Math.min(14, Math.round(2 + chronic + rnd() * 6)));
    const insurance_type = pick(
      rnd,
      INSURANCE,
      elderly ? [58, 14, 24, 4] : [12, 26, 55, 7],
    );
    const discharge_disposition = pick(
      rnd,
      DISPOSITIONS,
      elderly ? [40, 22, 22, 12, 4] : [66, 16, 10, 7, 1],
    );

    // Latent readmission probability, correlated with the same drivers the
    // demo risk model uses (so the dashboard tells a coherent story).
    let logit = -3.5;
    logit += num_prior_admissions * 0.34;
    logit += chronic * 0.36;
    logit += los <= 2 ? 0.5 : los >= 12 ? 0.62 : 0;
    logit += Math.max(0, age - 55) * 0.013;
    logit += num_medications * 0.026;
    logit += discharge_disposition === "Another Facility" ? 0.6 : 0;
    logit += discharge_disposition === "Skilled Nursing Facility" ? 0.42 : 0;
    logit += ["Heart Failure", "COPD", "Sepsis", "Renal Failure"].includes(diagnosis) ? 0.5 : 0;
    const p = 1 / (1 + Math.exp(-logit));

    records.push({
      patient_id: `PT-${String(10001 + i)}`,
      age,
      gender,
      admission_date: iso(admission),
      discharge_date: iso(discharge),
      length_of_stay: los,
      primary_diagnosis: diagnosis,
      num_prior_admissions,
      num_medications,
      num_lab_procedures,
      num_diagnoses,
      has_diabetes,
      has_hypertension,
      has_heart_disease,
      insurance_type,
      discharge_disposition,
      readmitted_30_days: rnd() < p,
    });
  }
  return records;
}
