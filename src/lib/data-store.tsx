import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { applyFilters } from "./analytics";
import { parsePatientCsv } from "./csv";
import { scoreAll } from "./risk";
import { generateSampleData } from "./sample-data";
import { emptyFilters, type Filters, type ScoredPatient } from "./types";

type Source = "none" | "sample" | "upload";

interface DataStore {
  allPatients: ScoredPatient[];
  patients: ScoredPatient[];
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  resetFilters: () => void;
  loading: boolean;
  source: Source;
  sourceLabel: string;
  hasData: boolean;
  loadSample: () => void;
  uploadCsv: (file: File) => void;
  clearData: () => void;
  options: { diagnoses: string[]; insurances: string[] };
}

const Ctx = createContext<DataStore | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [allPatients, setAllPatients] = useState<ScoredPatient[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<Source>("none");
  const [sourceLabel, setSourceLabel] = useState("");

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(emptyFilters), []);

  const loadSample = useCallback(() => {
    setLoading(true);
    setFilters(emptyFilters);
    window.setTimeout(() => {
      const scored = scoreAll(generateSampleData(560));
      setAllPatients(scored);
      setSource("sample");
      setSourceLabel("Synthetic sample cohort");
      setLoading(false);
      toast.success(`Loaded ${scored.length} synthetic patient records`);
    }, 420);
  }, []);

  const uploadCsv = useCallback((file: File) => {
    setLoading(true);
    setFilters(emptyFilters);
    parsePatientCsv(file)
      .then((records) => {
        setAllPatients(scoreAll(records));
        setSource("upload");
        setSourceLabel(file.name);
        toast.success(`Imported ${records.length} records from ${file.name}`);
      })
      .catch((err: Error) => {
        toast.error(err.message || "Could not read that file");
      })
      .finally(() => setLoading(false));
  }, []);

  const clearData = useCallback(() => {
    setAllPatients([]);
    setSource("none");
    setSourceLabel("");
    setFilters(emptyFilters);
  }, []);

  const patients = useMemo(() => applyFilters(allPatients, filters), [allPatients, filters]);

  const options = useMemo(
    () => ({
      diagnoses: [...new Set(allPatients.map((p) => p.primary_diagnosis))].sort(),
      insurances: [...new Set(allPatients.map((p) => p.insurance_type))].sort(),
    }),
    [allPatients],
  );

  const value: DataStore = {
    allPatients,
    patients,
    filters,
    setFilter,
    resetFilters,
    loading,
    source,
    sourceLabel,
    hasData: allPatients.length > 0,
    loadSample,
    uploadCsv,
    clearData,
    options,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
