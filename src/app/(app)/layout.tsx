
'use client';

import { useAuth } from '@/contexts/auth-context';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/app-sidebar';
import AppHeader from '@/components/layout/app-header';
import { usePathname } from 'next/navigation';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();

  // Don't render sidebar for specific pages like test taking.
  const noSidebarRoutes = ['/tests'];
  const showSidebar = !noSidebarRoutes.some((route) => pathname.startsWith(route));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // This case is handled by the AuthProvider, but as a fallback.
    return null;
  }
  
  if (!showSidebar) {
      return (
        <main>{children}</main>
      )
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <AppSidebar role={role} />
      </Sidebar>
      <div className="flex flex-col w-full">
         <AppHeader />
         <main className="flex-1 overflow-y-auto bg-muted/40">
           {children}
         </main>
      </div>
    </SidebarProvider>
  );
}
