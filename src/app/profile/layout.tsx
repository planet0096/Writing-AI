

import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "./_components/sidebar-nav"
import { useAuth } from "@/contexts/auth-context"

const studentSidebarNavItems = [
  {
    title: "Profile",
    href: "/profile",
  },
  {
    title: "Change Password",
    href: "/profile/password",
  },
];

const trainerSidebarNavItems = [
   ...studentSidebarNavItems,
   {
    title: "Trainer Settings",
    href: "/trainer/settings",
  },
]


interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { role } = useAuth();
  const navItems = role === 'trainer' ? trainerSidebarNavItems : studentSidebarNavItems;
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-6">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold font-headline">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings.
          </p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={navItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  )
}
