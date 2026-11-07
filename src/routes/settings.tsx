import { createFileRoute } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FieldGrid, PageHeader, Panel, validateFields, type Field } from "@/components/app/kit";
import { useStore, type Settings } from "@/lib/store";
import { thresholdError } from "@/lib/administration";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/settings")({
  head: pageHead("Settings", "Manage institution details, administrative categories, number prefixes and notification preferences."),
  component: Page,
});

function Page() {
  const { settings, setSettings } = useStore();
  const [draft, setDraft] = useState<Settings>(() => structuredClone(settings));
  const [tab, setTab] = useState("institution");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState(settings.leaveCategories.join("\n"));
  const [certTypes, setCertTypes] = useState(settings.certTypes.join("\n"));
  const institutionFields: Field[] = [
    { name: "institution", label: "Institution Name", required: true, full: true },
    { name: "address", label: "Address", type: "textarea", required: true },
    { name: "phone", label: "Phone Number", required: true }, { name: "email", label: "Email Address", type: "email", required: true },
    { name: "navigationDate", label: "Top Navigation Date (leave blank for current date)", type: "date" },
  ];
  const administrativeFields: Field[] = [
    { name: "absenceThreshold", label: "Long Absence Threshold (Days)", type: "number", required: true, validate: (v) => thresholdError(Number(v)) },
    { name: "currency", label: "Currency", readOnly: true }, { name: "dateFormat", label: "Date Format", readOnly: true },
  ];
  const prefixFields: Field[] = Object.keys(draft.prefixes)
    .filter((name) => name !== "application")
    .map((name) => ({ name, label: `${name.charAt(0).toUpperCase()}${name.slice(1)} Prefix`, required: true, validate: (v) => /^[A-Za-z0-9-]+$/.test(v) ? undefined : "Use only letters, numbers and hyphens" }));
  const split = (text: string) => [...new Set(text.split("\n").map((v) => v.trim()).filter(Boolean))];
  const moveToNextSettingsField = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (event.key !== "Enter" || !(target instanceof HTMLElement) || !target.matches("input, select, textarea, [role='switch']")) return;
    event.preventDefault();
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("input:not([type='hidden']):not(:disabled), select:not(:disabled), textarea:not(:disabled), [role='switch']:not([aria-disabled='true'])"));
    controls[controls.indexOf(target) + 1]?.focus();
  };
  const save = () => {
    const e = { ...validateFields([...institutionFields, ...administrativeFields], draft), ...validateFields(prefixFields, draft.prefixes) };
    if (!split(categories).length) e.leaveCategories = "Enter at least one leave category";
    if (!split(certTypes).length) e.certTypes = "Enter at least one certificate type";
    setErrors(e);
    if (Object.keys(e).length) { toast.error("Check the highlighted settings"); return; }
    setSettings({ ...draft, leaveCategories: split(categories), certTypes: split(certTypes) });
    toast.success("Settings saved for this session");
  };
  const reset = () => { setDraft(structuredClone(settings)); setCategories(settings.leaveCategories.join("\n")); setCertTypes(settings.certTypes.join("\n")); setErrors({}); };
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" actions={<><Button variant="outline" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Discard Changes</Button><Button onClick={save}><Save className="mr-1.5 h-4 w-4" />Save Settings</Button></>} />
      <Tabs value={tab} onValueChange={setTab}><TabsList className="flex h-auto w-fit flex-wrap"><TabsTrigger value="institution">Institution</TabsTrigger><TabsTrigger value="administration">Administration</TabsTrigger><TabsTrigger value="prefixes">Number Prefixes</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger></TabsList></Tabs>
      <div onKeyDown={moveToNextSettingsField}>
        {tab === "institution" && <Panel title="Institution Details"><FieldGrid fields={institutionFields} values={draft} errors={errors} setValues={(v) => setDraft((d) => ({ ...d, ...v }))} /></Panel>}
        {tab === "administration" && <div className="space-y-6"><Panel title="Administrative Preferences"><FieldGrid fields={administrativeFields} values={draft} errors={errors} setValues={(v) => setDraft((d) => ({ ...d, ...v }))} /></Panel><Panel title="Categories"><FieldGrid fields={[{ name: "leaveCategories", label: "Leave Categories", type: "textarea" }, { name: "certTypes", label: "Certificate Types", type: "textarea" }]} values={{ leaveCategories: categories, certTypes }} errors={errors} setValues={(v) => { setCategories(v.leaveCategories); setCertTypes(v.certTypes); }} /></Panel></div>}
        {tab === "prefixes" && <Panel title="Document Number Prefixes"><FieldGrid fields={prefixFields} values={draft.prefixes} errors={errors} setValues={(v) => setDraft((d) => ({ ...d, prefixes: v as Record<string, string> }))} cols={3} /></Panel>}
        {tab === "notifications" && <Panel title="Notification Preferences"><div className="divide-y">{Object.entries({ leave: "Leave Approvals", fees: "Fee Payment Follow-up", absence: "Long Absence Alerts", certificates: "Certificate Applications", dailySummary: "Daily Summary" }).map(([key, label]) => <div key={key} className="flex items-center justify-between gap-4 py-4"><Label htmlFor={`notify-${key}`}>{label}</Label><Switch id={`notify-${key}`} checked={!!draft.notify[key]} onCheckedChange={(checked) => setDraft((d) => ({ ...d, notify: { ...d.notify, [key]: checked } }))} /></div>)}</div></Panel>}
      </div>
    </div>
  );
}
