import type { NodeState } from "@/lib/progress";
import { STATE_COLOR, STATE_TEXT } from "./state";

export function StateBadge({ state, label }: { state: NodeState; label?: string }) {
  const color = STATE_COLOR[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider"
      style={{ color, borderColor: color }}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label ?? STATE_TEXT[state]}
    </span>
  );
}

export function ProgressBar({ percent, state }: { percent: number; state: NodeState }) {
  return (
    <div className="hud-bar h-2 w-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full transition-[width] duration-500" style={{ width: `${percent}%`, background: STATE_COLOR[state] }} />
    </div>
  );
}
