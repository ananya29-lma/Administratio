import { describe, expect, it } from "vitest";
import {
  batchCategory,
  BATCH_CATEGORIES,
  buildSchedule,
  attendancePercentage,
  academicMarksError,
  academicTopicTotal,
  availableFacultyAtTime,
  completedExamDate,
  countUniqueStudents,
  expandRecurrenceRule,
  examApprovalError,
  examFeeEligibility,
  examSessionStatus,
  examScheduleAfterClassEnd,
  facultyAvailableAtTime,
  findFacultyFreeSlots,
  facultyCalendarAvailability,
  facultyFreeSlot,
  feeTotals,
  inDateRange,
  hasDuplicateAttendance,
  paymentError,
  predictModuleCompletion,
  recurrenceRuleFromRRule,
  recurrenceRuleToRRule,
  relatedScheduledClassIds,
  scheduleConflict,
  summarizeExamEligibility,
  summarizeLeaveRequests,
  summarizeCertificateApplications,
  subjectSessionCount,
  studentsForExamRequest,
  studentDemoPassword,
  studentLmsUserIdPreview,
  suggestDays,
  taskTimeError,
  thresholdError,
  type RecurrenceRule,
} from "@/lib/administration";
import {
  COURSE_CATEGORIES,
  COURSE_OPTION_GROUPS,
  COURSES,
  courseFee,
  INITIAL_ADMISSIONS,
  INITIAL_CERTS,
  INITIAL_EXAM_REQUESTS,
  INITIAL_LEAVES,
  INITIAL_PAYMENTS,
  INITIAL_SCHEDULED_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_TASKS,
} from "@/lib/mock";
import { readScheduledClasses, writeScheduledClasses } from "@/lib/scheduled-class-storage";

