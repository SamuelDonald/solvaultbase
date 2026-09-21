import * as React from "react";

import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children }: { children: React.ReactElement }) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) return children;
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
      ctx.setOpen(!ctx.open);
    },
  } as React.HTMLAttributes<HTMLElement>);
}

export function DropdownMenuContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx?.open) return null;
  return (
    <div
      className={cn(
        "glass absolute z-50 mt-2 min-w-48 rounded-2xl p-1.5 shadow-xl",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary/60",
        className,
      )}
      onClick={() => {
        onClick?.();
        ctx?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2 text-xs text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border/60" />;
}
