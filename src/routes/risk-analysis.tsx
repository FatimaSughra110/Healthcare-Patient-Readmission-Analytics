import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { ChartTooltip, DataGate, Panel, TierBadge } from "@/components/dashboard/primitives";
import { RiskModelDialog } from "@/components/dashboard/risk-model-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useData } from "@/lib/data-store";
import { featureImportance } from "@/lib/risk";
import type { ScoredPatient } from "@/lib/types";

export const Route = createFileRoute("/risk-analysis")({
  head: () => ({
    meta: [
      { title: "Risk Analysis — Patient Readmission Analytics" },
      {
        name: "description",
        content:
          "Sortable patient risk table, feature importance, stay-vs-prior-admissions scatter and a high-risk watchlist.",
      },
      { property: "og:title", content: "Risk Analysis — Patient Readmission Analytics" },
      {
        property: "og:description",
        content: "Patient-level risk scores, factor importance and a high-risk intervention watchlist.",
      },
    ],
  }),
  component: RiskAnalysisPage,
});

type SortKey = "patient_id" | "age" | "primary_diagnosis" | "risk_score" | "risk_tier";

function RiskAnalysisPage() {
  return (
    <DataGate>
      <RiskAnalysisContent />
    </DataGate>
  );
}

function RiskAnalysisContent() {
  const { patients } = useData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "risk_score",
    dir: "desc",
  });

  const tierRank = { Low: 0, Medium: 1, High: 2 } as const;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? patients.filter(
          (p) =>
            p.patient_id.toLowerCase().includes(q) ||
            p.primary_diagnosis.toLowerCase().includes(q),
        )
      : patients;
    return [...filtered].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "risk_tier") return (tierRank[a.risk_tier] - tierRank[b.risk_tier]) * dir;
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [patients, query, sort]);

  const watchlist = useMemo(
    () => [...patients].sort((a, b) => b.risk_score - a.risk_score).slice(0, 20),
    [patients],
  );

  const importance = useMemo(() => featureImportance(patients), [patients]);

  const scatter = useMemo(
    () => ({
      readmitted: patients
        .filter((p) => p.readmitted_30_days)
        .map((p) => ({ x: p.length_of_stay, y: p.num_prior_admissions, id: p.patient_id, score: p.risk_score })),
      notReadmitted: patients
        .filter((p) => !p.readmitted_30_days)
        .map((p) => ({ x: p.length_of_stay, y: p.num_prior_admissions, id: p.patient_id, score: p.risk_score })),
    }),
    [patients],
  );

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  function SortHeader({ label, k, className = "" }: { label: string; k: SortKey; className?: string }) {
    const active = sort.key === k;
    return (
      <TableHead className={className}>
        <button
          className={`inline-flex items-center gap-1 text-xs font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}
          onClick={() => toggleSort(k)}
        >
          {label}
          {active &&
            (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Patient risk table"
        description={`${rows.length} patients · sort by clicking a column header`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patient ID or diagnosis"
                className="h-9 w-64 pl-8"
              />
            </div>
            <RiskModelDialog variant="inline" />
          </div>
        }
      >
        <div className="scroll-slim max-h-[520px] overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-surface">
              <TableRow>
                <SortHeader label="Patient ID" k="patient_id" />
                <SortHeader label="Age" k="age" />
                <SortHeader label="Primary diagnosis" k="primary_diagnosis" />
                <SortHeader label="Risk score" k="risk_score" />
                <SortHeader label="Tier" k="risk_tier" />
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Key risk factors
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Readmitted
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 300).map((p) => (
                <PatientRow key={p.patient_id} p={p} />
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No patients match the current filters or search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {rows.length > 300 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing the first 300 of {rows.length} matching patients — narrow the filters or search to
            see more.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Feature importance"
          description="Relative influence of each factor across this cohort (simulated model)"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importance}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 44, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(row) => [
                        { label: "Relative influence", value: `${row["importance"]} / 100` },
                      ]}
                    />
                  }
                />
                <Bar dataKey="importance" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Length of stay vs prior admissions"
          description="Each point is a patient, coloured by 30-day readmission outcome"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Length of stay"
                  unit="d"
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Prior admissions"
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                />
                <ZAxis range={[38, 38]} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(row) => [
                        { label: "Patient", value: String(row["id"]) },
                        { label: "Length of stay", value: `${row["x"]} days` },
                        { label: "Prior admissions", value: String(row["y"]) },
                        { label: "Risk score", value: String(row["score"]) },
                      ]}
                    />
                  }
                />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Scatter
                  name="Not readmitted"
                  data={scatter.notReadmitted}
                  fill="var(--risk-low)"
                  fillOpacity={0.5}
                />
                <Scatter
                  name="Readmitted within 30 days"
                  data={scatter.readmitted}
                  fill="var(--risk-high)"
                  fillOpacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="High-Risk Patient Watchlist"
        description="Top 20 patients by simulated risk score — candidates for early intervention"
      >
        <div className="scroll-slim overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-surface">
              <TableRow>
                <TableHead className="text-xs font-semibold text-muted-foreground">Rank</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Patient</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Age</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Diagnosis</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Prior adm.</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">LOS</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Disposition</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Score</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watchlist.map((p, i) => (
                <TableRow key={p.patient_id}>
                  <TableCell className="num text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="num font-medium">{p.patient_id}</TableCell>
                  <TableCell className="num">{p.age}</TableCell>
                  <TableCell>{p.primary_diagnosis}</TableCell>
                  <TableCell className="num">{p.num_prior_admissions}</TableCell>
                  <TableCell className="num">{p.length_of_stay} d</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.discharge_disposition}
                  </TableCell>
                  <TableCell className="num font-semibold">{p.risk_score}</TableCell>
                  <TableCell>
                    <TierBadge tier={p.risk_tier} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}

function PatientRow({ p }: { p: ScoredPatient }) {
  return (
    <TableRow>
      <TableCell className="num font-medium">{p.patient_id}</TableCell>
      <TableCell className="num">{p.age}</TableCell>
      <TableCell>{p.primary_diagnosis}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="num w-7 text-sm font-semibold">{p.risk_score}</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${p.risk_score}%`,
                backgroundColor:
                  p.risk_tier === "High"
                    ? "var(--risk-high)"
                    : p.risk_tier === "Medium"
                      ? "var(--risk-medium)"
                      : "var(--risk-low)",
              }}
            />
          </span>
        </div>
      </TableCell>
      <TableCell>
        <TierBadge tier={p.risk_tier} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {p.risk_factors.length ? p.risk_factors.join(", ") : "No dominant factor"}
      </TableCell>
      <TableCell className="text-xs font-medium">
        {p.readmitted_30_days ? (
          <span className="text-risk-high">Yes</span>
        ) : (
          <span className="text-muted-foreground">No</span>
        )}
      </TableCell>
    </TableRow>
  );
}
