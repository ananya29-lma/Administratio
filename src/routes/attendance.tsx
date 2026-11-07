import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, KpiCard, KV, PageHeader, Panel } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { courseCategoryName, type Row } from "@/lib/mock";
import { academicTopicTotal } from "@/lib/administration";
import { fmtDate } from "@/lib/format";
import { studentIdForRegistration } from "@/lib/student-records";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/attendance")({
  head: pageHead(
    "Student Academic & Attendance",
    "Review student profile, academic progress, attendance and leave.",
  ),
  component: Attendance,
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const STATUS_LABELS: Record<string, string> = {
  P: "Present",
  L: "Late",
  A: "Absent",
  H: "Holiday",
};
const STATUS_STYLES: Record<string, string> = {
  P: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  L: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  A: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  H: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};
const SAMPLE_ACADEMIC_TOPICS = [
  {
    key: "fundamentals",
    topic: "Computer Fundamentals",
    start: "01-12",
    end: "01-20",
    practical: 18,
    theory: 17,
  },
  {
    key: "office",
    topic: "Office Applications",
    start: "02-03",
    end: "02-14",
    practical: 20,
    theory: 18,
  },
  {
    key: "web",
    topic: "Web Design Basics",
    start: "03-02",
    end: "03-18",
    practical: 19,
    theory: 16,
  },
  {
    key: "programming",
    topic: "Programming Essentials",
    start: "04-01",
    end: "04-22",
    practical: 17,
    theory: 18,
  },
];
const sampleAttendanceByYear = new Map<string, Map<string, string>>();

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sampleAttendanceStatus(month: number, day: number, year: number): string {
  if (month > 5 || (month === 5 && day > 9)) return "";
  const yearKey = String(year);
  let attendanceByDate = sampleAttendanceByYear.get(yearKey);
  if (!attendanceByDate) {
    const dates: string[] = [];
    for (let monthIndex = 0; monthIndex < 6; monthIndex += 1) {
      const monthDays = new Date(year, monthIndex + 1, 0).getDate();
      const lastDay = monthIndex === 5 ? 9 : monthDays;
      for (let dateDay = 1; dateDay <= lastDay; dateDay += 1) {
        dates.push(
          `${yearKey}-${String(monthIndex + 1).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`,
        );
      }
    }

    const statuses = dates.map((_, index) => ["P", "L", "A"][index % 3]);
    let seed = year * 16807;
    for (let index = statuses.length - 1; index > 0; index -= 1) {
      seed = (seed * 48271) % 2147483647;
      const swapIndex = seed % (index + 1);
      [statuses[index], statuses[swapIndex]] = [statuses[swapIndex], statuses[index]];
    }
    attendanceByDate = new Map(
      dates.map((date, index) => {
        const weekday = new Date(`${date}T12:00:00`).getDay();
        return [date, weekday === 0 ? "H" : statuses[index]];
      }),
    );
    sampleAttendanceByYear.set(yearKey, attendanceByDate);
  }
  const date = `${yearKey}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return attendanceByDate.get(date) ?? "";
}

function Attendance() {
  const attendance = useCollection("attendance", "id");
  const topics = useCollection("academicTopics", "id");
  const { data, settings } = useStore();
  const now = new Date();
  const [selectedRegNo, setSelectedRegNo] = useState("");
  const monthFilter = "all";
  const yearFilter = String(now.getFullYear());

  const admissions = data.admissions;
  const batches = data.batches;
  const [showAttendanceDashboard, setShowAttendanceDashboard] = useState(false);
  const students: Row[] = data.students.map((student) => {
    const admission = admissions.find((row) => row.regNo === student.regNo);
    const batch = batches.find(
      (row) => row.name === (admission?.batch ?? student.batch) || row.id === student.batch,
    );
    return {
      ...student,
      studentId: studentIdForRegistration(student.regNo, data, settings.prefixes.student),
      admissionNo: admission?.admissionNo,
      course: admission?.course ?? student.course,
      batch: admission?.batch ?? student.batch,
      batchId: batch?.id ?? String(admission?.batch ?? student.batch ?? ""),
      faculty: batch?.instructor ?? "",
      startDate: admission?.startDate ?? admission?.admissionDate,
    };
  });
  const selectedStudent = students.find((student) => student.regNo === selectedRegNo);
  const selectedBatch = selectedStudent
    ? batches.find(
        (row) => row.id === selectedStudent.batchId || row.name === selectedStudent.batch,
      )
    : undefined;
  const selectedAttendance = selectedStudent
    ? attendance.rows.filter(
        (record) =>
          record.regNo === selectedStudent.regNo &&
          String(record.date).startsWith(`${yearFilter}-`) &&
          (monthFilter === "all" ||
            Number(String(record.date).slice(5, 7)) === Number(monthFilter)),
      )
    : [];
  const approvedLeaves = selectedStudent
    ? data.leaves.filter(
        (leave) => leave.regNo === selectedStudent.regNo && leave.status === "Approved",
      )
    : [];
  const approvedLeaveDates = new Set<string>();
  for (const leave of approvedLeaves) {
    const start = new Date(`${leave.start}T12:00:00`);
    const end = new Date(`${leave.end ?? leave.start}T12:00:00`);
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = isoDate(cursor);
      if (
        date.startsWith(`${yearFilter}-`) &&
        (monthFilter === "all" || Number(date.slice(5, 7)) === Number(monthFilter))
      ) {
        approvedLeaveDates.add(date);
      }
    }
  }
  const savedTopics = selectedStudent
    ? topics.rows.filter((topic) => topic.regNo === selectedStudent.regNo)
    : [];
  const selectedTopics = selectedStudent
    ? [
        ...SAMPLE_ACADEMIC_TOPICS.filter(
          (sample) => !savedTopics.some((topic) => topic.demoKey === sample.key),
        ).map((sample) => ({
          id: `DEMO-${selectedStudent.regNo}-${sample.key}`,
          demoKey: sample.key,
          regNo: selectedStudent.regNo,
          topic: sample.topic,
          startDate: `${yearFilter}-${sample.start}`,
          endDate: `${yearFilter}-${sample.end}`,
          practical: sample.practical,
          theory: sample.theory,
          total: academicTopicTotal(sample.practical, sample.theory),
        })),
        ...savedTopics,
      ]
    : [];
  const completion = selectedStudent
    ? data.courseCompletions.find((row) => row.regNo === selectedStudent.regNo)
    : undefined;
  const daysInMonth = (month: number) => new Date(Number(yearFilter), month + 1, 0).getDate();
  const visibleMonths =
    monthFilter === "all" ? MONTHS.map((_, index) => index) : [Number(monthFilter)];
  const admissionNo = selectedStudent?.admissionNo ?? "Not Available";
  const studentInitials =
    selectedStudent?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((_, index, parts) => index === 0 || index === parts.length - 1)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() ?? "";
  const recordsForDate = (date: string) =>
    attendance.rows.filter(
      (record) => record.regNo === selectedStudent?.regNo && record.date === date,
    );
  const statusesForDate = (date: string) => {
    const records = recordsForDate(date);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (records.length) {
      return records
        .map((record) => String(record.status))
        .filter((status) => status !== "H" || weekday === 0);
    }
    if (weekday === 0) return ["H"];
    if (approvedLeaveDates.has(date)) return [];
    const [month, day] = date.slice(5).split("-").map(Number);
    const sampleStatus = sampleAttendanceStatus(month, day, Number(yearFilter));
    return sampleStatus === "H" ? [] : sampleStatus ? [sampleStatus] : [];
  };
  const attendanceSummary = { P: 0, L: 0, A: 0, H: 0 };
  visibleMonths.forEach((month) => {
    for (let day = 1; day <= daysInMonth(month); day += 1) {
      const date = `${yearFilter}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      statusesForDate(date).forEach((status) => {
        if (status in attendanceSummary) {
          attendanceSummary[status as keyof typeof attendanceSummary] += 1;
        }
      });
    }
  });
  const formatClockTime = (value: unknown) => {
    if (!value) return "";
    const text = String(value).trim();
    if (!text) return "";
    const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)(?:[:.]([0-5]\d))?$/);
    if (!match) return text;
    const hours = Number(match[1]);
    const suffix = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${match[2]} ${suffix}`;
  };
  const attendanceTooltip = (date: string) => {
    const records = recordsForDate(date);
    const statuses = statusesForDate(date);
    const status = statuses[0] ?? "";
    if (!records.length && approvedLeaveDates.has(date)) {
      return new Date(`${date}T12:00:00`).getDay() === 0 ? "Holiday" : "Approved leave";
    }
    if (status === "A") return "Absent";
    if (status === "H") return "Holiday";
    if (status === "P" || status === "L") {
      const record = records[0];
      const checkIn = formatClockTime(
        record?.checkIn ??
          record?.checkInTime ??
          record?.clockIn ??
          record?.inTime ??
          selectedBatch?.startTime,
      );
      const checkOut = formatClockTime(
        record?.checkOut ??
          record?.checkOutTime ??
          record?.clockOut ??
          record?.outTime ??
          selectedBatch?.endTime,
      );
      const timeParts = [
        checkIn ? `Check in: ${checkIn}` : "",
        checkOut ? `Check out: ${checkOut}` : "",
      ];
      return (
        timeParts.filter(Boolean).join(" • ") || STATUS_LABELS[status] || "No attendance recorded"
      );
    }
    return STATUS_LABELS[status] ?? "No attendance recorded";
  };
  return (
    <div className="space-y-6">
      {!selectedStudent ? (
        <>
          <PageHeader
            title="Students Academic Details"
            description="Select a student to view their profile, topic-wise progress, and attendance."
          />
          <DataTable
            rows={students}
            pageSize={Math.max(students.length, 1)}
            searchKeys={["name", "regNo", "admissionNo", "course", "batch", "mobile"]}
            onRowClick={(student) => {
              setShowAttendanceDashboard(false);
              setSelectedRegNo(String(student.regNo));
            }}
            columns={[
              {
                key: "name",
                label: "Student Name",
                render: (student) => (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm font-semibold"
                    onClick={() => {
                      setShowAttendanceDashboard(false);
                      setSelectedRegNo(String(student.regNo));
                    }}
                  >
                    {student.name}
                  </Button>
                ),
              },
              {
                key: "studentId",
                label: "Student ID",
                render: (student) => (
                  <span className="font-mono text-xs">{student.studentId || "—"}</span>
                ),
              },
              {
                key: "admissionNo",
                label: "Admission Number",
                render: (student) => String(student.admissionNo ?? "Not Available"),
              },
              { key: "course", label: "Course", sortable: false },
              { key: "mobile", label: "Phone Number", sortable: false },
              {
                key: "startDate",
                label: "Starting Date",
                render: (student) => fmtDate(student.startDate),
              },
            ]}
            emptyText={
              students.length
                ? "No students match your search."
                : "No student records are available yet."
            }
          />
        </>
      ) : (
        <div className="space-y-4">
          <PageHeader
            title={
              showAttendanceDashboard
                ? `${selectedStudent.name} — Attendance Dashboard`
                : selectedStudent.name
            }
            description={
              showAttendanceDashboard
                ? "Review this student's attendance summary and monthly records."
                : "Student profile, topic-wise academic progress, and attendance."
            }
            actions={
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (showAttendanceDashboard) {
                    setShowAttendanceDashboard(false);
                  } else {
                    setSelectedRegNo("");
                  }
                }}
              >
                {showAttendanceDashboard ? "Back to Student Details" : "Back to Students"}
              </Button>
            }
          />
          {!showAttendanceDashboard && (
            <>
              <Panel title="Student Details">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${selectedStudent.name}'s attendance dashboard`}
                  onClick={() => setShowAttendanceDashboard(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setShowAttendanceDashboard(true);
                    }
                  }}
                  className="grid cursor-pointer gap-6 rounded-md outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_10rem]"
                >
                  <KV
                    items={[
                      ["Student Name", selectedStudent.name],
                      ["Phone Number", selectedStudent.mobile],
                      ["Admission Number", admissionNo],
                      ["Course", selectedStudent.course],
                      ["Starting Date", fmtDate(selectedStudent.startDate)],
                      [
                        "Time & Days",
                        selectedBatch
                          ? `${selectedBatch.startTime}–${selectedBatch.endTime}, ${(selectedBatch.days ?? []).join(", ")}`
                          : "Not Available",
                      ],
                      ["Qualification", selectedStudent.qualification],
                      ["Name of Parents / Guardian", selectedStudent.guardian],
                    ]}
                  />
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">Student Photo</span>
                    <div
                      aria-label={`Student initials: ${studentInitials}`}
                      className="flex h-48 w-40 max-w-full items-center justify-center rounded-lg border bg-muted/20 text-3xl font-semibold text-muted-foreground"
                    >
                      {studentInitials}
                    </div>
                  </div>
                </div>
              </Panel>
              <Panel title="Topic-wise Academic Progress">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        {[
                          "Sl. No",
                          "Topic",
                          "St. Date",
                          "End Date",
                          "Practical",
                          "Theory",
                          "Total Mark",
                        ].map((heading) => (
                          <th key={heading} className="px-2 py-2 font-medium">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTopics.map((topic, index) => (
                        <tr key={topic.id} className="border-b last:border-0">
                          <td className="px-2 py-2">{index + 1}</td>
                          <td className="px-2 py-2">{topic.topic}</td>
                          <td className="px-2 py-2">{fmtDate(topic.startDate)}</td>
                          <td className="px-2 py-2">{fmtDate(topic.endDate)}</td>
                          <td className="px-2 py-2">{topic.practical ?? "—"}</td>
                          <td className="px-2 py-2">{topic.theory ?? "—"}</td>
                          <td className="px-2 py-2">{topic.total ?? "—"}</td>
                        </tr>
                      ))}
                      {!selectedTopics.length && (
                        <tr>
                          <td className="px-2 py-6 text-center text-muted-foreground" colSpan={7}>
                            No academic topic records yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="px-2 py-2" colSpan={4}>
                          Total
                        </td>
                        <td className="px-2 py-2">
                          {selectedTopics.reduce(
                            (sum, topic) => sum + Number(topic.practical ?? 0),
                            0,
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {selectedTopics.reduce(
                            (sum, topic) => sum + Number(topic.theory ?? 0),
                            0,
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {selectedTopics.reduce((sum, topic) => sum + Number(topic.total ?? 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-4 border-t pt-4">
                  <KV
                    items={[
                      ["Completion Date", fmtDate(completion?.completionDate)],
                      ["Head of Department Verification", "Not Available"],
                    ]}
                  />
                </div>
              </Panel>
            </>
          )}
          {showAttendanceDashboard && (
            <>
              <div className="kpi-compact-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard
                  label="Total Present"
                  value={attendanceSummary.P}
                  icon={CheckCircle2}
                  tone="green"
                />
                <KpiCard
                  label="Total Late"
                  value={attendanceSummary.L}
                  icon={Clock3}
                  tone="orange"
                />
                <KpiCard
                  label="Total Absent"
                  value={attendanceSummary.A}
                  icon={XCircle}
                  tone="red"
                />
                <KpiCard
                  label="Total Holiday"
                  value={attendanceSummary.H}
                  icon={CalendarDays}
                  tone="blue"
                />
              </div>
              <Panel title="Attendance Status">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <span key={key} className="inline-flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-bold ${STATUS_STYLES[key]}`}
                      >
                        {key}
                      </span>
                      {key} = {label}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Attendance cells are view-only. Sundays appear as H for holidays, while approved
                  leave is shown separately unless attendance has been recorded for that day.
                  Unrecorded sample P/L/A/H statuses are illustrative and are not saved as
                  attendance records.
                </p>
              </Panel>
              <Panel title={`Month-wise Attendance · ${yearFilter}`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-center text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 border bg-background px-2 py-2 text-left">
                          Monthly
                        </th>
                        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                          <th key={day} className="border bg-muted/50 px-2 py-2">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMonths.map((month) => (
                        <tr key={month}>
                          <th className="sticky left-0 z-10 border bg-background px-2 py-1 text-left font-medium">
                            {MONTHS[month]}
                          </th>
                          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                            if (day > daysInMonth(month))
                              return (
                                <td key={day} className="border bg-muted/20" aria-hidden="true" />
                              );
                            const date = `${yearFilter}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const records = recordsForDate(date);
                            const statuses = statusesForDate(date);
                            const status = statuses.join(" ");
                            const title = attendanceTooltip(date);
                            return (
                              <td key={day} className="border p-0.5">
                                <span
                                  title={title}
                                  aria-label={`${date}: ${title}`}
                                  className={`inline-flex min-h-7 min-w-7 items-center justify-center rounded px-1 font-semibold ${status ? (STATUS_STYLES[statuses[0]] ?? "") : "text-muted-foreground"}`}
                                >
                                  {status}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!selectedAttendance.length && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No recorded attendance for this selection yet.
                  </p>
                )}
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
