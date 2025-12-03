"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/auth/signin');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <header className="py-4 px-6 md:px-8 flex items-center justify-between border-b">
      <Link href="/" className="flex items-center gap-2.5 group">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:scale-110"
        >
          <path
            d="M4 4H20V16H4V4Z"
            className="fill-primary/20"
          />
          <path
            d="M4 18H14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
           <path
            d="M4 20H10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 9L14 12L10 15V9Z"
            className="fill-primary"
          />
        </svg>
        <span className="font-semibold text-xl tracking-tight">Captionize</span>
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        ) : (
          null
        )}
      </div>
    </header>
  );
}
