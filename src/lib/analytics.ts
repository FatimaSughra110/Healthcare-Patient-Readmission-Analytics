import { AGE_GROUPS, ageGroupOf, type Filters, type ScoredPatient } from "./types";

export function applyFilters(patients: ScoredPatient[], f: Filters): ScoredPatient[] {
  return patients.filter((p) => {
    if (f.from && p.admission_date && p.admission_date < f.from) return false;
    if (f.to && p.admission_date && p.admission_date > f.to) return false;
    if (f.ageGroup !== "all" && ageGroupOf(p.age) !== f.ageGroup) return false;
    if (f.diagnosis !== "all" && p.primary_diagnosis !== f.diagnosis) return false;
    if (f.tier !== "all" && p.risk_tier !== f.tier) return false;
    if (f.insurance !== "all" && p.insurance_type !== f.insurance) return false;
    return true;
  });
}

export const pct = (n: number) => `${n.toFixed(1)}%`;

export function rate(patients: ScoredPatient[]) {
  if (!patients.length) return 0;
  return (patients.filter((p) => p.readmitted_30_days).length / patients.length) * 100;
}

export function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

interface Group {
  name: string;
  patients: number;
  readmitted: number;
  rate: number;
}

function groupBy(patients: ScoredPatient[], keyFn: (p: ScoredPatient) => string): Group[] {
  const map = new Map<string, ScoredPatient[]>();
  for (const p of patients) {
    const k = keyFn(p);
    const list = map.get(k);
    if (list) list.push(p);
    else map.set(k, [p]);
  }
  return [...map.entries()].map(([name, list]) => ({
    name,
    patients: list.length,
    readmitted: list.filter((p) => p.readmitted_30_days).length,
    rate: Number(rate(list).toFixed(1)),
  }));
}

export function byDiagnosis(patients: ScoredPatient[]) {
  return groupBy(patients, (p) => p.primary_diagnosis).sort((a, b) => b.rate - a.rate);
}

export function byAgeGroup(patients: ScoredPatient[]) {
  const groups = groupBy(patients, (p) => ageGroupOf(p.age));
  return AGE_GROUPS.map(
    (g) => groups.find((x) => x.name === g) ?? { name: g, patients: 0, readmitted: 0, rate: 0 },
  ).filter((g) => g.patients > 0);
}

export function byField(patients: ScoredPatient[], field: keyof ScoredPatient) {
  return groupBy(patients, (p) => String(p[field])).sort((a, b) => b.rate - a.rate);
}

export function byChronicCondition(patients: ScoredPatient[]) {
  const defs: { name: string; has: (p: ScoredPatient) => boolean }[] = [
    { name: "Diabetes", has: (p) => p.has_diabetes },
    { name: "Hypertension", has: (p) => p.has_hypertension },
    { name: "Heart disease", has: (p) => p.has_heart_disease },
  ];
  return defs.map((d) => {
    const withCond = patients.filter(d.has);
    const without = patients.filter((p) => !d.has(p));
    return {
      name: d.name,
      present: Number(rate(withCond).toFixed(1)),
      absent: Number(rate(without).toFixed(1)),
      patients: withCond.length,
    };
  });
}

export function comorbidityAnalysis(patients: ScoredPatient[]) {
  const combos: { name: string; test: (p: ScoredPatient) => boolean }[] = [
    { name: "No chronic conditions", test: (p) => !p.has_diabetes && !p.has_hypertension && !p.has_heart_disease },
    { name: "Diabetes only", test: (p) => p.has_diabetes && !p.has_hypertension && !p.has_heart_disease },
    { name: "Hypertension only", test: (p) => !p.has_diabetes && p.has_hypertension && !p.has_heart_disease },
    { name: "Heart disease only", test: (p) => !p.has_diabetes && !p.has_hypertension && p.has_heart_disease },
    { name: "Diabetes + Hypertension", test: (p) => p.has_diabetes && p.has_hypertension && !p.has_heart_disease },
    { name: "Diabetes + Heart disease", test: (p) => p.has_diabetes && !p.has_hypertension && p.has_heart_disease },
    { name: "Hypertension + Heart disease", test: (p) => !p.has_diabetes && p.has_hypertension && p.has_heart_disease },
    { name: "All three conditions", test: (p) => p.has_diabetes && p.has_hypertension && p.has_heart_disease },
  ];
  return combos
    .map((c) => {
      const list = patients.filter(c.test);
      return {
        name: c.name,
        patients: list.length,
        rate: Number(rate(list).toFixed(1)),
      };
    })
    .filter((c) => c.patients > 0);
}

