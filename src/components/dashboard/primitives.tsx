import { Database, FlaskConical, Upload, type LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/lib/data-store";
import type { RiskTier } from "@/lib/types";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "primary" | "low" | "medium" | "high";
}) {
  const tones = {
    primary: "bg-accent text-accent-foreground",
    low: "bg-risk-low-soft text-risk-low",
    medium: "bg-risk-medium-soft text-risk-medium",
    high: "bg-risk-high-soft text-risk-high",
  } as const;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="num mt-3 font-display text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 shadow-card ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const TIER_CLASS: Record<RiskTier, string> = {
  Low: "bg-risk-low-soft text-risk-low border-risk-low/30",
  Medium: "bg-risk-medium-soft text-risk-medium border-risk-medium/30",
  High: "bg-risk-high-soft text-risk-high border-risk-high/40",
};

export function TierBadge({ tier }: { tier: RiskTier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TIER_CLASS[tier]}`}
    >
      {tier}
    </span>
  );
}

export const TIER_COLOR: Record<RiskTier, string> = {
  Low: "var(--risk-low)",
  Medium: "var(--risk-medium)",
  High: "var(--risk-high)",
};

export function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export function EmptyState() {
  const { loadSample, uploadCsv } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Database className="size-6" />
      </span>
      <h2 className="mt-5 font-display text-xl font-semibold">
        Upload patient data or load sample data to begin analysis
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Import a CSV of discharge records, or load a 560-patient synthetic cohort to explore every
        chart, risk score and recommendation immediately.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={loadSample}>
          <FlaskConical className="size-4" /> Load Sample Data
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Upload CSV
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadCsv(file);
          e.target.value = "";
        }}
      />
      <p className="mt-6 text-xs text-muted-foreground">
        Expected columns: patient_id, age, gender, admission_date, discharge_date, length_of_stay,
        primary_diagnosis, num_prior_admissions, num_medications, num_lab_procedures, num_diagnoses,
        has_diabetes, has_hypertension, has_heart_disease, insurance_type, discharge_disposition,
        readmitted_30_days
      </p>
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; payload?: Record<string, unknown> }[];
  label?: string | number;
  formatter?: (row: Record<string, unknown>) => { label: string; value: string }[];
}) {
  if (!active || !payload?.length) return null;
  const row = (payload[0]?.payload ?? {}) as Record<string, unknown>;
  const rows = formatter
    ? formatter(row)
    : payload.map((p) => ({ label: String(p.name ?? ""), value: String(p.value ?? "") }));

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-raised">
      {label !== undefined && <p className="mb-1 font-semibold">{String(row["name"] ?? label)}</p>}
      {rows.map((r) => (
        <p key={r.label} className="num flex justify-between gap-4 text-muted-foreground">
          <span>{r.label}</span>
          <span className="font-medium text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function DataGate({ children }: { children: ReactNode }) {
  const { loading, hasData } = useData();
  if (loading) return <LoadingState />;
  if (!hasData) return <EmptyState />;
  return <>{children}</>;
}
