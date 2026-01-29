interface ProgressBarProps {
  step: "prepare" | "execute" | "follow";
}

const steps = [
  { key: "prepare", label: "PREPARE", color: "bg-orange-400" },
  { key: "execute", label: "EXECUTE", color: "bg-emerald-400" },
  { key: "follow", label: "FOLLOW", color: "bg-sky-400" }
] as const;

export function ProgressBar({ step }: ProgressBarProps) {
  return (
    <div className="flex w-full items-center gap-2 rounded-full bg-white/30 p-2">
      {steps.map((item) => (
        <div key={item.key} className="flex-1">
          <div
            className={`flex h-9 items-center justify-center rounded-full text-xs font-semibold tracking-[0.24em] text-white ${
              item.key === step ? item.color : "bg-white/30"
            }`}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
