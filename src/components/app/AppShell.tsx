import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { RibbonFolderIcon } from "@/components/app/RibbonFolderIcon";

type NavigationTarget =
  "/" | "/batches" | "/exam-requests" | "/attendance" | "/leave" | "/certificates";
type NavigationItem = { to?: NavigationTarget; label: string; icon: LucideIcon };

const PRIMARY_NAV: NavigationItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/batches", label: "Batch Allocation", icon: CalendarClock },
  { to: "/attendance", label: "Academic Information", icon: CalendarCheck },
  { to: "/exam-requests", label: "Examination", icon: ClipboardCheck },
];

const MORE_NAV: NavigationItem[] = [
  { to: "/leave", label: "Leave Approvals", icon: CheckCircle2 },
  { to: "/certificates", label: "Certificates", icon: FileCheck2 },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  const renderItem = (item: NavigationItem) => {
    const active = item.to === "/" ? path === "/" : item.to ? path.startsWith(item.to) : false;
    const itemClass = cn("es-nav-item", active && "is-active");
    const content = (
      <>
        <item.icon className="es-nav-icon" aria-hidden="true" />
        <span className="es-nav-label">{item.label}</span>
      </>
    );

    return item.to ? (
      <Link
        key={item.label}
        to={item.to}
        onClick={onNavigate}
        className={itemClass}
        title={item.label}
      >
        {content}
      </Link>
    ) : (
      <button
        key={item.label}
        type="button"
        className={itemClass}
        title={`${item.label} · Coming soon`}
      >
        {content}
      </button>
    );
  };

  return (
    <nav className="es-nav" aria-label="Main navigation">
      <div className="es-nav-group">{PRIMARY_NAV.map(renderItem)}</div>
      <div className="es-nav-group">{MORE_NAV.map(renderItem)}</div>
    </nav>
  );
}

function Brand() {
  return (
    <div className="es-brand">
      <span className="es-brand-mark">
        <GraduationCap size={24} strokeWidth={2.2} />
      </span>
      <div className="es-brand-copy">
        <p>Administration</p>
      </div>
    </div>
  );
}

function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  return (
    <div className={cn("es-sidebar-inner", mobile && "es-sidebar-mobile")}>
      <Brand />
      <NavList onNavigate={onNavigate} />
      <button type="button" className="es-logout">
        <LogOut size={18} />
        <span className="es-nav-label">Log out</span>
      </button>
    </div>
  );
}

function NavigationToggle({
  open,
  expanded = open,
  closing = false,
  onToggle,
}: {
  open: boolean;
  expanded?: boolean;
  closing?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={open ? "Close navigation" : "Open navigation"}
      aria-expanded={expanded}
      aria-controls="edu-sidebar"
      onClick={onToggle}
      className="es-menu-button"
      data-navigation-open={open}
      data-navigation-closing={closing}
    >
      <RibbonFolderIcon />
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [folderClosing, setFolderClosing] = useState(false);
  const folderClosingTimer = useRef<number | undefined>(undefined);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useStore();
  const pendingLeaves = data.leaves.filter((leave) => leave.status === "Pending").length;

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(
    () => () => {
      if (folderClosingTimer.current !== undefined) {
        window.clearTimeout(folderClosingTimer.current);
      }
    },
    [],
  );

  const setNavigationState = (open: boolean) => {
    if (folderClosingTimer.current !== undefined) {
      window.clearTimeout(folderClosingTimer.current);
      folderClosingTimer.current = undefined;
    }

    setNavigationOpen(open);
    if (open) {
      setFolderClosing(false);
      return;
    }

    setFolderClosing(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    folderClosingTimer.current = window.setTimeout(
      () => {
        setFolderClosing(false);
        folderClosingTimer.current = undefined;
      },
      reducedMotion ? 1 : 360,
    );
  };

  return (
    <div className="es-app-shell">
      <Sheet open={navigationOpen} onOpenChange={setNavigationState}>
        <SheetContent
          id="edu-sidebar"
          side="left"
          className="es-mobile-sidebar es-drawer-content p-0"
          overlayClassName="es-sidebar-overlay"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar mobile onNavigate={() => setNavigationState(false)} />
        </SheetContent>
      </Sheet>

      <div className="es-app-content">
        <header className="es-topbar no-print">
          <NavigationToggle
            open={navigationOpen}
            expanded={navigationOpen}
            closing={folderClosing}
            onToggle={() => setNavigationState(!navigationOpen)}
          />
          <div className="es-topbar-actions">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications, 3 unread"
                  className="es-icon-button es-bell"
                >
                  <Bell size={20} />
                  <span className="es-notification-count">3</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <p className="border-b px-4 py-3 text-sm font-semibold">Notifications</p>
                <ul className="divide-y text-sm">
                  <li className="px-4 py-3">
                    {pendingLeaves} leave requests are awaiting approval
                  </li>
                  <li className="px-4 py-3">3 students need urgent classes this week</li>
                  <li className="px-4 py-3">Your weekly report is ready to view</li>
                </ul>
              </PopoverContent>
            </Popover>
            <span className="es-topbar-divider" aria-hidden="true" />
            <button type="button" className="es-profile" aria-label="Harshika, Administrator">
              <span className="es-avatar">H</span>
              <span className="es-profile-copy">
                <strong>Harshika</strong>
                <small>Administrator</small>
              </span>
            </button>
          </div>
        </header>
        <main className={cn("es-main", path === "/" && "es-dashboard-main")}>{children}</main>
      </div>
    </div>
  );
}
