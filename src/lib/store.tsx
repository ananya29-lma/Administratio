import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as M from "./mock";
import type { Row } from "./mock";
import { persistCommittedStudentRecord, readCommittedStudentRecords } from "./student-records";

export type CollectionName = "students" | "admissions" | "payments" | "batches" | "leaves" | "late" | "outgoing" | "absences" | "certs" | "agreements" | "slips" | "courseChanges" | "courseRestarts" | "trackChanges" | "tasks" | "scheduledClasses" | "courseCompletions" | "committedStudents";

export interface Settings {
  institution: string; address: string; phone: string; email: string;
  navigationDate: string;
  absenceThreshold: number; currency: string; dateFormat: string;
  leaveCategories: string[]; certTypes: string[];
  prefixes: Record<string, string>; notify: Record<string, boolean>;
}

const initial: Record<CollectionName, Row[]> = {
  students: M.INITIAL_STUDENTS, admissions: M.INITIAL_ADMISSIONS, payments: M.INITIAL_PAYMENTS, batches: M.INITIAL_BATCHES,
  leaves: M.INITIAL_LEAVES, late: M.INITIAL_LATE, outgoing: M.INITIAL_OUTGOING, absences: M.INITIAL_ABSENCES,
  certs: M.INITIAL_CERTS, agreements: M.INITIAL_AGREEMENTS, slips: M.INITIAL_SLIPS,
  courseChanges: M.INITIAL_COURSE_CHANGES, courseRestarts: M.INITIAL_COURSE_RESTARTS, trackChanges: M.INITIAL_TRACK_CHANGES,
  tasks: M.INITIAL_TASKS,
  scheduledClasses: M.INITIAL_SCHEDULED_CLASSES,
  courseCompletions: M.INITIAL_COURSE_COMPLETIONS,
  committedStudents: [],
};

const initialSettings: Settings = {
  institution: "Brightpath Institute of Technology", address: "42, Anna Salai, Chennai 600002", phone: "+91 44 2345 6789", email: "office@brightpath.edu.in",
  navigationDate: "",
  absenceThreshold: 7, currency: "INR", dateFormat: "DD MMM YYYY",
  leaveCategories: ["Medical", "Personal", "Academic", "Family"], certTypes: M.CERT_TYPES,
  prefixes: { application: "APP", admission: "ADM", receipt: "RCP", leave: "LR", late: "LPR", outgoing: "OGS", certificate: "CRT", slip: "CSS", agreement: "AGR" },
  notify: { leave: true, fees: true, absence: true, certificates: false, dailySummary: true },
};

interface Ctx {
  data: Record<CollectionName, Row[]>;
  setCollection: (n: CollectionName, fn: (rows: Row[]) => Row[]) => void;
  saveCommittedStudentRecord: (record: Row) => void;
  settings: Settings; setSettings: (s: Settings) => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initial);
  const [settings, setSettings] = useState(initialSettings);
  const setCollection = useCallback((n: CollectionName, fn: (rows: Row[]) => Row[]) => setData((d) => ({ ...d, [n]: fn(d[n]) })), []);
  const saveCommittedStudentRecord = useCallback((record: Row) => {
    if (typeof window === "undefined") {
      throw new Error("Student records can only be saved in the browser");
    }
    const savedRecords = persistCommittedStudentRecord(window.localStorage, record);
    setData((current) => ({ ...current, committedStudents: savedRecords }));
  }, []);
  useEffect(() => {
    try {
      const records = readCommittedStudentRecords(window.localStorage);
      if (records.length) {
        setData((current) => ({ ...current, committedStudents: records }));
      }
    } catch (error) {
      console.error("Failed to load saved student records", error);
    }
  }, []);
  const value = useMemo(() => ({ data, setCollection, saveCommittedStudentRecord, settings, setSettings }), [data, setCollection, saveCommittedStudentRecord, settings]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

/** Collection helpers: add (prepend), update by key, remove by key. */
export function useCollection(n: CollectionName, key = "id") {
  const { data, setCollection } = useStore();
  const rows = data[n];
  return {
    rows,
    add: (r: Row) => setCollection(n, (rs) => [r, ...rs]),
    update: (k: string, patch: Row | ((r: Row) => Row)) =>
      setCollection(n, (rs) => rs.map((r) => (r[key] === k ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r))),
    remove: (k: string) => setCollection(n, (rs) => rs.filter((r) => r[key] !== k)),
    nextId: (prefix: string, digits = 4) => {
      const nums = rows.map((r) => parseInt(String(r[key]).split("-").pop() || "0", 10)).filter((x) => !isNaN(x));
      return `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(digits, "0")}`;
    },
  };
}
