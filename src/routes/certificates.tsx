import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, Clock, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, DocSheet, KV, PageHeader, PrintDialog, StatCard, StatusBadge } from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { CERT_STATUSES, TODAY, feeStatus, type Row } from "@/lib/mock";
import { exportCSV, fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/certificates")({
  head: pageHead("Certificate Applications", "Review certificate applications, document verification, fee clearance and collection."),
  component: Page,
});

function Page() {
  const certs = useCollection("certs");
  const { settings, data } = useStore();
  const [view, setView] = useState<Row | null>(null);
  const [print, setPrint] = useState<Row | null>(null);
  const setStatus = (r: Row, status: string) => {
    certs.update(r.id, { status });
    setView({ ...r, status });
    toast.success(status === "Approved" ? "Certificate application approved" : "Certificate application marked pending");
  };
  const currentFees = (r: Row) => { const a = data.admissions.find((a) => a.appNo === r.appNo); return a ? feeStatus(a) === "Paid" ? "Cleared" : "Pending" : r.feeStatus; };
  return (
    <div className="space-y-6">
      <PageHeader title="Certificate Applications" actions={<Button variant="outline" onClick={() => exportCSV("certificate-applications.csv", certs.rows)}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard label="Total Applications" value={certs.rows.length} icon={Award} /><StatCard label="Pending Applications" value={certs.rows.filter((r) => !["Issued", "Rejected"].includes(r.status)).length} icon={Clock} tone="warning" /><StatCard label="Ready for Collection" value={certs.rows.filter((r) => r.status === "Ready for Collection").length} icon={CheckCircle2} tone="success" /><StatCard label="Issued Certificates" value={certs.rows.filter((r) => r.status === "Issued").length} icon={Award} tone="success" /></div>
      <DataTable rows={certs.rows} searchKeys={["id", "name", "regNo"]} onRowClick={setView} filters={[{ key: "type", label: "Certificate Types", options: settings.certTypes }, { key: "status", label: "Statuses", options: CERT_STATUSES }]} columns={[
        { key: "id", label: "Application No" }, { key: "name", label: "Student" }, { key: "regNo", label: "Reg. No" }, { key: "type", label: "Certificate Type" }, { key: "date", label: "Applied", render: (r) => fmtDate(r.date) }, { key: "verification", label: "Verification", render: (r) => <StatusBadge status={r.verification} /> }, { key: "feeStatus", label: "Fee Clearance", render: (r) => <StatusBadge status={currentFees(r)} /> }, { key: "expected", label: "Expected Date", render: (r) => fmtDate(r.expected) }, { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]} />
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Certificate Application {view?.id}</DialogTitle></DialogHeader>{view && <><KV items={[["Student", view.name], ["Registration No", view.regNo], ["Course", view.course], ["Batch", view.batch], ["Certificate Type", view.type], ["Purpose", view.purpose], ["Course Completion", view.completion], ["Fee Clearance", currentFees(view)], ["Verification", view.verification], ["Processing Staff", view.staff], ["Expected Date", fmtDate(view.expected)], ["Delivery", view.delivery], ["Contact Number", view.mobile], ["Status", <StatusBadge status={view.status} />], ["Remarks", view.remarks]]} /><div className="flex justify-end gap-2">{["Approved", "Ready for Collection"].includes(view.status) && <Button variant="outline" onClick={() => { certs.update(view.id, { status: "Issued", issued: TODAY }); setView({ ...view, status: "Issued", issued: TODAY }); toast.success("Certificate marked issued"); }}><CheckCircle2 className="mr-1.5 h-4 w-4" />Mark Issued</Button>}<Button variant="outline" onClick={() => { setPrint(view); setView(null); }}><Printer className="mr-1.5 h-4 w-4" />Print</Button><Button variant="outline" disabled={view.status === "Approved"} onClick={() => setStatus(view, "Approved")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve</Button><Button disabled={view.status === "Pending"} onClick={() => setStatus(view, "Pending")}><Clock className="mr-1.5 h-4 w-4" />Pending</Button></div></>}</DialogContent></Dialog>
      <PrintDialog open={!!print} onOpenChange={(o) => !o && setPrint(null)} title="Certificate Application">{print && <DocSheet institution={settings.institution} title="Certificate Application" number={print.id}><KV items={[["Student", print.name], ["Registration No", print.regNo], ["Course", print.course], ["Certificate Type", print.type], ["Purpose", print.purpose], ["Application Date", fmtDate(print.date)], ["Delivery", print.delivery], ["Status", print.status], ["Expected Date", fmtDate(print.expected)], ["Processing Staff", print.staff]]} /></DocSheet>}</PrintDialog>
    </div>
  );
}
