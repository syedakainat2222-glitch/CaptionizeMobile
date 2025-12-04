"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b">
      <Link href="/" className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
        <span className="font-semibold text-xl tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <UserNav />
        ) : (
          <Button onClick={() => router.push('/auth/signin')} variant="outline">
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
