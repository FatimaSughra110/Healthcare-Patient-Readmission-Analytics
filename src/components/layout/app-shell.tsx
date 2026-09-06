import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  Menu,
  ShieldAlert,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { FilterBar } from "@/components/dashboard/filter-bar";
import { RiskModelDialog } from "@/components/dashboard/risk-model-dialog";
import { Button } from "@/components/ui/button";
import { buildRiskReport, downloadCsv } from "@/lib/csv";
import { avg, pct, rate } from "@/lib/analytics";
import { useData } from "@/lib/data-store";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/risk-analysis", label: "Risk Analysis", icon: ShieldAlert },
  { to: "/clinical-factors", label: "Clinical Factors", icon: Stethoscope },
  { to: "/insights", label: "Insights", icon: Lightbulb },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { hasData, loadSample, uploadCsv, patients, sourceLabel, allPatients } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [navOpen, setNavOpen] = useState(false);

  function exportReport() {
    if (!patients.length) {
      toast.error("Load data before exporting a report");
      return;
    }
    const watchlist = [...patients].sort((a, b) => b.risk_score - a.risk_score).slice(0, 20);
    const kpis = [
      { label: "Total patients (filtered)", value: String(patients.length) },
      { label: "Overall readmission rate", value: pct(rate(patients)) },
      { label: "Average length of stay (days)", value: avg(patients.map((p) => p.length_of_stay)).toFixed(1) },
      { label: "High-risk patients", value: String(patients.filter((p) => p.risk_tier === "High").length) },
      { label: "Data source", value: sourceLabel || "n/a" },
    ];
    downloadCsv(`readmission-risk-report-${new Date().toISOString().slice(0, 10)}.csv`, buildRiskReport(watchlist, kpis));
    toast.success("Risk report downloaded");
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
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

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-primary">
            <Activity className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight">Readmission Analytics</p>
            <p className="truncate text-xs text-sidebar-muted">Care transitions intelligence</p>
          </div>
          <button
            className="ml-auto text-sidebar-muted lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setNavOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold bg-sidebar-accent text-sidebar-primary",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border px-4 py-5">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground">
            <Database className="size-3.5 shrink-0 text-sidebar-primary" />
            <span className="truncate">
              {hasData ? `${allPatients.length} records · ${sourceLabel}` : "No dataset loaded"}
            </span>
          </div>
          <RiskModelDialog />
          <p className="text-[11px] leading-snug text-sidebar-muted">
            Synthetic data and a simplified illustrative risk model. Not a certified clinical
            decision-support tool.
          </p>
        </div>
      </aside>

      {navOpen && (
        <button
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 bg-risk-medium-soft px-4 py-2 text-xs font-medium text-foreground sm:px-6">
          <AlertTriangle className="size-4 shrink-0 text-risk-medium" />
          Demo data only — not for use with real patient information
        </div>

        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
            <button
              className="rounded-lg border border-border p-2 lg:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">Patient Readmission Analytics</h1>
              <p className="truncate text-xs text-muted-foreground">
                30-day readmission risk, drivers and intervention priorities
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Upload CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={loadSample}>
                <FlaskConical className="size-4" /> Load Sample Data
              </Button>
              <Button size="sm" onClick={exportReport}>
                <Download className="size-4" /> Export Risk Report
              </Button>
            </div>
          </div>
          {hasData && <FilterBar />}
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>

        <footer className="border-t border-border bg-surface px-4 py-5 text-xs leading-relaxed text-muted-foreground sm:px-6">
          This dashboard uses synthetic/demo data and a simplified illustrative risk model. It is not
          a certified clinical decision-support tool and should not be used for actual patient care
          decisions.
        </footer>
      </div>
    </div>
  );
}
