import { createFileRoute } from "@tanstack/react-router";
import { Activity, BedDouble, ShieldAlert, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartTooltip,
  DataGate,
  KpiCard,
  Panel,
  TIER_COLOR,
} from "@/components/dashboard/primitives";
import { RiskModelDialog } from "@/components/dashboard/risk-model-dialog";
import { avg, byAgeGroup, byDiagnosis, monthlyTrend, pct, rate, tierDistribution } from "@/lib/analytics";
import { useData } from "@/lib/data-store";
import type { RiskTier } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Patient Readmission Analytics" },
      {
        name: "description",
        content:
          "Readmission KPIs, monthly trend, diagnosis breakdown and risk tier distribution for a discharge cohort.",
      },
      { property: "og:title", content: "Overview — Patient Readmission Analytics" },
      {
        property: "og:description",
        content: "Readmission KPIs, monthly trend and risk tier distribution for a discharge cohort.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <DataGate>
      <OverviewContent />
    </DataGate>
  );
}

function OverviewContent() {
  const { patients } = useData();
  const trend = monthlyTrend(patients);
  const diagnoses = byDiagnosis(patients);
  const tiers = tierDistribution(patients);
  const ages = byAgeGroup(patients);
  const highRisk = patients.filter((p) => p.risk_tier === "High").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total patients"
          value={patients.length.toLocaleString()}
          sub="Discharges in current filter"
          icon={Users}
        />
        <KpiCard
          label="Readmission rate"
          value={pct(rate(patients))}
          sub={`${patients.filter((p) => p.readmitted_30_days).length} readmitted within 30 days`}
          icon={Activity}
          tone="medium"
        />
        <KpiCard
          label="Avg length of stay"
          value={`${avg(patients.map((p) => p.length_of_stay)).toFixed(1)} d`}
          sub={`Median ${median(patients.map((p) => p.length_of_stay)).toFixed(0)} days`}
          icon={BedDouble}
        />
        <KpiCard
          label="High-risk patients"
          value={highRisk.toLocaleString()}
          sub={`${patients.length ? ((highRisk / patients.length) * 100).toFixed(1) : "0"}% of cohort`}
          icon={ShieldAlert}
          tone="high"
        />
      </div>

      <Panel
        title="Readmission rate trend"
        description="Monthly 30-day readmission rate by admission month"
        action={<RiskModelDialog variant="inline" />}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis
                unit="%"
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
                domain={[0, "auto"]}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(row) => [
                      { label: "Readmission rate", value: `${row["rate"]}%` },
                      { label: "Patients", value: String(row["patients"]) },
                      { label: "Readmitted", value: String(row["readmitted"]) },
                    ]}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--chart-1)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Readmission rate by primary diagnosis"
          description="Ranked highest to lowest"
          className="xl:col-span-2"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diagnoses} margin={{ top: 8, right: 12, left: -8, bottom: 46 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  angle={-32}
                  textAnchor="end"
                  interval={0}
                  height={70}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis unit="%" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(row) => [
                        { label: "Readmission rate", value: `${row["rate"]}%` },
                        { label: "Patients", value: String(row["patients"]) },
                        { label: "Readmitted", value: String(row["readmitted"]) },
                      ]}
                    />
                  }
                />
                <Bar dataKey="rate" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Risk tier distribution" description="Simulated model output">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tiers}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke="var(--card)"
                >
                  {tiers.map((t) => (
                    <Cell key={t.name} fill={TIER_COLOR[t.name as RiskTier]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(row) => [
                        { label: "Patients", value: String(row["value"]) },
                        { label: "Readmission rate", value: `${row["rate"]}%` },
                      ]}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Readmission rate by age group" description="Age band comparison">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ages} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis unit="%" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(row) => [
                      { label: "Readmission rate", value: `${row["rate"]}%` },
                      { label: "Patients", value: String(row["patients"]) },
                      { label: "Readmitted", value: String(row["readmitted"]) },
                    ]}
                  />
                }
              />
              <Bar dataKey="rate" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}
