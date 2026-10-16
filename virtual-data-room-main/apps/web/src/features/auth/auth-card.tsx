import type { ReactNode } from "react";

export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-card-foreground">{title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">Data Room</p>

        {children}

        <p className="mt-4 text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
