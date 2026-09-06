import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Lightbulb, TrendingUp } from "lucide-react";

import { DataGate, Panel } from "@/components/dashboard/primitives";
import { generateInsights, pct, rate, RECOMMENDATIONS } from "@/lib/analytics";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights & Recommendations — Patient Readmission Analytics" },
      {
        name: "description",
        content:
          "Plain-language insights generated from the loaded cohort, plus suggested intervention categories for care transitions.",
      },
      { property: "og:title", content: "Insights & Recommendations — Patient Readmission Analytics" },
      {
        property: "og:description",
        content: "Auto-generated readmission insights and suggested intervention categories.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  return (
    <DataGate>
      <InsightsContent />
    </DataGate>
  );
}

const SEVERITY = {
  high: { badge: "High signal", cls: "border-risk-high bg-risk-high-soft text-risk-high" },
  medium: { badge: "Worth review", cls: "border-risk-medium bg-risk-medium-soft text-risk-medium" },
  info: { badge: "Context", cls: "border-primary bg-accent text-accent-foreground" },
} as const;

function InsightsContent() {
  const { patients } = useData();
  const insights = generateInsights(patients);
  const high = patients.filter((p) => p.risk_tier === "High");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Cohort summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {patients.length.toLocaleString()} patients in view, readmitting at {pct(rate(patients))}{" "}
              within 30 days. {high.length} patients sit in the High risk tier and readmit at{" "}
              {pct(rate(high))} — that group is where follow-up capacity goes furthest.
            </p>
          </div>
        </div>
      </div>

      <Panel
        title="Auto-generated insights"
        description="Recalculated from the patients currently in view"
      >
        {insights.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {insights.map((insight) => (
              <li
                key={insight.title}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Lightbulb className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">{insight.title}</h3>
                  <span
                    className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY[insight.severity].cls}`}
                  >
                    {SEVERITY[insight.severity].badge}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Not enough patients in view to generate reliable insights — widen the filters.
          </p>
        )}
      </Panel>

      <Panel
        title="Suggested intervention categories"
        description="Illustrative programme ideas mapped to the patterns above"
      >
        <ul className="grid gap-3 lg:grid-cols-2">
          {RECOMMENDATIONS.map((r) => (
            <li key={r.title} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                <ClipboardList className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          These suggestions are illustrative outputs of a demo model on synthetic data. They are not
          clinical guidance and must be reviewed by qualified clinical staff before any use.
        </p>
      </Panel>
    </div>
  );
}
