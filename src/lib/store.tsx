import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as M from "./mock";
import type { Row } from "./mock";
import { persistCommittedStudentRecord, readCommittedStudentRecords } from "./student-records";
import { readScheduledClasses, writeScheduledClasses } from "./scheduled-class-storage";
import { examApprovalError, examFeeEligibility } from "./administration";
import { DEFAULT_SUBJECT_CURRICULUM, type CurriculumSubject } from "./administration";

const SETTINGS_STORAGE_KEY = "administration.settings.v1";
const ATTENDANCE_STORAGE_KEY = "administration.attendance.v1";
const ACADEMIC_TOPICS_STORAGE_KEY = "administration.academic-topics.v1";

export type CollectionName =
  | "students"
  | "admissions"
  | "payments"
  | "batches"
  | "leaves"
  | "late"
  | "outgoing"
  | "absences"
  | "certs"
  | "agreements"
  | "slips"
  | "courseChanges"
  | "courseRestarts"
  | "trackChanges"
  | "tasks"
  | "scheduledClasses"
  | "attendance"
  | "academicTopics"
  | "courseCompletions"
  | "committedStudents"
  | "examRequests"
  | "examApprovals"
  | "feeVerificationRequests";

export interface Settings {
  institution: string;
  address: string;
  phone: string;
  email: string;
  navigationDate: string;
  absenceThreshold: number;
  currency: string;
  dateFormat: string;
  leaveCategories: string[];
  certTypes: string[];
  prefixes: Record<string, string>;
  notify: Record<string, boolean>;
  subjectCurriculum: CurriculumSubject[];
  holidays: string[];
}

const initial: Record<CollectionName, Row[]> = {
  students: M.INITIAL_STUDENTS,
  admissions: M.INITIAL_ADMISSIONS,
  payments: M.INITIAL_PAYMENTS,
  batches: M.INITIAL_BATCHES,
  leaves: M.INITIAL_LEAVES,
  late: M.INITIAL_LATE,
  outgoing: M.INITIAL_OUTGOING,
  absences: M.INITIAL_ABSENCES,
  certs: M.INITIAL_CERTS,
  agreements: M.INITIAL_AGREEMENTS,
  slips: M.INITIAL_SLIPS,
  courseChanges: M.INITIAL_COURSE_CHANGES,
  courseRestarts: M.INITIAL_COURSE_RESTARTS,
  trackChanges: M.INITIAL_TRACK_CHANGES,
  tasks: M.INITIAL_TASKS,
  scheduledClasses: M.INITIAL_SCHEDULED_CLASSES,
  attendance: [],
  academicTopics: [],
  courseCompletions: M.INITIAL_COURSE_COMPLETIONS,
  committedStudents: [],
  examRequests: M.INITIAL_EXAM_REQUESTS,
  examApprovals: M.INITIAL_EXAM_APPROVALS,
  feeVerificationRequests: M.INITIAL_FEE_VERIFICATION_REQUESTS,
};

const initialSettings: Settings = {
  institution: "Brightpath Institute of Technology",
  address: "42, Anna Salai, Chennai 600002",
  phone: "+91 44 2345 6789",
  email: "office@brightpath.edu.in",
  navigationDate: "",
  absenceThreshold: 7,
  currency: "INR",
  dateFormat: "DD MMM YYYY",
  leaveCategories: ["Medical", "Personal", "Academic", "Family"],
  certTypes: M.CERT_TYPES,
  prefixes: {
    application: "APP",
    admission: "ADM",
    receipt: "RCP",
    leave: "LR",
    certificate: "CRT",
    agreement: "AGR",
    examination: "EXM",
    student: "STU",
  },
  notify: { leave: true, fees: true, absence: true, certificates: false, dailySummary: true },
  subjectCurriculum: DEFAULT_SUBJECT_CURRICULUM,
  holidays: [],
};

function readSettings(): Settings {
  if (typeof window === "undefined") return initialSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return initialSettings;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return initialSettings;
    const saved = parsed as Partial<Settings>;
    const subjectCurriculum =
      Array.isArray(saved.subjectCurriculum) &&
      saved.subjectCurriculum.every(
        (subject) =>
          subject &&
          typeof subject.name === "string" &&
          Number.isInteger(subject.sessions) &&
          subject.sessions > 0 &&
          typeof subject.typical === "string",
      )
        ? saved.subjectCurriculum
        : initialSettings.subjectCurriculum;
    const holidays =
      Array.isArray(saved.holidays) && saved.holidays.every((date) => typeof date === "string")
        ? saved.holidays
        : initialSettings.holidays;
    const savedPrefixes =
      saved.prefixes && typeof saved.prefixes === "object" && !Array.isArray(saved.prefixes)
        ? Object.fromEntries(
            Object.entries(saved.prefixes).filter(
              ([name]) => !["late", "outgoing", "slip"].includes(name),
            ),
          )
        : {};
    return {
      ...initialSettings,
      ...saved,
      prefixes: { ...initialSettings.prefixes, ...savedPrefixes },
      subjectCurriculum,
      holidays,
    };
  } catch (error) {
    console.error("Failed to load administration settings", error);
    return initialSettings;
  }
}

function readStoredRows(key: string): Row[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((row) => row && typeof row === "object" && !Array.isArray(row))
  ) {
    throw new Error(`Stored data for ${key} is invalid`);
  }
  return parsed as Row[];
}

