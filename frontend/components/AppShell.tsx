import Link from "next/link";

import { ProgressBar } from "@/components/ProgressBar";
import { ToolTracePanel } from "@/components/ToolTracePanel";

interface AppShellProps {
  step: "prepare" | "execute" | "follow";
  title: string;
  subtitle: string;
  toolTrace?: {
    tool_name: string;
    status: string;
    elapsed_ms: number;
    short_result_preview: string;
  }[];
  children: React.ReactNode;
}

export function AppShell({ step, title, subtitle, toolTrace, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      <section className="ipad-frame px-8 pb-6 pt-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">
                Air Liquide Santé · BPCO Demo
              </p>
              <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { href: "/today", label: "Today" },
                { href: "/prebrief", label: "Pre-Brief" },
                { href: "/visit", label: "Visit Mode" },
                { href: "/after-visit", label: "After Visit" },
                { href: "/insights", label: "Insights" }
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.3em]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <ProgressBar step={step} />
        </div>
      </section>

      <section className="mx-auto -mt-10 flex max-w-7xl gap-6 px-8 pb-16">
        <div className="flex-1 space-y-6">{children}</div>
        <aside className="hidden w-[320px] xl:block">
          <ToolTracePanel toolTrace={toolTrace} />
        </aside>
      </section>
    </div>
  );
}
