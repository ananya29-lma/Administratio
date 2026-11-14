import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  UsersRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/app/kit";
import { useCollection } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/faculty-leave-requests")({
  head: pageHead("Faculty Leave Requests", "Review faculty leave requests."),
  component: FacultyLeaveRequests,
});

function FacultyLeaveRequests() {
  const requests = useCollection("facultyLeaveRequests");
  const pendingCount = requests.rows.filter((request) => request.status === "Pending").length;
  const approvedCount = requests.rows.filter((request) => request.status === "Approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Requests"
        description="View requests submitted by faculty."
        actions={
          <Button asChild variant="outline">
            <Link to="/batches">
              <ArrowLeft className="h-4 w-4" />
              Back to Batch Allocation
            </Link>
          </Button>
        }
      />
      <div className="kpi-compact-grid grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Requests" value={requests.rows.length} icon={UsersRound} />
        <KpiCard label="Pending Requests" value={pendingCount} icon={CalendarClock} tone="orange" />
        <KpiCard
          label="Approved Requests"
          value={approvedCount}
          icon={CalendarCheck}
          tone="green"
        />
      </div>
      <DataTable
        rows={requests.rows.map((row, index) => ({ ...row, serialNo: index + 1 }))}
        searchKeys={["id", "faculty", "department", "reason", "status"]}
        pagination={false}
        columns={[
          { key: "serialNo", label: "Sl.No", sortable: false },
          { key: "faculty", label: "Faculty" },
          { key: "department", label: "Department" },
          {
            key: "startDate",
            label: "Leave Dates",
            sortable: false,
            render: (row) => `${fmtDate(row.startDate)} – ${fmtDate(row.endDate)}`,
          },
          { key: "reason", label: "Reason" },
          {
            key: "submittedOn",
            label: "Requested On",
            render: (row) => fmtDate(row.submittedOn),
          },
          {
            key: "status",
            label: "Status",
            sortable: false,
            render: (row) =>
              row.status === "Pending" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      requests.update(String(row.id), { status: "Approved" });
                      toast.success(`${row.id} approved for ${row.faculty}`);
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
                      requests.update(String(row.id), { status: "Rejected" });
                      toast.success(`${row.id} rejected for ${row.faculty}`);
                    }}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              ) : (
                <StatusBadge status={String(row.status)} leave />
              ),
          },
        ]}
        emptyText="No faculty leave requests are available."
      />
    </div>
  );
}
