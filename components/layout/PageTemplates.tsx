import { cn } from "@/lib/utils";

type TemplateProps = {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function TemplateHeader({
  title,
  subtitle,
  actions,
}: Omit<TemplateProps, "children" | "className">): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="app-title">{title}</h1>
        <p className="app-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function DashboardPageTemplate({
  title,
  subtitle,
  actions,
  children,
  className,
}: TemplateProps): React.JSX.Element {
  return (
    <section className={cn("space-y-6", className)}>
      <TemplateHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </section>
  );
}

export function FormPageTemplate({
  title,
  subtitle,
  actions,
  children,
  className,
}: TemplateProps): React.JSX.Element {
  return (
    <section className={cn("mx-auto w-full max-w-4xl space-y-6", className)}>
      <TemplateHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </section>
  );
}

export function TablePageTemplate({
  title,
  subtitle,
  actions,
  children,
  className,
}: TemplateProps): React.JSX.Element {
  return (
    <section className={cn("space-y-5", className)}>
      <TemplateHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </section>
  );
}

export function SettingsPageTemplate({
  title,
  subtitle,
  actions,
  children,
  className,
}: TemplateProps): React.JSX.Element {
  return (
    <section className={cn("mx-auto w-full max-w-4xl space-y-6", className)}>
      <TemplateHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </section>
  );
}
