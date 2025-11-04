import CaptionEditor from '@/components/caption-editor';
import Header from '@/components/layout/header';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col">
        <CaptionEditor />
      </main>
    </div>
  );
}
