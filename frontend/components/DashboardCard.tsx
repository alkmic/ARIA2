import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function DashboardCard({ title, subtitle, children }: DashboardCardProps) {
  return (
    <div className="rounded-2xl bg-white/90 p-5 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-airnavy">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
