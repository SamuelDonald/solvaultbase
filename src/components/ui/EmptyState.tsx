import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass rise-in mx-auto max-w-md rounded-3xl p-10 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary/50">
        <Icon className="size-5 text-accent" />
      </div>
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
