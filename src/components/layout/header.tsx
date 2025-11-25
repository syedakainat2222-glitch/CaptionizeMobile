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
    {/* Video frame */}
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="url(#logoGradient)" strokeWidth="2" />
    {/* Caption line 1 */}
    <line x1="6" y1="12" x2="14" y2="12" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" />
    {/* Caption line 2 */}
    <line x1="6" y1="16" x2="18" y2="16" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" />
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
