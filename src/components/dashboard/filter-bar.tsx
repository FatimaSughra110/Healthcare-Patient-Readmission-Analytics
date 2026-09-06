import { RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/data-store";
import { AGE_GROUPS } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FilterBar() {
  const { filters, setFilter, resetFilters, options, patients, allPatients } = useData();

  return (
    <div className="border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 pb-1.5 text-xs font-semibold text-muted-foreground">
          <SlidersHorizontal className="size-3.5" /> Filters
        </div>

        <Field label="Admitted from">
          <Input
            type="date"
            className="h-9 w-[150px] bg-card"
            value={filters.from}
            onChange={(e) => setFilter("from", e.target.value)}
          />
        </Field>
        <Field label="Admitted to">
          <Input
            type="date"
            className="h-9 w-[150px] bg-card"
            value={filters.to}
            onChange={(e) => setFilter("to", e.target.value)}
          />
        </Field>

        <Field label="Age group">
          <Select value={filters.ageGroup} onValueChange={(v) => setFilter("ageGroup", v)}>
            <SelectTrigger className="h-9 w-[130px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ages</SelectItem>
              {AGE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Primary diagnosis">
          <Select value={filters.diagnosis} onValueChange={(v) => setFilter("diagnosis", v)}>
            <SelectTrigger className="h-9 w-[190px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All diagnoses</SelectItem>
              {options.diagnoses.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Risk tier">
          <Select value={filters.tier} onValueChange={(v) => setFilter("tier", v)}>
            <SelectTrigger className="h-9 w-[130px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Insurance">
          <Select value={filters.insurance} onValueChange={(v) => setFilter("insurance", v)}>
            <SelectTrigger className="h-9 w-[150px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {options.insurances.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button variant="ghost" size="sm" className="mb-0.5" onClick={resetFilters}>
          <RotateCcw className="size-3.5" /> Reset
        </Button>

        <span className="mb-2 ml-auto text-xs text-muted-foreground num">
          {patients.length} of {allPatients.length} patients in view
        </span>
      </div>
    </div>
  );
}
