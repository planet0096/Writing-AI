import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <p className="text-sm font-semibold font-headline text-primary">
              IELTS Pen
            </p>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} IELTS Pen. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Terms
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
