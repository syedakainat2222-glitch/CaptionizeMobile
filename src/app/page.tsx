import CaptionEditor from '@/components/caption-editor';
import { UserProvider } from '@/hooks/use-user';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <nav className="flex items-center gap-4 text-lg font-medium">
            <Link href="/" className="text-primary border-b-2 border-primary pb-1">
              Automatic Subtitle Generation
            </Link>
          </nav>
        </div>
        <UserProvider>
          <CaptionEditor />
        </UserProvider>
      </div>
    </main>
  );
}
