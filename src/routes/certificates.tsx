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
    <div
      className={`grid min-w-0 grid-cols-[38%_62%] border-b border-r border-[#777] ${className}`}
    >
      <dt className={`bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-medium leading-snug ${labelClass}`}>
        {label}
      </dt>
      <dd className="min-w-0 break-words px-2 py-1.5 text-xs leading-snug">{value}</dd>
    </div>
  );
  const formSectionHeading = (title: string) => (
    <h3 className="border-b border-[#777] bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-semibold uppercase leading-snug text-[#E86F2A]">
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

                  <dl className="grid grid-cols-1 border-l border-t border-[#777] sm:grid-cols-2">
                    {formField("Name", available(selectedStudent?.name ?? view.name))}
                    {formField("Campus Name", available(settings.institution))}
                    {formField(
                      "Admission No",
                      available(selectedAdmission?.admissionNo ?? view.admissionNo),
                    )}
                    {formField("Course Detail", available(view.course), "", "text-[#E86F2A]")}
                    {formField("Address", available(selectedStudent?.address))}
                    {formField("Name of Course", available(view.course))}
                    {formField("Contact No", available(selectedStudent?.mobile ?? view.mobile))}
                    {formField(
                      "Starting Date",
                      availableDate(selectedAdmission?.startDate ?? view.startDate),
                    )}
                    {formField(
                      "Completion Date",
                      availableDate(selectedCompletion?.completionDate ?? view.completionDate),
                    )}
                  </dl>

                  <section className="grid grid-cols-1 border border-[#777] sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <h3 className="px-2 py-2 text-xs font-medium">
                      Do you want placement through the Skill AI Placement Division?
                    </h3>
                    {["Yes", "No"].map((choice) => {
                      const selected =
                        String(view.placementPreference ?? "").toLowerCase() ===
                        choice.toLowerCase();
                      return (
                        <p key={choice} className="px-3 py-2 text-xs">
                          {selected ? "☒" : "☐"} {choice}
                        </p>
                      );
                    })}
                  </section>

                  <section className="grid grid-cols-1 border-l border-t border-[#777] sm:grid-cols-[1.4fr_1fr]">
                    <div className="border-b border-r border-[#777]">
                      {formSectionHeading("Academic Evaluation by Campus Section In-Charge")}
                      <dl className="grid grid-cols-1 border-l border-[#777]">
                        {formField(
                          "Subject and % of marks obtained",
                          `${available(subject)} · ${available(percentageOfMarks)}`,
                          "grid-cols-[38%_62%]",
                        )}
                      </dl>
                      <div className="flex min-h-16 flex-col justify-end px-2 py-2 text-[11px]">
                        <span className="mb-1 border-b border-dotted border-[#555] pb-1 text-xs">
                          {available(view.sectionInChargeSignatureDate)}
                        </span>
                        Sign &amp; Date of Section In-Charge
                      </div>
                    </div>
                    <div className="border-b border-r border-[#777]">
                      {formSectionHeading("Payment Details")}
                      <dl className="grid grid-cols-1 border-l border-[#777]">
                        {formField("Total Fee", availableMoney(selectedAdmission?.fee ?? view.fee))}
                        {formField("Concession Value", availableMoney(selectedAdmission?.discount))}
                        {formField("Total Paid", availableMoney(selectedAdmission?.paid))}
                        {formField(
                          "Last Paid Date",
                          availableDate(
                            selectedPayments.find((payment) => payment.verified === true)?.date,
                          ),
                        )}
                      </dl>
                      <div className="space-y-2 px-2 py-2 text-[11px] leading-snug">
                        <p>
                          I hereby declare that all fee payments made by the student, as detailed
                          above, have been duly received, verified, and recorded in the
                          institution’s accounts by the undersigned Accounts Officer.
                        </p>
                        <p className="border-b border-dotted border-[#555] pb-1 text-xs">
                          {available(view.accountsOfficerSignatureDate)}
                        </p>
                        <p>Sign &amp; Date of Accounts Officer</p>
                      </div>
                    </div>
                  </section>

                  <section className="border border-[#777]">
                    {formSectionHeading("Academic Verification by Academic Head from Head Office")}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr]">
                      <div className="grid grid-cols-[38%_62%] border-r border-[#777]">
                        <p className="bg-[#F3F3F3] px-2 py-1.5 text-[11px] font-medium text-[#E86F2A]">
                          Grade Assigned
                        </p>
                        <p className="px-2 py-1.5 text-xs">{available(gradeAssigned)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1 px-2 py-1.5 text-[11px] sm:grid-cols-4">
                        {["EXCELLENT", "GOOD", "VERY GOOD", "AVERAGE"].map((grade) => (
                          <span key={grade}>
                            {gradeAssigned === grade ? "☒" : "☐"} {grade}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="border-t border-[#777] px-2 py-2 text-[11px]">
                      <span className="mr-2 inline-block min-w-40 border-b border-dotted border-[#555] pb-1 text-xs">
                        {available(view.academicHeadSignatureDate)}
                      </span>
                      Sign &amp; Date of Academic Head
                    </p>
                  </section>

                  <section className="border border-[#777]">
                    <p className="px-2 py-2 text-xs leading-snug">
                      I hereby declare that the above details are true.
                    </p>
                    <p className="mx-2 mt-3 min-h-6 border-b border-dotted border-[#555] pb-1 text-xs">
                      {available(view.applicantSignature)}
                    </p>
                    <p className="px-2 py-1 text-[11px]">Signature of applicant</p>
                  </section>

                  <section className="border border-[#777]">
                    {formSectionHeading("For official use (Campus)")}
                    <p className="px-2 py-2 text-xs leading-snug">
                      We hereby approve this certificate application and confirm that the above
                      details have been verified and are correct as per the records maintained in
                      our center.
                    </p>
                    <div className="grid grid-cols-1 border-t border-[#777] sm:grid-cols-2">
                      <p className="border-b border-r border-[#777] px-2 py-2 text-xs">
                        Date: {availableDate(view.approvalDate ?? "2026-11-02")}
                      </p>
                      <div className="px-2 py-2 text-xs">
                        <p className="mb-2 min-h-5 border-b border-dotted border-[#555]">
                          {available(view.directorSignature)}
                        </p>
                        Signature of Director
                      </div>
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
