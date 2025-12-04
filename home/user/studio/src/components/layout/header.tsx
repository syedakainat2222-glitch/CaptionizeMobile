"use client";
import Link from 'next/link';

export default function Header() {
  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-3">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Captionize Logo"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="hsl(var(--primary))" />
              <stop offset="1" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path
            d="M16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28Z"
            stroke="url(#logoGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 12L21 16L13 20V12Z"
            stroke="url(#logoGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xl font-bold tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* Auth components can be added here */}
      </div>
    </header>
  );
}
