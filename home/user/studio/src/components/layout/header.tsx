"use client";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-2">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-8 h-8 rounded-full"
          poster="https://cdn.usebright.com/assets/bright-logo-inf-loop-s.mp4"
        >
          <source
            src="https://cdn.usebright.com/assets/bright-logo-inf-loop-s.mp4"
            type="video/mp4"
          />
        </video>
        <span className="font-semibold text-lg">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* AuthButton has been removed */}
      </div>
    </header>
  );
}