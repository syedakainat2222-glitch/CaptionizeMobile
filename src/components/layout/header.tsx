"use client";
import Link from 'next/link';

const CaptionizeLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" />
        <stop offset="100%" stopColor="hsl(var(--accent))" />
      </linearGradient>
    </defs>
    <path
      d="M10.5 15.5L15 12L10.5 8.5V15.5Z"
      stroke="url(#logoGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 12C21 16.9706 16.9706 21 12 21C10.8356 21 9.72253 20.764 8.71459 20.3341C5.49888 19.202 3 15.8913 3 12C3 8.10871 5.49888 4.79799 8.71459 3.66589C9.72253 3.23602 10.8356 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="url(#logoGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);


export default function Header() {
  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-2 group">
        <CaptionizeLogo className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
        <span className="font-semibold text-lg tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* AuthButton has been removed */}
      </div>
    </header>
  );
}
