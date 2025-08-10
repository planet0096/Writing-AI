

import { LayoutDashboard, BookCopy, BarChart3, Users, Settings, CreditCard, FileText, Bug } from "lucide-react";

export const NAV_LINKS = {
    student: [
        { href: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { href: '/student/tests', label: 'My Tests', icon: <BookCopy /> },
        { href: '/student/submissions', label: 'My Submissions', icon: <FileText /> },
        { href: '/student/plans', label: 'Buy Credits', icon: <CreditCard /> },
        { href: '/student/credits', label: 'My Credits', icon: <BarChart3 /> },
        { href: '/profile', label: 'Account', icon: <Settings /> },
        { href: '/student/debug', label: 'Debug', icon: <Bug /> }
    ],
    trainer: [
        { href: '/trainer/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { href: '/trainer/sales', label: 'Sales', icon: <BarChart3 /> },
        { href: '/trainer/tests', label: 'Tests', icon: <BookCopy /> },
        { href: '/trainer/submissions', label: 'Submissions', icon: <FileText /> },
        { href: '/trainer/students', label: 'Students', icon: <Users /> },
        { href: '/trainer/plans', label: 'Credit Plans', icon: <CreditCard /> },
        { href: '/trainer/settings', label: 'Settings', icon: <Settings /> },
        { href: '/trainer/debug', label: 'Debug', icon: <Bug /> }
    ]
};
