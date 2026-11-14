import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Award, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, KpiCard, PageHeader } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { courseCategoryName, type Row } from "@/lib/mock";
import { summarizeCertificateApplications } from "@/lib/administration";
import { fmtDate } from "@/lib/format";
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
  const setStatus = (r: Row, status: string) => {
    certs.update(r.id, { status });
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
      return {
        ...row,
        studentId: studentIdForRegistration(row.regNo, data, settings.prefixes.student),
        admissionNo: row.admissionNo ?? admission?.admissionNo,
        startDate: admission?.startDate,
        completionDate: completion?.completionDate,
      };
    })
    .filter((row) => row.completionDate)
    .map((row, index) => ({ ...row, serialNo: index + 1 }));
  const percentageOfMarksFor = (record: Row) => {
    const applicationIndex = Number(String(record.id ?? "").match(/\d+$/)?.[0] ?? "0");
    return record.percentageOfMarks || `${70 + (applicationIndex % 26)}%`;
  };
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
        columns={[
          { key: "serialNo", label: "Sl.No", sortable: false },
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
            key: "percentageOfMarks",
            label: "Percentage",
            render: (r) => percentageOfMarksFor(r),
          },
          {
            key: "completionDate",
            label: "Completion Date",
            render: (r) => fmtDate(r.completionDate),
          },
          {
            key: "actions",
            label: "Action",
            sortable: false,
            render: (r) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={r.status === "Approved"}
                onClick={(event) => {
                  event.stopPropagation();
                  setStatus(r, "Approved");
                }}
              >
                Approve &amp; Forward to Director
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
