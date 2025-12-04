"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const showSignInButton = !user && pathname !== '/auth/signin';

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/icon.png" alt="Captionize Logo" width="24" height="24" />
        <span className="font-semibold text-xl tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <UserNav />
        ) : showSignInButton ? (
          <Button onClick={() => router.push('/auth/signin')} variant="outline">
            Sign In
          </Button>
        ) : null}
      </div>
    </header>
  );
}
