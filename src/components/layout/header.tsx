"use client";

import Link from 'next/link';
import { BookOpen, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const navLinks = [
    { href: '#features', label: 'Features', public: true },
    { href: '/trainer/tests', label: 'My Tests', public: false, role: 'trainer' },
    { href: '#', label: 'Pricing', public: true },
    { href: '#', label: 'Contact', public: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline inline-block">IELTS Prep Hub</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.filter(l => l.public || (l.role === role)).map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {!loading && (
            <>
              {user ? (
                <>
                  <Button variant="ghost" asChild>
                    <Link href={role === 'trainer' ? '/trainer/dashboard' : '/student/dashboard'}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button onClick={handleLogout}>Logout</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Sign Up</Link>
                  </Button>
                </>
              )}
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <Link href="/" className="mr-6 flex items-center space-x-2 mb-6">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="font-bold font-headline">IELTS Prep Hub</span>
              </Link>
              <nav className="flex flex-col gap-4">
                {navLinks.filter(l => l.public || (l.role === role)).map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
