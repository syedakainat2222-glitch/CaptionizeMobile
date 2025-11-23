"use client";

import Link from 'next/link';
import { Film } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2 group">
          <Film className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
          <span className="font-bold text-lg tracking-tight text-foreground sm:inline-block">Captionize</span>
        </Link>
        <div className="flex flex-1 items-center justify-end" />
      </div>
    </header>
  );
};
