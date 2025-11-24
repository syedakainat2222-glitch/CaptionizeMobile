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
      d="M15.5 12L8.5 7.5V16.5L15.5 12Z"
      stroke="url(#logoGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect 
      x="3" y="3" 
      width="18" height="18" 
      rx="2" 
      stroke="url(#logoGradient)" 
      strokeWidth="2"
    />
    <path d="M8 18H16" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);


export default function Header() {
  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-2 group">
        <CaptionizeLogo className="h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-5deg]" />
        <span className="font-semibold text-lg tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* AuthButton has been removed */}
      </div>
    </header>
  );
}
