"use client";
type Props = { steps: string[]; current: number };
export default function ProgressBar({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
              ${i < current ? "bg-[#2563eb] border-[#2563eb] text-white" :
                i === current ? "bg-transparent border-[#2563eb] text-[#2563eb]" :
                "bg-transparent border-white/20 text-white/30"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-xs whitespace-nowrap transition-all ${i === current ? "text-white" : i < current ? "text-[#2563eb]" : "text-white/30"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-5 transition-all ${i < current ? "bg-[#2563eb]" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
