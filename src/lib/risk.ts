import type { PatientRecord, RiskTier, ScoredPatient } from "./types";

/**
 * SIMULATED risk model. This mimics the shape of a logistic-regression
 * inference step (weighted sum of features -> logistic squashing -> 0-100),
 * but the weights are hand-authored for illustration only.
 */
export const RISK_WEIGHTS = {
  intercept: -4.1,
  prior_admissions: 0.52,
  chronic_conditions: 0.44,
  length_of_stay: 0.38,
  age: 0.3,
  medications: 0.26,
  discharge_disposition: 0.34,
  lab_procedures: 0.16,
  diagnoses: 0.18,
} as const;

export const RISK_FACTOR_LABELS: Record<string, string> = {
  prior_admissions: "Prior admissions",
  chronic_conditions: "Chronic conditions",
  length_of_stay: "Length of stay",
  age: "Age",
  medications: "Medication count",
  discharge_disposition: "Discharge disposition",
  lab_procedures: "Lab procedures",
  diagnoses: "Diagnosis count",
};

const HIGH_RISK_DISPOSITIONS = ["Another Facility", "Skilled Nursing Facility", "Hospice"];

function logistic(x: number) {
  return 1 / (1 + Math.exp(-x));
}

/** Normalised feature contributions, each roughly 0..1 before weighting. */
export function featureValues(p: PatientRecord) {
  const chronic =
    (p.has_diabetes ? 1 : 0) + (p.has_hypertension ? 1 : 0) + (p.has_heart_disease ? 1 : 0);

  // Very short OR very long stays are both elevated risk (U-shape).
  const los =
    p.length_of_stay <= 2
      ? 0.8
      : p.length_of_stay >= 12
        ? 1
        : p.length_of_stay >= 8
          ? 0.6
          : 0.15;

  const disposition = HIGH_RISK_DISPOSITIONS.includes(p.discharge_disposition)
    ? 1
    : p.discharge_disposition === "Home Health Care"
      ? 0.5
      : 0.1;

  return {
    prior_admissions: Math.min(p.num_prior_admissions / 5, 1),
    chronic_conditions: chronic / 3,
    length_of_stay: los,
    age: Math.min(Math.max(p.age - 40, 0) / 45, 1),
    medications: Math.min(p.num_medications / 25, 1),
    discharge_disposition: disposition,
    lab_procedures: Math.min(p.num_lab_procedures / 60, 1),
    diagnoses: Math.min(p.num_diagnoses / 12, 1),
  };
}

export function tierOf(score: number): RiskTier {
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

export function scorePatient(p: PatientRecord): ScoredPatient {
  const f = featureValues(p);
  let z = RISK_WEIGHTS.intercept;
  const contributions: { key: string; value: number }[] = [];

  for (const key of Object.keys(f) as (keyof typeof f)[]) {
    const w = RISK_WEIGHTS[key] * 2.9; // scale so the logistic spans a useful range
    const c = w * f[key];
    z += c;
    contributions.push({ key, value: c });
  }

  const score = Math.round(logistic(z) * 100);
  const risk_factors = contributions
    .sort((a, b) => b.value - a.value)
    .filter((c) => c.value > 0.25)
    .slice(0, 3)
    .map((c) => RISK_FACTOR_LABELS[c.key] ?? c.key);

  return { ...p, risk_score: score, risk_tier: tierOf(score), risk_factors };
}

export function scoreAll(records: PatientRecord[]): ScoredPatient[] {
  return records.map(scorePatient);
}

/**
 * Dataset-level "feature importance": |weight| x observed spread of the
 * feature across the cohort, normalised to 100 for the strongest factor.
 */
export function featureImportance(patients: PatientRecord[]) {
  if (!patients.length) return [];
  const keys = Object.keys(RISK_FACTOR_LABELS);
  const sums: Record<string, number[]> = {};
  keys.forEach((k) => (sums[k] = []));
  for (const p of patients) {
    const f = featureValues(p) as Record<string, number>;
    keys.forEach((k) => sums[k]?.push(f[k] ?? 0));
  }
  const raw = keys.map((k) => {
    const vals = sums[k] ?? [];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    const w = RISK_WEIGHTS[k as keyof typeof RISK_WEIGHTS] as number;
    return { key: k, label: RISK_FACTOR_LABELS[k] ?? k, value: Math.abs(w) * (sd + 0.12) };
  });
  const max = Math.max(...raw.map((r) => r.value)) || 1;
  return raw
    .map((r) => ({ ...r, importance: Math.round((r.value / max) * 100) }))
    .sort((a, b) => b.importance - a.importance);
}
