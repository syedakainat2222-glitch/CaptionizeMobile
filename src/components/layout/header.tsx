import { Film } from 'lucide-react';
import type { FC } from 'react';

const Header: FC = () => {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Film className="size-7 text-primary" />
          <h1 className="font-headline text-2xl font-bold text-foreground">
            Captionize
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