interface Ctx {
  data: Record<CollectionName, Row[]>;
  setCollection: (n: CollectionName, fn: (rows: Row[]) => Row[]) => void;
  saveCommittedStudentRecord: (record: Row) => void;
  approveExamStudent: (request: Row, student: Row, monthlyDue: number) => string | undefined;
  settings: Settings;
  setSettings: (s: Settings) => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initial);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [scheduledClassesLoaded, setScheduledClassesLoaded] = useState(false);
  const scheduledClassesRef = useRef(initial.scheduledClasses);
  const scheduledClassesLoadedRef = useRef(false);
  const persistentRowsRef = useRef({
    attendance: initial.attendance,
    academicTopics: initial.academicTopics,
  });
  const persistentRowsLoadedRef = useRef(false);
  const setCollection = useCallback((n: CollectionName, fn: (rows: Row[]) => Row[]) => {
    if (n === "scheduledClasses") {
      const scheduledClasses = fn(scheduledClassesRef.current);
      scheduledClassesRef.current = scheduledClasses;
      if (scheduledClassesLoadedRef.current) {
        try {
          writeScheduledClasses(window.localStorage, scheduledClasses);
        } catch (error) {
          console.error("Failed to save scheduled classes", error);
        }
      }
      setData((current) => ({ ...current, scheduledClasses }));
      return;
    }
    if (n === "attendance" || n === "academicTopics") {
      const key = n === "attendance" ? ATTENDANCE_STORAGE_KEY : ACADEMIC_TOPICS_STORAGE_KEY;
      const rows = fn(persistentRowsRef.current[n]);
      if (persistentRowsLoadedRef.current) {
        try {
          window.localStorage.setItem(key, JSON.stringify(rows));
        } catch (error) {
          console.error(`Failed to save ${n}`, error);
          throw error;
        }
      }
      persistentRowsRef.current[n] = rows;
      setData((current) => ({ ...current, [n]: rows }));
      return;
    }
    setData((current) => ({ ...current, [n]: fn(current[n]) }));
  }, []);
  const saveCommittedStudentRecord = useCallback((record: Row) => {
    if (typeof window === "undefined") {
      throw new Error("Student records can only be saved in the browser");
    }
    const savedRecords = persistCommittedStudentRecord(window.localStorage, record);
    setData((current) => ({ ...current, committedStudents: savedRecords }));
  }, []);
  const approveExamStudent = useCallback(
    (request: Row, student: Row, monthlyDue: number) => {
      const eligibility = examFeeEligibility(
        student.appNo,
        student.regNo,
        request.month || String(request.examDate).slice(0, 7),
        monthlyDue,
        data.payments,
      );
      const error = examApprovalError(request.id, student.regNo, data.examApprovals, eligibility);
      if (error) return error;
      const record = {
        id: `${request.id}-${student.regNo}`,
        requestId: request.id,
        regNo: student.regNo,
        appNo: student.appNo,
        name: student.name,
        approvedAt: new Date().toISOString(),
        status: "Approved for Exam",
      };
      setData((current) =>
        current.examApprovals.some(
          (approval) => approval.requestId === request.id && approval.regNo === student.regNo,
        )
          ? current
          : { ...current, examApprovals: [record, ...current.examApprovals] },
      );
      return undefined;
    },
    [data],
  );
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
  useEffect(() => {
    const scheduledClasses = readScheduledClasses(window.localStorage, scheduledClassesRef.current);
    scheduledClassesRef.current = scheduledClasses;
    scheduledClassesLoadedRef.current = true;
    setData((current) => ({ ...current, scheduledClasses }));
    setScheduledClassesLoaded(true);
  }, []);
  useEffect(() => {
    let attendance = initial.attendance;
    let academicTopics = initial.academicTopics;
    try {
      attendance = readStoredRows(ATTENDANCE_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to load attendance records", error);
    }
    try {
      academicTopics = readStoredRows(ACADEMIC_TOPICS_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to load academic topic records", error);
    }
    persistentRowsRef.current = { attendance, academicTopics };
    setData((current) => ({ ...current, attendance, academicTopics }));
    persistentRowsLoadedRef.current = true;
  }, []);
  useEffect(() => {
    if (!scheduledClassesLoaded) return;
    try {
      writeScheduledClasses(window.localStorage, data.scheduledClasses);
    } catch (error) {
      console.error("Failed to save scheduled classes", error);
    }
  }, [data.scheduledClasses, scheduledClassesLoaded]);
  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save administration settings", error);
    }
  }, [settings]);
  const value = useMemo(
    () => ({
      data,
      setCollection,
      saveCommittedStudentRecord,
      approveExamStudent,
      settings,
      setSettings,
    }),
    [data, setCollection, saveCommittedStudentRecord, approveExamStudent, settings],
  );
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
    add: (r: Row) =>
      setCollection(n, (rs) => {
        if (n === "scheduledClasses") {
          const id = String(r.id ?? "");
          if (!id) return rs;
          return rs.some((row) => String(row.id ?? "") === id) ? rs : [r, ...rs];
        }
        return [r, ...rs];
      }),
    update: (k: string, patch: Row | ((r: Row) => Row)) =>
      setCollection(n, (rs) =>
        rs.map((r) =>
          r[key] === k ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r,
        ),
      ),
    remove: (k: string) => setCollection(n, (rs) => rs.filter((r) => r[key] !== k)),
    nextId: (prefix: string, digits = 4, idKey = key) => {
      const nums = rows
        .map((r) => parseInt(String(r[idKey]).split("-").pop() || "0", 10))
        .filter((x) => !isNaN(x));
      let candidateNumber = (nums.length ? Math.max(...nums) : 0) + 1;
      let candidate = `${prefix}-${String(candidateNumber).padStart(digits, "0")}`;
      const existingIds = new Set(rows.map((row) => String(row[idKey])));
      while (existingIds.has(candidate)) {
        candidateNumber += 1;
        candidate = `${prefix}-${String(candidateNumber).padStart(digits, "0")}`;
      }
      return candidate;
    },
  };
}
