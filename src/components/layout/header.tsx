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
        >
          <defs>
            <linearGradient
              id="logoGradient"
              x1="0"
              y1="0"
              x2="100%"
              y2="100%"
            >
              <stop stopColor="hsl(var(--primary))" offset="0%" />
              <stop stopColor="hsl(var(--accent))" offset="100%" />
            </linearGradient>
          </defs>
          <path
            d="M16 2.66667C8.63604 2.66667 2.66667 8.63604 2.66667 16C2.66667 23.364 8.63604 29.3333 16 29.3333C23.364 29.3333 29.3333 23.364 29.3333 16C29.3333 8.63604 23.364 2.66667 16 2.66667ZM16 26.6667C10.1093 26.6667 5.33333 21.8907 5.33333 16C5.33333 10.1093 10.1093 5.33333 16 5.33333C21.8907 5.33333 26.6667 10.1093 26.6667 16C26.6667 21.8907 21.8907 26.6667 16 26.6667Z"
            fill="url(#logoGradient)"
          />
          <path
            d="M13.3333 20L18.6667 16L13.3333 12V20Z"
            fill="url(#logoGradient)"
          />
        </svg>
        <span className="text-2xl font-bold tracking-tighter">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* AuthButton has been removed */}
      </div>
    </header>
  );
}
