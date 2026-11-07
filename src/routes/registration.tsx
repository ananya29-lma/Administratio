import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Printer,
  Trash2,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ConfirmDialog,
  DataTable,
  DocSheet,
  KV,
  PageHeader,
  Panel,
  PrintDialog,
  type Field,
} from "@/components/app/kit";
import { useCollection, useStore } from "@/lib/store";
import { COURSE_OPTION_GROUPS, TODAY, type Row } from "@/lib/mock";
import { fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/registration")({
  head: pageHead("Application Form", "Complete and manage student application forms."),
  component: Registration,
});

function useSections(): { title: string; fields: Field[] }[] {
  return [
    {
      title: "Personal Details",
      fields: [
        { name: "regNo", label: "Application No.", readOnly: true },
        { name: "regDate", label: "Application Date", type: "date", required: true },
        { name: "name", label: "Student Full Name", required: true },
        {
          name: "dob",
          label: "Date of Birth",
          type: "date",
          required: true,
          validate: (v) =>
            v && v > "2012-01-01" ? "Student must be at least 14 years old" : undefined,
        },
        {
          name: "gender",
          label: "Gender",
          type: "select",
          options: ["Male", "Female", "Other"],
          required: true,
        },
        { name: "mobile", label: "Mobile Number", type: "tel", required: true },
        { name: "email", label: "Email Address", type: "email", required: true },
        { name: "address", label: "Residential Address", type: "textarea", required: true },
      ],
    },
    {
      title: "Guardian Details",
      fields: [
        { name: "guardian", label: "Guardian Full Name", required: true },
        {
          name: "guardianRelationship",
          label: "Relationship to Student",
          type: "select",
          options: ["Father", "Mother", "Guardian", "Other"],
          required: true,
        },
        { name: "guardianMobile", label: "Guardian Contact Number", type: "tel", required: true },
      ],
    },
    {
      title: "Educational Qualification / Work Experience",
      fields: [
        {
          name: "qualification",
          label: "Qualification / Role",
          type: "select",
          options: [
            "10th Standard",
            "12th Standard",
            "Diploma",
            "B.Com",
            "B.Sc Computer Science",
            "BCA",
            "B.A English",
            "MBA",
            "Other",
          ],
          required: true,
        },
        { name: "prevInstitution", label: "Institution / Company" },
        { name: "qualificationYear", label: "Year of Passing", type: "number" },
        { name: "gradePercent", label: "Grade %", type: "number" },
      ],
    },
    {
      title: "Lead Source & Reference",
      fields: [
        {
          name: "source",
          label: "How did you hear about us?",
          type: "select",
          options: [
            "Walk-in",
            "Website",
            "Social Media",
            "Friend Referral",
            "Newspaper Ad",
            "Alumni",
            "Other",
          ],
          required: true,
        },
      ],
    },
    {
      title: "Course Preference",
      fields: [
        {
          name: "course",
          label: "Course Applied For",
          type: "select",
          optionGroups: COURSE_OPTION_GROUPS,
          required: true,
        },
        {
          name: "feePlanPreferred",
          label: "Fee Plan Preferred",
          type: "select",
          options: ["Full Payment", "Installment"],
        },
        {
          name: "preferredInstallments",
          label: "Preferred Number of Installments",
          type: "number",
        },
      ],
    },
    {
      title: "Documents Enclosed",
      fields: [
        { name: "photoEnclosed", label: "Passport-size photographs", type: "checkbox" },
        { name: "idEnclosed", label: "ID proof", type: "checkbox" },
        {
          name: "qualificationEnclosed",
          label: "Latest mark sheet",
          type: "checkbox",
        },
        { name: "transferEnclosed", label: "Transfer certificate", type: "checkbox" },
      ],
    },
    {
      title: "Declaration",
      fields: [
        {
          name: "declarationAccepted",
          label: "I declare that the information and documents provided are true and complete.",
          type: "checkbox",
        },
        { name: "declarationDate", label: "Declaration Date", type: "date" },
      ],
    },
    {
      title: "Student / Guardian / Counsellor Signatures",
      fields: [
        { name: "studentSignature", label: "Student Signature (type full name)", required: true },
        { name: "studentSignatureDate", label: "Student Signature Date", type: "date" },
        { name: "guardianSignature", label: "Guardian Signature (type full name)" },
        { name: "guardianSignatureDate", label: "Guardian Signature Date", type: "date" },
        { name: "counsellorSignature", label: "Counsellor Name / Signature" },
        { name: "counsellorSignatureDate", label: "Counsellor Date", type: "date" },
      ],
    },
    {
      title: "Administrator / Accountant Verification",
      fields: [
        {
          name: "administratorVerified",
          label: "Administrator verification complete",
          type: "checkbox",
        },
        { name: "administratorName", label: "Administrator Name" },
        { name: "administratorDate", label: "Administrator Verification Date", type: "date" },
        { name: "accountantVerified", label: "Accountant verification complete", type: "checkbox" },
        { name: "accountantName", label: "Accountant Name" },
        { name: "accountantDate", label: "Accountant Verification Date", type: "date" },
      ],
    },
  ];
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value ? String(value) : "—";
}

