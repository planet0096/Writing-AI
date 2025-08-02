"use client";

import './globals.css';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/app-sidebar';

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === '/';
  const isPublicPage = pathname.startsWith('/ielts-writing-questions');
  const isTestTakingPage = pathname.startsWith('/tests/');

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      </div>
    );
  }

  if (isAuthPage || isPublicPage || !user) {
    return (
      <div className="relative flex min-h-dvh flex-col bg-slate-50">
        {isPublicPage && <Header />}
        <main className="flex-1">{children}</main>
        {isPublicPage && <Footer />}
      </div>
    );
  }
  
  if (isTestTakingPage) {
     return (
        <main className="bg-slate-50">{children}</main>
      )
  }

  return (
    <SidebarProvider defaultOpen>
       <Sidebar>
        <AppSidebar role={role} />
      </Sidebar>
      <div className="flex flex-col w-full bg-slate-50 dark:bg-background">
         <Header />
         <main className="flex-1 overflow-y-auto">
           {children}
         </main>
      </div>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased")}>
        <AuthProvider>
          <AppContent>{children}</AppContent>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
