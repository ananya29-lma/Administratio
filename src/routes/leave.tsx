import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTable,
  FormDialog,
  KpiCard,
  PageHeader,
  StatusBadge,
  type Field,
} from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { useStudentPicker } from "@/lib/use-students";
import { addDays, type Row } from "@/lib/mock";
import { batchCategory, summarizeLeaveRequests } from "@/lib/administration";
import { daysBetween, fmtDate } from "@/lib/format";
import { studentIdForRegistration } from "@/lib/student-records";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/leave")({
  head: pageHead("Leave Approvals", "Review, approve and reject student leave requests."),
  component: Leave,
});

function Leave() {
  const lv = useCollection("leaves", "id");
  const { data, settings } = useStore();
  const picker = useStudentPicker(true);
  const [tab, setTab] = useState("Pending");
  const [form, setForm] = useState<Row | null>(null);

  const leaveSummary = summarizeLeaveRequests(lv.rows);
  const count = (s: string) => lv.rows.filter((r) => r.status === s).length;
  const rows = (tab === "All" ? lv.rows : lv.rows.filter((r) => r.status === tab)).map(
    (row, index) => ({
      ...row,
      studentId: studentIdForRegistration(row.regNo, data, settings.prefixes.student),
      serialNo: index + 1,
    }),
  );
  const admissionNoFor = (regNo: unknown) =>
    data.admissions.find((admission) => admission.regNo === regNo)?.admissionNo ?? "—";

  const fields: Field[] = [
    { name: "id", label: "Leave Request No", readOnly: true },
    { name: "submitted", label: "Request Submission Date", type: "date", required: true },
    {
      name: "student",
      label: "Student",
      type: "select",
      options: picker.options,
      required: true,
      full: true,
    },
    { name: "start", label: "Leave Start Date", type: "date", required: true },
    {
      name: "end",
      label: "Leave End Date",
      type: "date",
      required: true,
      validate: (v, all) =>
        v && all.start && v < all.start ? "End date cannot be before start date" : undefined,
    },
    {
      name: "category",
      label: "Leave Category",
      type: "select",
      options: settings.leaveCategories,
      required: true,
    },
    { name: "reason", label: "Reason for Leave", type: "textarea", required: true },
    { name: "remarks", label: "Administrative Remarks", type: "textarea" },
  ];

  const save = (v: Row) => {
    const s = picker.resolve(v.student);
    lv.add({
      ...v,
      name: s.name,
      regNo: s.regNo,
      admissionNo: admissionNoFor(s.regNo),
      course: s.course,
      batch: s.batch,
      days: daysBetween(v.start, v.end),
      rejoinedDate: addDays(v.end, 1),
      status: "Pending",
    });
    toast.success(`Leave request ${v.id} submitted`);
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approvals"
        description="Review student leave requests and record decisions."
      />
      <div className="kpi-compact-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Requests" value={leaveSummary.total} icon={CalendarCheck} />
        <KpiCard label="Pending Requests" value={leaveSummary.pending} icon={Clock} tone="orange" />
        <KpiCard
          label="Approved Requests"
          value={leaveSummary.approved}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Rejected Requests"
          value={leaveSummary.rejected}
          icon={XCircle}
          tone="red"
        />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="leave-status-tabs">
          {[
            { value: "Pending", label: "Pending", tone: "pending" },
            { value: "Approved", label: "Approved", tone: "approved" },
            { value: "Rejected", label: "Rejected", tone: "rejected" },
            { value: "All", label: "All Requests", tone: "all" },
          ].map(({ value, label, tone }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={`leave-status-tab leave-status-${tone}`}
            >
              <span>{label}</span>
              <span className="leave-status-count">
                {value === "All" ? lv.rows.length : count(value)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable
        rows={rows}
        searchKeys={["id", "name", "regNo", "admissionNo", "reason", "rejoinedDate"]}
        emptyText={`No ${tab === "All" ? "" : tab.toLowerCase() + " "}leave requests`}
        columns={[
          { key: "serialNo", label: "Sl.No", sortable: false },
          {
            key: "name",
            label: "Student",
            render: (r) => <span className="font-medium">{r.name}</span>,
          },
          {
            key: "studentId",
            label: "Student ID",
            render: (r) => <span className="font-mono text-xs">{r.studentId || "—"}</span>,
          },
          {
            key: "admissionNo",
            label: "Admission No",
            render: (r) => (
              <span className="font-mono text-xs">{r.admissionNo ?? admissionNoFor(r.regNo)}</span>
            ),
          },
          { key: "batch", label: "Batch", render: (r) => batchCategory(r.batch, data.batches) },
          {
            key: "start",
            label: "Leave Dates",
            render: (r) => `${fmtDate(r.start)} – ${fmtDate(r.end)}`,
          },
          {
            key: "reason",
            label: "Reason for Leave",
            render: (r) => r.reason || "—",
          },
          {
            key: "days",
            label: "Days",
            render: (r) => <span className="font-mono">{r.days}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (r) =>
              r.status === "Pending" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      lv.update(r.id, { status: "Approved" });
                      toast.success(`${r.id} approved for ${r.name}`);
                    }}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      lv.update(r.id, { status: "Rejected" });
                      toast.success(`${r.id} rejected for ${r.name}`);
                    }}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              ) : (
                <StatusBadge status={r.status} leave />
              ),
          },
        ]}
      />

      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        title="New Leave Request"
        wide
        enterMovesNext
        fields={fields}
        initial={form ?? {}}
        onSubmit={save}
        submitLabel="Submit Request"
      >
        {(v) =>
          v.start && v.end && v.end >= v.start ? (
            <p className="rounded-md bg-muted p-3 text-sm">
              Total Leave Days:{" "}
              <span className="font-mono font-semibold">{daysBetween(v.start, v.end)}</span>
            </p>
          ) : null
        }
      </FormDialog>
    </div>
  );
}
