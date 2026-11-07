const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} ${MON[+m - 1]} ${y}`;
};
export const fmtINR = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export const finalPayable = (total: number, discount: number) => total - discount;
export const outstanding = (total: number, discount: number, paid: number) => finalPayable(total, discount) - paid;

export function exportCSV(filename: string, rows: Record<string, any>[], cols?: { key: string; label: string }[]) {
  if (!rows.length) return;
  const c = cols ?? Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== "object").map((k) => ({ key: k, label: k }));
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [c.map((x) => esc(x.label)).join(","), ...rows.map((r) => c.map((x) => esc(r[x.key])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
