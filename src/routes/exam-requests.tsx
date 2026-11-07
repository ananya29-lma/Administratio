import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
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
import { DataTable, KpiCard, PageHeader, Panel, StatusBadge } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { courseCategoryName, COURSES, type Row } from "@/lib/mock";
import {
  attendancePercentage,
  batchCategory,
  examScheduleAfterClassEnd,
  examFeeEligibility,
  summarizeExamEligibility,
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

function Page() {
  const { data, settings } = useStore();
  const requests = useCollection("examRequests", "id");
  const approvals = useCollection("examApprovals", "id");
  const feeVerificationRequests = useCollection("feeVerificationRequests", "id");
  const [view, setView] = useState<Row | null>(null);
  const [studentView, setStudentView] = useState<Row | null>(null);
  const [studentPage, setStudentPage] = useState(0);

  const eligibleStudents = (request: Row): Row[] =>
    data.admissions
      .filter(
        (admission) =>
          admission.status === "Enrolled" &&
          admission.course === request.course &&
          admission.batch === request.batch,
      )
      .map((admission): Row => {
        const course = COURSES.find((item) => item.name === admission.course);
        const months = Number(String(course?.duration ?? "").match(/\d+/)?.[0] ?? 0);
        const monthlyDue = Number(
          admission.monthlyFee ?? (months > 0 ? Number(course?.tuition ?? 0) / months : 0),
        );
        const feeMonth = request.month || String(request.examDate).slice(0, 7);
        const monthPayments = data.payments.filter(
          (payment) =>
            payment.appNo === admission.appNo &&
            payment.regNo === admission.regNo &&
            String(payment.date ?? "").slice(0, 7) === feeMonth,
        );
        const eligibility = examFeeEligibility(
          admission.appNo,
          admission.regNo,
          feeMonth,
          monthlyDue,
          data.payments,
        );
        const approval = approvals.rows.find(
          (record) => record.requestId === request.id && record.regNo === admission.regNo,
        );
        const feeVerification = feeVerificationRequests.rows
          .filter(
            (record) =>
              record.examRequestId === request.id &&
              record.regNo === admission.regNo &&
              record.feeMonth === feeMonth,
          )
          .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))[0];
        const recordedAmountPaid = feeVerification?.status === "Unpaid" ? 0 : eligibility.paid;
        const studentRecord = data.students.find((student) => student.regNo === admission.regNo);
        const attendancePercent = attendancePercentage(
          data.attendance.filter((record) => record.regNo === admission.regNo),
        );
        const latestPayment = monthPayments
          .filter((payment) => payment.verified === true)
          .sort((first, second) => String(second.date).localeCompare(String(first.date)))[0];
        return {
          ...admission,
          studentId: studentIdForRegistration(admission.regNo, data, settings.prefixes.student),
          email: studentRecord?.email ?? admission.email,
          mobile: studentRecord?.mobile ?? admission.mobile,
          photoUrl: studentRecord?.photoUrl,
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

  const rows = requests.rows.map((request) => {
    const batch = data.batches.find(
      (record) => record.name === request.batch || record.id === request.batch,
    );
    return {
      ...request,
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
  const studentPageSize = 10;
  const studentPageCount = Math.max(1, Math.ceil(detailStudents.length / studentPageSize));
  const visibleStudents = detailStudents.slice(
    studentPage * studentPageSize,
    (studentPage + 1) * studentPageSize,
  );
  const feeMonthLabel = view
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${view.month || String(view.examDate).slice(0, 7)}-01T00:00:00Z`),
      )
    : "";
  const examLabel = view ? `${courseCategoryName(view.subject)} Module Assessment` : "";
  const openRequest = (request: Row) => {
    setView(request);
    setStudentView(null);
    setStudentPage(0);
  };
  const scheduleExamination = (request: Row) => {
    const batch = data.batches.find(
      (record) => record.name === request.batch || record.id === request.batch,
    );
    const dateBase = String(batch?.endDate ?? request.examDate ?? "");
    let examSchedule: ReturnType<typeof examScheduleAfterClassEnd>;
    try {
      examSchedule = examScheduleAfterClassEnd(dateBase);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not determine the examination date",
      );
      return;
    }
    const scheduledValues = {
      scheduled: true,
      ...examSchedule,
    };
    requests.update(request.id, scheduledValues);
    setView({ ...request, ...scheduledValues });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations"
        description="Review Academic Department requests and make fee-verified student approval decisions."
      />
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
      <Panel>
        <DataTable
          rows={rows}
          searchKeys={["id", "subject", "course", "batchLabel"]}
          onRowClick={openRequest}
          columns={[
            {
              key: "id",
              label: "Examination No",
              render: (row) => (
                <span className="font-mono text-xs">
                  {String(row.id ?? "").replace(/^EXR-/, "EXM-")}
                </span>
              ),
            },
            { key: "subject", label: "Course", render: (row) => courseCategoryName(row.subject) },
            { key: "course", label: "Module" },
            {
              key: "classEndDate",
              label: "Class End Date",
              render: (row) => (row.classEndDate ? fmtDate(row.classEndDate) : "—"),
            },
            {
              key: "practicalDate",
              label: "Practical Date",
              render: (row) => (row.scheduled ? fmtDate(row.practicalDate || row.examDate) : "—"),
            },
            {
              key: "practicalTime",
              label: "Practical Time",
              render: (row) =>
                row.scheduled
                  ? `${String(row.practicalTime || "14:00")} – ${String(row.practicalEndTime || "17:00")}`
                  : "—",
            },
            {
              key: "theoryDate",
              label: "Theory Date",
              render: (row) => (row.scheduled ? fmtDate(row.theoryDate || row.examDate) : "—"),
            },
            {
              key: "theoryTime",
              label: "Theory Time",
              render: (row) =>
                row.scheduled
                  ? `${String(row.theoryTime || "10:00")} – ${String(row.theoryEndTime || "13:00")}`
                  : "—",
            },
            { key: "studentCount", label: "Students" },
          ]}
          emptyText="No exam requests found."
        />
      </Panel>

      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[80vh] overflow-auto p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {examLabel} · {feeMonthLabel}
            </DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <Panel title={`Eligibile · ${studentSummary.totalStudents} Students`}>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="w-[22%] px-3 py-3">Student Name</th>
                        <th className="w-[20%] px-3 py-3">Student ID</th>
                        <th className="w-[13%] px-3 py-3">Admission No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.map((student) => {
                        const studentId = String(student.regNo);
                        return (
                          <tr
                            key={studentId}
                            className="cursor-pointer border-b transition-colors hover:bg-muted/30 last:border-0"
                            onDoubleClick={() => setStudentView(student)}
                            title="Double-click to view student details"
                          >
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
                            <td className="break-words px-3 py-3 font-mono text-xs text-muted-foreground">
                              {student.studentId || "—"}
                            </td>
                            <td className="break-words px-3 py-3 text-muted-foreground">
                              {student.admissionNo}
                            </td>
                          </tr>
                        );
                      })}
                      {!visibleStudents.length && (
                        <tr>
                          <td className="px-3 py-10 text-center text-muted-foreground" colSpan={3}>
                            No enrolled students match this course and batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {detailStudents.length
                      ? `Showing ${studentPage * studentPageSize + 1}–${Math.min((studentPage + 1) * studentPageSize, detailStudents.length)} of ${detailStudents.length} students`
                      : "Showing 0 students"}
                  </span>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span>
                      Page {studentPage + 1} of {studentPageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Previous student page"
                      disabled={studentPage === 0}
                      onClick={() => setStudentPage((page) => Math.max(0, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Next student page"
                      disabled={studentPage + 1 >= studentPageCount}
                      onClick={() =>
                        setStudentPage((page) => Math.min(studentPageCount - 1, page + 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Panel>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    className="active:scale-[0.98]"
                    disabled={Boolean(view.scheduled)}
                    onClick={() => scheduleExamination(view)}
                  >
                    <CalendarDays className="mr-1.5 h-4 w-4" />
                    {view.scheduled ? "Scheduled" : "Schedule Examination"}
                  </Button>
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
