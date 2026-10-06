// A small conic-gradient ring used by both RFP paths' progress sidebars
// (Question Review, Proposal Outline) — plain CSS, no charting library.
export function ProgressRing({ percent }: { percent: number }) {
  return (
    <div
      className="grid size-16 flex-none place-items-center rounded-full"
      style={{ background: `conic-gradient(hsl(var(--primary)) 0 ${percent}%, hsl(var(--muted)) ${percent}% 100%)` }}
    >
      <div className="grid size-12 place-items-center rounded-full bg-card text-sm font-semibold">{percent}%</div>
    </div>
  );
}
