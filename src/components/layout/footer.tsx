import Link from 'next/link';
import { Film } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-card/50 text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Captionize</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/faq" className="transition-colors hover:text-foreground">
            FAQ
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