export function monthlyTrend(patients: ScoredPatient[]) {
  const map = new Map<string, ScoredPatient[]>();
  for (const p of patients) {
    if (!p.admission_date) continue;
    const k = p.admission_date.slice(0, 7);
    const list = map.get(k);
    if (list) list.push(p);
    else map.set(k, [p]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, list]) => ({
      month,
      label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      rate: Number(rate(list).toFixed(1)),
      patients: list.length,
      readmitted: list.filter((p) => p.readmitted_30_days).length,
    }));
}

export function tierDistribution(patients: ScoredPatient[]) {
  return (["Low", "Medium", "High"] as const).map((tier) => {
    const list = patients.filter((p) => p.risk_tier === tier);
    return {
      name: tier,
      value: list.length,
      rate: Number(rate(list).toFixed(1)),
    };
  });
}

const NUMERIC_FIELDS: { key: keyof ScoredPatient; label: string }[] = [
  { key: "age", label: "Age" },
  { key: "length_of_stay", label: "Length of stay" },
  { key: "num_medications", label: "Medications" },
  { key: "num_lab_procedures", label: "Lab procedures" },
  { key: "num_diagnoses", label: "Diagnoses" },
  { key: "num_prior_admissions", label: "Prior admissions" },
];

function corr(a: number[], b: number[]) {
  const n = a.length;
  if (n < 2) return 0;
  const ma = avg(a);
  const mb = avg(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = (a[i] ?? 0) - ma;
    const y = (b[i] ?? 0) - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export function correlationMatrix(patients: ScoredPatient[]) {
  const cols = [...NUMERIC_FIELDS, { key: "readmitted_30_days" as const, label: "Readmitted" }];
  const series = cols.map((c) =>
    patients.map((p) => (c.key === "readmitted_30_days" ? (p.readmitted_30_days ? 1 : 0) : Number(p[c.key]))),
  );
  return {
    labels: cols.map((c) => c.label),
    matrix: series.map((s1) => series.map((s2) => Number(corr(s1, s2).toFixed(2)))),
  };
}

export interface Insight {
  title: string;
  body: string;
  severity: "high" | "medium" | "info";
}

export function generateInsights(patients: ScoredPatient[]): Insight[] {
  if (patients.length < 10) return [];
  const overall = rate(patients);
  const out: Insight[] = [];
  const rel = (v: number) => {
    if (overall === 0) return "0%";
    const diff = ((v - overall) / overall) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}%`;
  };

  const heavy = patients.filter((p) => p.num_prior_admissions >= 3);
  if (heavy.length >= 5) {
    out.push({
      title: "Prior admissions are the strongest signal",
      body: `Patients with 3 or more prior admissions readmit at ${pct(rate(heavy))} versus ${pct(overall)} across the cohort — a ${rel(rate(heavy))} relative difference over ${heavy.length} patients.`,
      severity: "high",
    });
  }

  const shortStay = patients.filter((p) => p.length_of_stay <= 2);
  if (shortStay.length >= 5) {
    out.push({
      title: "Very short stays carry elevated risk",
      body: `Stays of 2 days or less show a ${pct(rate(shortStay))} readmission rate (${rel(rate(shortStay))} versus cohort average), suggesting some discharges may be happening before patients are stable.`,
      severity: rate(shortStay) > overall ? "high" : "info",
    });
  }

  const longStay = patients.filter((p) => p.length_of_stay >= 12);
  if (longStay.length >= 5) {
    out.push({
      title: "Extended stays flag complex cases",
      body: `Patients staying 12+ days readmit at ${pct(rate(longStay))} (${longStay.length} patients), consistent with higher underlying acuity rather than premature discharge.`,
      severity: "medium",
    });
  }

  const allThree = patients.filter((p) => p.has_diabetes && p.has_hypertension && p.has_heart_disease);
  if (allThree.length >= 5) {
    out.push({
      title: "Triple comorbidity compounds risk",
      body: `Patients with diabetes, hypertension and heart disease together readmit at ${pct(rate(allThree))}, versus ${pct(overall)} overall (${allThree.length} patients).`,
      severity: "high",
    });
  }

  const dx = byDiagnosis(patients).filter((d) => d.patients >= 8);
  if (dx.length) {
    out.push({
      title: `${dx[0]!.name} leads diagnosis-level readmission`,
      body: `${dx[0]!.name} shows the highest readmission rate at ${pct(dx[0]!.rate)} across ${dx[0]!.patients} patients, while ${dx[dx.length - 1]!.name} is lowest at ${pct(dx[dx.length - 1]!.rate)}.`,
      severity: "medium",
    });
  }

  const disp = byField(patients, "discharge_disposition").filter((d) => d.patients >= 8);
  if (disp.length) {
    out.push({
      title: "Discharge destination matters",
      body: `Patients discharged to ${disp[0]!.name.toLowerCase()} readmit at ${pct(disp[0]!.rate)} — the highest of any discharge destination in this dataset (${disp[0]!.patients} patients).`,
      severity: "medium",
    });
  }

  const elderly = patients.filter((p) => p.age >= 75);
  if (elderly.length >= 5) {
    out.push({
      title: "Age 75+ cohort needs closer follow-up",
      body: `Readmission among patients aged 75 and over is ${pct(rate(elderly))} (${elderly.length} patients), ${rel(rate(elderly))} relative to the cohort average.`,
      severity: "medium",
    });
  }

  const highTier = patients.filter((p) => p.risk_tier === "High");
  out.push({
    title: "Model separation check",
    body: `The demo risk model places ${highTier.length} patients (${((highTier.length / patients.length) * 100).toFixed(1)}%) in the High tier, and those patients readmit at ${pct(rate(highTier))} versus ${pct(rate(patients.filter((p) => p.risk_tier === "Low")))} in the Low tier.`,
    severity: "info",
  });

  const meds = patients.filter((p) => p.num_medications >= 15);
  if (meds.length >= 5) {
    out.push({
      title: "Polypharmacy signal",
      body: `Patients on 15 or more medications readmit at ${pct(rate(meds))} across ${meds.length} patients — medication reconciliation at discharge is a plausible lever here.`,
      severity: "medium",
    });
  }

  return out;
}

export const RECOMMENDATIONS = [
  {
    title: "7-day follow-up calls for High-risk tier",
    body: "Prioritise a nurse-led telephone follow-up within 7 days of discharge for every patient in the High risk tier, starting with the watchlist on the Risk Analysis page.",
  },
  {
    title: "Discharge readiness review for stays under 2 days",
    body: "Add a second sign-off for very short stays in high-readmission diagnoses so discharge timing is reviewed before the patient leaves.",
  },
  {
    title: "Medication reconciliation for polypharmacy patients",
    body: "Route patients on 15+ medications to a pharmacist-led reconciliation session before discharge and a check-in at day 10.",
  },
  {
    title: "Chronic-condition care bundles",
    body: "Enrol patients with two or more chronic conditions in a combined care-management pathway rather than single-condition programmes.",
  },
  {
    title: "Transition support for facility discharges",
    body: "Assign a transition coordinator to patients discharged to another facility or skilled nursing, where handover gaps drive avoidable returns.",
  },
  {
    title: "Weekly cohort review",
    body: "Review the monthly readmission trend and diagnosis mix weekly with clinical leads to catch emerging spikes early.",
  },
];
