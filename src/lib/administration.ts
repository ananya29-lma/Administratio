import type { Row } from "./mock";

export const BATCH_CATEGORIES = ["MWF", "TTS", "Full Week"];

export function batchCategory(batchName: unknown, batches: Row[]): string {
  const name = String(batchName ?? "");
  if (BATCH_CATEGORIES.includes(name)) return name;
  const days = batches.find((batch) => batch.name === name)?.days;
  const activeDays = Array.isArray(days) ? days.map(String) : [];
  if (activeDays.length === 3 && ["Mon", "Wed", "Fri"].every((day) => activeDays.includes(day))) return "MWF";
  if (activeDays.length === 3 && ["Tue", "Thu", "Sat"].every((day) => activeDays.includes(day))) return "TTS";
  return "Full Week";
}

export function paymentError(amount: number, balance: number): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than zero";
  if (amount > balance) return "Payment exceeds the outstanding balance";
  return undefined;
}

export function feeTotals(rows: Row[]) {
  return rows.reduce((totals, row) => ({
    payable: totals.payable + Number(row.fee || 0) - Number(row.discount || 0),
    paid: totals.paid + Number(row.paid || 0),
    outstanding: totals.outstanding + Number(row.fee || 0) - Number(row.discount || 0) - Number(row.paid || 0),
  }), { payable: 0, paid: 0, outstanding: 0 });
}

export function inDateRange(date: string | undefined, from: string, to: string) {
  return !!date && (!from || date >= from) && (!to || date <= to);
}

export function thresholdError(value: number): string | undefined {
  return Number.isInteger(value) && value >= 1 ? undefined : "Enter a whole number of at least 1 day";
}

export function scheduleConflict(existing: Row[], candidate: Row): string | undefined {
  const overlaps = (row: Row) => row.date === candidate.date
    && String(candidate.startTime) < String(row.endTime)
    && String(row.startTime) < String(candidate.endTime);
  const same = (a: unknown, b: unknown) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
  const students = (row: Row) => {
    const values = Array.isArray(row.admissionNumbers) ? row.admissionNumbers : [row.admissionNumber];
    return values.filter(Boolean).map((value) => String(value).trim().toLowerCase());
  };
  const sharedStudent = (row: Row) => students(row).some((student) => students(candidate).includes(student));
  const conflict = existing.find((row) => row.id !== candidate.id && overlaps(row) && (
    same(row.facultyName, candidate.facultyName)
    || sharedStudent(row)
    || (candidate.room && same(row.room, candidate.room))
  ));
  if (!conflict) return undefined;
  if (same(conflict.facultyName, candidate.facultyName)) return "This faculty member is already scheduled for that time";
  if (sharedStudent(conflict)) return "This student is already scheduled for that time";
  return candidate.room ? "This room is already booked for that time" : undefined;
}

export function taskTimeError(start: string, end: string): string | undefined {
  if (start && end && end <= start) return "End time must be later than start time";
  return undefined;
}
