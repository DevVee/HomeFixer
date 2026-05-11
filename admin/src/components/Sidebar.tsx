'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, BookOpen, Users, Briefcase, LogOut, Wrench,
  CreditCard, Bell, ClipboardList, Settings, BarChart2,
  ShieldCheck, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const NAV: (NavItem | NavGroup)[] = [
  { href: '/dashboard',              label: 'Overview',      icon: LayoutDashboard },
  {
    label: 'Users', icon: Users,
    items: [
      { href: '/dashboard/users',     label: 'All Users',    icon: Users },
    ],
  },
  {
    label: 'Providers', icon: Briefcase,
    items: [
      { href: '/dashboard/providers',              label: 'All Providers',  icon: Briefcase },
      { href: '/dashboard/providers/verification', label: 'Verification',   icon: ShieldCheck, badge: 'new' },
    ],
  },
  { href: '/dashboard/bookings',     label: 'Bookings',      icon: BookOpen },
  { href: '/dashboard/transactions', label: 'Transactions',  icon: CreditCard },
  { href: '/dashboard/notifications',label: 'Notifications', icon: Bell },
  { href: '/dashboard/audit',        label: 'Audit Logs',    icon: ClipboardList },
  { href: '/dashboard/reports',      label: 'Reports',       icon: BarChart2 },
  { href: '/dashboard/settings',     label: 'Settings',      icon: Settings },
];

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'items' in item;
}

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Users: true, Providers: true,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const linkClass = (href: string) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-orange-50 text-orange-600'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;
  };

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <Wrench size={15} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-sm">HomeFixer</span>
        <span className="ml-auto text-[10px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map((item) => {
          if (isGroup(item)) {
            const open = openGroups[item.label] ?? true;
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                {open && (
                  <div className="ml-3 pl-3 border-l border-gray-100 space-y-0.5 mt-0.5">
                    {item.items.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <Link key={sub.href} href={sub.href} className={linkClass(sub.href)}>
                          <SubIcon size={14} />
                          <span className="flex-1">{sub.label}</span>
                          {sub.badge && (
                            <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full uppercase">
                              {sub.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 shrink-0">
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
