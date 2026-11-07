import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Printer,
  Search,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Row } from "@/lib/mock";

/* ---------- Status badge ---------- */
const TONES: Record<string, string[]> = {
  success: [
    "Approved",
    "Approved for Exam",
    "Eligible",
    "Fee Paid",
    "Enrolled",
    "Paid",
    "Completed",
    "Accepted",
    "Active",
    "Returned",
    "Resolved",
    "Verified",
    "Cleared",
    "Attending",
  ],
  warning: [
    "Pending",
    "Pending Accountancy Verification",
    "Awaiting Approval",
    "Under Review",
    "Partially Paid",
    "Monitoring",
    "Follow-up Scheduled",
    "In Progress",
    "Under Verification",
    "Awaiting Fee Clearance",
    "Awaiting Student",
    "Out",
    "Medium",
    "Upcoming",
  ],
  danger: [
    "Rejected",
    "Fee Payment Pending",
    "Unpaid",
    "More Information Required",
    "Overdue",
    "Contact Required",
    "High",
    "Absent",
  ],
  info: ["Open", "Draft", "Low"],
};
export function StatusBadge({
  status,
  certificate = false,
  leave = false,
}: {
  status: string;
  certificate?: boolean;
  leave?: boolean;
}) {
  const certificateTone: Record<string, string> = {
    Approved: "approved",
    "Awaiting Documents": "awaiting-documents",
    "Ready for Collection": "ready-for-collection",
    Issued: "issued",
    Submitted: "submitted",
  };
  const leaveTone: Record<string, string> = {
    Pending: "leave-pending",
    Approved: "leave-approved",
    Rejected: "leave-rejected",
  };
  const defaultTone =
    Object.entries(TONES).find(([, statuses]) => statuses.includes(status))?.[0] ?? "neutral";
  const tone = certificate
    ? (certificateTone[status] ?? defaultTone)
    : leave
      ? (leaveTone[status] ?? defaultTone)
      : defaultTone;
  return <span className={cn("status-badge", `status-${tone}`)}>{status}</span>;
}

/* ---------- Page header & stat card ---------- */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  return (
    <div className="panel flex items-start justify-between p-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("stat-icon", `stat-icon-${tone}`)}>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "teal",
  change,
  flat = false,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "teal" | "green" | "orange" | "blue" | "red";
  change?: string;
  flat?: boolean;
}) {
  return (
    <article className={`es-metric es-tone-${tone}`}>
      <div className="es-metric-top">
        <span className="es-metric-icon">
          <Icon size={21} strokeWidth={2} />
        </span>
        {change && (
          <span className="es-metric-change">
            {flat ? <ArrowRight size={14} /> : <ArrowUpRight size={14} />}
            {change}
          </span>
        )}
      </div>
      <div className="es-metric-info">
        <p className="es-metric-value">{value}</p>
        <div className="es-metric-footer">
          <span>{label}</span>
        </div>
      </div>
    </article>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export interface OptionGroup {
  label: string;
  options: string[];
}

export function NativeSelect({
  value,
  onChange,
  options = [],
  optionGroups,
  optionLabels = {},
  optionStyles = {},
  placeholder,
  className,
  id,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  optionGroups?: OptionGroup[] | undefined;
  optionLabels?: Record<string, string> | undefined;
  optionStyles?: Record<string, CSSProperties> | undefined;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "data-enter-navigation"?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("native-select", className)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {optionGroups
        ? optionGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option} value={option} style={optionStyles[option]}>
                  {optionLabels[option] ?? option}
                </option>
              ))}
            </optgroup>
          ))
        : options.map((o) => (
            <option key={o} value={o} style={optionStyles[o]}>
              {optionLabels[o] ?? o}
            </option>
          ))}
    </select>
  );
}

/* ---------- Data table ---------- */
export interface Column {
  key: string;
  label: string;
  render?: (r: Row) => ReactNode;
  sortable?: boolean;
  className?: string;
}
export interface Filter {
  key: string;
  label: string;
  options?: string[];
  optionGroups?: OptionGroup[];
  match?: (r: Row, v: string) => boolean;
}

