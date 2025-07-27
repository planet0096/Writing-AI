

"use client";

import { SidebarNav } from "@/app/profile/_components/sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { Shield, CreditCard, Gem } from "lucide-react";
import Link from 'next/link';

const sidebarNavItems = [
  {
    title: "Pricing",
    href: "/trainer/settings",
    icon: <Gem />,
  },
  {
    title: "Payments",
    href: "/trainer/settings/payments",
    icon: <CreditCard />,
  },
   {
    title: "Account",
    href: "/profile",
    icon: <Shield />,
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <>
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold font-headline">Trainer Settings</h2>
          <p className="text-muted-foreground">
            Manage your trainer account settings and payment configurations.
          </p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
             <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                {sidebarNavItems.map((item) => (
                    <Link
                    key={item.href}
                    href={item.href}
                     className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                    {item.icon}
                    {item.title}
                    </Link>
                ))}
            </nav>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
    </>
  );
}
