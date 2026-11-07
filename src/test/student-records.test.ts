import { describe, expect, it } from "vitest";
import {
  COMMITTED_STUDENT_RECORDS_KEY,
  persistCommittedStudentRecord,
  readCommittedStudentRecords,
  upsertCommittedStudentRecord,
} from "@/lib/student-records";
import type { Row } from "@/lib/mock";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: (key: string) => key === COMMITTED_STUDENT_RECORDS_KEY ? value : null,
    setItem: (key: string, next: string) => {
      if (key !== COMMITTED_STUDENT_RECORDS_KEY) throw new Error("Unexpected storage key");
      value = next;
    },
    get value() { return value; },
  };
}

describe("committed student records", () => {
  it("updates an existing admission record instead of creating a duplicate", () => {
    const first = { admissionNumber: "ADM-1", applicationNumber: "APP-1", name: "Student One" };
    const updated = { admissionNumber: "ADM-1", applicationNumber: "APP-1", name: "Updated Student" };

    expect(upsertCommittedStudentRecord([first], updated)).toEqual([updated]);
  });

  it("persists and reloads the committed student snapshot", () => {
    const storage = createStorage();
    const record: Row = {
      admissionNumber: "ADM-1",
      applicationNumber: "APP-1",
      name: "Student One",
      photoUrl: "data:image/jpeg;base64,photo",
    };

    expect(persistCommittedStudentRecord(storage, record)).toEqual([record]);
    expect(storage.value).toBe(JSON.stringify([record]));
    expect(readCommittedStudentRecords(storage)).toEqual([record]);
  });

  it("updates a record by student ID when admission number is unavailable", () => {
    const previous = { studentId: "STU-1", name: "Student One" };
    const updated = { studentId: "STU-1", name: "Updated Student" };

    expect(upsertCommittedStudentRecord([previous], updated)).toEqual([updated]);
  });

  it("rejects a record without an admission number or student ID", () => {
    expect(() => upsertCommittedStudentRecord([], { applicationNumber: "APP-1" }))
      .toThrow("An admission number or student ID is required to save a student record");
  });

  it("surfaces storage failures instead of reporting a successful save", () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error("Storage full"); },
    };

    expect(() => persistCommittedStudentRecord(storage, { admissionNumber: "ADM-1" }))
      .toThrow("Storage full");
  });
});