export function DataTable({
  rows,
  columns,
  searchKeys,
  filters = [],
  pageSize = 10,
  toolbar,
  filterToolbar,
  onRowClick,
  onRowDoubleClick,
  emptyText = "No records found",
}: {
  rows: Row[];
  columns: Column[];
  searchKeys?: string[];
  filters?: Filter[];
  pageSize?: number;
  toolbar?: ReactNode;
  filterToolbar?: ReactNode;
  onRowClick?: (r: Row) => void;
  onRowDoubleClick?: (r: Row) => void;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const searchableValues = useMemo(
    () =>
      searchKeys
        ? rows.map((row) => searchKeys.map((key) => String(row[key] ?? "").toLowerCase()))
        : [],
    [rows, searchKeys],
  );
  const filtered = useMemo(() => {
    let r = rows;
    if (q && searchKeys) {
      const s = q.toLowerCase();
      r = r.filter((_, index) => searchableValues[index].some((value) => value.includes(s)));
    }
    filters.forEach((f) => {
      const v = fv[f.key];
      if (v) r = r.filter((x) => (f.match ? f.match(x, v) : x[f.key] === v));
    });
    if (sort)
      r = [...r].sort(
        (a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir,
      );
    return r;
  }, [rows, q, fv, sort, searchKeys, filters, searchableValues]);
  useEffect(() => setPage(0), [q, fv]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center no-print">
        {searchKeys && (
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search table"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <NativeSelect
              key={f.key}
              aria-label={f.label}
              value={fv[f.key] ?? ""}
              onChange={(v) => setFv({ ...fv, [f.key]: v })}
              options={f.options ?? []}
              optionGroups={f.optionGroups}
              placeholder={`All ${f.label}`}
              className="h-9 w-auto"
            />
          ))}
          {filterToolbar}
        </div>
        {toolbar && <div className="flex gap-2 lg:ml-auto">{toolbar}</div>}
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.className}>
                  {c.sortable !== false && c.key !== "actions" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() =>
                        setSort(
                          sort?.key === c.key
                            ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 }
                            : { key: c.key, dir: 1 },
                        )
                      }
                    >
                      {c.label}
                      {sort?.key === c.key &&
                        (sort.dir === 1 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(r) : undefined}
                className={onRowClick || onRowDoubleClick ? "cursor-pointer" : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!view.length && (
          <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <Inbox className="h-8 w-8" />
            {emptyText}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground no-print">
        <span>
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Page {page + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            aria-label="Next page"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Form fields & dialog ---------- */
export interface Field {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "time"
    | "select"
    | "multiSelect"
    | "textarea"
    | "file"
    | "email"
    | "tel"
    | "checkbox";
  options?: string[];
  optionGroups?: OptionGroup[];
  optionsFor?: (all: Row) => string[];
  optionLabelsFor?: (all: Row) => Record<string, string>;
  optionStylesFor?: (all: Row) => Record<string, CSSProperties>;
  optionEnabledFor?: (option: string, all: Row) => boolean;
  optionEmphasisFor?: (option: string, all: Row) => boolean;
  modalPicker?: boolean;
  modalRequiresCourse?: boolean;
  modalTitle?: string;
  modalDescription?: string;
  searchPlaceholder?: string;
  showOptionValue?: boolean;
  emptyMessage?: string;
  noSelectionMessage?: string;
  required?: boolean;
  readOnly?: boolean;
  min?: number;
  full?: boolean;
  placeholder?: string;
  hint?: string | ((all: Row) => string | undefined);
  validate?: (v: unknown, all: Row) => string | undefined;
  onChange?: (value: unknown, all: Row) => Partial<Row> | void;
  onBeforeChange?: (value: unknown, all: Row) => boolean;
  render?: (all: Row, setValues: (v: Row) => void) => ReactNode;
}

export function validateFields(fields: Field[], v: Row) {
  const e: Record<string, string> = {};
  fields.forEach((f) => {
    const val = v[f.name];
    if (
      f.required &&
      (val === undefined || val === "" || val === null || (Array.isArray(val) && val.length === 0))
    )
      e[f.name] = `${f.label} is required`;
    else if (f.type === "email" && val && !/^\S+@\S+\.\S+$/.test(val))
      e[f.name] = "Enter a valid email address";
    else if (f.type === "tel" && val && !/^\d{10}$/.test(String(val)))
      e[f.name] = "Enter a 10-digit mobile number";
    else if (f.validate) {
      const m = f.validate(val, v);
      if (m) e[f.name] = m;
    }
  });
  return e;
}

export function focusNextEnterControl(current: HTMLElement | null) {
  const form = current?.closest("form");
  if (!form || !current) return;
  const controls = Array.from(
    form.querySelectorAll<HTMLElement>("[data-enter-navigation], [data-enter-submit]"),
  ).filter((control) => {
    const style = window.getComputedStyle(control);
    return (
      !control.hasAttribute("disabled") &&
      control.getAttribute("aria-disabled") !== "true" &&
      !control.hidden &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
  const index = controls.indexOf(current);
  controls[index + 1]?.focus();
}

function ModalOptionPicker({
  id,
  labelId,
  title,
  description,
  searchPlaceholder,
  selectedOptions,
  selectedLabels,
  options,
  optionGroups,
  optionLabels,
  enabledOptions,
  highlightedOptions,
  requiresCourse,
  hasCourse,
  showOptionValue,
  placeholder,
  emptyMessage,
  noSelectionMessage,
  hasError,
  multiple,
  onSelect,
}: {
  id: string;
  labelId: string;
  title: string;
  description?: string | undefined;
  searchPlaceholder: string;
  selectedOptions: string[];
  selectedLabels: string[];
  options: string[];
  optionGroups?: OptionGroup[] | undefined;
  optionLabels: Record<string, string>;
  enabledOptions: Record<string, boolean>;
  highlightedOptions?: Record<string, boolean> | undefined;
  requiresCourse: boolean;
  hasCourse: boolean;
  showOptionValue: boolean;
  placeholder?: string | undefined;
  emptyMessage?: string | undefined;
  noSelectionMessage?: string | undefined;
  hasError: boolean;
  multiple: boolean;
  onSelect: (options: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const keyboardActivation = useRef(false);
  const focusNextAfterKeyboardSelection = () => {
    if (!keyboardActivation.current) return;
    keyboardActivation.current = false;
    window.setTimeout(() => focusNextEnterControl(document.getElementById(id)), 250);
  };
  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (option: string) =>
    `${optionLabels[option] ?? option} ${option}`.toLowerCase().includes(searchTerm);
  const filteredGroups = optionGroups
    ?.map((group) => ({
      ...group,
      options: group.options.filter(matchesSearch),
    }))
    .filter((group) => group.options.length);
  const filteredOptions = optionGroups
    ? (filteredGroups?.flatMap((group) => group.options) ?? [])
    : options.filter(matchesSearch);
  const renderOption = (option: string) =>
    multiple ? (
      <label
        key={option}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5",
          enabledOptions[option] ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed",
        )}
      >
        <Checkbox
          disabled={!enabledOptions[option]}
          checked={draftSelection.includes(option)}
          onCheckedChange={(checked) => {
            if (!enabledOptions[option]) return;
            setDraftSelection(
              checked
                ? [...draftSelection, option]
                : draftSelection.filter((selected) => selected !== option),
            );
          }}
        />
        <span
          className={cn(
            "flex min-w-0 flex-col items-start",
            enabledOptions[option] ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "w-full truncate text-xs",
              enabledOptions[option] ? "font-bold" : "font-normal",
            )}
          >
            {optionLabels[option] ?? option}
          </span>
          {showOptionValue && (
            <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
              {option}
            </span>
          )}
        </span>
      </label>
    ) : (
      <Button
        key={option}
        type="button"
        variant="ghost"
        disabled={!enabledOptions[option]}
        onKeyDown={(event) => {
          if (event.key === "Enter") keyboardActivation.current = true;
        }}
        onPointerDown={() => {
          keyboardActivation.current = false;
        }}
        onClick={() => {
          onSelect([option]);
          setOpen(false);
          setSearch("");
          focusNextAfterKeyboardSelection();
        }}
        className={cn(
          "h-auto w-full justify-start px-3 py-2 text-left",
          !enabledOptions[option] && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex min-w-0 flex-col items-start">
          <span
            className={cn(
              "truncate",
              !enabledOptions[option]
                ? "font-normal text-muted-foreground"
                : highlightedOptions
                  ? highlightedOptions[option]
                    ? "font-bold text-foreground"
                    : "font-normal text-muted-foreground"
                  : "font-medium",
            )}
          >
            {optionLabels[option] ?? option}
          </span>
          {showOptionValue && (
            <span className="font-mono text-xs text-muted-foreground">{option}</span>
          )}
        </span>
      </Button>
    );

  return (
    <>
      <Button
        id={id}
        data-enter-navigation
        type="button"
        variant="outline"
        aria-labelledby={labelId}
        aria-invalid={hasError}
        onClick={() => {
          setDraftSelection(selectedOptions.filter((option) => enabledOptions[option]));
          setOpen(true);
        }}
        className={cn(
          "h-10 w-full justify-start font-normal",
          !selectedLabels.length && "text-muted-foreground",
          hasError && "border-destructive",
        )}
      >
        <span className="truncate">
          {selectedLabels.length ? selectedLabels.join(", ") : (placeholder ?? "Select a student…")}
        </span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <DialogContent
          className={
            multiple
              ? "flex h-[90vh] w-[calc(100vw-2rem)] max-w-6xl flex-col overflow-hidden"
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {options.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              {emptyMessage ?? "No options available."}
            </p>
          ) : (
            <div className={cn("flex min-h-0 flex-col", multiple ? "flex-1 gap-2" : "space-y-3")}>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  aria-label={`Search ${title.toLowerCase()}`}
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                />
              </div>
              {multiple && requiresCourse && !hasCourse && (
                <p className="text-xs text-muted-foreground">
                  {noSelectionMessage ?? "Select a course first."}
                </p>
              )}
              {multiple &&
                requiresCourse &&
                hasCourse &&
                !Object.values(enabledOptions).some(Boolean) && (
                  <p className="text-xs text-muted-foreground">
                    No students are currently enrolled in this subject.
                  </p>
                )}
              <div
                className={
                  multiple
                    ? "grid min-h-0 auto-rows-min content-start grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-5"
                    : "max-h-64 space-y-1 overflow-y-auto"
                }
              >
                {optionGroups
                  ? filteredGroups?.map((group) => (
                      <div key={group.label}>
                        <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                          {group.label}
                        </p>
                        {group.options.map(renderOption)}
                      </div>
                    ))
                  : filteredOptions.map(renderOption)}
                {!filteredOptions.length && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No results match your search.
                  </p>
                )}
              </div>
              {multiple && (
                <div className="mt-auto flex justify-end border-t pt-3">
                  <Button
                    type="button"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") keyboardActivation.current = true;
                    }}
                    onPointerDown={() => {
                      keyboardActivation.current = false;
                    }}
                    onClick={() => {
                      onSelect(draftSelection.filter((option) => enabledOptions[option]));
                      setOpen(false);
                      setSearch("");
                      focusNextAfterKeyboardSelection();
                    }}
                    disabled={!draftSelection.some((option) => enabledOptions[option])}
                  >
                    Add Selected Students
                    {draftSelection.some((option) => enabledOptions[option])
                      ? ` (${draftSelection.filter((option) => enabledOptions[option]).length})`
                      : ""}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FieldGrid({
  fields,
  values,
  setValues,
  errors,
  cols = 2,
}: {
  fields: Field[];
  values: Row;
  setValues: (v: Row) => void;
  errors: Record<string, string>;
  cols?: 2 | 3;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {fields.map((f) => {
        const id = `f-${f.name}`;
        const set = (val: unknown) => {
          if (f.onBeforeChange && !f.onBeforeChange(val, values)) return;
          setValues({ ...values, ...f.onChange?.(val, values), [f.name]: val });
        };
        const err = errors[f.name];
        if (f.render)
          return (
            <div key={f.name} className={cn("space-y-1.5", f.full && "md:col-span-full")}>
              {f.render(values, setValues)}
            </div>
          );
        const options =
          f.optionsFor?.(values) ??
          f.options ??
          f.optionGroups?.flatMap((group) => group.options) ??
          [];
        const optionLabels = f.optionLabelsFor?.(values) ?? {};
        const selectedOptions = Array.isArray(values[f.name])
          ? (values[f.name] as string[])
          : values[f.name]
            ? [String(values[f.name])]
            : [];
        const selectedLabels = selectedOptions.map((option) => optionLabels[option] ?? option);
        return (
          <div
            key={f.name}
            className={cn("space-y-1.5", (f.full || f.type === "textarea") && "md:col-span-full")}
          >
            {f.type !== "checkbox" && (
              <Label
                htmlFor={f.type === "multiSelect" ? undefined : id}
                id={`${id}-label`}
                className="text-xs font-medium"
              >
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
            )}
            {(f.type === "multiSelect" || f.type === "select") && f.modalPicker ? (
              <ModalOptionPicker
                id={id}
                labelId={`${id}-label`}
                title={f.modalTitle ?? `Select ${f.label}`}
                description={f.modalDescription}
                searchPlaceholder={f.searchPlaceholder ?? "Search by name or admission number"}
                selectedOptions={selectedOptions}
                selectedLabels={selectedLabels}
                options={options}
                optionGroups={f.optionGroups}
                optionLabels={optionLabels}
                enabledOptions={Object.fromEntries(
                  options.map((option) => [option, f.optionEnabledFor?.(option, values) ?? true]),
                )}
                highlightedOptions={
                  f.optionEmphasisFor
                    ? Object.fromEntries(
                        options.map((option) => [
                          option,
                          f.optionEmphasisFor?.(option, values) ?? false,
                        ]),
                      )
                    : undefined
                }
                requiresCourse={!!f.modalRequiresCourse}
                hasCourse={!!values.course}
                showOptionValue={f.showOptionValue ?? true}
                placeholder={f.placeholder}
                emptyMessage={f.emptyMessage}
                noSelectionMessage={f.noSelectionMessage}
                hasError={!!err}
                multiple={f.type === "multiSelect"}
                onSelect={(selected) =>
                  set(f.type === "multiSelect" ? selected : (selected[0] ?? ""))
                }
              />
            ) : f.type === "multiSelect" ? (
              <div
                id={id}
                role="group"
                aria-labelledby={`${id}-label`}
                className={cn(
                  "max-h-44 space-y-1 overflow-y-auto rounded-md border p-2",
                  err && "border-destructive",
                )}
              >
                {options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedOptions.includes(option)}
                      onCheckedChange={(checked) => {
                        set(
                          checked
                            ? [...selectedOptions, option]
                            : selectedOptions.filter((item) => item !== option),
                        );
                      }}
                    />
                    {optionLabels[option] ?? option}
                  </label>
                ))}
                {!options.length && (
                  <p className="px-1.5 py-1 text-sm text-muted-foreground">
                    Select a course to view its students.
                  </p>
                )}
              </div>
            ) : f.type === "select" ? (
              <NativeSelect
                id={id}
                data-enter-navigation
                value={values[f.name] ?? ""}
                onChange={set}
                options={f.optionsFor?.(values) ?? f.options ?? []}
                optionGroups={f.optionGroups}
                optionLabels={f.optionLabelsFor?.(values)}
                optionStyles={f.optionStylesFor?.(values)}
                placeholder="Select…"
                className={cn(err && "border-destructive")}
              />
            ) : f.type === "textarea" ? (
              <Textarea
                id={id}
                data-enter-navigation
                value={values[f.name] ?? ""}
                onChange={(e) => set(e.target.value)}
                rows={3}
                placeholder={f.placeholder}
                className={cn(err && "border-destructive")}
              />
            ) : f.type === "file" ? (
              <label htmlFor={id} className="upload-box">
                <Upload className="h-4 w-4" />
                <span className="truncate">
                  {values[f.name] || "Click to choose a file (PDF, JPG, PNG)"}
                </span>
                <input
                  id={id}
                  type="file"
                  className="sr-only"
                  onChange={(e) => set(e.target.files?.[0]?.name ?? "")}
                />
              </label>
            ) : f.type === "checkbox" ? (
              <label htmlFor={id} className="flex items-center gap-2 pt-6 text-sm">
                <Checkbox id={id} checked={!!values[f.name]} onCheckedChange={(c) => set(!!c)} />
                {f.label}
              </label>
            ) : (
              <Input
                id={id}
                data-enter-navigation
                type={f.type ?? "text"}
                readOnly={f.readOnly}
                min={f.min}
                value={values[f.name] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) =>
                  set(
                    f.type === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value,
                  )
                }
                className={cn(f.readOnly && "bg-muted font-mono", err && "border-destructive")}
                aria-invalid={!!err}
              />
            )}
            {err && <p className="text-xs text-destructive">{err}</p>}
            {typeof f.hint === "function"
              ? f.hint(values) && <p className="text-xs text-muted-foreground">{f.hint(values)}</p>
              : f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitLabel = "Save",
  wide,
  enterMovesNext = false,
  hideCancel = false,
  submitDisabled,
  contentClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  fields: Field[];
  initial: Row;
  onSubmit: (v: Row) => void | boolean;
  submitLabel?: string;
  wide?: boolean;
  enterMovesNext?: boolean;
  hideCancel?: boolean;
  submitDisabled?: (values: Row) => boolean;
  contentClassName?: string;
  children?: (v: Row, set: (v: Row) => void) => ReactNode;
}) {
  const [values, setValues] = useState<Row>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) {
      setValues(initial);
      setErrors({});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    const e = validateFields(fields, values);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (onSubmit(values) === false) return;
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl",
          contentClassName,
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          onKeyDown={(e) => {
            if (
              !enterMovesNext ||
              e.key !== "Enter" ||
              !(e.target instanceof HTMLElement) ||
              !e.target.matches("input:not([type='hidden']), textarea")
            )
              return;
            e.preventDefault();
            focusNextEnterControl(e.target);
          }}
          className="space-y-4"
        >
          <FieldGrid fields={fields} values={values} setValues={setValues} errors={errors} />
          {children?.(values, setValues)}
          <DialogFooter>
            {!hideCancel && (
              <Button
                type="button"
                variant="outline"
                data-enter-skip
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" data-enter-submit disabled={submitDisabled?.(values) ?? false}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Confirm ---------- */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string | undefined;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- Print / document ---------- */
export function PrintDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl print-dialog">
        <DialogHeader className="no-print">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preview below. Use Print to produce a paper copy.</DialogDescription>
        </DialogHeader>
        <div className="print-area">{children}</div>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocSheet({
  institution,
  title,
  number,
  children,
  footer,
}: {
  institution: string;
  title: string;
  number?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="doc-sheet">
      <div className="flex items-start justify-between border-b-2 border-primary pb-3">
        <div>
          <p className="text-base font-bold text-primary">{institution}</p>
          <p className="text-xs text-muted-foreground">Student Administration Office</p>
        </div>
        {number && <p className="font-mono text-xs text-muted-foreground">No. {number}</p>}
      </div>
      <h3 className="my-4 text-center text-sm font-bold uppercase tracking-widest text-foreground">
        {title}
      </h3>
      {children}
      {footer ?? (
        <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
          <div className="border-t pt-2">Student Signature</div>
          <div className="border-t pt-2 text-right">Authorized Signatory</div>
        </div>
      )}
    </div>
  );
}

export function KV({ items, cols = 2 }: { items: [string, ReactNode][]; cols?: 2 | 3 }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-3 text-sm",
        cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 font-medium text-foreground">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({ items }: { items: { date: string; note: string; by?: string }[] }) {
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
          <p className="text-xs text-muted-foreground">
            {h.date}
            {h.by ? ` · ${h.by}` : ""}
          </p>
          <p className="text-sm text-foreground">{h.note}</p>
        </li>
      ))}
    </ol>
  );
}

export function SampleNotice({ children }: { children: ReactNode }) {
  return <div className="sample-notice">{children}</div>;
}
