import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Plus,
  Printer,
  Receipt,
  Wallet,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DataTable,
  DocSheet,
  FormDialog,
  KV,
  PageHeader,
  PrintDialog,
  StatCard,
  StatusBadge,
  type Field,
} from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { COURSE_OPTION_GROUPS, COURSES, TODAY, feeStatus, type Row } from "@/lib/mock";
import { exportCSV, fmtDate, fmtINR } from "@/lib/format";
import { feeTotals, paymentError } from "@/lib/administration";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/fees")({
  head: pageHead(
    "Course Fees",
    "View course fee structures, record payments and print student receipts.",
  ),
  component: Page,
});

function Page() {
  const { data, settings } = useStore();
  const admissions = useCollection("admissions", "appNo");
  const payments = useCollection("payments", "receiptNo");
  const [tab, setTab] = useState("balances");
  const [form, setForm] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);
  const [receipt, setReceipt] = useState<Row | null>(null);
  const totals = feeTotals(admissions.rows);
  const selected = (label: string) =>
    admissions.rows.find((a) => `${a.name} (${a.appNo})` === label);
  const fields: Field[] = [
    {
      name: "student",
      label: "Student / Admission",
      type: "select",
      options: admissions.rows.map((a) => `${a.name} (${a.appNo})`),
      required: true,
      full: true,
    },
    { name: "date", label: "Payment Date", type: "date", required: true },
    {
      name: "amount",
      label: "Payment Amount (₹)",
      type: "number",
      required: true,
      validate: (v, all) => {
        const a = selected(all.student);
        return a ? paymentError(Number(v), a.fee - a.discount - a.paid) : "Select an admission";
      },
    },
    {
      name: "method",
      label: "Payment Method",
      type: "select",
      options: ["Cash", "UPI", "Card", "Bank Transfer"],
      required: true,
    },
    { name: "reference", label: "Transaction Reference" },
    {
      name: "component",
      label: "Fee Component",
      type: "select",
      options: ["Registration Fee", "Admission Fee", "Tuition Fee", "Exam Fee", "Other Fee"],
      required: true,
    },
    {
      name: "installment",
      label: "Installment No",
      type: "number",
      required: true,
      validate: (v) =>
        Number.isInteger(Number(v)) && Number(v) > 0 ? undefined : "Enter a positive whole number",
    },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ];
  const newPayment = (a?: Row) =>
    setForm({
      student: a ? `${a.name} (${a.appNo})` : "",
      date: TODAY,
      method: "Cash",
      component: "Tuition Fee",
      installment: 1,
    });
  const save = (v: Row) => {
    const a = selected(v.student);
    if (!a) return;
    const error = paymentError(Number(v.amount), a.fee - a.discount - a.paid);
    if (error) {
      toast.error(error);
      return;
    }
    const r = {
      ...v,
      receiptNo: payments.nextId("RCP"),
      appNo: a.appNo,
      name: a.name,
      regNo: a.regNo,
      amount: Number(v.amount),
      verified: true,
    };
    payments.add(r);
    admissions.update(a.appNo, { paid: Number(a.paid) + r.amount });
    setReceipt(r);
    toast.success("Payment recorded");
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Fees"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                exportCSV(
                  "course-fees.csv",
                  tab === "payments"
                    ? payments.rows
                    : tab === "structures"
                      ? COURSES
                      : admissions.rows.map((a) => ({
                          ...a,
                          balance: a.fee - a.discount - a.paid,
                          feeStatus: feeStatus(a),
                        })),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => newPayment()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Record Payment
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Payable" value={fmtINR(totals.payable)} icon={CircleDollarSign} />
        <StatCard
          label="Fees Collected"
          value={fmtINR(totals.paid)}
          icon={Receipt}
          tone="success"
        />
        <StatCard
          label="Outstanding Balance"
          value={fmtINR(totals.outstanding)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Overdue Students"
          value={admissions.rows.filter((a) => feeStatus(a) === "Overdue").length}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-fit flex-wrap">
          <TabsTrigger value="balances">Student Balances</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "balances" && (
        <DataTable
          rows={admissions.rows}
          searchKeys={["name", "appNo", "regNo"]}
          onRowDoubleClick={setView}
          filters={[
            { key: "course", label: "Courses", optionGroups: COURSE_OPTION_GROUPS },
            {
              key: "feeStatus",
              label: "Fee Status",
              options: ["Paid", "Partially Paid", "Unpaid", "Overdue"],
              match: (r, v) => feeStatus(r) === v,
            },
          ]}
          columns={[
            { key: "appNo", label: "Application No" },
            { key: "name", label: "Student" },
            { key: "course", label: "Course" },
            { key: "fee", label: "Course Fee", render: (r) => fmtINR(r.fee) },
            { key: "paid", label: "Paid", render: (r) => fmtINR(r.paid) },
            {
              key: "balance",
              label: "Balance",
              render: (r) => fmtINR(r.fee - r.discount - r.paid),
            },
            { key: "dueDate", label: "Due Date", render: (r) => fmtDate(r.dueDate) },
            {
              key: "status",
              label: "Fee Status",
              render: (r) => <StatusBadge status={feeStatus(r)} />,
            },
          ]}
        />
      )}
      {tab === "payments" && (
        <DataTable
          rows={payments.rows}
          searchKeys={["receiptNo", "name", "regNo", "reference"]}
          filters={[
            { key: "method", label: "Methods", options: ["Cash", "UPI", "Card", "Bank Transfer"] },
          ]}
          columns={[
            { key: "receiptNo", label: "Receipt No" },
            { key: "name", label: "Student" },
            { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
            { key: "amount", label: "Amount", render: (r) => fmtINR(r.amount) },
            { key: "method", label: "Method" },
            { key: "component", label: "Component" },
            { key: "reference", label: "Reference" },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Print receipt ${r.receiptNo}`}
                  onClick={() => setReceipt(r)}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      )}
      {tab === "structures" && (
        <DataTable
          rows={COURSES}
          searchKeys={["code", "name"]}
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Course" },
            { key: "duration", label: "Duration" },
            ...["registration", "admission", "tuition", "exam", "other", "total"].map((key) => ({
              key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              render: (r: Row) => fmtINR(r[key]),
            })),
            {
              key: "installments",
              label: "Installments",
              render: (r) => (r.installments ? "Allowed" : "Not Allowed"),
            },
          ]}
        />
      )}
      <FormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        title="Record Fee Payment"
        fields={fields}
        initial={form ?? {}}
        onSubmit={save}
        submitLabel="Record Payment"
        wide
        enterMovesNext
      >
        {(v) => {
          const a = selected(v.student);
          return a ? (
            <KV
              items={[
                ["Final Payable", fmtINR(a.fee - a.discount)],
                ["Outstanding Balance", fmtINR(a.fee - a.discount - a.paid)],
              ]}
            />
          ) : null;
        }}
      </FormDialog>
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fee Details · {view?.name}</DialogTitle>
          </DialogHeader>
          {view && (
            <>
              <KV
                items={[
                  ["Application No", view.appNo],
                  ["Course", view.course],
                  ["Course Fee", fmtINR(view.fee)],
                  ["Paid", fmtINR(view.paid)],
                  ["Balance", fmtINR(view.fee - view.discount - view.paid)],
                ]}
              />
              <Button
                onClick={() => {
                  setView(null);
                  newPayment(view);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Record Payment
              </Button>
              <h3 className="border-t pt-3 text-sm font-semibold">Payment History</h3>
              <ul className="divide-y">
                {data.payments
                  .filter((p) => p.appNo === view.appNo)
                  .map((p) => (
                    <li
                      key={p.receiptNo}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span>
                        {p.receiptNo} · {fmtDate(p.date)} · {fmtINR(p.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Print receipt ${p.receiptNo}`}
                        onClick={() => {
                          setView(null);
                          setReceipt(p);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
      <PrintDialog
        open={!!receipt}
        onOpenChange={(o) => !o && setReceipt(null)}
        title="Fee Payment Receipt"
      >
        {receipt && (
          <DocSheet
            institution={settings.institution}
            title="Fee Payment Receipt"
            number={receipt.receiptNo}
          >
            <KV
              items={[
                ["Student", receipt.name],
                ["Registration No", receipt.regNo],
                ["Application No", receipt.appNo],
                ["Payment Date", fmtDate(receipt.date)],
                ["Amount Received", fmtINR(receipt.amount)],
                ["Payment Method", receipt.method],
                ["Fee Component", receipt.component],
                ["Installment", receipt.installment],
                ["Reference", receipt.reference],
                ["Remarks", receipt.remarks],
              ]}
            />
          </DocSheet>
        )}
      </PrintDialog>
    </div>
  );
}
