"use client";
import Link from 'next/link';
import { Captions } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-2 group">
        <Captions className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
        <span className="font-semibold text-lg tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* AuthButton has been removed */}
      </div>
    </header>
  );
}
