
import AuthGuard from '@/components/auth/auth-guard';
import CaptionEditor from '@/components/caption-editor';

export default function Home() {
  return (
    <AuthGuard>
      <main className="flex flex-1 flex-col">
        <div className="container mx-auto px-4 py-8">
          <CaptionEditor />
        </div>
      </main>
    </AuthGuard>
  );
}
