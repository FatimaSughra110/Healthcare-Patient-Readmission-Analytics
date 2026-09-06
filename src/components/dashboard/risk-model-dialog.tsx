import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RISK_FACTOR_LABELS, RISK_WEIGHTS } from "@/lib/risk";

const PLAIN_LANGUAGE: Record<string, string> = {
  prior_admissions: "Each previous admission raises risk — repeat users of care are the strongest signal.",
  chronic_conditions: "Diabetes, hypertension and heart disease each add weight; combinations add more.",
  length_of_stay: "Both very short stays (2 days or fewer) and very long stays (12+ days) raise risk.",
  age: "Risk rises gradually from around age 40 and is weighted highest for elderly patients.",
  medications: "More medications at discharge suggests a more complex regimen to follow at home.",
  discharge_disposition: "Discharge to another facility, skilled nursing or hospice adds risk versus going home.",
  lab_procedures: "A high number of lab procedures indicates a more intensive workup.",
  diagnoses: "More recorded diagnoses means more competing problems to manage after discharge.",
};

const ORDER = Object.keys(RISK_FACTOR_LABELS).sort(
  (a, b) =>
    (RISK_WEIGHTS[b as keyof typeof RISK_WEIGHTS] as number) -
    (RISK_WEIGHTS[a as keyof typeof RISK_WEIGHTS] as number),
);

export function RiskModelDialog({ variant = "sidebar" }: { variant?: "sidebar" | "inline" }) {
  return (
    <Dialog>
      <DialogTrigger
        className={
          variant === "sidebar"
            ? "flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            : "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        }
      >
        <Info className="size-3.5" /> How the Risk Score Works
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>How the Risk Score Works</DialogTitle>
          <DialogDescription>
            A simulated, weighted scoring function that mimics the shape of a logistic-regression
            model. It is illustrative only — not a validated or certified clinical tool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Each patient's details are converted into eight factors scaled between 0 and 1. Those
            factors are multiplied by fixed weights, added together, then squashed into a 0–100 score.
            Higher weight means the factor pushes the score up faster.
          </p>

          <ul className="space-y-3">
            {ORDER.map((key) => (
              <li key={key} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{RISK_FACTOR_LABELS[key]}</span>
                  <span className="num rounded-md bg-card px-2 py-0.5 text-xs text-muted-foreground">
                    weight {(RISK_WEIGHTS[key as keyof typeof RISK_WEIGHTS] as number).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {PLAIN_LANGUAGE[key]}
                </p>
              </li>
            ))}
          </ul>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border-l-4 border-risk-low bg-risk-low-soft p-3">
              <p className="text-sm font-semibold">Low · 0–34</p>
              <p className="text-xs text-muted-foreground">Standard discharge instructions.</p>
            </div>
            <div className="rounded-lg border-l-4 border-risk-medium bg-risk-medium-soft p-3">
              <p className="text-sm font-semibold">Medium · 35–64</p>
              <p className="text-xs text-muted-foreground">Follow-up within 14 days.</p>
            </div>
            <div className="rounded-lg border-l-4 border-risk-high bg-risk-high-soft p-3">
              <p className="text-sm font-semibold">High · 65–100</p>
              <p className="text-xs text-muted-foreground">Follow-up within 7 days.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
