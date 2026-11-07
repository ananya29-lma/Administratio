import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, PageHeader } from "@/components/app/kit";
import { useStore } from "@/lib/store";
import { feeStatus, type Row } from "@/lib/mock";
import { fmtDate, fmtINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/student-records")({
  head: pageHead("Student Records", "Search student profiles and view saved admission records."),
  component: StudentRecords,
});

function StudentRecords() {
  const { data, saveCommittedStudentRecord } = useStore();
  const [profile, setProfile] = useState<Row | null>(null);
  const agreementInput = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => data.students.map((student) => {
    const admission = data.admissions.find((record) => record.regNo === student.regNo);
    const committedRecord = data.committedStudents.find((record) =>
      record.admissionNumber === admission?.appNo ||
      record.applicationNumber === student.regNo ||
      record.studentId === student.studentId,
    );
    return {
      ...student,
      ...(admission ?? {}),
      ...(committedRecord ?? {}),
      appNo: committedRecord?.admissionNumber ?? admission?.appNo,
      regNo: committedRecord?.applicationNumber ?? student.regNo,
      balance: committedRecord?.balance ?? (admission ? admission.fee - admission.discount - admission.paid : null),
      admissionStatus: admission?.status ?? "Not admitted",
      committedRecord,
    };
  }), [data.students, data.admissions, data.committedStudents]);

  const selectedStudent = profile
    ? rows.find((row) => row.regNo === profile.regNo) ?? profile
    : null;
  const studentProfile = selectedStudent?.committedRecord
    ? selectedStudent.committedRecord
    : selectedStudent;
  const initials = studentProfile?.name?.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part: string) => part[0]).join("").toUpperCase() || "?";
  const showValue = (value: unknown) => value === undefined || value === null || value === "" ? "Not provided" : value;
  const showDate = (value: unknown) => typeof value === "string" && value ? fmtDate(value) : "Not provided";
  const showMoney = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? fmtINR(value) : "Not provided";
  const fields = studentProfile ? [
    ["Full Name", showValue(studentProfile.name)],
    ["Admission Number", showValue(String(studentProfile.admissionNumber ?? studentProfile.appNo ?? "").replace(/^APP(?=-)/, "ADM"))],
    ["Date of Birth", showDate(studentProfile.dob)],
    ["Gender", showValue(studentProfile.gender)],
    ["Contact Number", showValue(studentProfile.mobile)],
    ["Email Address", showValue(studentProfile.email)],
    ["Address", showValue(studentProfile.address)],
    ["Guardian Name", showValue(studentProfile.guardian)],
    ["Guardian Contact Number", showValue(studentProfile.guardianMobile)],
    ["Qualification", showValue(studentProfile.qualification)],
    ["Course Name", showValue(studentProfile.course)],
    ["Admission Date", showDate(studentProfile.admissionDate)],
    ["Total Course Fees", showMoney(studentProfile.fee)],
  ] as [string, unknown][] : [];

  const uploadAgreement = (file?: File) => {
    if (!file || !selectedStudent || !studentProfile) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast.error("Choose a PDF or image file for the agreement");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Agreement files must be 2 MB or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read the selected agreement. Please try again.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Could not read the selected agreement. Please try again.");
        return;
      }
      try {
        const admissionNumber = studentProfile.admissionNumber ?? studentProfile.appNo;
        const applicationNumber = studentProfile.applicationNumber ?? studentProfile.regNo;
        saveCommittedStudentRecord({
          ...selectedStudent,
          ...(selectedStudent.committedRecord ?? {}),
          studentId: studentProfile.studentId ?? applicationNumber ?? studentProfile.regNo,
          admissionNumber,
          applicationNumber,
          agreement: {
            name: file.name,
            type: file.type,
            dataUrl: reader.result,
            uploadedAt: new Date().toISOString(),
          },
          balance: studentProfile.balance ?? (
            typeof studentProfile.fee === "number"
              ? studentProfile.fee - Number(studentProfile.discount ?? 0) - Number(studentProfile.paid ?? 0)
              : undefined
          ),
          feeStatus: studentProfile.feeStatus ?? (selectedStudent.admissionStatus !== "Not admitted" ? feeStatus(selectedStudent) : undefined),
          committedAt: new Date().toISOString(),
        });
        toast.success(`${studentProfile.name}'s agreement was saved`);
      } catch (error) {
        console.error("Failed to save student agreement", error);
        toast.error(error instanceof Error ? `Could not save agreement: ${error.message}` : "Could not save agreement. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Student Records" description="Find student profiles and view their committed records." />
      <DataTable
        rows={rows}
        searchKeys={["name", "applicationNumber", "regNo", "admissionNumber", "appNo"]}
        onRowClick={(row) => {
          setProfile(row);
        }}
        columns={[
          { key: "appNo", label: "Admission Number", render: (row) => <span className="font-mono text-xs">{row.appNo ? String(row.appNo).replace(/^APP(?=-)/, "ADM") : "Not provided"}</span> },
          { key: "name", label: "Student", render: (row) => <span className="font-medium">{row.name}</span> },
          { key: "mobile", label: "Contact", render: (row) => <span className="font-mono text-xs">{row.mobile}</span> },
          { key: "course", label: "Course" },
          { key: "balance", label: "Balance", render: (row) => row.balance === null ? "Not provided" : fmtINR(row.balance) },
        ]}
      />

      <Dialog open={!!studentProfile} onOpenChange={(open) => {
        if (!open) {
          setProfile(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          {studentProfile && <>
            <DialogHeader>
              <DialogTitle>{studentProfile.name || "Student Profile"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 border-t pt-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-3 md:items-start">
                <Avatar className="h-64 w-56 rounded-xl">
                  <AvatarFallback className="rounded-xl text-4xl font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{studentProfile.name || "Not provided"}</p>
                <input
                  ref={agreementInput}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  aria-label="Upload student agreement"
                  onChange={(event) => {
                    uploadAgreement(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => agreementInput.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />Upload Agreement
                </Button>
                {studentProfile.agreement?.dataUrl && (
                  <a
                    href={studentProfile.agreement.dataUrl}
                    download={studentProfile.agreement.name}
                    className="max-w-full truncate text-xs font-medium text-primary underline underline-offset-4"
                  >
                    {studentProfile.agreement.name}
                  </a>
                )}
                {selectedStudent.committedRecord && (
                  <p className="text-xs text-muted-foreground">
                    Saved {new Date(selectedStudent.committedRecord.committedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <section className="grid content-start grid-cols-1 gap-x-6 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <div key={label} className="border-b py-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </section>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button variant="outline" onClick={() => setProfile(null)}>Close</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
