export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1
          className="font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[38px]"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          {title}
        </h1>
        {description && <p className="mt-2 text-[16px] text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="space-y-3">
      <div className="h-12 animate-pulse rounded-[12px] bg-sunken" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-[76px] animate-pulse rounded-[14px] bg-sunken" style={{ opacity: 1 - i * 0.12 }} />
      ))}
      <p className="sr-only">Loading…</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center">
      <Icon className="size-8 text-ink-faint" />
      <p className="mt-3 font-serif text-xl font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
