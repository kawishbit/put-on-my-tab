import { cn } from "@/lib/utils";

export function SimpleTableRoot({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return <div className={cn("app-table-shell", className)}>{children}</div>;
}

export function SimpleTableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <thead
      className={cn(
        "bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-800/80 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function SimpleTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <tbody
      className={cn(
        "divide-y divide-slate-100 bg-white dark:divide-white/8 dark:bg-transparent",
        className,
      )}
    >
      {children}
    </tbody>
  );
}

export function SimpleTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <tr className={cn("align-middle", className)}>{children}</tr>;
}

export function SimpleTableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <th className={cn("px-3 py-2 font-medium", className)}>{children}</th>;
}

export function SimpleTableCell({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}): React.JSX.Element {
  return (
    <td className={cn("align-middle px-3 py-2", className)} colSpan={colSpan}>
      {children}
    </td>
  );
}

export function SimpleTableEmpty({
  message,
  colSpan,
  className,
}: {
  message: string;
  colSpan: number;
  className?: string;
}): React.JSX.Element {
  return (
    <SimpleTableRow>
      <SimpleTableCell
        colSpan={colSpan}
        className={cn(
          "py-4 text-center text-slate-500 dark:text-slate-400",
          className,
        )}
      >
        {message}
      </SimpleTableCell>
    </SimpleTableRow>
  );
}
