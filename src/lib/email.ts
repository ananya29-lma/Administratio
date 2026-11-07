import { fmtINR } from "@/lib/format";

/** Build a mailto draft URL for the user's configured mail application. */
export function emailDraftHref(email: string, subject: string, body: string) {
  const recipient = email.trim();
  if (!recipient) return "";
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function instituteVisitDraft(
  student: { name: string; email: string },
  visitDate: string,
  visitTime: string,
  institution: string,
  address: string,
) {
  const subject = "Institute Visit Scheduled";
  const body = `Dear ${student.name || "Student"},\n\nYour visit to ${institution} has been scheduled for ${visitDate} at ${visitTime}.\n\n${address ? `Institute address: ${address}\n\n` : ""}Please contact the Administration Department if you need to make any changes.\n\nRegards,\nAdministration Department`;
  return {
    subject,
    body,
    href: emailDraftHref(student.email, subject, body),
  };
}

export function feeReminderDraft(
  student: {
    name: string;
    email: string;
    admissionNo: string;
    course: string;
  },
  monthLabel: string,
  monthlyDue: number,
  amountPaid: number,
  eligible: boolean,
) {
  const outstanding = Math.max(0, monthlyDue - amountPaid);
  const paymentStatus = eligible ? "Paid in full" : amountPaid > 0 ? "Partially paid" : "Pending";
  const subject =
    outstanding > 0
      ? `Fee reminder · ${student.course}`
      : `Fee payment confirmation · ${student.course}`;
  const body =
    outstanding > 0
      ? `Dear ${student.name || "Student"},\n\nThis is a courteous reminder about your ${student.course} fee for ${monthLabel}.\n\nAdmission number: ${student.admissionNo || "Not available"}\nMonthly amount due: ${fmtINR(monthlyDue)}\nAmount paid: ${fmtINR(amountPaid)}\nOutstanding amount: ${fmtINR(outstanding)}\nPayment status: ${paymentStatus}\n\nPlease complete the outstanding payment at your earliest convenience. If you have already paid, please contact the Administration office so we can verify it.\n\nRegards,\nAdministration`
      : `Dear ${student.name || "Student"},\n\nWe have verified your ${student.course} fee payment for ${monthLabel}.\n\nAdmission number: ${student.admissionNo || "Not available"}\nAmount paid: ${fmtINR(amountPaid)}\nPayment status: ${paymentStatus}\n\nThank you.\n\nRegards,\nAdministration`;
  return {
    subject,
    body,
    href: emailDraftHref(student.email, subject, body),
    outstanding,
    paymentStatus,
  };
}
