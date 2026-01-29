interface ToolTraceEntry {
  tool_name: string;
  status: string;
  elapsed_ms: number;
  short_result_preview: string;
}

interface ToolTracePanelProps {
  toolTrace?: ToolTraceEntry[];
}

export function ToolTracePanel({ toolTrace = [] }: ToolTracePanelProps) {
  return (
    <div className="glass-card rounded-3xl p-6 text-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Tool Trace
        </h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Compliance
        </span>
      </div>
      {toolTrace.length === 0 ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Waiting for tools</p>
            <p className="mt-2 text-sm font-semibold">Trace will appear during generation.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {toolTrace.map((entry) => (
            <div key={entry.tool_name} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{entry.tool_name}</span>
                <span>{entry.elapsed_ms} ms</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-airnavy">
                {entry.status.toUpperCase()}
              </p>
              <p className="text-xs text-slate-500">{entry.short_result_preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
