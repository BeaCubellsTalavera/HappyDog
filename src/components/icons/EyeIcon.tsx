interface EyeIconProps {
  open: boolean;
  className?: string;
}

export function EyeIcon({ open, className }: EyeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx={12} cy={12} r={3} />
      {!open && <line x1={4} y1={20} x2={20} y2={4} />}
    </svg>
  );
}
