export function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M 250,110 A 150,70 0 0,0 100,180 L 60,320 C 60,410 440,410 440,320 L 400,180 A 150,70 0 0,0 250,110 Z M 250,130 A 130,50 0 0,1 380,180 A 130,50 0 0,1 250,230 A 130,50 0 0,1 120,180 A 130,50 0 0,1 250,130 Z"
      />
    </svg>
  );
}
