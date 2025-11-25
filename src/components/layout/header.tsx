"use client";
import Link from 'next/link';
import { Film } from 'lucide-react';

export default function Header() {
  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
          <Film className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        </div>
        <span className="font-semibold text-xl tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* AuthButton has been removed */}
      </div>
    </header>
  );
}
