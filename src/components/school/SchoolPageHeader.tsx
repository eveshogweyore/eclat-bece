import type { ReactNode } from "react";

interface SchoolPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Page-level heading block rendered inside the persistent school shell. */
export function SchoolPageHeader({ title, subtitle, actions }: SchoolPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground dark:text-[#71c9ed] truncate">
          {title}
          <span className="text-primary">.</span>
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
