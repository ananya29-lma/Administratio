import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, FormDialog, KV, PageHeader, StatCard, StatusBadge, type Field } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { useStudentPicker } from "@/lib/use-students";
import { TODAY, type Row } from "@/lib/mock";
import { daysBetween, fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/leave")({
  head: pageHead("Leave Approvals", "Review, approve and reject student leave requests."),
  component: Leave,
});

function Leave() {
  const lv = useCollection("leaves", "id");
  const { settings } = useStore();
  const picker = useStudentPicker(true);
  const [tab, setTab] = useState("Pending");
  const [form, setForm] = useState<Row | null>(null);
  const [review, setReview] = useState<Row | null>(null);
  const [remarks, setRemarks] = useState("");

  const count = (s: string) => lv.rows.filter((r) => r.status === s).length;
  const rows = tab === "All" ? lv.rows : lv.rows.filter((r) => r.status === tab);

  const fields: Field[] = [
    { name: "id", label: "Leave Request No", readOnly: true },
    { name: "submitted", label: "Request Submission Date", type: "date", required: true },
    { name: "student", label: "Student", type: "select", options: picker.options, required: true, full: true },
    { name: "start", label: "Leave Start Date", type: "date", required: true },
    { name: "end", label: "Leave End Date", type: "date", required: true, validate: (v, all) => (v && all.start && v < all.start ? "End date cannot be before start date" : undefined) },
    { name: "category", label: "Leave Category", type: "select", options: settings.leaveCategories, required: true },
    { name: "reason", label: "Reason for Leave", type: "textarea", required: true },
    { name: "remarks", label: "Administrative Remarks", type: "textarea" },
  ];

  const save = (v: Row) => {
    const s = picker.resolve(v.student);
    lv.add({ ...v, name: s.name, regNo: s.regNo, course: s.course, batch: s.batch, days: daysBetween(v.start, v.end), status: "Pending" });
    toast.success(`Leave request ${v.id} submitted`);
  };
  const decide = (to: "Approved" | "Rejected") => {
    if (!review) return;
    if (to === "Rejected" && !remarks.trim()) { toast.error("Add remarks before rejecting a request"); return; }
    lv.update(review.id, { status: to, remarks });
    toast.success(`${review.id} ${to.toLowerCase()} for ${review.name}`);
    setReview(null);
  };
  const open = (r: Row) => { setReview(r); setRemarks(r.remarks ?? ""); };

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Approvals" description="Review student leave requests and record decisions." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Requests" value={lv.rows.length} icon={CalendarCheck} />
        <StatCard label="Pending Requests" value={count("Pending")} icon={Clock} tone="warning" />
        <StatCard label="Approved Requests" value={count("Approved")} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected Requests" value={count("Rejected")} icon={XCircle} tone="danger" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>{["Pending", "Approved", "Rejected", "All"].map((t) => <TabsTrigger key={t} value={t}>{t === "All" ? "All Requests" : t} ({t === "All" ? lv.rows.length : count(t)})</TabsTrigger>)}</TabsList>
      </Tabs>
      <DataTable rows={rows} searchKeys={["id", "name", "regNo", "reason"]} onRowDoubleClick={open}
        filters={[{ key: "category", label: "Categories", options: settings.leaveCategories }]}
        emptyText={`No ${tab === "All" ? "" : tab.toLowerCase() + " "}leave requests`}
        columns={[
          { key: "id", label: "Request No", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "name", label: "Student", render: (r) => <div><p className="font-medium">{r.name}</p><p className="font-mono text-xs text-muted-foreground">{r.regNo}</p></div> },
          { key: "batch", label: "Batch" },
          { key: "start", label: "Leave Dates", render: (r) => `${fmtDate(r.start)} – ${fmtDate(r.end)}` },
          { key: "days", label: "Days", render: (r) => <span className="font-mono">{r.days}</span> },
          { key: "reason", label: "Reason" },
          { key: "submitted", label: "Submitted", render: (r) => fmtDate(r.submitted) },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />

      <FormDialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title="New Leave Request" wide enterMovesNext fields={fields} initial={form ?? {}} onSubmit={save} submitLabel="Submit Request">
        {(v) => v.start && v.end && v.end >= v.start ? <p className="rounded-md bg-muted p-3 text-sm">Total Leave Days: <span className="font-mono font-semibold">{daysBetween(v.start, v.end)}</span></p> : null}
      </FormDialog>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Leave Request {review?.id}</DialogTitle></DialogHeader>
          {review && <>
            <KV items={[["Student", review.name], ["Registration No", review.regNo], ["Course", review.course], ["Batch", review.batch], ["Leave Dates", `${fmtDate(review.start)} – ${fmtDate(review.end)}`], ["Total Days", review.days], ["Category", review.category], ["Submitted", fmtDate(review.submitted)], ["Reason", review.reason], ["Supporting Document", review.doc || "Not attached"], ["Status", <StatusBadge key="s" status={review.status} />]]} />
            <div className="space-y-1.5"><Label htmlFor="rm" className="text-xs">Administrative Remarks</Label><Textarea id="rm" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} readOnly={review.status !== "Pending"} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReview(null)}>Close</Button>
              {review.status === "Pending" && <>
                <Button variant="destructive" onClick={() => decide("Rejected")}><XCircle className="mr-1.5 h-4 w-4" />Reject</Button>
                <Button onClick={() => decide("Approved")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve</Button>
              </>}
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
