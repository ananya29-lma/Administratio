import type { Row } from "./mock";

export const BATCH_CATEGORIES = ["MWF", "TTS", "Full Week"];

export function studentLmsUserIdPreview(
  name: unknown,
  admissionNumber: unknown,
  existingUserIds: string[] = [],
): string | undefined {
  const nameParts =
    String(name ?? "")
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .match(/[a-z]+/g) ?? [];
  const admissionYear = String(admissionNumber ?? "").match(/(?:19|20)\d{2}/)?.[0];
  if (!nameParts.length || !admissionYear) return undefined;

  const baseId = `${nameParts[0]}.${nameParts[1]?.[0] ?? "s"}${admissionYear}`;
  const usedIds = new Set(existingUserIds.map((id) => id.toLowerCase()));
  if (!usedIds.has(baseId)) return baseId;

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

export function studentDemoPassword(name: unknown, studentIdentifier: unknown): string | undefined {
  const firstName = String(name ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .match(/[a-z]+/)?.[0];
  const identifier = String(studentIdentifier ?? "").trim();
  if (!firstName || !identifier) return undefined;
  return `${firstName}@2026`;
}

export type AttendanceRecord = {
  id?: string;
  regNo: string;
  date: string;
  sessionId?: string;
  batch?: string;
  status: string;
};

export function attendancePercentage(records: { status?: unknown }[]): number | null {
  const counted = records.filter((record) => ["P", "L", "A"].includes(String(record.status ?? "")));
  if (!counted.length) return null;
  const attended = counted.filter((record) =>
    ["P", "L"].includes(String(record.status ?? "")),
  ).length;
  return Math.round((attended / counted.length) * 100);
}

export function hasDuplicateAttendance(
  records: Row[],
  candidate: AttendanceRecord,
  excludeId?: string,
): boolean {
  const sessionId = candidate.sessionId ?? candidate.batch ?? "";
  return records.some(
    (record) =>
      record.id !== excludeId &&
      record.regNo === candidate.regNo &&
      record.date === candidate.date &&
      (record.sessionId ?? record.batch ?? "") === sessionId,
  );
}

export function academicTopicTotal(practical: unknown, theory: unknown): number {
  const practicalMark =
    practical === "" || practical === null || practical === undefined ? 0 : Number(practical);
  const theoryMark = theory === "" || theory === null || theory === undefined ? 0 : Number(theory);
  return practicalMark + theoryMark;
}

export function academicMarksError(practical: unknown, theory: unknown): string | undefined {
  const marks = [practical, theory].filter(
    (mark) => mark !== "" && mark !== null && mark !== undefined,
  );
  return marks.some((mark) => !Number.isFinite(Number(mark)) || Number(mark) < 0)
    ? "Marks must be valid non-negative numbers"
    : undefined;
}

export function countUniqueStudents(records: Row[]): number {
  const identifiers = new Set(
    records
      .map((record) => {
        const identifier =
          record.studentId ??
          record.regNo ??
          record.admissionNo ??
          record.admissionNumber ??
          record.appNo ??
          record.applicationNumber ??
          record.name;
        return String(identifier ?? "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean),
  );
  return identifiers.size;
}

export type CurriculumSubject = { name: string; sessions: number; typical: string };

export const DEFAULT_SUBJECT_CURRICULUM: CurriculumSubject[] = [
  { name: "AI Foundation / Orientation", sessions: 15, typical: "15 days" },
  { name: "Advanced Python & Database Foundation", sessions: 40, typical: "2 months" },
  { name: "ML, Data Science & Data Visualization", sessions: 55, typical: "55 days" },
  { name: "Big Data & Cloud Data Engineering", sessions: 40, typical: "40 days" },
  { name: "Big Data Analytics - Tableau & Power BI", sessions: 25, typical: "25 days" },
  { name: "Advanced MLOps", sessions: 30, typical: "1.5 months" },
  { name: "Advanced Deep Learning & Computer Vision", sessions: 40, typical: "2 months" },
  { name: "NLP & AI Bots", sessions: 40, typical: "2 months" },
  { name: "Introduction to Generative AI & Agentic AI", sessions: 15, typical: "15 days" },
  { name: "AI Research", sessions: 15, typical: "15 days" },
];

export const SUBJECT_SESSION_COUNTS = Object.fromEntries(
  DEFAULT_SUBJECT_CURRICULUM.map(({ name, sessions }) => [name, sessions]),
);

export function subjectSessionCount(
  subject: unknown,
  curriculum: CurriculumSubject[] = DEFAULT_SUBJECT_CURRICULUM,
): number | undefined {
  return curriculum.find((item) => item.name === String(subject ?? ""))?.sessions;
}

export type ScheduleBuildInput = {
  startDate: string;
  daysOfWeek: number[];
  totalSessions: number;
  holidays?: string[];
  unavailable?: string[];
  endDate?: string;
};

export type BuiltSchedule = {
  sessions: string[];
  endDate: string;
  weeks: number;
  skippedDates: string[];
  lastWeekSessions: number;
};

export type SchedulePlan = BuiltSchedule & {
  startDate: string;
  daysOfWeek: number[];
  totalSessions: number;
  endMode: "afterSessions";
  selectedEndDate: string;
  holidayDates: string[];
  unavailableDates: string[];
};

function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return undefined;
  return date;
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildSchedule({
  startDate,
  daysOfWeek,
  totalSessions,
  holidays = [],
  unavailable = [],
  endDate,
}: ScheduleBuildInput): BuiltSchedule {
  const start = parseIsoDate(startDate);
  const until = endDate ? parseIsoDate(endDate) : undefined;
  const selectedDays = [...new Set(daysOfWeek)].filter(
    (day) => Number.isInteger(day) && day >= 0 && day <= 6,
  );
  if (
    !start ||
    (endDate && (!until || until < start)) ||
    selectedDays.length === 0 ||
    !Number.isInteger(totalSessions) ||
    totalSessions < 1
  ) {
    return { sessions: [], endDate: "", weeks: 0, skippedDates: [], lastWeekSessions: 0 };
  }

  const holidaySet = new Set(holidays);
  const unavailableSet = new Set(unavailable);
  const sessions: string[] = [];
  const skippedDates: string[] = [];
  const cursor = new Date(start);
  for (let guard = 0; guard < 3650 && sessions.length < totalSessions; guard++) {
    if (until && cursor > until) break;
    const date = localIsoDate(cursor);
    if (selectedDays.includes(cursor.getDay())) {
      if (holidaySet.has(date) || unavailableSet.has(date)) skippedDates.push(date);
      else sessions.push(date);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const last = sessions.at(-1);
  if (!last) return { sessions, endDate: "", weeks: 0, skippedDates, lastWeekSessions: 0 };
  const lastDate = parseIsoDate(last)!;
  const lastWeekIndex = Math.floor((lastDate.getTime() - start.getTime()) / 604_800_000);
  const lastWeekSessions = sessions.filter((sessionDate) => {
    const session = parseIsoDate(sessionDate)!;
    return Math.floor((session.getTime() - start.getTime()) / 604_800_000) === lastWeekIndex;
  }).length;
  const weeks = Math.max(1, Math.ceil((lastDate.getTime() - start.getTime() + 1) / 604_800_000));
  return { sessions, endDate: last, weeks, skippedDates, lastWeekSessions };
}

export type SuggestedDays = {
  minimumSessionsPerWeek: number;
  suggestedPatterns: Array<{ label: string; daysOfWeek: number[] }>;
};

export function suggestDays({
  totalSessions,
  targetEndDate,
  startDate,
  durationInWeeks,
}: {
  totalSessions: number;
  targetEndDate?: string;
  startDate?: string;
  durationInWeeks?: number;
}): SuggestedDays {
  let weeks = durationInWeeks;
  if (targetEndDate) {
    const target = parseIsoDate(targetEndDate);
    if (target) {
      const start = parseIsoDate(startDate ?? "") ?? new Date();
      start.setHours(12, 0, 0, 0);
      weeks = Math.max(1, Math.ceil((target.getTime() - start.getTime()) / 604_800_000));
    }
  }
  const minimumSessionsPerWeek =
    Number.isFinite(totalSessions) && totalSessions > 0 && Number.isFinite(weeks) && weeks! > 0
      ? Math.ceil(totalSessions / weeks!)
      : 0;
  const patterns = [
    { label: "Mon–Fri", daysOfWeek: [1, 2, 3, 4, 5] },
    { label: "Mon/Wed/Fri", daysOfWeek: [1, 3, 5] },
    { label: "Tue/Thu", daysOfWeek: [2, 4] },
    { label: "Mon–Sat", daysOfWeek: [1, 2, 3, 4, 5, 6] },
    { label: "Every day", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
  ];
  return {
    minimumSessionsPerWeek,
    suggestedPatterns: patterns.filter(
      ({ daysOfWeek }) => daysOfWeek.length >= minimumSessionsPerWeek,
    ),
  };
}

export function batchCategory(batchName: unknown, batches: Row[]): string {
  const name = String(batchName ?? "");
  if (BATCH_CATEGORIES.includes(name)) return name;
  const days = batches.find((batch) => batch.name === name)?.days;
  const activeDays = Array.isArray(days) ? days.map(String) : [];
  if (activeDays.length === 3 && ["Mon", "Wed", "Fri"].every((day) => activeDays.includes(day)))
    return "MWF";
  if (activeDays.length === 3 && ["Tue", "Thu", "Sat"].every((day) => activeDays.includes(day)))
    return "TTS";
  return "Full Week";
}

export function paymentError(amount: number, balance: number): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than zero";
  if (amount > balance) return "Payment exceeds the outstanding balance";
  return undefined;
}

export function examFeeEligibility(
  appNo: string,
  regNo: string,
  month: string,
  monthlyDue: number,
  payments: Row[],
) {
  const matching = payments.filter(
    (payment) =>
      payment.appNo === appNo &&
      payment.regNo === regNo &&
      typeof payment.date === "string" &&
      payment.date.slice(0, 7) === month,
  );
  const verified = matching.filter((payment) => payment.verified === true);
  const paid = verified.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const overdue = month < new Date().toISOString().slice(0, 7);
  if (paid >= monthlyDue && monthlyDue > 0)
    return { eligible: true, paid, reason: "Monthly fee fully paid and verified" };
  if (matching.some((payment) => payment.verified !== true)) {
    return {
      eligible: false,
      paid,
      reason: `${overdue ? "Overdue: " : ""}payment for this month is not verified`,
    };
  }
  if (paid > 0)
    return {
      eligible: false,
      paid,
      reason: `${overdue ? "Overdue: " : "Partial payment: "}₹${Math.max(0, monthlyDue - paid).toLocaleString("en-IN")} still due`,
    };
  return {
    eligible: false,
    paid: 0,
    reason: overdue
      ? "Overdue: no verified fee payment recorded for this month"
      : "No verified fee payment recorded for this month",
  };
}

export function summarizeExamEligibility(students: { eligible: boolean }[]) {
  const eligibleForExam = students.filter((student) => student.eligible).length;
  return {
    totalStudents: students.length,
    eligibleForExam,
    feesPending: students.length - eligibleForExam,
  };
}

export function examScheduleAfterClassEnd(classEndDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(classEndDate);
  if (!match) throw new Error("A valid class end date is required to schedule the examination");

  const [, year, month, day] = match;
  const endDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    endDate.getUTCFullYear() !== Number(year) ||
    endDate.getUTCMonth() !== Number(month) - 1 ||
    endDate.getUTCDate() !== Number(day)
  ) {
    throw new Error("A valid class end date is required to schedule the examination");
  }

  endDate.setUTCDate(endDate.getUTCDate() + 4);
  const examDate = endDate.toISOString().slice(0, 10);
  return {
    practicalDate: examDate,
    practicalTime: "14:00",
    practicalEndTime: "17:00",
    theoryDate: examDate,
    theoryTime: "10:00",
    theoryEndTime: "13:00",
  };
}

export function examApprovalError(
  requestId: string,
  regNo: string,
  approvals: Row[],
  eligibility: { eligible: boolean },
) {
  if (!eligibility.eligible)
    return "Student is not eligible: monthly fees must be fully paid and verified";
  if (approvals.some((approval) => approval.requestId === requestId && approval.regNo === regNo)) {
    return "This student has already been approved for this exam";
  }
  return undefined;
}

export function feeTotals(rows: Row[]) {
  return rows.reduce(
    (totals, row) => ({
      payable: totals.payable + Number(row.fee || 0) - Number(row.discount || 0),
      paid: totals.paid + Number(row.paid || 0),
      outstanding:
        totals.outstanding +
        Number(row.fee || 0) -
        Number(row.discount || 0) -
        Number(row.paid || 0),
    }),
    { payable: 0, paid: 0, outstanding: 0 },
  );
}

export function inDateRange(date: string | undefined, from: string, to: string) {
  return !!date && (!from || date >= from) && (!to || date <= to);
}

export function thresholdError(value: number): string | undefined {
  return Number.isInteger(value) && value >= 1
    ? undefined
    : "Enter a whole number of at least 1 day";
}

export function scheduleConflict(existing: Row[], candidate: Row): string | undefined {
  const overlaps = (row: Row) =>
    row.date === candidate.date &&
    String(candidate.startTime) < String(row.endTime) &&
    String(row.startTime) < String(candidate.endTime);
  const same = (a: unknown, b: unknown) =>
    String(a ?? "")
      .trim()
      .toLowerCase() ===
    String(b ?? "")
      .trim()
      .toLowerCase();
  const students = (row: Row) => {
    const values = Array.isArray(row.admissionNumbers)
      ? row.admissionNumbers
      : [row.admissionNumber];
    return values.filter(Boolean).map((value) => String(value).trim().toLowerCase());
  };
  const sharedStudent = (row: Row) =>
    students(row).some((student) => students(candidate).includes(student));
  const sameBatch = (row: Row) => {
    const candidateBatch = candidate.batchId ?? candidate.batch;
    const existingBatch = row.batchId ?? row.batch;
    return !!candidateBatch && same(candidateBatch, existingBatch);
  };
  const conflict = existing.find(
    (row) =>
      row.id !== candidate.id &&
      overlaps(row) &&
      (same(row.facultyName, candidate.facultyName) ||
        sharedStudent(row) ||
        sameBatch(row) ||
        (candidate.room && same(row.room, candidate.room))),
  );
  if (!conflict) return undefined;
  if (same(conflict.facultyName, candidate.facultyName))
    return "This faculty member is already scheduled for that time";
  if (sharedStudent(conflict)) return "This student is already scheduled for that time";
  if (sameBatch(conflict)) return "This batch is already scheduled for that time";
  return candidate.room ? "This room is already booked for that time" : undefined;
}

export function taskTimeError(start: string, end: string): string | undefined {
  if (start && end && end <= start) return "End time must be later than start time";
  return undefined;
}

export function relatedScheduledClassIds(_sessions: Row[], target: Row): string[] {
  return target.id == null ? [] : [String(target.id)];
}

export type RecurrenceUnit = "day" | "week" | "month" | "year";
export type RecurrenceEnd = {
  type: "never" | "onDate" | "afterCount";
  date: string;
  count: number;
};

export type RecurrenceRule = {
  interval: number;
  unit: RecurrenceUnit;
  daysOfWeek: number[];
  monthlyMode: "dayOfMonth" | "nthWeekday";
  ends: RecurrenceEnd;
  startDate: string;
  startTime: string;
  endTime: string;
};

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const RRULE_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateAtUtcNoon(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function isoDateUtc(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function recurrenceMatchesDate(rule: RecurrenceRule, date: string) {
  const start = dateAtUtcNoon(rule.startDate);
  const current = dateAtUtcNoon(date);
  if (current < start) return false;
  const daysAfterStart = Math.floor((current.getTime() - start.getTime()) / 86400000);
  if (rule.unit === "day") return daysAfterStart % rule.interval === 0;
  if (rule.unit === "week") {
    const startMondayOffset = (start.getUTCDay() + 6) % 7;
    const currentMondayOffset = (current.getUTCDay() + 6) % 7;
    const weekIndex = Math.floor((daysAfterStart + startMondayOffset - currentMondayOffset) / 7);
    return weekIndex % rule.interval === 0 && rule.daysOfWeek.includes(current.getUTCDay());
  }
  if (rule.unit === "month") {
    const monthsAfterStart =
      (current.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      current.getUTCMonth() -
      start.getUTCMonth();
    if (monthsAfterStart % rule.interval !== 0) return false;
    if (rule.monthlyMode === "dayOfMonth") return current.getUTCDate() === start.getUTCDate();
    const dayIndex = current.getUTCDay();
    const nthInMonth = Math.ceil(current.getUTCDate() / 7);
    const isLastWeekday =
      new Date(
        Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() + 7, 12),
      ).getUTCMonth() !== current.getUTCMonth();
    const startNth = Math.ceil(start.getUTCDate() / 7);
    const startIsLast =
      new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7, 12),
      ).getUTCMonth() !== start.getUTCMonth();
    return (
      dayIndex === start.getUTCDay() && (startIsLast ? isLastWeekday : nthInMonth === startNth)
    );
  }
  const yearsAfterStart = current.getUTCFullYear() - start.getUTCFullYear();
  return (
    yearsAfterStart % rule.interval === 0 &&
    current.getUTCMonth() === start.getUTCMonth() &&
    current.getUTCDate() === start.getUTCDate()
  );
}

export function recurrenceRuleToRRule(rule: RecurrenceRule): string {
  const parts = [
    `FREQ=${rule.unit.toUpperCase()}`,
    `INTERVAL=${Math.max(1, Math.floor(rule.interval))}`,
  ];
  if (rule.unit === "week" && rule.daysOfWeek.length) {
    parts.push(
      `BYDAY=${[...new Set(rule.daysOfWeek)]
        .sort((a, b) => a - b)
        .map((day) => RRULE_DAYS[day])
        .join(",")}`,
    );
  }
  if (rule.unit === "month") {
    if (rule.monthlyMode === "dayOfMonth") {
      parts.push(`BYMONTHDAY=${dateAtUtcNoon(rule.startDate).getUTCDate()}`);
    } else {
      const date = dateAtUtcNoon(rule.startDate);
      const ordinal = Math.ceil(date.getUTCDate() / 7);
      const isLast =
        new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 7, 12),
        ).getUTCMonth() !== date.getUTCMonth();
      parts.push(`BYDAY=${isLast ? -1 : ordinal}${RRULE_DAYS[date.getUTCDay()]}`);
    }
  }
  if (rule.ends.type === "afterCount")
    parts.push(`COUNT=${Math.max(1, Math.floor(rule.ends.count))}`);
  if (rule.ends.type === "onDate")
    parts.push(`UNTIL=${rule.ends.date.replaceAll("-", "")}T235959Z`);
  return parts.join(";");
}

export function recurrenceRuleFromRRule(
  rrule: string,
  startDate: string,
  startTime = "09:00",
  endTime = "11:00",
): RecurrenceRule {
  const values = Object.fromEntries(
    rrule.split(";").map((part) => {
      const separator = part.indexOf("=");
      return [part.slice(0, separator).toUpperCase(), part.slice(separator + 1)];
    }),
  );
  const frequencyUnits: Record<string, RecurrenceUnit> = {
    DAILY: "day",
    WEEKLY: "week",
    MONTHLY: "month",
    YEARLY: "year",
  };
  const unit = frequencyUnits[values.FREQ ?? "WEEKLY"] ?? "week";
  const byDays = (values.BYDAY ?? "").split(",").filter(Boolean);
  const daysOfWeek = byDays
    .map((day) => RRULE_DAYS.indexOf(day.slice(-2)))
    .filter((day) => day >= 0);
  const count = Number(values.COUNT ?? 13);
  const until = values.UNTIL?.slice(0, 8);
  const ends: RecurrenceEnd = values.COUNT
    ? { type: "afterCount", date: "", count }
    : until && until.length === 8
      ? {
          type: "onDate",
          date: `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`,
          count: 13,
        }
      : { type: "never", date: "", count: 13 };
  return {
    interval: Math.max(1, Number(values.INTERVAL ?? 1) || 1),
    unit,
    daysOfWeek: daysOfWeek.length ? daysOfWeek : [dateAtUtcNoon(startDate).getUTCDay()],
    monthlyMode: values.BYMONTHDAY
      ? "dayOfMonth"
      : byDays.some((day) => /^-?\d/.test(day))
        ? "nthWeekday"
        : "dayOfMonth",
    ends,
    startDate,
    startTime,
    endTime,
  };
}

export function recurrenceSummary(rule: RecurrenceRule): string {
  const intervalText = rule.interval === 1 ? "Every" : `Every ${rule.interval}`;
  let summary: string;
  if (rule.unit === "day") summary = rule.interval === 1 ? "Every day" : `${intervalText} days`;
  else if (rule.unit === "week") {
    const selected = [...new Set(rule.daysOfWeek)]
      .sort((a, b) => a - b)
      .map((day) => RRULE_DAY_NAMES[day])
      .join(", ");
    summary = `${rule.interval === 1 ? "Every week" : `Every ${rule.interval} weeks`}${selected ? ` on ${selected}` : ""}`;
  } else if (rule.unit === "month") {
    const date = dateAtUtcNoon(rule.startDate);
    const ordinalWords = ["first", "second", "third", "fourth", "fifth"];
    const isLast =
      new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 7, 12),
      ).getUTCMonth() !== date.getUTCMonth();
    const mode =
      rule.monthlyMode === "dayOfMonth"
        ? `on day ${date.getUTCDate()}`
        : `on the ${isLast ? "last" : ordinalWords[Math.ceil(date.getUTCDate() / 7) - 1]} ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getUTCDay()]}`;
    summary = `${rule.interval === 1 ? "Every month" : `Every ${rule.interval} months`} ${mode}`;
  } else summary = rule.interval === 1 ? "Every year" : `Every ${rule.interval} years`;
  if (rule.ends.type === "onDate" && rule.ends.date) {
    const endDate = dateAtUtcNoon(rule.ends.date);
    const formatted = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(endDate);
    summary += ` until ${formatted}`;
  } else if (rule.ends.type === "afterCount") summary += `, ${rule.ends.count} times`;
  return summary;
}

export function expandRecurrenceRule(
  rule: RecurrenceRule,
  rangeStart: string,
  rangeEnd: string,
  bufferDays = 0,
): string[] {
  if (!rule.startDate || !rangeStart || !rangeEnd || rangeStart > rangeEnd) return [];
  const start = dateAtUtcNoon(rule.startDate);
  const lower = dateAtUtcNoon(rangeStart);
  lower.setUTCDate(lower.getUTCDate() - Math.max(0, bufferDays));
  const upper = dateAtUtcNoon(rangeEnd);
  upper.setUTCDate(upper.getUTCDate() + Math.max(0, bufferDays));
  const cursor = new Date(start > lower ? start : lower);
  const dates: string[] = [];
  let occurrenceCount = 0;
  if (rule.ends.type === "afterCount" && cursor > start) {
    const previous = new Date(start);
    while (previous < cursor) {
      const candidate = isoDateUtc(previous);
      if (recurrenceMatchesDate(rule, candidate)) occurrenceCount++;
      previous.setUTCDate(previous.getUTCDate() + 1);
    }
  }
  const finalDate =
    rule.ends.type === "onDate" && rule.ends.date && rule.ends.date < isoDateUtc(upper)
      ? dateAtUtcNoon(rule.ends.date)
      : upper;
  for (
    let guard = 0;
    cursor <= finalDate && guard < 36600;
    guard++, cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const candidate = isoDateUtc(cursor);
    if (!recurrenceMatchesDate(rule, candidate)) continue;
    occurrenceCount++;
    if (rule.ends.type === "afterCount" && occurrenceCount > rule.ends.count) break;
    if (candidate >= rangeStart && candidate <= rangeEnd) dates.push(candidate);
  }
  return dates;
}

export type ModulePredictionConfig = {
  currentModule: string;
  nextModule: string;
  remainingSessions: number;
  totalSessions: number;
  action: string;
};

export function predictModuleCompletion(
  config: ModulePredictionConfig,
  batch: Row | undefined,
  sessions: Row[],
  fromDate: string,
  facultyName: string,
) {
  if (!batch || !Array.isArray(batch.days) || batch.days.length === 0) return undefined;
  const days = batch.days as string[];
  const completedInSchedule = sessions.filter(
    (session) =>
      session.batch === batch.name &&
      session.module === config.currentModule &&
      (session.status === "Completed" ||
        (typeof session.date === "string" && session.date < fromDate)),
  ).length;
  const totalSessions = Number(batch.totalSessions ?? config.totalSessions);
  const completedSessions = Math.min(
    totalSessions,
    Math.max(
      0,
      Number(
        batch.completedSessions ??
          totalSessions -
            Number(batch.remainingSessions ?? config.remainingSessions) +
            completedInSchedule,
      ),
    ),
  );
  const remaining = Math.max(0, totalSessions - completedSessions);
  const sourceSeries = sessions.find(
    (session) =>
      session.course === batch.course &&
      session.facultyName === facultyName &&
      session.recurrenceRule &&
      (session.batch === batch.name || !session.batch),
  );
  const savedRule = sourceSeries?.recurrenceRule as RecurrenceRule | undefined;
  if (savedRule) {
    const rangeEnd = new Date(`${fromDate}T12:00:00`);
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 5);
    const end = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;
    const excludedDates = new Set(
      Array.isArray(sourceSeries?.excludedDates) ? sourceSeries.excludedDates.map(String) : [],
    );
    const futureDates = expandRecurrenceRule(savedRule, fromDate, end).filter((date) => {
      if (excludedDates.has(date)) return false;
      return !sessions.some((session) => {
        if (session.id === sourceSeries?.id) return false;
        const otherRule = session.recurrenceRule as RecurrenceRule | undefined;
        const occurs = otherRule
          ? expandRecurrenceRule(otherRule, date, date).includes(date)
          : session.date === date;
        const startTime = otherRule?.startTime ?? session.startTime;
        const endTime = otherRule?.endTime ?? session.endTime;
        return (
          occurs &&
          startTime < savedRule.endTime &&
          endTime > savedRule.startTime &&
          (session.facultyName === facultyName || session.batch === batch.name)
        );
      });
    });
    if (futureDates.length >= remaining) {
      const selectedDates = futureDates.slice(0, remaining);
      const completionDate = selectedDates.at(-1) ?? fromDate;
      const nextDates = futureDates.slice(remaining, remaining + 2);
      const nextStart = new Date(`${completionDate}T12:00:00`);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextStartDate = `${nextStart.getFullYear()}-${String(nextStart.getMonth() + 1).padStart(2, "0")}-${String(nextStart.getDate()).padStart(2, "0")}`;
      const predictedDays = Math.max(
        1,
        Math.round(
          (new Date(`${completionDate}T12:00:00`).getTime() -
            new Date(`${fromDate}T12:00:00`).getTime()) /
            86400000,
        ),
      );
      const progress = totalSessions > 0 ? completedSessions / totalSessions : 0;
      return {
        currentModule: config.currentModule,
        nextModule: config.nextModule,
        remainingSessions: remaining,
        completedSessions,
        totalSessions,
        completionDate,
        nextDates,
        startTime: savedRule.startTime,
        endTime: savedRule.endTime,
        days: predictedDays,
        action: config.action,
        status:
          completionDate > String(batch.endDate ?? "9999-12-31")
            ? "Delayed"
            : progress >= 0.85
              ? "Almost Complete"
              : "On Track",
      };
    }
    return undefined;
  }
  const estimate = (startDate: string, count: number, startTime: string, endTime: string) => {
    const dates: string[] = [];
    const cursor = new Date(`${startDate}T12:00:00`);
    for (let i = 0; i < 366 && dates.length < count; i++, cursor.setDate(cursor.getDate() + 1)) {
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][cursor.getDay()];
      if (!days.includes(day)) continue;
      const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const clash = sessions.some(
        (session) =>
          session.date === date &&
          session.startTime < endTime &&
          session.endTime > startTime &&
          (session.facultyName === facultyName || session.batch === batch.name),
      );
      if (!clash) dates.push(date);
    }
    return dates;
  };
  if (!Number.isFinite(remaining) || remaining < 0) return undefined;
  const remainingDates = estimate(
    fromDate,
    remaining,
    String(batch.startTime ?? "09:00"),
    String(batch.endTime ?? "11:00"),
  );
  if (remainingDates.length !== remaining) return undefined;
  const completionDate = remainingDates.at(-1) ?? fromDate;
  const nextStart = new Date(`${completionDate}T12:00:00`);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextStartDate = `${nextStart.getFullYear()}-${String(nextStart.getMonth() + 1).padStart(2, "0")}-${String(nextStart.getDate()).padStart(2, "0")}`;
  const nextDates = estimate(
    nextStartDate,
    2,
    String(batch.startTime ?? "09:00"),
    String(batch.endTime ?? "11:00"),
  );
  const predictedDays = Math.max(
    1,
    Math.round(
      (new Date(`${completionDate}T12:00:00`).getTime() -
        new Date(`${fromDate}T12:00:00`).getTime()) /
        86400000,
    ),
  );
  const progress = totalSessions > 0 ? completedSessions / totalSessions : 0;
  return {
    currentModule: config.currentModule,
    nextModule: config.nextModule,
    remainingSessions: remaining,
    completedSessions,
    totalSessions,
    completionDate,
    nextDates,
    startTime: String(batch.startTime ?? "09:00"),
    endTime: String(batch.endTime ?? "11:00"),
    days: predictedDays,
    action: config.action,
    status:
      completionDate > String(batch.endDate ?? "9999-12-31")
        ? "Delayed"
        : progress >= 0.85
          ? "Almost Complete"
          : "On Track",
  };
}

