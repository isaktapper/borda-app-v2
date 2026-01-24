export function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
    >
      {/* Microsoft Teams official logo - purple/blue gradient */}
      <defs>
        <linearGradient id="teamsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5059C9" />
          <stop offset="100%" stopColor="#7B83EB" />
        </linearGradient>
      </defs>

      {/* Background shape */}
      <path
        fill="url(#teamsGradient)"
        d="M20.625 8.127c-.563 0-1.105.074-1.62.21a4.876 4.876 0 0 0-9.253 0 5.25 5.25 0 1 0 .001 10.125h2.622v-5.25a2.25 2.25 0 1 1 4.5 0v5.25h3.75a3.375 3.375 0 1 0 0-6.75v-3.585z"
      />

      {/* Left person */}
      <path
        fill="#5059C9"
        d="M9 18.462v-5.25a2.25 2.25 0 1 0-4.5 0v5.25H9z"
      />

      {/* Right person circle */}
      <circle
        fill="#7B83EB"
        cx="15.75"
        cy="5.25"
        r="2.25"
      />

      {/* Smaller person circle */}
      <circle
        fill="#5059C9"
        cx="19.5"
        cy="6"
        r="1.5"
      />
    </svg>
  )
}
