import type { Row } from "@/lib/mock";

export const COMMITTED_STUDENT_RECORDS_KEY = "administration-committed-student-records";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export function readCommittedStudentRecords(storage: KeyValueStorage): Row[] {
  const saved = storage.getItem(COMMITTED_STUDENT_RECORDS_KEY);
  if (!saved) return [];
  const records: unknown = JSON.parse(saved);
  if (!Array.isArray(records)) {
    throw new Error("Saved student records are not in the expected format");
  }
  return records;
}

export function upsertCommittedStudentRecord(records: Row[], record: Row): Row[] {
  const admissionNumber = String(record.admissionNumber ?? "").trim();
  const studentId = String(record.studentId ?? "").trim();
  if (!admissionNumber && !studentId) {
    throw new Error("An admission number or student ID is required to save a student record");
  }

  const existingIndex = records.findIndex((item) =>
    (admissionNumber && item.admissionNumber === admissionNumber) ||
    (studentId && item.studentId === studentId) ||
    (record.applicationNumber && item.applicationNumber === record.applicationNumber),
  );
  if (existingIndex < 0) return [...records, record];

  return records.map((item, index) =>
    index === existingIndex ? { ...item, ...record } : item,
  );
}

export function persistCommittedStudentRecord(storage: KeyValueStorage, record: Row): Row[] {
  const records = readCommittedStudentRecords(storage);
  const updatedRecords = upsertCommittedStudentRecord(records, record);
  storage.setItem(COMMITTED_STUDENT_RECORDS_KEY, JSON.stringify(updatedRecords));
  return updatedRecords;
}
