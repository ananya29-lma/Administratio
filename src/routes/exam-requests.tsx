import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ChevronLeft, ClipboardCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DataTable,
  KpiCard,
  PageHeader,
  Panel,
  StatusBadge,
  type Column,
} from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { courseCategoryName, COURSES, type Row } from "@/lib/mock";
import {
  attendancePercentage,
  batchCategory,
  completedExamDate,
  examScheduleAfterClassEnd,
  examFeeEligibility,
  examSessionStatus,
  facultyAvailableAtTime,
  findFacultyFreeSlots,
  summarizeExamEligibility,
  studentsForExamRequest,
} from "@/lib/administration";
import { fmtDate, fmtINR } from "@/lib/format";
import { studentIdForRegistration } from "@/lib/student-records";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/exam-requests")({
  head: pageHead(
    "Examinations",
    "Review Academic Department exam requests and verify student eligibility.",
  ),
  component: Page,
});

function formatExamTime(value: unknown) {
  const rawTime = String(value ?? "");
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(rawTime);
  if (!match) return rawTime;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return rawTime;
  if (meridiem) hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);

  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

function displayFacultyName(value: unknown) {
  const facultyName = String(value ?? "").trim();
  if (!facultyName) return "—";
  return facultyName === "Priya Natarajan" ? "Priyanka" : "Shruti";
}

type ExamScheduleKey = "theory" | "practical" | "industrialViva";

