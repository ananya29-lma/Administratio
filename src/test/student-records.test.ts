import { describe, expect, it } from "vitest";
import {
  COMMITTED_STUDENT_RECORDS_KEY,
  canCompleteInstituteVisit,
  isRemovedExamDemoRecord,
  persistCommittedStudentRecord,
  readCommittedStudentRecords,
  studentIdForRecord,
  studentIdForRegistration,
  upsertCommittedStudentRecord,
  withoutRemovedExamDemoRecords,
} from "@/lib/student-records";
import {
  INITIAL_ADMISSIONS,
  INITIAL_EXAM_REQUESTS,
  INITIAL_PAYMENTS,
  INITIAL_STUDENTS,
  type Row,
} from "@/lib/mock";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: (key: string) => (key === COMMITTED_STUDENT_RECORDS_KEY ? value : null),
    setItem: (key: string, next: string) => {
      if (key !== COMMITTED_STUDENT_RECORDS_KEY) throw new Error("Unexpected storage key");
      value = next;
    },
    get value() {
      return value;
    },
  };
}

describe("committed student records", () => {
  it("identifies only the removed exam demo cohort", () => {
    expect(isRemovedExamDemoRecord({ admissionNo: "ADM-2026-0510" })).toBe(true);
    expect(isRemovedExamDemoRecord({ admissionNumber: "ADM-2026-0529" })).toBe(true);
    expect(isRemovedExamDemoRecord({ appNo: "EXAM-APP-2026-0001" })).toBe(true);
    expect(isRemovedExamDemoRecord({ regNo: "EXAM-REG-2026-0020" })).toBe(true);
    expect(isRemovedExamDemoRecord({ admissionNo: "ADM-2026-0509" })).toBe(false);
    expect(isRemovedExamDemoRecord({ admissionNo: "ADM-2026-0530" })).toBe(false);
    expect(isRemovedExamDemoRecord({ appNo: "EXAM-APP-2026-0021" })).toBe(false);
  });

  it("does not seed the removed cohort or its linked application and payment records", () => {
    expect(INITIAL_STUDENTS.some(isRemovedExamDemoRecord)).toBe(false);
    expect(INITIAL_ADMISSIONS.some(isRemovedExamDemoRecord)).toBe(false);
    expect(INITIAL_PAYMENTS.some(isRemovedExamDemoRecord)).toBe(false);
    expect(
      INITIAL_PAYMENTS.some((payment) => String(payment.receiptNo).startsWith("EXAM-COHORT-PAY-")),
    ).toBe(true);
    expect(INITIAL_EXAM_REQUESTS.map((request) => request.studentCount)).toEqual([4, 9, 8, 3]);
  });

  it("filters removed demo records while preserving unrelated saved records", () => {
    const records = [
      { admissionNo: "ADM-2026-0510" },
      { admissionNo: "ADM-2026-0401" },
      { applicationNumber: "EXAM-APP-2026-0020" },
    ];

    expect(withoutRemovedExamDemoRecords(records)).toEqual([{ admissionNo: "ADM-2026-0401" }]);
  });

  it("allows visit completion only after a visit, signed agreement, and issued handbook", () => {
    expect(
      canCompleteInstituteVisit({
        instituteVisitStatus: "Visited",
        agreementStatus: "Signed",
        handbookStatus: "Issued",
      }),
    ).toBe(true);
    expect(
      canCompleteInstituteVisit({
        instituteVisitStatus: "Visit Scheduled",
        agreementStatus: "Signed",
        handbookStatus: "Issued",
      }),
    ).toBe(false);
    expect(
      canCompleteInstituteVisit({
        instituteVisitStatus: "Visited",
        agreementStatus: "Pending",
        handbookStatus: "Issued",
      }),
    ).toBe(false);
  });

  it("creates a student ID from an application number when no separate ID exists", () => {
    expect(studentIdForRecord({ applicationNumber: "APP-2026-1017" })).toBe("STU-2026-1017");
  });

  it("uses the configured student prefix when deriving a student ID", () => {
    expect(studentIdForRecord({ applicationNumber: "APP-2026-1017" }, "LEARNER")).toBe(
      "LEARNER-2026-1017",
    );
  });

  it("resolves a registration to its configured student ID", () => {
    expect(
      studentIdForRegistration(
        "APP-2026-1017",
        {
          students: [{ regNo: "APP-2026-1017" }],
          admissions: [{ regNo: "APP-2026-1017", admissionNo: "ADM-2026-0401" }],
          committedStudents: [],
        },
        "LEARNER",
      ),
    ).toBe("LEARNER-2026-1017");
  });

  it("prefers an existing committed student ID for a registration", () => {
    expect(
      studentIdForRegistration("APP-2026-1017", {
        students: [{ regNo: "APP-2026-1017" }],
        admissions: [{ regNo: "APP-2026-1017", admissionNo: "ADM-2026-0401" }],
        committedStudents: [{ admissionNumber: "ADM-2026-0401", studentId: "STU-2026-1017" }],
      }),
    ).toBe("STU-2026-1017");
  });

  it("preserves an existing student ID", () => {
    expect(
      studentIdForRecord({ studentId: "STU-2026-0007", applicationNumber: "APP-2026-1017" }),
    ).toBe("STU-2026-0007");
  });

  it("updates an existing admission record instead of creating a duplicate", () => {
    const first = { admissionNumber: "ADM-1", applicationNumber: "APP-1", name: "Student One" };
    const updated = {
      admissionNumber: "ADM-1",
      applicationNumber: "APP-1",
      name: "Updated Student",
    };

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

  it("keeps institute workflow state separate for multiple students", () => {
    const storage = createStorage();
    persistCommittedStudentRecord(storage, {
      studentId: "STU-1",
      admissionNumber: "ADM-1",
      instituteVisitStatus: "Visited",
      agreementStatus: "Signed",
      handbookStatus: "Pending",
    });
    persistCommittedStudentRecord(storage, {
      studentId: "STU-2",
      admissionNumber: "ADM-2",
      instituteVisitStatus: "Visit Scheduled",
      agreementStatus: "Pending",
      handbookStatus: "Pending",
    });

    expect(readCommittedStudentRecords(storage)).toEqual([
      {
        studentId: "STU-1",
        admissionNumber: "ADM-1",
        instituteVisitStatus: "Visited",
        agreementStatus: "Signed",
        handbookStatus: "Pending",
      },
      {
        studentId: "STU-2",
        admissionNumber: "ADM-2",
        instituteVisitStatus: "Visit Scheduled",
        agreementStatus: "Pending",
        handbookStatus: "Pending",
      },
    ]);
  });

  it("updates a record by student ID when admission number is unavailable", () => {
    const previous = { studentId: "STU-1", name: "Student One" };
    const updated = { studentId: "STU-1", name: "Updated Student" };

    expect(upsertCommittedStudentRecord([previous], updated)).toEqual([updated]);
  });

  it("rejects a record without an admission number or student ID", () => {
    expect(() => upsertCommittedStudentRecord([], { applicationNumber: "APP-1" })).toThrow(
      "An admission number or student ID is required to save a student record",
    );
  });

  it("surfaces storage failures instead of reporting a successful save", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage full");
      },
    };

    expect(() => persistCommittedStudentRecord(storage, { admissionNumber: "ADM-1" })).toThrow(
      "Storage full",
    );
  });
});
