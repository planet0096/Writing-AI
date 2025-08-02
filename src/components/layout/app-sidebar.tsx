
"use client";

import { useAuth } from "@/contexts/auth-context";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar";
import { NAV_LINKS } from "@/config/nav-links";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

export default function AppSidebar({ role }: { role: 'student' | 'trainer' | null }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const links = role ? NAV_LINKS[role] : [];
    
    return (
        <div className="flex flex-col h-full text-sidebar-foreground">
            <div className="p-4 flex items-center gap-2">
                 <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="font-semibold text-lg text-card-foreground">IELTS Prep Hub</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                <SidebarMenu>
                    {links.map((link) => (
                        <SidebarMenuItem key={link.href}>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname.startsWith(link.href)}
                                tooltip={{ children: link.label, side: "right" }}
                            >
                                <Link href={link.href}>
                                    {link.icon}
                                    <span>{link.label}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </div>
            <div className="p-4 border-t border-sidebar-border">
                {/* Footer content if any */}
            </div>
        </div>
    )
}
