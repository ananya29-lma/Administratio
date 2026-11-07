import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, KpiCard, KV, PageHeader, StatusBadge } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { TODAY, courseCategoryName, type Row } from "@/lib/mock";
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
  const detailsSection = (title: string, items: [string, ReactNode][]) => (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <KV items={items} />
    </section>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Certificate Applications" />
      <div className="kpi-compact-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Applications" value={certs.rows.length} icon={Award} />
        <KpiCard
          label="Pending Applications"
          value={certs.rows.filter((r) => !["Issued", "Rejected"].includes(r.status)).length}
          icon={Clock}
          tone="orange"
        />
        <KpiCard
          label="Ready for Collection"
          value={certs.rows.filter((r) => r.status === "Ready for Collection").length}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Issued Certificates"
          value={certs.rows.filter((r) => r.status === "Issued").length}
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
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            {view && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pr-8">
                <DialogTitle>Certificate Application {view.appNo ?? view.id}</DialogTitle>
                <p className="text-sm">
                  <span className="text-muted-foreground">Date: </span>
                  {availableDate(view.date)}
                </p>
              </div>
            )}
          </DialogHeader>
          {view && (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                <KV
                  items={[
                    ["Student Name", available(selectedStudent?.name ?? view.name)],
                    ["Campus Name", available(settings.institution)],
                    [
                      "Admission Number",
                      available(selectedAdmission?.admissionNo ?? view.admissionNo),
                    ],
                    ["Address", available(selectedStudent?.address)],
                    ["Contact Number", available(selectedStudent?.mobile ?? view.mobile)],
                  ]}
                />
                {detailsSection("Course Details", [
                  ["Name of Course", available(view.course)],
                  ["Starting Date", availableDate(selectedAdmission?.startDate ?? view.startDate)],
                  [
                    "Completion Date",
                    availableDate(selectedCompletion?.completionDate ?? view.completionDate),
                  ],
                ])}
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">
                    Do you want placement through the Skill AI Placement Division?
                  </h3>
                  <p className="text-sm">
                    {String(view.placementPreference ?? "").toLowerCase() === "yes" ? "Yes" : "No"}
                  </p>
                </section>
                {detailsSection("Academic Evaluation by Campus Section In-Charge", [
                  ["Subject", available(subject)],
                  ["Percentage of Marks Obtained", available(percentageOfMarks)],
                  [
                    "Sign & Date of Section In-Charge",
                    available(view.sectionInChargeSignatureDate),
                  ],
                ])}
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Payment Details</h3>
                  <KV
                    items={[
                      ["Total Fee", availableMoney(selectedAdmission?.fee ?? view.fee)],
                      ["Concession Value", availableMoney(selectedAdmission?.discount)],
                      ["Total Paid", availableMoney(selectedAdmission?.paid)],
                      [
                        "Last Paid Date",
                        availableDate(
                          selectedPayments.find((payment) => payment.verified === true)?.date,
                        ),
                      ],
                    ]}
                  />
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Accounts Officer Declaration</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        I hereby declare that all fee payments made by the student, as detailed
                        above, have been duly received, verified, and recorded in the institution’s
                        accounts by the undersigned Accounts Officer.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Sign &amp; Date of Accounts Officer
                      </p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {available(view.accountsOfficerSignatureDate)}
                      </p>
                    </div>
                  </div>
                </section>
                {detailsSection("Academic Verification by Academic Head from Head Office", [
                  ["Grade Assigned", available(gradeAssigned)],
                  ["Sign & Date of Academic Head", available(view.academicHeadSignatureDate)],
                ])}
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Student Declaration</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Declaration</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        I hereby declare that the above details are true.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Signature of applicant</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {available(view.applicantSignature)}
                      </p>
                    </div>
                  </div>
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Official Use - Campus</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Approval Declaration</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        We hereby approve this certificate application and confirm that the above
                        details have been verified and are correct as per the records maintained in
                        our center.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="mt-0.5 font-medium text-foreground">
                        {availableDate(view.approvalDate ?? "2026-11-02")}
                      </p>
                    </div>
                  </div>
                </section>
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