function downloadApplicationPdf(row: Row, sections: { title: string; fields: Field[] }[]) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 16;
  const right = pageWidth - left;
  let y = 18;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 16) {
      pdf.addPage();
      y = 18;
    }
  };

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Application Form", left, y);
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Application No.: ${row.regNo ?? "—"}     Status: ${row.status ?? "Draft"}`, left, y);
  y += 9;

  sections.forEach((section) => {
    ensureSpace(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(section.title, left, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    section.fields.forEach((field) => {
      const text = pdf.splitTextToSize(
        `${field.label}: ${displayValue(row[field.name])}`,
        right - left,
      );
      ensureSpace(text.length * 4.5 + 2);
      pdf.text(text, left, y);
      y += text.length * 4.5 + 2;
    });
    y += 2;
  });

  pdf.save(`student-application-${row.regNo ?? "draft"}.pdf`);
}

function Registration() {
  const students = useCollection("students", "regNo");
  const { settings } = useStore();
  const sections = useSections();
  const [view, setView] = useState<Row | null>(null);
  const [printRecord, setPrintRecord] = useState<Row | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const printItems = (row: Row) =>
    sections.flatMap((section) =>
      section.fields.map(
        (field) => [field.label, displayValue(row[field.name])] as [string, string],
      ),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Form"
        description="Complete the application form. Required fields are marked *."
      />
      <Panel title="Application" className="p-0">
        <DataTable
          rows={students.rows}
          searchKeys={["regNo", "name", "mobile", "email"]}
          onRowDoubleClick={setView}
          filters={[{ key: "course", label: "Courses", optionGroups: COURSE_OPTION_GROUPS }]}
          columns={[
            {
              key: "regNo",
              label: "Application No.",
              render: (row) => <span className="font-mono text-xs">{row.regNo}</span>,
            },
            {
              key: "name",
              label: "Student",
              render: (row) => <span className="font-medium">{row.name}</span>,
            },
            { key: "mobile", label: "Mobile" },
            { key: "course", label: "Course" },
            { key: "feePlanPreferred", label: "Fee Plan Preferred" },
            { key: "regDate", label: "Applied", render: (row) => fmtDate(row.regDate) },
          ]}
        />
      </Panel>

      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {view?.name} · Application {view?.regNo}
            </DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-5">
              {sections.map((section) => (
                <section key={section.title} className="space-y-2 border-b pb-4 last:border-0">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <KV
                    items={section.fields.map((field) => [
                      field.label,
                      displayValue(view[field.name]),
                    ])}
                    cols={3}
                  />
                </section>
              ))}
              <KV items={[["Application Status", view.status ?? "Registered"]]} />
              <div className="flex justify-end gap-2">
                <Button variant="destructive" onClick={() => { setDel(view); setView(null); }}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setPrintRecord(view)}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print
                </Button>
                <Button onClick={() => downloadApplicationPdf(view, sections)}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PrintDialog
        open={!!printRecord}
        onOpenChange={(open) => !open && setPrintRecord(null)}
        title="Application Form"
      >
        {printRecord && (
          <DocSheet
            institution={settings.institution}
            title="Application Form"
            number={printRecord.regNo}
          >
            <KV
              items={[
                ["Application Status", printRecord.status ?? "Registered"],
                ...printItems(printRecord),
              ]}
              cols={2}
            />
          </DocSheet>
        )}
      </PrintDialog>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(open) => !open && setDel(null)}
        destructive
        title="Delete registration?"
        confirmLabel="Delete"
        description={`This removes ${del?.name} (${del?.regNo}) from the registration list.`}
        onConfirm={() => {
          students.remove(del!.regNo);
          toast.success("Registration deleted");
        }}
      />
    </div>
  );
}
