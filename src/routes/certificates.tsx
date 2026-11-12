import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { TODAY, courseCategoryName, type Row } from "@/lib/mock";
import { summarizeCertificateApplications } from "@/lib/administration";
import { fmtDate, fmtINR } from "@/lib/format";
import { studentIdForRegistration } from "@/lib/student-records";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/certificates")({
  head: pageHead(
    "Certificate Applications",
    "Review certificate applications, document verification, fee clearance and collection.",
  ),
  component: Page,
});

function Page() {
  const certs = useCollection("certs");
  const { settings, data } = useStore();
  const certificateSummary = summarizeCertificateApplications(certs.rows);
  const [view, setView] = useState<Row | null>(null);
  const setStatus = (r: Row, status: string) => {
    certs.update(r.id, { status });
    setView({ ...r, status });
    toast.success(
      status === "Approved"
        ? "Certificate application approved"
        : "Certificate application marked pending",
    );
  };
  const certificateRows = certs.rows
    .map((row) => {
      const admission = data.admissions.find(
        (record) =>
          record.appNo === row.appNo ||
          record.regNo === row.regNo ||
          record.admissionNo === row.admissionNo,
      );
      const completion = data.courseCompletions.find(
        (record) => (admission && record.appNo === admission.appNo) || record.regNo === row.regNo,
      );
      const lastPayment = data.payments
        .filter(
          (payment) =>
            payment.verified === true &&
            ((admission && payment.appNo === admission.appNo) ||
              (row.regNo && payment.regNo === row.regNo)),
        )
        .sort((first, second) =>
          String(second.date ?? "").localeCompare(String(first.date ?? "")),
        )[0];
      return {
        ...row,
        studentId: studentIdForRegistration(row.regNo, data, settings.prefixes.student),
        admissionNo: row.admissionNo ?? admission?.admissionNo,
        startDate: admission?.startDate,
        completionDate: completion?.completionDate,
        lastPaidDate: lastPayment?.date,
      };
    })
    .filter((row) => row.completionDate);
  const selectedAdmission = view
    ? data.admissions.find(
        (admission) =>
          admission.appNo === view.appNo ||
          admission.regNo === view.regNo ||
          admission.admissionNo === view.admissionNo,
      )
    : undefined;
  const selectedStudent = view
    ? data.students.find(
        (student) =>
          student.regNo === view.regNo ||
          (selectedAdmission && student.regNo === selectedAdmission.regNo),
      )
    : undefined;
  const selectedCompletion = view
    ? data.courseCompletions.find(
        (completion) =>
          (selectedAdmission && completion.appNo === selectedAdmission.appNo) ||
          completion.regNo === view.regNo,
      )
    : undefined;
  const selectedPayments = view
    ? data.payments
        .filter(
          (payment) =>
            (selectedAdmission && payment.appNo === selectedAdmission.appNo) ||
            (view.regNo && payment.regNo === view.regNo),
        )
        .sort((first, second) => String(second.date ?? "").localeCompare(String(first.date ?? "")))
    : [];
  const available = (value: unknown) =>
    value === undefined || value === null || String(value).trim() === ""
      ? "Not Available"
      : String(value);
  const availableDate = (value: unknown) =>
    value === undefined || value === null || String(value).trim() === ""
      ? "Not Available"
      : fmtDate(String(value));
  const availableMoney = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? fmtINR(value) : "Not Available";
  const applicationIndex = Number(String(view?.id ?? "").match(/\d+$/)?.[0] ?? "0");
  const subjectOptions = ["AI", "Multimedia", "Accounts", "Management"];
  const subject = view?.subject || subjectOptions[applicationIndex % subjectOptions.length];
  const percentageOfMarks = view?.percentageOfMarks || `${70 + (applicationIndex % 26)}%`;
  const gradeOptions = ["EXCELLENT", "GOOD", "AVERAGE", "VERY GOOD"];
  const gradeAssigned = view
    ? view.gradeAssigned || gradeOptions[applicationIndex % gradeOptions.length]
    : undefined;
  const formField = (label: string, value: ReactNode, className = "", labelClass = "") => (
    <div className={`grid min-w-0 grid-cols-[38%_62%] ${className}`}>
      <dt className={`bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-medium leading-snug ${labelClass}`}>
        {label}
      </dt>
      <dd className="min-w-0 break-words px-2 py-1.5 text-xs leading-snug">{value}</dd>
    </div>
  );
  const formLabel = (label: string, className = "") => (
    <dt
      className={`min-w-0 bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-medium leading-snug ${className}`}
    >
      {label}
    </dt>
  );
  const formValue = (value: ReactNode, className = "") => (
    <dd className={`min-w-0 break-words px-2 py-1.5 text-xs leading-snug ${className}`}>{value}</dd>
  );
  const formSectionHeading = (title: string) => (
    <h3 className="bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-semibold uppercase leading-snug text-[#E86F2A]">
      {title}
    </h3>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Certificate Applications" />
      <div className="kpi-compact-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Applications" value={certificateSummary.total} icon={Award} />
        <KpiCard
          label="Pending Applications"
          value={certificateSummary.pending}
          icon={Clock}
          tone="orange"
        />
        <KpiCard
          label="Ready for Collection"
          value={certificateSummary.readyForCollection}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Issued Certificates"
          value={certificateSummary.issued}
          icon={Award}
          tone="teal"
        />
      </div>
      <DataTable
        rows={certificateRows}
        searchKeys={["id", "name", "admissionNo", "course"]}
        onRowClick={setView}
        columns={[
          { key: "id", label: "Certificate No" },
          { key: "name", label: "Student" },
          {
            key: "studentId",
            label: "Student ID",
            render: (r) => <span className="font-mono text-xs">{r.studentId || "—"}</span>,
          },
          {
            key: "admissionNo",
            label: "Admission No",
            render: (r) => <span className="font-mono text-xs">{r.admissionNo ?? "—"}</span>,
          },
          { key: "course", label: "Course", render: (r) => courseCategoryName(r.course) },
          {
            key: "completionDate",
            label: "Completion Date",
            render: (r) => fmtDate(r.completionDate),
          },
          { key: "lastPaidDate", label: "Last Paid Date", render: (r) => fmtDate(r.lastPaidDate) },
          {
            key: "status",
            label: "Status",
            render: (r) => {
              const displayStatus = [
                "Submitted",
                "Awaiting Documents",
                "Ready for Collection",
                "Issued",
              ].includes(r.status)
                ? "Pending"
                : r.status;
              return <StatusBadge status={displayStatus} certificate />;
            },
          },
        ]}
      />
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            {view && (
              <DialogTitle className="text-center text-base font-bold uppercase tracking-wide">
                Certificate Application Form
              </DialogTitle>
            )}
          </DialogHeader>
          {view && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <article className="space-y-3 bg-white p-3 text-slate-900">
                  <div className="flex flex-wrap items-end justify-between gap-2 pb-2 text-xs">
                    <p>
                      <span className="font-semibold text-[#E86F2A]">
                        Certificate Application No:
                      </span>{" "}
                      {available(view.appNo ?? view.id)}
                    </p>
                    <p>
                      <span className="font-semibold text-[#E86F2A]">Date:</span>{" "}
                      {availableDate(view.date)}
                    </p>
                  </div>

                  <dl className="grid grid-cols-[38%_62%] sm:grid-cols-[18%_32%_18%_32%] sm:auto-rows-[minmax(2rem,auto)]">
                    {formLabel("Name", "sm:col-start-1 sm:row-start-1")}
                    {formValue(
                      available(selectedStudent?.name ?? view.name),
                      "sm:col-start-2 sm:row-start-1",
                    )}
                    {formLabel("Campus Name", "sm:col-start-3 sm:row-start-1")}
                    {formValue("Skill AI", "sm:col-start-4 sm:row-start-1")}
                    {formLabel("Admission No", "sm:col-start-1 sm:row-start-2")}
                    {formValue(
                      available(selectedAdmission?.admissionNo ?? view.admissionNo),
                      "sm:col-start-2 sm:row-start-2",
                    )}
                    <dt className="bg-[#F3F3F3] px-2 py-1.5 text-center text-sm font-semibold text-[#E86F2A] sm:col-span-2 sm:col-start-3 sm:row-start-2">
                      Course Detail
                    </dt>
                    {formLabel("Address", "sm:col-start-1 sm:row-span-2 sm:row-start-3")}
                    {formValue(
                      available(selectedStudent?.address),
                      "sm:col-start-2 sm:row-span-2 sm:row-start-3",
                    )}
                    {formLabel("Name of Course", "sm:col-start-3 sm:row-start-3")}
                    {formValue(available(view.course), "sm:col-start-4 sm:row-start-3")}
                    {formLabel("Starting Date", "sm:col-start-3 sm:row-start-4")}
                    {formValue(
                      availableDate(selectedAdmission?.startDate ?? view.startDate),
                      "sm:col-start-4 sm:row-start-4",
                    )}
                    {formLabel("Contact No", "sm:col-start-1 sm:row-start-5")}
                    {formValue(
                      available(selectedStudent?.mobile ?? view.mobile),
                      "sm:col-start-2 sm:row-start-5",
                    )}
                    {formLabel("Completion Date", "sm:col-start-3 sm:row-start-5")}
                    {formValue(
                      availableDate(selectedCompletion?.completionDate ?? view.completionDate),
                      "sm:col-start-4 sm:row-start-5",
                    )}
                  </dl>

                  <section className="grid grid-cols-1 items-center sm:grid-cols-[minmax(0,1fr)_auto]">
                    <h3 className="px-2 py-1.5 text-xs font-medium">
                      Do you want placement through the Skill AI Placement Division?
                    </h3>
                    <p className="px-3 py-1.5 text-center text-xs">
                      {available(view.placementPreference)}
                    </p>
                  </section>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7fr_3fr]">
                    <div className="space-y-3">
                      <section className="flex min-h-[320px] flex-col">
                        {formSectionHeading("Academic Evaluation by Campus Section In-Charge")}
                        <div className="px-2 py-2 text-center text-xs font-semibold">
                          Subject and % of marks obtained
                        </div>
                        <div className="grid flex-1 grid-cols-1 sm:grid-cols-[2fr_0.75fr_2fr_0.75fr]">
                          <div />
                          <div />
                          <div className="px-2 py-2 text-center text-xs">
                            {available(subject)} · {available(percentageOfMarks)}
                          </div>
                          <div />
                        </div>
                      </section>

                      <section>
                        {formSectionHeading(
                          "Academic Verification by Academic Head from Head Office",
                        )}
                        <p className="bg-[#F3F3F3] px-2 py-1.5 text-center text-xs font-semibold text-[#E86F2A]">
                          Grade Assigned
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3">
                          <div className="col-span-1 grid grid-cols-1 sm:col-span-2 sm:grid-cols-2">
                            <span className="px-2 py-1.5 text-xs font-semibold">
                              • {available(gradeAssigned)}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>

                    <section className="flex h-full flex-col">
                      {formSectionHeading("Payment Details")}
                      <dl className="grid grid-cols-1">
                        {formField(
                          "Total Fee",
                          availableMoney(selectedAdmission?.fee ?? view.fee),
                          "grid-cols-[46%_54%]",
                        )}
                        {formField(
                          "Concession Value",
                          availableMoney(selectedAdmission?.discount),
                          "grid-cols-[46%_54%]",
                        )}
                        {formField(
                          "Total Paid",
                          availableMoney(selectedAdmission?.paid),
                          "grid-cols-[46%_54%]",
                        )}
                        {formField(
                          "Last Paid Date",
                          availableDate(
                            selectedPayments.find((payment) => payment.verified === true)?.date,
                          ),
                          "grid-cols-[46%_54%]",
                        )}
                      </dl>
                      <div className="space-y-2 px-2 py-2 text-[11px] leading-snug">
                        <p>
                          I hereby declare that all fee payments made by the student, as detailed
                          above, have been duly received, verified, and recorded in the
                          institution’s accounts by the undersigned Accounts Officer.
                        </p>
                      </div>
                    </section>
                  </div>

                  <section>
                    <p className="px-2 py-2 text-xs leading-snug">
                      I hereby declare that the above details are true.
                    </p>
                  </section>

                  <section>
                    <h3 className="bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-semibold uppercase leading-snug text-[#E86F2A]">
                      For official use (Campus)
                    </h3>
                    <p className="px-2 py-2 text-xs leading-snug">
                      We hereby approve this certificate application and confirm that the above
                      details have been verified and are correct as per the records maintained in
                      our center.
                    </p>
                    <div>
                      <p className="px-2 py-2 text-xs">
                        Date: {availableDate(view.approvalDate ?? "2026-11-02")}
                      </p>
                    </div>
                  </section>
                </article>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  disabled={view.status === "Approved"}
                  onClick={() => setStatus(view, "Approved")}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Approve &amp; Forward to Director
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