describe("Administration calculations", () => {
  it("builds a normalized LMS user ID preview and resolves known local collisions", () => {
    expect(studentLmsUserIdPreview("Ananya Hegde", "ADM-2025-0401")).toBe("ananya.h2025");
    expect(studentLmsUserIdPreview("Élodie O'Neil", "ADM-2025-0402")).toBe("elodie.o2025");
    expect(studentLmsUserIdPreview("Ananya Hegde", "ADM-2025-0401", ["ananya.h2025"])).toBe(
      "ananya.h2025-2",
    );
    expect(studentLmsUserIdPreview("", "ADM-2025-0401")).toBeUndefined();
    expect(studentLmsUserIdPreview("Ananya Hegde", "ADM-UNKNOWN")).toBeUndefined();
  });

  it("creates name-based inactive example passwords for identified student records", () => {
    expect(studentDemoPassword("Manoj Reddy", "ADM-2026-0401")).toBe("manoj@2026");
    expect(studentDemoPassword("Ananya Hegde", "ADM-2026-0402")).toBe("ananya@2026");
    expect(studentDemoPassword("", "ADM-2026-0401")).toBeUndefined();
    expect(studentDemoPassword("Manoj Reddy", "")).toBeUndefined();
  });

  it("calculates attendance percentage from present, late, and absent records only", () => {
    expect(
      attendancePercentage([{ status: "P" }, { status: "L" }, { status: "A" }, { status: "H" }]),
    ).toBe(67);
    expect(attendancePercentage([{ status: "H" }])).toBeNull();
  });

  it("marks scheduled exams completed only after all exam sessions have passed", () => {
    const exam = {
      scheduled: true,
      examDate: "2026-11-01",
      practicalDate: "2026-11-01",
      theoryDate: "2026-11-02",
      industrialVivaDate: "2026-11-03",
      technicalVivaDate: "2026-11-04",
    };

    expect(completedExamDate(exam, "2026-11-05")).toBe("2026-11-04");
    expect(completedExamDate(exam, "2026-11-04")).toBeUndefined();
    expect(completedExamDate({ ...exam, scheduled: false }, "2026-11-05")).toBeUndefined();
  });

  it("reports whether an individual exam session is completed, scheduled, or missing", () => {
    expect(examSessionStatus("2026-11-03", "2026-11-04")).toBe("Completed");
    expect(examSessionStatus("2026-11-04", "2026-11-04")).toBe("Scheduled");
    expect(examSessionStatus(undefined, "2026-11-04")).toBe("Not scheduled");
  });

  it("detects duplicate student attendance per date and class session", () => {
    const records = [
      { id: "1", regNo: "APP-1", date: "2026-11-02", sessionId: "B-1", status: "P" },
    ];
    expect(
      hasDuplicateAttendance(records, {
        regNo: "APP-1",
        date: "2026-11-02",
        sessionId: "B-1",
        status: "A",
      }),
    ).toBe(true);
    expect(
      hasDuplicateAttendance(records, {
        regNo: "APP-1",
        date: "2026-11-02",
        sessionId: "B-2",
        status: "A",
      }),
    ).toBe(false);
    expect(
      hasDuplicateAttendance(
        records,
        { id: "1", regNo: "APP-1", date: "2026-11-02", sessionId: "B-1", status: "A" },
        "1",
      ),
    ).toBe(false);
  });

  it("calculates academic topic totals and rejects invalid marks", () => {
    expect(academicTopicTotal(18, 72)).toBe(90);
    expect(academicTopicTotal("", 72)).toBe(72);
    expect(academicTopicTotal(84, 79, 8, 7)).toBe(178);
    expect(academicTopicTotal(84, 79, 8, 7, 5)).toBe(183);
    expect(academicMarksError(18, 72)).toBeUndefined();
    expect(academicMarksError(-1, 72)).toBe("Marks must be valid non-negative numbers");
    expect(academicMarksError("not a mark", 72)).toBe("Marks must be valid non-negative numbers");
  });

  it("counts unique students by stable identifiers with a name fallback", () => {
    expect(
      countUniqueStudents([
        { studentId: "STU-1", regNo: "APP-1", name: "Alex" },
        { studentId: "STU-1", regNo: "APP-1", name: "Alex Duplicate" },
        { admissionNo: "ADM-2", name: "Jamie" },
        { name: "jamie" },
      ]),
    ).toBe(3);
  });

  it("maps the ten AI subjects to their total session counts", () => {
    expect(
      [
        ["AI Foundation / Orientation", 15],
        ["Advanced Python & Database Foundation", 40],
        ["ML, Data Science & Data Visualization", 55],
        ["Big Data & Cloud Data Engineering", 40],
        ["Big Data Analytics - Tableau & Power BI", 25],
        ["Advanced MLOps", 30],
        ["Advanced Deep Learning & Computer Vision", 40],
        ["NLP & AI Bots", 40],
        ["Introduction to Generative AI & Agentic AI", 15],
        ["AI Research", 15],
      ].map(([subject]) => subjectSessionCount(subject)),
    ).toEqual([15, 40, 55, 40, 25, 30, 40, 40, 15, 15]);
    expect(subjectSessionCount("Unmapped subject")).toBeUndefined();
  });

  it("builds exact weekday session counts and moves around holidays or unavailable days", () => {
    const result = buildSchedule({
      startDate: "2026-10-28",
      daysOfWeek: [2, 4, 5],
      totalSessions: 6,
      holidays: ["2026-10-29"],
      unavailable: ["2026-10-30"],
    });
    expect(result.sessions).toEqual([
      "2026-11-03",
      "2026-11-05",
      "2026-11-06",
      "2026-11-10",
      "2026-11-12",
      "2026-11-13",
    ]);
    expect(result.endDate).toBe("2026-11-13");
    expect(result.weeks).toBe(3);
    expect(result.skippedDates).toEqual(["2026-10-29", "2026-10-30"]);
  });

  it("caps On Date schedules and recommends the weekly frequency for a target duration", () => {
    const byDate = buildSchedule({
      startDate: "2026-10-28",
      daysOfWeek: [2, 4, 5],
      totalSessions: 15,
      endDate: "2026-11-06",
    });
    expect(byDate.sessions).toEqual([
      "2026-10-29",
      "2026-10-30",
      "2026-11-03",
      "2026-11-05",
      "2026-11-06",
    ]);
    expect(suggestDays({ totalSessions: 15, durationInWeeks: 4 }).minimumSessionsPerWeek).toBe(4);
    expect(
      suggestDays({ totalSessions: 15, durationInWeeks: 4 }).suggestedPatterns.map(
        (pattern) => pattern.label,
      ),
    ).toContain("Mon–Fri");
    expect(
      suggestDays({
        totalSessions: 15,
        startDate: "2026-10-28",
        targetEndDate: "2026-11-25",
      }).minimumSessionsPerWeek,
    ).toBe(4);
    expect(suggestDays({ totalSessions: 40, durationInWeeks: 4 }).minimumSessionsPerWeek).toBe(10);
  });

  it("expands weekly recurrences through calendar month end dates and selected weekdays", () => {
    const weekly: RecurrenceRule = {
      interval: 1,
      unit: "week",
      daysOfWeek: [2, 4],
      monthlyMode: "dayOfMonth",
      ends: { type: "onDate", date: "2026-11-27", count: 13 },
      startDate: "2026-10-27",
      startTime: "09:00",
      endTime: "11:00",
    };
    const oneMonthDates = expandRecurrenceRule(weekly, weekly.startDate, weekly.ends.date);
    expect(oneMonthDates).toEqual([
      "2026-10-27",
      "2026-10-29",
      "2026-11-03",
      "2026-11-05",
      "2026-11-10",
      "2026-11-12",
      "2026-11-17",
      "2026-11-19",
      "2026-11-24",
      "2026-11-26",
    ]);
    expect(new Set(oneMonthDates).size).toBe(oneMonthDates.length);

    const twoMonthRule = { ...weekly, ends: { ...weekly.ends, date: "2026-12-27" } };
    const twoMonthDates = expandRecurrenceRule(
      twoMonthRule,
      twoMonthRule.startDate,
      twoMonthRule.ends.date,
    );
    expect(twoMonthDates).toHaveLength(18);
    expect(twoMonthDates.at(-1)).toBe("2026-12-24");

    const thursdaysOnly = { ...weekly, daysOfWeek: [4] };
    expect(expandRecurrenceRule(thursdaysOnly, thursdaysOnly.startDate, "2026-10-30")).toEqual([
      "2026-10-29",
    ]);
  });

  it("respects Never and After occurrence count rules and round-trips saved weekly rules", () => {
    const base: RecurrenceRule = {
      interval: 1,
      unit: "week",
      daysOfWeek: [2, 4],
      monthlyMode: "dayOfMonth",
      ends: { type: "never", date: "", count: 13 },
      startDate: "2026-10-27",
      startTime: "09:00",
      endTime: "11:00",
    };
    expect(expandRecurrenceRule(base, "2026-10-27", "2026-11-05")).toEqual([
      "2026-10-27",
      "2026-10-29",
      "2026-11-03",
      "2026-11-05",
    ]);

    const afterFour = { ...base, ends: { type: "afterCount" as const, date: "", count: 4 } };
    expect(expandRecurrenceRule(afterFour, afterFour.startDate, "2026-12-31")).toEqual([
      "2026-10-27",
      "2026-10-29",
      "2026-11-03",
      "2026-11-05",
    ]);

    const savedRule = { ...base, ends: { type: "onDate" as const, date: "2026-12-27", count: 13 } };
    const restored = recurrenceRuleFromRRule(
      recurrenceRuleToRRule(savedRule),
      savedRule.startDate,
      savedRule.startTime,
      savedRule.endTime,
    );
    expect(restored).toEqual(savedRule);
  });

  it("persists recurring class rules for calendar reloads", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    };
    const savedClasses = [
      {
        id: "CLS-1001",
        course: "AI Foundation / Orientation",
        date: "2026-10-27",
        recurrenceRule: {
          interval: 1,
          unit: "week",
          daysOfWeek: [2, 4],
          monthlyMode: "dayOfMonth",
          ends: { type: "onDate", date: "2026-12-27", count: 13 },
          startDate: "2026-10-27",
          startTime: "09:00",
          endTime: "11:00",
        },
      },
    ];

    writeScheduledClasses(storage, savedClasses);
    expect(readScheduledClasses(storage, [])).toEqual(savedClasses);
  });

  it("removes old demo calendar rows while preserving saved classes", () => {
    const storage = {
      getItem: () =>
        JSON.stringify([
          { id: "CLS-DEMO-AI-001" },
          { id: "CLS-DEMO-AI-002" },
          { id: "CLS-DEMO-MM-001" },
          { id: "CLS-USER-1001" },
        ]),
    };

    expect(readScheduledClasses(storage, [])).toEqual([{ id: "CLS-USER-1001" }]);
  });

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
          "AI Foundation / Orientation",
          "Advanced Python & Database Foundation",
          "ML, Data Science & Data Visualization",
          "Big Data & Cloud Data Engineering",
          "Big Data Analytics - Tableau & Power BI",
          "Advanced MLOps",
          "Advanced Deep Learning & Computer Vision",
          "NLP & AI Bots",
          "Introduction to Generative AI & Agentic AI",
          "AI Research",
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
      {
        category: "UG & PG",
        codePrefix: "UG",
        names: ["BCA", "BBA", "BCom", "BA", "MBA", "MCA", "MCom", "MA"],
      },
      {
        category: "OFFICE AUTOMATION & PROGRAMMING DEPARTMENT",
        codePrefix: "OP",
        names: [
          "Advance Diploma in Computer Application",
          "Python",
          "C & C++",
          "C++",
          "Advanced Excel",
          "MS Excel",
          "Zoho Books",
          "Power BI",
          "Tableau",
        ],
      },
      {
        category: "ACCOUNTING DEPARTMENT",
        codePrefix: "AC",
        names: ["AI in Accounting", "Manual + SAP", "Manual + Tally", "SAP FICO", "Tally"],
      },
    ]);
    expect(COURSES).toHaveLength(51);
    expect([...groupedNames].sort()).toEqual([...courseNames].sort());
    expect(new Set(COURSES.map((course) => course.code)).size).toBe(COURSES.length);
    expect(
      COURSES.every((course) => course.total > 0 && courseFee(course.name) === course.total),
    ).toBe(true);
  });

  it("starts the calendar without seeded dummy classes", () => {
    expect(INITIAL_SCHEDULED_CLASSES).toEqual([]);
  });

  it("estimates module completion from batch days and matching completed module sessions", () => {
    const config = {
      currentModule: "Tableau",
      nextModule: "Power BI",
      remainingSessions: 3,
      totalSessions: 7,
      action: "Prepare the next timetable.",
    };
    const batch = {
      name: "AI Morning",
      days: ["Mon", "Wed", "Fri"],
      startTime: "09:00",
      endTime: "11:00",
      remainingSessions: 3,
    };
    const result = predictModuleCompletion(
      config,
      batch,
      [
        {
          batch: "AI Morning",
          module: "Tableau",
          date: "2026-10-16",
          status: "Completed",
          startTime: "09:00",
          endTime: "11:00",
          facultyName: "Priyanka (AI)",
        },
        { batch: "Other Batch", module: "Tableau" },
      ],
      "2026-10-19",
      "Priyanka (AI)",
    );

    expect(result).toMatchObject({
      currentModule: "Tableau",
      nextModule: "Power BI",
      remainingSessions: 2,
      completedSessions: 5,
      totalSessions: 7,
      completionDate: "2026-10-21",
      status: "On Track",
    });
    expect(result?.nextDates).toContain("2026-10-23");
    expect(
      predictModuleCompletion(config, undefined, [], "2026-10-19", "Priyanka (AI)"),
    ).toBeUndefined();
  });

  it("starts the faculty task calendar without sample task records", () => {
    expect(INITIAL_TASKS).toEqual([]);
  });

  it("provides one free faculty slot and a non-assignable lunch slot", () => {
    const slots = facultyCalendarAvailability("Alex", "2026-10-19", 0, [], []);

    expect(slots.map(({ startTime, endTime }) => [startTime, endTime])).toEqual([
      ["09:00", "11:00"],
      ["11:00", "13:00"],
      ["13:00", "14:00"],
      ["14:00", "16:00"],
      ["16:00", "18:00"],
    ]);
    expect(slots.filter((slot) => slot.status === "free")).toHaveLength(1);
    expect(slots.find((slot) => "lunch" in slot)?.status).toBe("lunch");
  });

  it("marks a designated free slot busy when a class or assigned task overlaps", () => {
    const faculty = "Alex";
    const date = "2026-10-19";
    const freeSlot = facultyFreeSlot(0, date);
    const classBooking = [
      { facultyName: faculty, date, startTime: freeSlot.startTime, endTime: freeSlot.endTime },
    ];
    const taskBooking = [
      {
        assignee: faculty,
        date,
        startTime: freeSlot.startTime,
        endTime: freeSlot.endTime,
        workflowStatus: "Assigned",
      },
    ];

    expect(
      facultyCalendarAvailability(faculty, date, 0, classBooking, []).find(
        (slot) => slot.startTime === freeSlot.startTime,
      )?.status,
    ).toBe("busy");
    expect(
      facultyCalendarAvailability(faculty, date, 0, [], taskBooking).find(
        (slot) => slot.startTime === freeSlot.startTime,
      )?.status,
    ).toBe("busy");
  });

  it("selects a faculty member without a class during the scheduled time", () => {
    const classes = [
      {
        facultyName: "Alex",
        date: "2026-10-19",
        startTime: "10:00",
        endTime: "11:00",
      },
    ];

    expect(
      availableFacultyAtTime(["Alex", "Jordan"], "2026-10-19", "10:30", "11:30", classes, []),
    ).toBe("Jordan");
    expect(
      availableFacultyAtTime(["Alex", "Jordan"], "2026-10-19", "11:00", "12:00", classes, []),
    ).toBe("Alex");
  });

  it("treats a faculty alias as busy when its calendar identifier has a suffix", () => {
    expect(
      facultyAvailableAtTime(
        ["Priyanka", "Priyanka (AI)"],
        "2026-10-19",
        "10:30",
        "11:30",
        [
          {
            facultyName: "Priyanka (AI)",
            date: "2026-10-19",
            startTime: "10:00",
            endTime: "11:00",
          },
        ],
        [],
      ),
    ).toBe(false);
  });

  it("finds separate free faculty slots for viva exams and skips conflicting bookings", () => {
    const faculty = "Alex";
    const startDate = "2026-10-19";
    const mondaySlot = facultyFreeSlot(0, startDate);
    const appointments = findFacultyFreeSlots(
      faculty,
      startDate,
      0,
      [
        {
          facultyName: faculty,
          date: startDate,
          startTime: mondaySlot.startTime,
          endTime: mondaySlot.endTime,
        },
      ],
      [],
      2,
    );

    expect(appointments).toEqual([
      { date: "2026-10-20", startTime: "11:00", endTime: "13:00" },
      { date: "2026-10-21", startTime: "14:00", endTime: "16:00" },
    ]);
  });

  it("blocks recurring faculty classes when finding free viva slots", () => {
    const appointments = findFacultyFreeSlots(
      "Alex",
      "2026-10-19",
      0,
      [
        {
          facultyName: "Alex",
          date: "2026-10-19",
          startTime: "09:00",
          endTime: "11:00",
          recurrenceRule: {
            interval: 1,
            unit: "week",
            daysOfWeek: [1],
            monthlyMode: "dayOfMonth",
            ends: { type: "never", date: "", count: 0 },
            startDate: "2026-10-19",
            startTime: "09:00",
            endTime: "11:00",
          },
        },
      ],
      [],
      1,
    );

    expect(appointments[0]).toEqual({
      date: "2026-10-20",
      startTime: "11:00",
      endTime: "13:00",
    });
  });

  it("assigns each sample admission a unique generated admission number", () => {
    const admissionNumbers = INITIAL_ADMISSIONS.map((admission) => admission.admissionNo);

    expect(admissionNumbers).toHaveLength(INITIAL_ADMISSIONS.length);
    expect(admissionNumbers.every((number) => /^ADM-\d{4}-\d{4}$/.test(number))).toBe(true);
    expect(new Set(admissionNumbers).size).toBe(admissionNumbers.length);
  });

  it("provides a unique local dummy portrait for each sample student", () => {
    const portraits = INITIAL_STUDENTS.map((student) => student.photoUrl);

    expect(portraits).toHaveLength(INITIAL_STUDENTS.length);
    expect(
      portraits.every(
        (portrait) => typeof portrait === "string" && portrait.startsWith("data:image/svg+xml,"),
      ),
    ).toBe(true);
    expect(new Set(portraits).size).toBe(INITIAL_STUDENTS.length);
  });

  it("accepts full outstanding payments but not overpayments or nonpositive amounts", () => {
    expect(paymentError(7500, 7500)).toBeUndefined();
    expect(paymentError(7501, 7500)).toBe("Payment exceeds the outstanding balance");
    expect(paymentError(0, 7500)).toBe("Enter an amount greater than zero");
    expect(paymentError(-10, 7500)).toBe("Enter an amount greater than zero");
  });
  it("requires verified payments for the exact student and applicable month", () => {
    const payments = [
      { appNo: "APP-1", regNo: "REG-1", date: "2026-10-03", amount: 1200, verified: true },
      { appNo: "APP-1", regNo: "REG-1", date: "2026-09-03", amount: 1200, verified: true },
      { appNo: "APP-2", regNo: "REG-1", date: "2026-10-03", amount: 1200, verified: true },
      { appNo: "APP-1", regNo: "REG-1", date: "2026-10-04", amount: 1000, verified: false },
    ];
    expect(examFeeEligibility("APP-1", "REG-1", "2026-10", 1200, payments)).toMatchObject({
      eligible: true,
      paid: 1200,
    });
    expect(examFeeEligibility("APP-1", "REG-1", "2026-09", 1200, payments).eligible).toBe(true);
    expect(examFeeEligibility("APP-1", "REG-1", "2026-11", 1200, payments).eligible).toBe(false);
    expect(
      examFeeEligibility("APP-1", "REG-1", "2026-10", 1200, [{ ...payments[3] }]).reason,
    ).toContain("not verified");
  });
  it("summarizes exam eligibility from the selected request's students", () => {
    expect(
      summarizeExamEligibility([{ eligible: true }, { eligible: false }, { eligible: true }]),
    ).toEqual({ totalStudents: 3, eligibleForExam: 2, feesPending: 1 });
    expect(summarizeExamEligibility([])).toEqual({
      totalStudents: 0,
      eligibleForExam: 0,
      feesPending: 0,
    });
  });
  it("summarizes leave cards from the existing leave request records", () => {
    expect(summarizeLeaveRequests(INITIAL_LEAVES)).toEqual({
      total: 18,
      pending: 6,
      approved: 9,
      rejected: 3,
    });
  });
  it("summarizes certificate cards from existing application statuses", () => {
    expect(summarizeCertificateApplications(INITIAL_CERTS)).toEqual({
      total: 14,
      pending: 6,
      readyForCollection: 2,
      issued: 2,
    });
  });
  it("gets exam request students from existing records in the exact course and batch", () => {
    const students = [
      { regNo: "REG-1", course: "Python", batch: "Morning" },
      { regNo: "REG-2", course: "Python", batch: "Evening" },
      { regNo: "REG-3", course: "Tally", batch: "Morning" },
    ];

    expect(studentsForExamRequest(students, { course: "Python", batch: "Morning" })).toEqual([
      students[0],
    ]);
  });
  it("includes the matching existing student roster beyond enrolled admissions", () => {
    const request = INITIAL_EXAM_REQUESTS[0];
    const rosterStudents = studentsForExamRequest(INITIAL_STUDENTS, {
      course: request.course,
      batch: request.batch,
    });
    const enrolledAdmissions = INITIAL_ADMISSIONS.filter(
      (admission) =>
        admission.status === "Enrolled" &&
        admission.course === request.course &&
        admission.batch === request.batch,
    );

    expect(rosterStudents.length).toBeGreaterThan(enrolledAdmissions.length);
  });
  it("seeds four paid students in each remaining exam cohort", () => {
    const request = INITIAL_EXAM_REQUESTS[1];
    const cohortStudents = studentsForExamRequest(INITIAL_STUDENTS, {
      course: request.course,
      batch: request.batch,
    });
    const eligibility = cohortStudents.map((student) => {
      const admission = INITIAL_ADMISSIONS.find(
        (record) =>
          record.regNo === student.regNo &&
          record.status === "Enrolled" &&
          record.course === request.course &&
          record.batch === request.batch,
      );
      const course = COURSES.find((item) => item.name === request.course);
      const months = Number(String(course?.duration ?? "").match(/\d+/)?.[0] ?? 0);
      const monthlyDue = Number(
        admission?.monthlyFee ??
          student.monthlyFee ??
          (months > 0 ? Number(course?.tuition ?? 0) / months : 0),
      );
      const appNo = String(
        admission?.appNo ?? student.appNo ?? student.applicationNumber ?? student.regNo,
      );
      return examFeeEligibility(appNo, student.regNo, request.month, monthlyDue, INITIAL_PAYMENTS)
        .eligible;
    });

    expect(eligibility.filter(Boolean)).toHaveLength(4);
    expect(eligibility.filter((eligible) => !eligible)).toHaveLength(cohortStudents.length - 4);
  });
  it("seeds three paid students and one unpaid student in the first exam cohort", () => {
    const request = INITIAL_EXAM_REQUESTS[0];
    const cohortStudents = studentsForExamRequest(INITIAL_STUDENTS, {
      course: request.course,
      batch: request.batch,
    }).sort((a, b) => a.name.localeCompare(b.name));
    const eligibility = cohortStudents.map((student) => {
      const admission = INITIAL_ADMISSIONS.find(
        (record) =>
          record.regNo === student.regNo &&
          record.status === "Enrolled" &&
          record.course === request.course &&
          record.batch === request.batch,
      );
      const course = COURSES.find((item) => item.name === student.course);
      const months = Number(String(course?.duration ?? "").match(/\d+/)?.[0] ?? 0);
      const appNo = String(
        admission?.appNo ?? student.appNo ?? student.applicationNumber ?? student.regNo,
      );
      const monthlyDue = Number(
        admission?.monthlyFee ??
          student.monthlyFee ??
          (months > 0 ? Number(course?.tuition ?? 0) / months : 0),
      );
      return examFeeEligibility(appNo, student.regNo, request.month, monthlyDue, INITIAL_PAYMENTS)
        .eligible;
    });

    expect(cohortStudents).toHaveLength(4);
    expect(eligibility.filter(Boolean)).toHaveLength(3);
    expect(eligibility.filter((eligible) => !eligible)).toHaveLength(1);
  });
  it("schedules practical and theory exams four days after class end", () => {
    expect(examScheduleAfterClassEnd("2026-11-07")).toEqual({
      practicalDate: "2026-11-11",
      practicalTime: "14:00",
      practicalEndTime: "17:00",
      theoryDate: "2026-11-11",
      theoryTime: "10:00",
      theoryEndTime: "13:00",
    });
  });
  it("rejects an invalid class end date when scheduling exams", () => {
    expect(() => examScheduleAfterClassEnd("2026-02-30")).toThrow(
      "A valid class end date is required to schedule the examination",
    );
  });
  it("rejects ineligible and duplicate exam approvals", () => {
    expect(examApprovalError("EXR-1", "REG-1", [], { eligible: false })).toContain("not eligible");
    expect(
      examApprovalError("EXR-1", "REG-1", [{ requestId: "EXR-1", regNo: "REG-1" }], {
        eligible: true,
      }),
    ).toContain("already been approved");
    expect(examApprovalError("EXR-1", "REG-1", [], { eligible: true })).toBeUndefined();
  });
  it("subtracts discounts and payments from total fees", () => {
    expect(
      feeTotals([
        { fee: 39000, discount: 1000, paid: 5000 },
        { fee: 50000, discount: 2000, paid: 48000 },
      ]),
    ).toEqual({ payable: 86000, paid: 53000, outstanding: 33000 });
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
    const booked = [
      {
        id: "CLS-1",
        date: "2026-10-19",
        startTime: "09:00",
        endTime: "10:00",
        facultyName: "Alex",
        admissionNumber: "APP-1",
        room: "Lab A",
      },
    ];
    expect(
      scheduleConflict(booked, {
        id: "CLS-2",
        date: "2026-10-19",
        startTime: "09:30",
        endTime: "10:30",
        facultyName: "Alex",
        admissionNumber: "APP-2",
        room: "Lab B",
      }),
    ).toBe("This faculty member is already scheduled for that time");
    expect(
      scheduleConflict(booked, {
        id: "CLS-2",
        date: "2026-10-19",
        startTime: "09:30",
        endTime: "10:30",
        facultyName: "Sam",
        admissionNumber: "APP-1",
        room: "Lab B",
      }),
    ).toBe("This student is already scheduled for that time");
    expect(
      scheduleConflict(booked, {
        id: "CLS-2",
        date: "2026-10-19",
        startTime: "09:30",
        endTime: "10:30",
        facultyName: "Sam",
        admissionNumber: "APP-2",
        room: "Lab A",
      }),
    ).toBe("This room is already booked for that time");
    expect(
      scheduleConflict([{ ...booked[0], batchId: "B-1" }], {
        id: "CLS-2",
        date: "2026-10-19",
        startTime: "09:30",
        endTime: "10:30",
        facultyName: "Sam",
        admissionNumber: "APP-2",
        batchId: "B-1",
        room: "Lab B",
      }),
    ).toBe("This batch is already scheduled for that time");
    expect(
      scheduleConflict(booked, {
        id: "CLS-2",
        date: "2026-10-19",
        startTime: "10:00",
        endTime: "11:00",
        facultyName: "Alex",
        admissionNumber: "APP-2",
        room: "Lab B",
      }),
    ).toBeUndefined();
    expect(
      scheduleConflict(booked, {
        id: "CLS-1",
        date: "2026-10-19",
        startTime: "09:00",
        endTime: "10:00",
        facultyName: "Alex",
        admissionNumber: "APP-1",
        room: "Lab A",
      }),
    ).toBeUndefined();
    expect(
      scheduleConflict(booked, {
        id: "CLS-3",
        date: "2026-10-19",
        startTime: "09:30",
        endTime: "10:30",
        facultyName: "Sam",
        admissionNumbers: ["APP-2", "APP-1"],
        room: "Lab C",
      }),
    ).toBe("This student is already scheduled for that time");
  });
  it("returns only the selected scheduled class id", () => {
    const sessions = [
      { id: "CLS-1-S20261028", classId: "CLS-1", date: "2026-10-28" },
      {
        id: "CLS-1-S20261029",
        classSchedule: { classId: "CLS-1" },
        date: "2026-10-29",
      },
      { id: "CLS-2-S20261028", classId: "CLS-2", date: "2026-10-28" },
    ];
    expect(relatedScheduledClassIds(sessions, sessions[0])).toEqual(["CLS-1-S20261028"]);
    expect(relatedScheduledClassIds(sessions, sessions[1])).toEqual(["CLS-1-S20261029"]);
    expect(relatedScheduledClassIds(sessions, { id: "legacy-class" })).toEqual(["legacy-class"]);
  });
  it("requires task end time to be later than its start time", () => {
    expect(taskTimeError("09:00", "10:00")).toBeUndefined();
    expect(taskTimeError("09:00", "09:00")).toBe("End time must be later than start time");
    expect(taskTimeError("10:00", "09:00")).toBe("End time must be later than start time");
  });
});
