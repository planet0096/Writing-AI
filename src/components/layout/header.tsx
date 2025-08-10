
"use client";

import Link from 'next/link';
import { BookOpen, Menu, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { NAV_LINKS } from '@/config/nav-links';
import { useSidebar } from '../ui/sidebar';

export default function Header() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { toggleSidebar } = useSidebar();


  useEffect(() => {
    // Only trainers should listen for these specific notifications.
    if (!user || role !== 'trainer') {
        setUnreadNotifications(0);
        return;
    };

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    }, (error) => {
        // This will help debug if the trainer themselves has an issue.
        console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [user, role]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu />
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {!loading && user && (
                <>
                 {role === 'trainer' && (
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadNotifications > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        )}
                    </Button>
                 )}
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem asChild>
                       <Link href={role === 'trainer' ? '/trainer/dashboard' : '/student/dashboard'}>Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                       <Link href="/profile">Profile Settings</Link>
                    </DropdownMenuItem>
                     {role === 'trainer' && (
                       <DropdownMenuItem asChild>
                         <Link href="/trainer/settings">Trainer Settings</Link>
                       </DropdownMenuItem>
                     )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              )
            }
        </div>
      </div>
    </header>
  );
}
