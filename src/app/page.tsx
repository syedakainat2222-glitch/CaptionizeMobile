

import CaptionEditor from '@/components/caption-editor';
import { UserProvider } from '@/hooks/use-user';

export default function Home() {
  return (
    <UserProvider>
      <main className="flex flex-1 flex-col">
        <div className="container mx-auto px-4 py-8">
          <CaptionEditor />
        </div>
      </main>
    </UserProvider>
  );
}