function Page() {
  const { data, settings, approveExamStudent, setCollection } = useStore();
  const requests = useCollection("examRequests", "id");
  const approvals = useCollection("examApprovals", "id");
  const feeVerificationRequests = useCollection("feeVerificationRequests", "id");
  const examNotifications = useCollection("examNotifications", "id");
  const tasks = useCollection("tasks", "id");
  const [view, setView] = useState<Row | null>(null);
  const [studentView, setStudentView] = useState<Row | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingDate, setEditingDate] = useState<{
    requestId: string;
    schedule: ExamScheduleKey;
    draft: string;
  } | null>(null);
  const automaticScheduleAttempts = useRef(new Map<string, string>());

  const eligibleStudents = (request: Row): Row[] =>
    studentsForExamRequest(data.students, {
      course: request.course,
      batch: request.batch,
    }).map((student): Row => {
      const admission = data.admissions.find(
        (record) =>
          record.regNo === student.regNo &&
          record.status === "Enrolled" &&
          record.course === request.course &&
          record.batch === request.batch,
      );
      const course = COURSES.find((item) => item.name === student.course);
      const months = Number(String(course?.duration ?? "").match(/\d+/)?.[0] ?? 0);
      const monthlyDue = Number(
        admission?.monthlyFee ??
          student.monthlyFee ??
          (months > 0 ? Number(course?.tuition ?? 0) / months : 0),
      );
      const feeMonth = request.month || String(request.examDate).slice(0, 7);
      const appNo = String(
        admission?.appNo ?? student.appNo ?? student.applicationNumber ?? student.regNo ?? "",
      );
      const regNo = String(student.regNo ?? "");
      const monthPayments = data.payments.filter(
        (payment) =>
          payment.appNo === appNo &&
          payment.regNo === regNo &&
          String(payment.date ?? "").slice(0, 7) === feeMonth,
      );
      const eligibility = examFeeEligibility(appNo, regNo, feeMonth, monthlyDue, data.payments);
      const approval = approvals.rows.find(
        (record) => record.requestId === request.id && record.regNo === regNo,
      );
      const feeVerification = feeVerificationRequests.rows
        .filter(
          (record) =>
            record.examRequestId === request.id &&
            record.regNo === regNo &&
            record.feeMonth === feeMonth,
        )
        .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))[0];
      const recordedAmountPaid = feeVerification?.status === "Unpaid" ? 0 : eligibility.paid;
      const attendancePercent = attendancePercentage(
        data.attendance.filter((record) => record.regNo === regNo),
      );
      const latestPayment = monthPayments
        .filter((payment) => payment.verified === true)
        .sort((first, second) => String(second.date).localeCompare(String(first.date)))[0];
      return {
        ...student,
        ...admission,
        regNo,
        appNo,
        admissionNo: admission?.admissionNo ?? student.admissionNo ?? "Not enrolled",
        studentId: studentIdForRegistration(regNo, data, settings.prefixes.student),
        email: student.email ?? admission?.email,
        mobile: student.mobile ?? admission?.mobile,
        photoUrl: student.photoUrl,
        monthlyDue,
        recordedAmountPaid,
        eligibility,
        approval,
        feeVerification,
        latestPaymentDate: latestPayment?.date,
        monthPayments,
        attendancePercent,
      };
    });

  const rows: Row[] = requests.rows.map((request, index) => {
    const batch = data.batches.find(
      (record) => record.name === request.batch || record.id === request.batch,
    );
    return {
      ...request,
      serialNo: index + 1,
      batchLabel: batchCategory(request.batch, data.batches),
      classEndDate: batch?.endDate,
    };
  });
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const toDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const upcomingExamCount = requests.rows.filter((request) => {
    if (!request.scheduled) return false;
    const examDate = String(request.examDate ?? "");
    return examDate >= toDateString(today) && examDate <= toDateString(nextWeek);
  }).length;
  const totalScheduledExamCount = requests.rows.filter((request) =>
    Boolean(request.scheduled),
  ).length;
  const todayIso = toDateString(today);
  const completedExamRows = rows.filter(
    (request) => completedExamDate(request, todayIso) !== undefined,
  );
  const completedStudentCount = completedExamRows.reduce(
    (total, request) => total + Number(request.studentCount ?? 0),
    0,
  );
  const latestCompletedExamDate = completedExamRows
    .map((request) => completedExamDate(request, todayIso))
    .filter((date): date is string => date !== undefined)
    .sort()
    .at(-1);
  const examColumns: Column[] = [
    { key: "serialNo", label: "Sl.No", sortable: false },
    { key: "subject", label: "Course", render: (row: Row) => courseCategoryName(row.subject) },
    { key: "course", label: "Module" },
    ...(!showHistory
      ? [
          {
            key: "classEndDate",
            label: "Class End Date",
            render: (row: Row) => (row.classEndDate ? fmtDate(row.classEndDate) : "—"),
          },
        ]
      : []),
    ...(!showHistory
      ? [
          {
            key: "theoryDate",
            label: "Theory Date",
            render: (row: Row) =>
              row.scheduled
                ? renderVivaSchedule(
                    { ...row, theoryDate: row.theoryDate || row.examDate },
                    "theory",
                  )
                : "—",
          },
          {
            key: "practicalDate",
            label: "Practical & Viva Date",
            render: (row: Row) =>
              row.scheduled
                ? renderVivaSchedule(
                    { ...row, practicalDate: row.practicalDate || row.examDate },
                    "practical",
                  )
                : "—",
          },
          {
            key: "industrialVivaDate",
            showSortIndicator: false,
            label: (
              <>
                Viva
                <br />
                (Industrial)
                <br />
                Director
              </>
            ),
            render: (row: Row) => renderVivaSchedule(row, "industrialViva"),
          },
        ]
      : []),
    ...(showHistory
      ? [
          {
            key: "examStatus",
            label: "Exam Status",
            sortable: false,
            render: (row: Row) => {
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>Theory</span>
                    <StatusBadge
                      status={examSessionStatus(row.theoryDate || row.examDate, todayIso)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Practical &amp; Viva</span>
                    <StatusBadge
                      status={examSessionStatus(row.practicalDate || row.examDate, todayIso)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Industrial Viva</span>
                    <span className="status-badge status-danger">Pending</span>
                  </div>
                </div>
              );
            },
          },
        ]
      : []),
    ...(!showHistory ? [{ key: "studentCount", label: "Students" }] : []),
  ];
  const detailStudents: Row[] = view
    ? eligibleStudents(view)
        .map((student): Row => ({
          ...student,
          batchLabel: batchCategory(student.batch, data.batches),
        }))
        .sort((first, second) => String(first.name).localeCompare(String(second.name)))
    : [];
  const studentSummary = summarizeExamEligibility(
    detailStudents.map((student) => ({ eligible: student.eligibility.eligible })),
  );
  const feeMonthLabel = view
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${view.month || String(view.examDate).slice(0, 7)}-01T00:00:00Z`),
      )
    : "";
  const theoryFaculty = [
    { name: "Anvitha", identifiers: ["Anvitha", "Anvitha (Multimedia)"] },
    {
      name: "Priyanka",
      identifiers: ["Priyanka", "Priyanka (AI)", "Priya Natarajan"],
    },
    { name: "Shruti", identifiers: ["Shruti"] },
    { name: "Megha", identifiers: ["Megha"] },
  ];
  const renderVivaSchedule = (request: Row, schedule: ExamScheduleKey) => {
    const date = request[`${schedule}Date`];
    const startTime = request[`${schedule}Time`];
    const endTime = request[`${schedule}EndTime`];
    const time =
      startTime && endTime
        ? `${formatExamTime(startTime)} – ${formatExamTime(endTime)}`
        : formatExamTime(startTime ?? endTime ?? "");
    const availableTheoryFaculty =
      schedule === "theory" && date && startTime && endTime
        ? theoryFaculty.find((faculty) =>
            facultyAvailableAtTime(
              faculty.identifiers,
              String(date),
              String(startTime),
              String(endTime),
              data.scheduledClasses,
              tasks.rows,
            ),
          )?.name
        : undefined;
    if (!date && !time) return "—";
    const requestId = String(request.id ?? "");
    const isEditing = editingDate?.requestId === requestId && editingDate.schedule === schedule;
    return (
      <div>
        <Popover
          open={isEditing}
          onOpenChange={(open) =>
            setEditingDate(open && date ? { requestId, schedule, draft: String(date) } : null)
          }
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="link"
              className="h-auto justify-start p-0 text-foreground"
              aria-label={`Edit ${schedule} exam date`}
              onClick={(event) => event.stopPropagation()}
            >
              {date ? fmtDate(date) : "—"}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium">Edit exam date</p>
            <Input
              type="date"
              aria-label="Exam date"
              value={editingDate?.draft ?? String(date ?? "")}
              onChange={(event) => {
                const draft = event.currentTarget.value;
                setEditingDate((current) => (current ? { ...current, draft } : current));
              }}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingDate(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!editingDate?.draft}
                onClick={() => {
                  if (!editingDate?.draft) return;
                  const {
                    requestId: editedRequestId,
                    schedule: editedSchedule,
                    draft,
                  } = editingDate;
                  setCollection("examRequests", (current) =>
                    current.map((record) =>
                      String(record.id ?? "") === editedRequestId
                        ? { ...record, [`${editedSchedule}Date`]: draft }
                        : record,
                    ),
                  );
                  setEditingDate(null);
                  toast.success("Examination date updated");
                }}
              >
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {time && <div className="text-xs text-muted-foreground">{time}</div>}
        {schedule === "practical" && request.vivaFacultyName && (
          <div className="text-xs text-muted-foreground">
            {displayFacultyName(request.vivaFacultyName)}
          </div>
        )}
        {availableTheoryFaculty && (
          <div className="text-xs text-muted-foreground">{availableTheoryFaculty}</div>
        )}
      </div>
    );
  };
  const openRequest = (request: Row) => {
    setView(request);
    setStudentView(null);
  };
  useEffect(() => {
    const workingRequests = [...requests.rows];
    const scheduledPatches = new Map<string, Row>();

    for (const request of workingRequests) {
      const requestId = String(request.id ?? "");
      if (request.scheduled || !requestId) continue;
      const batch = data.batches.find(
        (record) => record.name === request.batch || record.id === request.batch,
      );
      const signature = JSON.stringify([request, batch, data.scheduledClasses, tasks.rows]);
      if (automaticScheduleAttempts.current.get(requestId) === signature) continue;
      automaticScheduleAttempts.current.set(requestId, signature);

      const dateBase = String(batch?.endDate ?? request.examDate ?? "");
      let examSchedule: ReturnType<typeof examScheduleAfterClassEnd>;
      try {
        examSchedule = examScheduleAfterClassEnd(dateBase);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not determine the examination date",
        );
        continue;
      }

      const facultyName = String(batch?.instructor ?? "").trim();
      const facultyIndex = [
        ...new Set(
          data.batches.map((record) => String(record.instructor ?? "").trim()).filter(Boolean),
        ),
      ].indexOf(facultyName);
      if (facultyIndex < 0) {
        toast.error("The batch must have an assigned faculty member to schedule viva exams");
        continue;
      }

      const otherVivaBookings = workingRequests
        .filter((record) => record.id !== request.id && record.vivaFacultyName === facultyName)
        .flatMap((record) =>
          (["industrialViva", "technicalViva"] as const).flatMap((viva) => {
            const date = record[`${viva}Date`];
            const startTime = record[`${viva}Time`];
            const endTime = record[`${viva}EndTime`];
            return date && startTime && endTime ? [{ facultyName, date, startTime, endTime }] : [];
          }),
        );
      const examBookings = [
        {
          facultyName,
          date: examSchedule.practicalDate,
          startTime: examSchedule.practicalTime,
          endTime: examSchedule.practicalEndTime,
        },
        {
          facultyName,
          date: examSchedule.theoryDate,
          startTime: examSchedule.theoryTime,
          endTime: examSchedule.theoryEndTime,
        },
      ];
      const otherExamBookings = workingRequests
        .filter((record) => record.id !== request.id && record.scheduled)
        .flatMap((record) => {
          const scheduledBatch = data.batches.find(
            (item) => item.name === record.batch || item.id === record.batch,
          );
          if (String(scheduledBatch?.instructor ?? "").trim() !== facultyName) return [];
          return [
            {
              facultyName,
              date: record.practicalDate || record.examDate,
              startTime: record.practicalTime || "14:00",
              endTime: record.practicalEndTime || "17:00",
            },
            {
              facultyName,
              date: record.theoryDate || record.examDate,
              startTime: record.theoryTime || "10:00",
              endTime: record.theoryEndTime || "13:00",
            },
          ];
        });

      let vivaAppointments: ReturnType<typeof findFacultyFreeSlots>;
      try {
        vivaAppointments = findFacultyFreeSlots(
          facultyName,
          examSchedule.practicalDate,
          facultyIndex,
          [...data.scheduledClasses, ...otherVivaBookings, ...otherExamBookings, ...examBookings],
          tasks.rows,
          2,
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not find free faculty time for viva exams",
        );
        continue;
      }

      const [industrialViva, technicalViva] = vivaAppointments;
      const scheduledValues = {
        scheduled: true,
        ...examSchedule,
        vivaFacultyName: facultyName,
        industrialVivaDate: industrialViva.date,
        industrialVivaTime: industrialViva.startTime,
        industrialVivaEndTime: industrialViva.endTime,
        technicalVivaDate: technicalViva.date,
        technicalVivaTime: technicalViva.startTime,
        technicalVivaEndTime: technicalViva.endTime,
      };
      scheduledPatches.set(requestId, scheduledValues);
      const requestIndex = workingRequests.findIndex((record) => record.id === request.id);
      workingRequests[requestIndex] = { ...request, ...scheduledValues };
    }

    if (scheduledPatches.size) {
      setCollection("examRequests", (current) =>
        current.map((request) => {
          const patch = scheduledPatches.get(String(request.id ?? ""));
          return patch ? { ...request, ...patch } : request;
        }),
      );
    }
  }, [requests.rows, data.batches, data.scheduledClasses, tasks.rows, setCollection]);
  const scheduleStudent = (student: Row) => {
    if (!view) return;
    const error = approveExamStudent(view, student, Number(student.monthlyDue));
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`${student.name} scheduled for the examination`);
  };
  const notifyStudent = (student: Row) => {
    if (!view) return;
    const notificationId = `${view.id}-${student.regNo}`;
    if (examNotifications.rows.some((notification) => notification.id === notificationId)) {
      return;
    }
    examNotifications.add({
      id: notificationId,
      requestId: view.id,
      regNo: student.regNo,
      appNo: student.appNo,
      name: student.name,
      type: "Exam fee reminder",
      feeMonth: view.month || String(view.examDate).slice(0, 7),
      monthlyDue: Number(student.monthlyDue),
      amountPaid: Number(student.recordedAmountPaid),
      createdAt: new Date().toISOString(),
      status: "Unread",
    });
    toast.success("LMS demo notification recorded.");
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title={showHistory ? "Examination History" : "Examinations"}
        description={
          showHistory
            ? "Review examinations whose scheduled sessions have been completed."
            : "Review Academic Department requests and make fee-verified student approval decisions."
        }
        actions={
          <Button
            type="button"
            variant={showHistory ? "outline" : "default"}
            onClick={() => setShowHistory((current) => !current)}
          >
            {showHistory ? (
              <>
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Back to Examinations
              </>
            ) : (
              <>
                <History className="mr-1.5 h-4 w-4" />
                Examination History
              </>
            )}
          </Button>
        }
      />
      {showHistory ? (
        <div className="kpi-compact-grid grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Completed Examinations"
            value={completedExamRows.length}
            icon={ClipboardCheck}
          />
          <KpiCard
            label="Students Examined"
            value={completedStudentCount}
            icon={CheckCircle2}
            tone="green"
          />
          <KpiCard
            label="Latest Completed Exam"
            value={latestCompletedExamDate ? fmtDate(latestCompletedExamDate) : "—"}
            icon={CalendarDays}
            tone="blue"
          />
        </div>
      ) : (
        <div className="kpi-compact-grid grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Total Examinations" value={requests.rows.length} icon={ClipboardCheck} />
          <KpiCard
            label="Total Scheduled Examination"
            value={totalScheduledExamCount}
            icon={CalendarDays}
          />
          <KpiCard
            label="Upcoming Exams in a Week"
            value={upcomingExamCount}
            icon={CalendarDays}
            tone="orange"
          />
        </div>
      )}
      <Panel>
        <DataTable
          rows={showHistory ? completedExamRows : rows}
          searchKeys={["id", "subject", "course", "batchLabel"]}
          {...(showHistory ? {} : { onRowClick: openRequest })}
          columns={examColumns}
          pagination={false}
          emptyText={showHistory ? "No completed examinations found." : "No exam requests found."}
        />
      </Panel>

      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none max-h-screen content-start overflow-auto gap-2 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Examination Subject: {view?.subject}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              {view.scheduled && (
                <Panel
                  title="Examination Scheduled"
                  actions={
                    <span className="text-sm text-muted-foreground">
                      Faculty: {displayFacultyName(view.vivaFacultyName)}
                    </span>
                  }
                >
                  <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="mb-1 font-medium">Theory Exam</p>
                      {renderVivaSchedule(view, "theory")}
                    </div>
                    <div>
                      <p className="mb-1 font-medium">Practical &amp; Viva Exam</p>
                      {renderVivaSchedule(view, "practical")}
                    </div>
                    <div>
                      <p className="mb-1 font-medium">Viva (Industrial)</p>
                      {renderVivaSchedule(view, "industrialViva")}
                    </div>
                  </div>
                </Panel>
              )}
              <Panel title={`Eligible · ${studentSummary.totalStudents} Students`}>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="w-[16%] px-3 py-3">Student ID</th>
                        <th className="w-[25%] px-3 py-3">Student Name</th>
                        <th className="w-[18%] px-3 py-3">Monthly Fees</th>
                        <th className="w-[22%] px-3 py-3">Fees Status</th>
                        <th className="w-[19%] px-3 py-3">Schedule / Notify</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailStudents.map((student) => {
                        const studentId = String(student.regNo);
                        const feeStatus =
                          student.feeVerification?.status === "Unpaid"
                            ? "Unpaid"
                            : student.eligibility.eligible
                              ? "Paid"
                              : student.eligibility.paid > 0
                                ? "Partially Paid"
                                : student.eligibility.reason.startsWith("Overdue:")
                                  ? "Overdue"
                                  : student.eligibility.reason.includes("not verified")
                                    ? "Pending Accountancy Verification"
                                    : "Unpaid";
                        const pendingFee = Math.max(
                          0,
                          Number(student.monthlyDue) - Number(student.recordedAmountPaid),
                        );
                        const notified = examNotifications.rows.some(
                          (notification) =>
                            notification.requestId === view.id &&
                            notification.regNo === student.regNo,
                        );
                        return (
                          <tr
                            key={studentId}
                            className="cursor-pointer border-b transition-colors hover:bg-muted/30 last:border-0"
                            onDoubleClick={() => setStudentView(student)}
                            title="Double-click to view student details"
                          >
                            <td className="break-words px-3 py-3 font-mono text-xs text-muted-foreground">
                              {student.studentId || "—"}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage
                                    src={student.photoUrl}
                                    alt={`${student.name} profile`}
                                  />
                                  <AvatarFallback>
                                    {String(student.name)
                                      .split(/\s+/)
                                      .slice(0, 2)
                                      .map((part: string) => part[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate font-medium">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="space-y-1 text-xs">
                                <p>{fmtINR(Number(student.monthlyDue))}</p>
                                <p className="text-muted-foreground">
                                  Pending: {fmtINR(pendingFee)}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge status={feeStatus} />
                            </td>
                            <td className="px-3 py-3">
                              {student.eligibility.eligible &&
                              student.feeVerification?.status !== "Unpaid" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={Boolean(student.approval)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    scheduleStudent(student);
                                  }}
                                >
                                  {student.approval ? "Scheduled" : "Schedule"}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={notified}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    notifyStudent(student);
                                  }}
                                >
                                  {notified ? "Notified" : "Notify"}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!detailStudents.length && (
                        <tr>
                          <td className="px-3 py-10 text-center text-muted-foreground" colSpan={5}>
                            No student records match this course and batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>Showing {detailStudents.length} students</span>
                </div>
              </Panel>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <div className="flex flex-wrap justify-end gap-2">
                  {view.status === "Approved" && <StatusBadge status="Approved" />}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!studentView} onOpenChange={(open) => !open && setStudentView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              {studentView?.name} · {studentView?.admissionNo}
            </DialogDescription>
          </DialogHeader>
          {studentView && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Registration No.:</span>{" "}
                  {studentView.regNo}
                </p>
                <p>
                  <span className="text-muted-foreground">Course:</span>{" "}
                  {courseCategoryName(studentView.course)}
                </p>
                <p>
                  <span className="text-muted-foreground">Batch:</span> {studentView.batch}
                </p>
                <p>
                  <span className="text-muted-foreground">Mobile:</span> {studentView.mobile || "—"}
                </p>
                <p className="break-all sm:col-span-2">
                  <span className="text-muted-foreground">Email:</span> {studentView.email || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Exam fee month:</span> {feeMonthLabel}
                </p>
                <p>
                  <span className="text-muted-foreground">Paid:</span>{" "}
                  {fmtINR(Number(studentView.recordedAmountPaid))}
                </p>
                <p>
                  <span className="text-muted-foreground">Monthly fee:</span>{" "}
                  {fmtINR(Number(studentView.monthlyDue))}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Eligibility:</span>{" "}
                  <StatusBadge
                    status={studentView.eligibility.eligible ? "Eligible" : "Not Eligible"}
                  />
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Payments for this fee month</h3>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {(studentView.monthPayments as Row[]).length ? (
                    (studentView.monthPayments as Row[]).map((payment) => (
                      <div
                        key={String(payment.receiptNo ?? `${payment.date}-${payment.amount}`)}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{fmtINR(Number(payment.amount))}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(payment.date)} · {payment.method || "Payment"}
                          </p>
                        </div>
                        <StatusBadge status={payment.verified ? "Verified" : "Pending"} />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border px-3 py-4 text-sm text-muted-foreground">
                      No payments recorded for this fee month.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
