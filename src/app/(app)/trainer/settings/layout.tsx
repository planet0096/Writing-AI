
"use client";

import { SidebarNav } from "@/app/profile/_components/sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { Shield, CreditCard, Gem } from "lucide-react";

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
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-6">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold font-headline">Settings</h1>
          <p className="text-muted-foreground">
            Manage your trainer account settings and payment configurations.
          </p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
