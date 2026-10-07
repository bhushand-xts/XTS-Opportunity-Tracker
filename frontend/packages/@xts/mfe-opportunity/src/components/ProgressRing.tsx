// A small conic-gradient ring used by both RFP paths' progress sidebars
// (Question Review, Proposal Outline) — plain CSS, no charting library.
// `color` defaults to the existing primary-blue so Proposal Outline's ring
// is unaffected; Question Review passes emerald to match its "Answered"
// metric being this ring's headline number. `size` defaults to the
// original dimensions for the same reason — Proposal Outline is untouched.
const SIZE_CLASSES = {
  md: { outer: "size-16", inner: "size-12", text: "text-sm" },
  lg: { outer: "size-32", inner: "size-28", text: "text-xl" },
} as const;

export function ProgressRing({
  percent,
  color = "hsl(var(--primary))",
  size = "md",
}: {
  percent: number;
  color?: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const classes = SIZE_CLASSES[size];
  return (
    <div
      className={`grid ${classes.outer} flex-none place-items-center rounded-full`}
      style={{ background: `conic-gradient(${color} 0 ${percent}%, hsl(var(--muted)) ${percent}% 100%)` }}
    >
      <div className={`grid ${classes.inner} place-items-center rounded-full bg-card ${classes.text} font-semibold`}>
        {percent}%
      </div>
    </div>
  );
}
