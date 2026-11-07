import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, DataTable, FormDialog, KV, PageHeader, StatusBadge, type Field } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { useStudentPicker } from "@/lib/use-students";
import { COURSES, COURSE_OPTION_GROUPS, TODAY, type Row } from "@/lib/mock";
import { BATCH_CATEGORIES, batchCategory } from "@/lib/administration";
import { fmtDate, fmtINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/admissions")({
  head: pageHead("Admission Management", "Review, approve and enrol admission applications."),
  component: Admissions,
});

const DOCS: [string, string][] = [["photo", "Passport photos"], ["id", "Identity proof"], ["marksheet", "Mark sheets"], ["transfer", "Transfer certificate"]];

function Admissions() {
  const adm = useCollection("admissions", "appNo");
  const { data, settings } = useStore();
  const picker = useStudentPicker();
  const [form, setForm] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<{ row: Row; to: string } | null>(null);

  const fields: Field[] = [
    ...(form?.appNo ? [] : [{
      name: "student",
      label: "Student",
      type: "select" as const,
      options: picker.options,
      required: true,
      full: true,
    }, {
      name: "finalPayable",
      label: "Final Payable",
      type: "number" as const,
      required: true,
      validate: (value: number, all: Row) => Number(value) > 0 && Number(value) <= Number(all.fee)
        ? undefined
        : "Final payable must be greater than zero and no more than total fees",
    }]),
    { name: "course", label: "Course", type: "select", optionGroups: COURSE_OPTION_GROUPS, required: true },
    { name: "batch", label: "Track", type: "select", options: data.batches.map((b) => b.name), required: true },
    { name: "admissionDate", label: "Admission Date", type: "date", required: true },
    { name: "fee", label: "Total Fees", type: "number", required: true, validate: (value) => Number(value) > 0 ? undefined : "Enter a total fee greater than zero" },
  ];

  const save = (v: Row) => {
    const fee = Number(v.fee);
    const duration = COURSES.find((c) => c.name === v.course)?.duration;
    if (v.appNo) { adm.update(v.appNo, { ...v, fee, duration, discount: +v.discount || 0, paid: +v.paid || 0 }); toast.success("Application updated"); return; }
    const s = picker.resolve(v.student);
    const appNo = adm.nextId(`${settings.prefixes.application}-2026`);
    adm.add({ ...v, appNo, name: s.name, regNo: s.regNo, mobile: s.mobile, appDate: TODAY, startDate: TODAY, status: "Submitted", fee, duration, discount: fee - Number(v.finalPayable), paid: +v.paid || 0, dueDate: TODAY, docs: v.docs ?? {} });
    toast.success(`Application ${appNo} created`);
  };
  const setStatus = (r: Row, to: string) => { adm.update(r.appNo, { status: to }); toast.success(`${r.appNo} marked ${to}`); };

  return (
    <div className="space-y-6">
      <PageHeader title="Admission Management" description="Track every application from draft to enrolment."
        actions={<Button onClick={() => setForm({ admissionDate: TODAY, type: "Regular", status: "Submitted", discount: 0, paid: 0, docs: {} })}><Plus className="mr-1.5 h-4 w-4" />New Admission</Button>} />
      <DataTable rows={adm.rows} searchKeys={["appNo", "name", "regNo"]}
        onRowDoubleClick={setView}
        filters={[
          { key: "course", label: "Courses", optionGroups: COURSE_OPTION_GROUPS },
          { key: "batch", label: "Batches", options: BATCH_CATEGORIES, match: (r, v) => batchCategory(r.batch, data.batches) === v },
        ]}
        columns={[
          { key: "appNo", label: "Application No", render: (r) => <span className="font-mono text-xs">{r.appNo}</span> },
          { key: "name", label: "Student", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "regNo", label: "Admission Number", render: (r) => <span className="font-mono text-xs">{r.regNo}</span> },
          { key: "course", label: "Course" },
          { key: "batch", label: "Batch", render: (r) => batchCategory(r.batch, data.batches) },
          { key: "appDate", label: "Applied", render: (r) => fmtDate(r.appDate) },
        ]} />

      <FormDialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title={form?.appNo ? `Edit ${form.appNo}` : "New Admission Application"} wide enterMovesNext fields={fields} initial={form ?? {}} onSubmit={save}>
        {(v) => {
          const fee = Number(v.fee) || 0;
          const payable = Number(v.finalPayable) || 0;
          const balance = Math.max(0, fee - payable);
          return (
            <div className="grid gap-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Fee summary</p>
                <KV items={[["Course Duration", COURSES.find((c) => c.name === v.course)?.duration], ["Total Fees", fmtINR(fee)], ["Final Payable", fmtINR(payable)]]} />
                <div className="mt-3 flex items-center justify-between rounded-md border bg-background px-3 py-2.5">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Balance Amount</span>
                  <span className="font-mono text-base font-semibold">{fmtINR(balance)}</span>
                </div>
              </div>
            </div>
          );
        }}
      </FormDialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Application {view?.appNo}</DialogTitle></DialogHeader>
          {view && <>
            <KV items={[["Student", view.name], ["Registration No.", view.regNo], ["Course", view.course], ["Batch", view.batch], ["Admission Date", fmtDate(view.admissionDate)], ["Admission Type", view.type], ["Duration", view.duration], ["Status", <StatusBadge key="s" status={view.status} />], ["Course Fees", fmtINR(view.fee)], ["Discount", fmtINR(view.discount)], ["Paid", fmtINR(view.paid)], ["Balance", fmtINR(view.fee - view.discount - view.paid)]]} />
            <div className="flex flex-wrap gap-2 border-t pt-3 text-xs">{DOCS.map(([k, l]) => <span key={k} className={view.docs?.[k] ? "status-badge status-success" : "status-badge status-danger"}>{l}</span>)}</div>
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button variant="outline" onClick={() => { setForm(view); setView(null); }}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
              {["Submitted", "Under Review", "Draft"].includes(view.status) && <Button onClick={() => { setConfirm({ row: view, to: "Approved" }); setView(null); }}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve</Button>}
              {!["Rejected", "Enrolled"].includes(view.status) && <Button variant="destructive" onClick={() => { setConfirm({ row: view, to: "Rejected" }); setView(null); }}><XCircle className="mr-1.5 h-4 w-4" />Reject</Button>}
              {view.status === "Approved" && <Button onClick={() => { setConfirm({ row: view, to: "Enrolled" }); setView(null); }}><GraduationCap className="mr-1.5 h-4 w-4" />Mark Enrolled</Button>}
            </div>
          </>}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} destructive={confirm?.to === "Rejected"} title={`Mark application as ${confirm?.to}?`}
        description={`${confirm?.row.name} · ${confirm?.row.appNo}`} confirmLabel={confirm?.to} onConfirm={() => setStatus(confirm!.row, confirm!.to)} />
    </div>
  );
}
