import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileBadge, FolderOpen, CalendarClock, BarChart3, Settings, Bell, ClipboardList,
  Menu, GraduationCap, CalendarDays, Moon, Sun, CheckCircle2, FileCheck2, Contact,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/records", label: "Admission Records", icon: FolderOpen },
  { to: "/student-records", label: "Student Records", icon: Contact },
  { to: "/leave", label: "Approve Leave", icon: CheckCircle2 },
  { to: "/certificates", label: "Process Certificate", icon: FileCheck2 },
  { to: "/starting-slip", label: "Student Slips", icon: FileBadge },
  { to: "/batches", label: "Batch & Timing", icon: CalendarClock },
  { to: "/tasks", label: "Task Assigning", icon: ClipboardList },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const PAGE_LABELS: Record<string, string> = {
  "/registration": "Application Form",
  "/admissions": "Admission Management",
  "/leave": "Leave Approvals",
  "/fees": "Course Fees",
  "/certificates": "Certificate Applications",
  "/absence": "Long Absence Tracking",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Main">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to} onClick={onNavigate}
            className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
              active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
            <n.icon className="h-4 w-4 shrink-0" />{n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { settings } = useStore();
  return (
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><GraduationCap className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{settings.institution.split(" ").slice(0, 2).join(" ")}</p>
        <p className="text-[11px] text-sidebar-foreground">Student Administration</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)));
  const currentLabel = current?.label ?? PAGE_LABELS[path] ?? "Page";
  const { data, settings } = useStore();
  const pendingLeaves = data.leaves.filter((l) => l.status === "Pending").length;
  const absent = data.absences.filter((a) => a.status === "Contact Required").length;

  useEffect(() => {
    const enabled = window.localStorage.getItem("administration-theme") === "dark";
    document.documentElement.classList.toggle("dark", enabled);
    setDarkMode(enabled);
  }, []);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeout = window.setTimeout(() => setCurrentDate(new Date()), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timeout);
  }, [currentDate]);

  const toggleDarkMode = () => {
    setDarkMode((enabled) => {
      const next = !enabled;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("administration-theme", next ? "dark" : "light");
      return next;
    });
  };
  const dateToDisplay = settings.navigationDate
    ? (() => {
        const [year, month, day] = settings.navigationDate.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : currentDate;
  const formattedDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(dateToDisplay);

  return (
    <div className="flex min-h-screen w-full">
      <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
        <SheetContent
          side="left"
          className="flex w-64 flex-col sidebar-bg p-0"
          overlayClassName="bg-black/35 backdrop-blur-sm"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand /><NavList onNavigate={() => setNavigationOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 backdrop-blur lg:px-6 no-print">
          <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setNavigationOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="hidden text-sm md:block">
            <span className="text-muted-foreground">Administration</span>
            <span className="mx-1.5 text-muted-foreground">/</span>
            <span className="font-medium text-foreground">{currentLabel}</span>
          </div>
          <div className="ml-auto" aria-hidden="true" />

          <div className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground sm:flex"><CalendarDays className="h-4 w-4" />{formattedDate}</div>
          <Button variant="ghost" size="icon" aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <p className="border-b px-4 py-2.5 text-sm font-semibold">Notifications</p>
              <ul className="divide-y text-sm">
                <li className="px-4 py-2.5"><Link to="/leave" className="hover:underline">{pendingLeaves} leave requests awaiting approval</Link></li>
                <li className="px-4 py-2.5"><Link to="/absence" className="hover:underline">{absent} long-absence cases need contact</Link></li>
              </ul>
            </PopoverContent>
          </Popover>
          <div className="hidden h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:grid">Ad</div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
