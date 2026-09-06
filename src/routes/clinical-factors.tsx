import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip, DataGate, Panel } from "@/components/dashboard/primitives";
import {
  byChronicCondition,
  byField,
  comorbidityAnalysis,
  correlationMatrix,
  pct,
  rate,
} from "@/lib/analytics";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/clinical-factors")({
  head: () => ({
    meta: [
      { title: "Clinical Factors — Patient Readmission Analytics" },
      {
        name: "description",
        content:
          "Readmission rates by chronic condition, discharge disposition, insurance and gender, with comorbidity and correlation analysis.",
      },
      { property: "og:title", content: "Clinical Factors — Patient Readmission Analytics" },
      {
        property: "og:description",
        content: "Comorbidity combinations, discharge destination and correlation analysis of readmission drivers.",
      },
    ],
  }),
  component: ClinicalFactorsPage,
});

function ClinicalFactorsPage() {
  return (
    <DataGate>
      <ClinicalContent />
    </DataGate>
  );
}

const CATEGORY_TOOLTIP = (
  <ChartTooltip
    formatter={(row) => [
      { label: "Readmission rate", value: `${row["rate"]}%` },
      { label: "Patients", value: String(row["patients"]) },
      { label: "Readmitted", value: String(row["readmitted"] ?? "—") },
    ]}
  />
);

function CategoryChart({ data, color }: { data: { name: string; rate: number }[]; color: string }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 34 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            angle={-24}
            textAnchor="end"
            interval={0}
            height={56}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <YAxis unit="%" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
          <Tooltip content={CATEGORY_TOOLTIP} />
          <Bar dataKey="rate" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClinicalContent() {
  const { patients } = useData();
  const chronic = byChronicCondition(patients);
  const dispositions = byField(patients, "discharge_disposition");
  const insurance = byField(patients, "insurance_type");
  const gender = byField(patients, "gender");
  const comorbidity = comorbidityAnalysis(patients);
  const { labels, matrix } = correlationMatrix(patients);
  const overall = rate(patients);

  return (
    <div className="space-y-5">
      <Panel
        title="Chronic condition presence"
        description={`Readmission rate with and without each condition · cohort average ${pct(overall)}`}
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chronic} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis unit="%" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(row) => [
                      { label: "Condition present", value: `${row["present"]}%` },
                      { label: "Condition absent", value: `${row["absent"]}%` },
                      { label: "Patients with condition", value: String(row["patients"]) },
                    ]}
                  />
                }
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Condition present" dataKey="present" fill="var(--risk-high)" radius={[4, 4, 0, 0]} />
              <Bar name="Condition absent" dataKey="absent" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="By discharge disposition" description="Where the patient went after discharge">
          <CategoryChart data={dispositions} color="var(--chart-1)" />
        </Panel>
        <Panel title="By insurance type" description="Coverage-level differences">
          <CategoryChart data={insurance} color="var(--chart-3)" />
        </Panel>
        <Panel title="By gender" description="Recorded gender">
          <CategoryChart data={gender} color="var(--chart-4)" />
        </Panel>
      </div>

      <Panel
        title="Comorbidity analysis"
        description="How combinations of diabetes, hypertension and heart disease affect readmission likelihood"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comorbidity}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(row) => [
                      { label: "Readmission rate", value: `${row["rate"]}%` },
                      { label: "Patients", value: String(row["patients"]) },
                    ]}
                  />
                }
              />
              <Bar dataKey="rate" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Groups are mutually exclusive, so each patient appears exactly once. Small groups can move
          sharply — check the patient count in the tooltip before drawing conclusions.
        </p>
      </Panel>

      <Panel
        title="Correlation heatmap"
        description="Pearson correlation between numeric factors and 30-day readmission (−1 to +1)"
      >
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th />
                {labels.map((l) => (
                  <th key={l} className="pb-2 text-left font-medium text-muted-foreground">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={labels[i]}>
                  <th className="pr-3 text-right font-medium text-muted-foreground">{labels[i]}</th>
                  {row["map"]((v, j) => (
                    <td
                      key={`${i}-${j}`}
                      className="num rounded-md px-2 py-2.5 text-center font-medium"
                      style={{
                        backgroundColor:
                          v >= 0
                            ? `color-mix(in oklab, var(--chart-1) ${Math.abs(v) * 78}%, var(--card))`
                            : `color-mix(in oklab, var(--risk-medium) ${Math.abs(v) * 78}%, var(--card))`,
                        color: Math.abs(v) > 0.55 ? "var(--primary-foreground)" : "var(--foreground)",
                      }}
                      title={`${labels[i]} vs ${labels[j]}: ${v}`}
                    >
                      {v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Values near 0 mean little linear relationship. Correlation is not causation — use these as a
          starting point for review, not as evidence.
        </p>
      </Panel>
    </div>
  );
}
