
"use client";

import { usePathname } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Shield, CreditCard, Gem, KeyRound, Mail, Paintbrush } from 'lucide-react';


const sidebarNavItems = [
  {
    title: "Account",
    href: "/trainer/settings",
    icon: <Shield />,
  },
  {
    title: "Branding",
    href: "/trainer/settings/branding",
    icon: <Paintbrush />,
  },
  {
    title: "Evaluation Pricing",
    href: "/trainer/settings/pricing",
    icon: <Gem />,
  },
  {
    title: "Payment Methods",
    href: "/trainer/settings/payments",
    icon: <CreditCard />,
  },
  {
    title: "Gemini API Key",
    href: "/trainer/settings/api-key",
    icon: <KeyRound />,
  },
   {
    title: "Email",
    href: "/trainer/settings/email",
    icon: <Mail />,
  },
];


interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold text-slate-900">Trainer Settings</h2>
          <p className="text-sm text-slate-500">
            Manage your account settings, pricing, payments, and API keys.
          </p>
        </div>
        
        <nav className="flex border-b border-slate-200 overflow-x-auto">
          {sidebarNavItems.map((item) => (
             <Link 
                key={item.href} 
                href={item.href} 
                className={cn(
                    "flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-indigo-600",
                    pathname === item.href && "border-b-2 border-indigo-600 text-indigo-600"
                )}
             >
                {item.icon}
                {item.title}
             </Link>
          ))}
        </nav>

        <div className="flex-1 mt-6">{children}</div>
      </div>
  );
}
