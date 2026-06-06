export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="jh-g" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#jh-g)" opacity="0.2" />
      <path
        d="M12 28V12h4.5l5.2 9.4V12H26v16h-4.4l-5.3-9.6V28H12z"
        fill="url(#jh-g)"
      />
      <circle cx="30" cy="10" r="3" fill="#5eead4" opacity="0.9" />
    </svg>
  );
}
