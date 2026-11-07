import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  Flag,
  Phone,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ConfirmDialog,
  DataTable,
  KV,
  PageHeader,
  Panel,
  SampleNotice,
  StatCard,
  StatusBadge,
  Timeline,
} from "@/components/app/kit";
import { RowActions } from "@/components/app/RowActions";
import { useCollection, useStore } from "@/lib/store";
import { TODAY, addDays, type Row } from "@/lib/mock";
import { fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/absence")({
  head: pageHead("Long Absence Tracking", "Monitor long-absent students and record follow-ups."),
  component: Absence,
});

const STATUSES = ["Monitoring", "Contact Required", "Follow-up Scheduled", "Returned", "Resolved"];

function Absence() {
  const ab = useCollection("absences", "id");
  const { settings, setSettings } = useStore();
  const [detail, setDetail] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [next, setNext] = useState(addDays(TODAY, 2));
  const [resolve, setResolve] = useState<Row | null>(null);
  const t = settings.absenceThreshold;
  const rows = ab.rows.filter((r) => r.days >= t || ["Returned", "Resolved"].includes(r.status));
  const d = ab.rows.find((r) => r.id === detail) ?? null;

  const log = (r: Row, text: string, patch: Row = {}) =>
    ab.update(r.id, (x) => ({
      ...x,
      ...patch,
      lastFollowUp: TODAY,
      history: [...x.history, { date: TODAY, note: text, by: "Admin Office" }],
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Long Absence Tracking"
        description="Students absent beyond the sample threshold and their follow-ups."
      />
      <SampleNotice>
        Sample data only — absence counts below are illustrative and are not calculated from real
        attendance records.
      </SampleNotice>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Currently Long-Absent"
          value={rows.filter((r) => r.studentStatus === "Absent").length}
          icon={UserX}
          tone="danger"
        />
        <StatCard
          label="Newly Flagged (7 days)"
          value={
            rows.filter((r) => r.flaggedOn >= addDays(TODAY, -7) && r.studentStatus === "Absent")
              .length
          }
          icon={Flag}
          tone="warning"
        />
        <StatCard
          label="Follow-ups Due"
          value={
            rows.filter(
              (r) => r.nextFollowUp <= TODAY && !["Returned", "Resolved"].includes(r.status),
            ).length
          }
          icon={CalendarClock}
        />
        <StatCard
          label="Returned to Class"
          value={rows.filter((r) => r.studentStatus === "Attending").length}
          icon={UserCheck}
          tone="success"
        />
      </div>
      <Panel title="Sample Long-Absence Threshold">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="th" className="text-xs">
              Consecutive absent days (sample setting)
            </Label>
            <Input
              id="th"
              type="number"
              min={1}
              max={60}
              value={t}
              onChange={(e) =>
                setSettings({ ...settings, absenceThreshold: Math.max(1, +e.target.value || 1) })
              }
              className="h-9 w-28"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Students with {t}+ consecutive absent days are listed below.
          </p>
        </div>
      </Panel>
      <DataTable
        rows={rows}
        searchKeys={["name", "regNo"]}
        onRowClick={(r) => setDetail(r.id)}
        filters={[
          { key: "status", label: "Follow-up Statuses", options: STATUSES },
          { key: "studentStatus", label: "Student Statuses", options: ["Absent", "Attending"] },
        ]}
        columns={[
          {
            key: "name",
            label: "Student",
            render: (r) => (
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{r.regNo}</p>
              </div>
            ),
          },
          { key: "course", label: "Course" },
          { key: "batch", label: "Batch" },
          {
            key: "lastAttendance",
            label: "Last Attended",
            render: (r) => fmtDate(r.lastAttendance),
          },
          {
            key: "days",
            label: "Absent Days",
            render: (r) => (
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-destructive">
                {r.days >= 14 && <AlertTriangle className="h-3.5 w-3.5" />}
                {r.days}
              </span>
            ),
          },
          {
            key: "guardianMobile",
            label: "Guardian Contact",
            render: (r) => <span className="font-mono text-xs">{r.guardianMobile}</span>,
          },
          { key: "lastFollowUp", label: "Last Follow-up", render: (r) => fmtDate(r.lastFollowUp) },
          {
            key: "nextFollowUp",
            label: "Next Follow-up",
            render: (r) => (
              <span
                className={
                  r.nextFollowUp <= TODAY && !["Returned", "Resolved"].includes(r.status)
                    ? "font-medium text-destructive"
                    : ""
                }
              >
                {fmtDate(r.nextFollowUp)}
              </span>
            ),
          },
          {
            key: "status",
            label: "Follow-up Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "studentStatus",
            label: "Student",
            render: (r) => <StatusBadge status={r.studentStatus} />,
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <RowActions
                actions={[
                  { label: "View Details", icon: Eye, onClick: () => setDetail(r.id) },
                  {
                    label: "Mark Contacted",
                    icon: Phone,
                    hidden: r.status === "Resolved",
                    onClick: () => {
                      log(r, "Guardian contacted by phone.", { status: "Monitoring" });
                      toast.success(`${r.name} marked contacted`);
                    },
                  },
                  {
                    label: "Mark Returned",
                    icon: UserCheck,
                    hidden: r.studentStatus === "Attending",
                    onClick: () => {
                      log(r, "Student returned to class.", {
                        status: "Returned",
                        studentStatus: "Attending",
                        returnDate: TODAY,
                      });
                      toast.success(`${r.name} returned to class`);
                    },
                  },
                  {
                    label: "Resolve Case",
                    icon: CheckCircle2,
                    hidden: r.status === "Resolved",
                    separator: true,
                    onClick: () => setResolve(r),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <Dialog open={!!d} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {d?.name} · Absence Case {d?.id}
            </DialogTitle>
          </DialogHeader>
          {d && (
            <div className="space-y-5">
              <KV
                items={[
                  ["Registration No", d.regNo],
                  ["Course / Batch", `${d.course} · ${d.batch}`],
                  ["Last Attendance", fmtDate(d.lastAttendance)],
                  ["Consecutive Absent Days", d.days],
                  ["Guardian Contact", d.guardianMobile],
                  ["Next Follow-up", fmtDate(d.nextFollowUp)],
                  ["Follow-up Status", <StatusBadge key="s" status={d.status} />],
                  ["Return-to-Class Date", fmtDate(d.returnDate)],
                ]}
              />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Absence timeline &amp; contact attempts
                </p>
                <Timeline items={d.history} />
              </div>
              {d.status !== "Resolved" && (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Record follow-up
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="nt" className="text-xs">
                      Follow-up note / remarks
                    </Label>
                    <Textarea
                      id="nt"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="nx" className="text-xs">
                        Next follow-up date
                      </Label>
                      <Input
                        id="nx"
                        type="date"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className="h-9 w-44"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!note.trim()) {
                          toast.error("Enter a follow-up note");
                          return;
                        }
                        log(d, note, { status: "Follow-up Scheduled", nextFollowUp: next });
                        setNote("");
                        toast.success("Follow-up recorded");
                      }}
                    >
                      Save Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        log(d, "Guardian contacted by phone.", { status: "Monitoring" });
                        toast.success("Marked contacted");
                      }}
                    >
                      <Phone className="mr-1.5 h-4 w-4" />
                      Mark Contacted
                    </Button>
                    <Button variant="outline" onClick={() => setResolve(d)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Resolve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!resolve}
        onOpenChange={(o) => !o && setResolve(null)}
        title="Resolve this case?"
        description={`Close the long-absence case for ${resolve?.name}. It will remain in history.`}
        confirmLabel="Resolve Case"
        onConfirm={() => {
          if (resolve) {
            log(resolve, "Case marked resolved.", {
              status: "Resolved",
              studentStatus: "Attending",
              returnDate: resolve.returnDate || TODAY,
            });
            toast.success("Case resolved");
          }
          setResolve(null);
        }}
      />
    </div>
  );
}
