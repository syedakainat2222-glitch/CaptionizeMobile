"use client";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

const CaptionizeLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
    />
    <path
      d="M8 12H16"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 16H13"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
    />
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