export const FACULTY_CALENDAR_SLOTS = [
  { startTime: "09:00", endTime: "11:00" },
  { startTime: "11:00", endTime: "13:00" },
  { startTime: "13:00", endTime: "14:00", lunch: true },
  { startTime: "14:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "18:00" },
] as const;

const ASSIGNABLE_SLOT_INDICES = [0, 1, 3, 4] as const;

export function facultyFreeSlot(facultyIndex: number, date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekdayIndex = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  const slotIndex =
    ASSIGNABLE_SLOT_INDICES[
      (Math.max(0, facultyIndex) + weekdayIndex) % ASSIGNABLE_SLOT_INDICES.length
    ];
  return FACULTY_CALENDAR_SLOTS[slotIndex];
}

export function facultyCalendarAvailability(
  faculty: string,
  date: string,
  facultyIndex: number,
  classes: Row[],
  tasks: Row[],
) {
  const demoFreeSlot = facultyFreeSlot(facultyIndex, date);
  const overlapsSlot = (record: Row, slot: (typeof FACULTY_CALENDAR_SLOTS)[number]) =>
    typeof record.startTime === "string" &&
    typeof record.endTime === "string" &&
    record.startTime < slot.endTime &&
    slot.startTime < record.endTime;
  const hasClass = (slot: (typeof FACULTY_CALENDAR_SLOTS)[number]) =>
    classes.some(
      (row) => row.facultyName === faculty && row.date === date && overlapsSlot(row, slot),
    );
  const hasTask = (slot: (typeof FACULTY_CALENDAR_SLOTS)[number]) =>
    tasks.some(
      (row) =>
        row.assignee === faculty &&
        row.date === date &&
        row.workflowStatus !== "Draft" &&
        overlapsSlot(row, slot),
    );

  return FACULTY_CALENDAR_SLOTS.map((slot) => {
    if ("lunch" in slot) return { ...slot, status: "lunch" as const };
    const isDesignatedFreeSlot = slot.startTime === demoFreeSlot.startTime;
    return {
      ...slot,
      status:
        isDesignatedFreeSlot && !hasClass(slot) && !hasTask(slot)
          ? ("free" as const)
          : ("busy" as const),
    };
  });
}
