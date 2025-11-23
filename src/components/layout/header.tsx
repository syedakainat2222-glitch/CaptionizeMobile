"use client";

import Link from 'next/link';
import { Clapperboard } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2 group">
          <Clapperboard className="h-7 w-7 text-primary transition-transform group-hover:rotate-[-5deg]" />
          <span className="font-bold text-xl tracking-tighter text-primary sm:inline-block">
            Captionize
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end" />
      </div>
    </header>
  );
};
