import type { Row } from "@/lib/mock";

export const COMMITTED_STUDENT_RECORDS_KEY = "administration-committed-student-records";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export function isRemovedExamDemoRecord(record: Row): boolean {
  const removedAdmissionNumber = /^ADM-2026-05(?:1\d|2\d)$/;
  const removedExamNumber = /^EXAM-(?:APP|REG)-2026-(?:000[1-9]|001\d|0020)$/;

  return [
    record.admissionNo,
    record.admissionNumber,
    record.appNo,
    record.applicationNumber,
    record.regNo,
    record.studentId,
  ].some((value) => {
    if (typeof value !== "string") return false;
    return removedAdmissionNumber.test(value) || removedExamNumber.test(value);
  });
}

export function withoutRemovedExamDemoRecords(records: Row[]): Row[] {
  return records.filter((record) => !isRemovedExamDemoRecord(record));
}

export function studentIdForRecord(record: Row, studentPrefix = "STU"): string {
  const applicationNumber = String(record.applicationNumber ?? record.regNo ?? "").trim();
  const existingStudentId = String(record.studentId ?? "").trim();
  if (existingStudentId && existingStudentId !== applicationNumber) return existingStudentId;
  if (!applicationNumber) return existingStudentId;
  return applicationNumber.replace(/^APP(?=-)/, studentPrefix);
}

export function studentIdForRegistration(
  regNo: unknown,
  records: { students: Row[]; admissions: Row[]; committedStudents: Row[] },
  studentPrefix = "STU",
): string {
  const applicationNumber = String(regNo ?? "").trim();
  const student = records.students.find((record) => record.regNo === applicationNumber);
  const admission = records.admissions.find((record) => record.regNo === applicationNumber);
  const admissionNumbers = [
    admission?.admissionNo,
    admission?.appNo,
    student?.admissionNo,
    student?.appNo,
  ].filter((number): number is string => typeof number === "string" && number !== "");
  const committedRecord = records.committedStudents.find(
    (record) =>
      record.applicationNumber === applicationNumber ||
      record.regNo === applicationNumber ||
      admissionNumbers.includes(String(record.admissionNumber ?? record.admissionNo ?? "")),
  );
  return studentIdForRecord(
    {
      studentId: committedRecord?.studentId ?? student?.studentId ?? admission?.studentId,
      applicationNumber: committedRecord?.applicationNumber ?? applicationNumber,
    },
    studentPrefix,
  );
}

export function canCompleteInstituteVisit(
  record: Pick<Row, "instituteVisitStatus" | "agreementStatus" | "handbookStatus">,
): boolean {
  return (
    ["Visited", "Completed"].includes(String(record.instituteVisitStatus)) &&
    record.agreementStatus === "Signed" &&
    record.handbookStatus === "Issued"
  );
}

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

  const existingIndex = records.findIndex(
    (item) =>
      (admissionNumber && item.admissionNumber === admissionNumber) ||
      (studentId && item.studentId === studentId) ||
      (record.applicationNumber && item.applicationNumber === record.applicationNumber),
  );
  if (existingIndex < 0) return [...records, record];

  return records.map((item, index) => (index === existingIndex ? { ...item, ...record } : item));
}

export function persistCommittedStudentRecord(storage: KeyValueStorage, record: Row): Row[] {
  const records = readCommittedStudentRecords(storage);
  const updatedRecords = upsertCommittedStudentRecord(records, record);
  storage.setItem(COMMITTED_STUDENT_RECORDS_KEY, JSON.stringify(updatedRecords));
  return updatedRecords;
}
