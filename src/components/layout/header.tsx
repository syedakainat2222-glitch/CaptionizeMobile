"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { UserNav } from './user-nav';
import { useIsPWA } from '@/hooks/use-is-pwa'; // Add this

export default function Header() {
  const { user } = useAuth();
  const isPWA = useIsPWA(); // Add this

  return (
    <header className={`flex items-center justify-between px-4 py-3 bg-background border-b ${isPWA ? 'safe-top' : ''}`}>
      <Link href="/" className="flex items-center gap-2">
        <Image src="/icon.png" alt="Captionize Logo" width="24" height="24" />
        <span className="font-semibold text-xl tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {user && <UserNav />}
      </div>
    </header>
  );
}
