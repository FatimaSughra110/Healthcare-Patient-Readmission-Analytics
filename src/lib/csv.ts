import Papa from "papaparse";
import type { PatientRecord, ScoredPatient } from "./types";

const truthy = new Set(["yes", "y", "true", "1", "t"]);

function bool(v: unknown) {
  return truthy.has(String(v ?? "").trim().toLowerCase());
}
function num(v: unknown) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown, fallback = "Unknown") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}
function date(v: unknown) {
  const s = String(v ?? "").trim();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function parsePatientCsv(file: File): Promise<PatientRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (result) => {
        try {
          const rows = result.data.filter((r) => Object.values(r).some((v) => String(v).trim()));
          if (!rows.length) throw new Error("No data rows found in this file.");
          const records = rows.map((r, i) => {
            const admission = date(r["admission_date"]);
            const discharge = date(r["discharge_date"]);
            let los = num(r["length_of_stay"]);
            if (!los && admission && discharge) {
              los = Math.max(
                1,
                Math.round(
                  (new Date(discharge).getTime() - new Date(admission).getTime()) / 86400000,
                ),
              );
            }
            return {
              patient_id: str(r["patient_id"], `ROW-${i + 1}`),
              age: num(r["age"]),
              gender: str(r["gender"]),
              admission_date: admission,
              discharge_date: discharge,
              length_of_stay: los || 1,
              primary_diagnosis: str(r["primary_diagnosis"]),
              num_prior_admissions: num(r["num_prior_admissions"]),
              num_medications: num(r["num_medications"]),
              num_lab_procedures: num(r["num_lab_procedures"]),
              num_diagnoses: num(r["num_diagnoses"]),
              has_diabetes: bool(r["has_diabetes"]),
              has_hypertension: bool(r["has_hypertension"]),
              has_heart_disease: bool(r["has_heart_disease"]),
              insurance_type: str(r["insurance_type"]),
              discharge_disposition: str(r["discharge_disposition"]),
              readmitted_30_days: bool(r["readmitted_30_days"]),
            } satisfies PatientRecord;
          });
          resolve(records);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Could not read this file."));
        }
      },
      error: (err) => reject(err),
    });
  });
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildRiskReport(
  patients: ScoredPatient[],
  kpis: { label: string; value: string }[],
) {
  const rows: (string | number)[][] = [["Readmission Risk Report"], ["Generated", new Date().toISOString()], []];
  rows.push(["Summary"]);
  kpis.forEach((k) => rows.push([k.label, k.value]));
  rows.push([]);
  rows.push([
    "patient_id",
    "age",
    "gender",
    "primary_diagnosis",
    "length_of_stay",
    "num_prior_admissions",
    "risk_score",
    "risk_tier",
    "key_risk_factors",
    "readmitted_30_days",
  ]);
  patients.forEach((p) =>
    rows.push([
      p.patient_id,
      p.age,
      p.gender,
      p.primary_diagnosis,
      p.length_of_stay,
      p.num_prior_admissions,
      p.risk_score,
      p.risk_tier,
      p.risk_factors.join(" | "),
      p.readmitted_30_days ? "yes" : "no",
    ]),
  );
  rows.push([]);
  rows.push([
    "Note: synthetic/demo data and a simplified illustrative risk model. Not a certified clinical decision-support tool.",
  ]);
  return rows;
}
