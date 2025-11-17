import Link from 'next/link';
import { Film } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-card/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Film className="size-5" />
          <span>&copy; {new Date().getFullYear()} Captionize. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
