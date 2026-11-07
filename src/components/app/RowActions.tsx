import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Action {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
  separator?: boolean;
}

export function RowActions({ actions }: { actions: Action[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Row actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions
          .filter((a) => !a.hidden)
          .map((a) => (
            <div key={a.label}>
              {a.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={a.onClick}
                className={a.destructive ? "text-destructive focus:text-destructive" : undefined}
              >
                {a.icon && <a.icon className="mr-2 h-4 w-4" />}
                {a.label}
              </DropdownMenuItem>
            </div>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
