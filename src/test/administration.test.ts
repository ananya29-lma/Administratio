import { describe, expect, it } from "vitest";
import { batchCategory, BATCH_CATEGORIES, feeTotals, inDateRange, paymentError, scheduleConflict, taskTimeError, thresholdError } from "@/lib/administration";
import { COURSE_CATEGORIES, COURSE_OPTION_GROUPS, COURSES, courseFee, INITIAL_SCHEDULED_CLASSES, INITIAL_STUDENTS } from "@/lib/mock";

describe("Administration calculations", () => {
  it("maps batch schedules to the supported batch categories", () => {
    const batches = [
      { name: "Weekday", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
      { name: "MWF", days: ["Mon", "Wed", "Fri"] },
      { name: "TTS", days: ["Tue", "Thu", "Sat"] },
    ];

    expect(BATCH_CATEGORIES).toEqual(["MWF", "TTS", "Full Week"]);
    expect(batchCategory("MWF", batches)).toBe("MWF");
    expect(batchCategory("Weekday", batches)).toBe("Full Week");
    expect(batchCategory("TTS", batches)).toBe("TTS");
    expect(batchCategory("missing", batches)).toBe("Full Week");
  });

  it("keeps the categorized course catalog consistent with fee structures and dropdown groups", () => {
    const groupedNames = COURSE_OPTION_GROUPS.flatMap((group) => group.options);
    const courseNames = COURSES.map((course) => course.name);

    expect(COURSE_CATEGORIES).toEqual([
      {
        category: "AI COURSE",
        codePrefix: "AI",
        names: [
          "Master's in Gen AI & Agentic AI",
          "Master's in AI Big Data & Advance MLOps",
          "Advanced Data Science",
          "Certificate in Big Data",
          "Expertise in Cyber Security",
          "Certificate in Data Security",
          "Advanced Product Management",
        ],
      },
      {
        category: "MULTIMEDIA",
        codePrefix: "MM",
        names: [
          "AI Integrated Graphic Design",
          "AI Integrated Video Editing & VFX",
          "Animation & VFX",
          "Film Production",
          "Performance Marketing & Social Media Marketing",
          "Certificate in Digital Marketing",
          "Diploma in 3D Animation & Visual Effects",
          "Auto Desk, Maya",
          "After Effect",
          "Adobe Premier",
          "Adobe Photoshop",
          "Adobe Illustrator",
          "Corel Draw",
        ],
      },
      {
        category: "MANAGEMENT",
        codePrefix: "MG",
        names: [
          "Business & Entrepreneurship",
          "Sales & Business Development",
          "Marketing & Growth",
          "Finance & Accounting",
          "People & Operations",
          "Product Management",
        ],
      },
      { category: "UG & PG", codePrefix: "UG", names: ["BCA", "BBA", "BCom", "BA", "MBA", "MCA", "MCom", "MA"] },
      {
        category: "OFFICE AUTOMATION & PROGRAMMING DEPARTMENT",
        codePrefix: "OP",
        names: ["Advance Diploma in Computer Application", "Python", "C & C++", "C++", "Advanced Excel", "MS Excel", "Zoho Books", "Power BI", "Tableau"],
      },
      { category: "ACCOUNTING DEPARTMENT", codePrefix: "AC", names: ["AI in Accounting", "Manual + SAP", "Manual + Tally", "SAP FICO", "Tally"] },
    ]);
    expect(COURSES).toHaveLength(48);
    expect(groupedNames).toEqual(courseNames);
    expect(new Set(COURSES.map((course) => course.code)).size).toBe(COURSES.length);
    expect(COURSES.every((course) => course.total > 0 && courseFee(course.name) === course.total)).toBe(true);
  });

  it("starts the weekly schedule without sample classes", () => {
    expect(INITIAL_SCHEDULED_CLASSES).toEqual([]);
  });

  it("provides a unique local dummy portrait for each sample student", () => {
    const portraits = INITIAL_STUDENTS.map((student) => student.photoUrl);

    expect(portraits).toHaveLength(52);
    expect(portraits.every((portrait) => typeof portrait === "string" && portrait.startsWith("data:image/svg+xml,"))).toBe(true);
    expect(new Set(portraits).size).toBe(INITIAL_STUDENTS.length);
  });

  it("accepts full outstanding payments but not overpayments or nonpositive amounts", () => {
    expect(paymentError(7500, 7500)).toBeUndefined();
    expect(paymentError(7501, 7500)).toBe("Payment exceeds the outstanding balance");
    expect(paymentError(0, 7500)).toBe("Enter an amount greater than zero");
    expect(paymentError(-10, 7500)).toBe("Enter an amount greater than zero");
  });
  it("subtracts discounts and payments from total fees", () => {
    expect(feeTotals([{ fee: 39000, discount: 1000, paid: 5000 }, { fee: 50000, discount: 2000, paid: 48000 }]))
      .toEqual({ payable: 86000, paid: 53000, outstanding: 33000 });
  });
  it("includes both report date boundaries and excludes dates outside them", () => {
    expect(inDateRange("2026-10-01", "2026-10-01", "2026-10-16")).toBe(true);
    expect(inDateRange("2026-10-16", "2026-10-01", "2026-10-16")).toBe(true);
    expect(inDateRange("2026-09-30", "2026-10-01", "2026-10-16")).toBe(false);
    expect(inDateRange(undefined, "", "")).toBe(false);
  });
  it("requires a positive whole-day absence threshold", () => {
    expect(thresholdError(7)).toBeUndefined();
    expect(thresholdError(1)).toBeUndefined();
    expect(thresholdError(0)).toBeDefined();
    expect(thresholdError(1.5)).toBeDefined();
  });
  it("prevents overlapping bookings for a faculty member, student, or room", () => {
    const booked = [{ id: "CLS-1", date: "2026-10-19", startTime: "09:00", endTime: "10:00", facultyName: "Alex", admissionNumber: "APP-1", room: "Lab A" }];
    expect(scheduleConflict(booked, { id: "CLS-2", date: "2026-10-19", startTime: "09:30", endTime: "10:30", facultyName: "Alex", admissionNumber: "APP-2", room: "Lab B" }))
      .toBe("This faculty member is already scheduled for that time");
    expect(scheduleConflict(booked, { id: "CLS-2", date: "2026-10-19", startTime: "09:30", endTime: "10:30", facultyName: "Sam", admissionNumber: "APP-1", room: "Lab B" }))
      .toBe("This student is already scheduled for that time");
    expect(scheduleConflict(booked, { id: "CLS-2", date: "2026-10-19", startTime: "09:30", endTime: "10:30", facultyName: "Sam", admissionNumber: "APP-2", room: "Lab A" }))
      .toBe("This room is already booked for that time");
    expect(scheduleConflict(booked, { id: "CLS-2", date: "2026-10-19", startTime: "10:00", endTime: "11:00", facultyName: "Alex", admissionNumber: "APP-2", room: "Lab B" }))
      .toBeUndefined();
    expect(scheduleConflict(booked, { id: "CLS-1", date: "2026-10-19", startTime: "09:00", endTime: "10:00", facultyName: "Alex", admissionNumber: "APP-1", room: "Lab A" }))
      .toBeUndefined();
    expect(scheduleConflict(booked, { id: "CLS-3", date: "2026-10-19", startTime: "09:30", endTime: "10:30", facultyName: "Sam", admissionNumbers: ["APP-2", "APP-1"], room: "Lab C" }))
      .toBe("This student is already scheduled for that time");
  });
  it("requires task end time to be later than its start time", () => {
    expect(taskTimeError("09:00", "10:00")).toBeUndefined();
    expect(taskTimeError("09:00", "09:00")).toBe("End time must be later than start time");
    expect(taskTimeError("10:00", "09:00")).toBe("End time must be later than start time");
  });
});