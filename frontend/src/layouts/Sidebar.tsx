import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  Layers,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Users,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavSection {
  title: string;
  items: {
    label: string;
    to: string;
    icon: React.ReactNode;
    roles?: UserRole[];
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { user, role } = useAuth();

  const navigation: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
      ],
    },
    {
      title: 'BILLING',
      items: [
        {
          label: 'Products',
          to: '/products',
          icon: <Package className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
        {
          label: 'Plans',
          to: '/plans',
          icon: <Layers className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
        {
          label: 'Quotations',
          to: '/quotations',
          icon: <FileText className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
        {
          label: 'Subscriptions',
          to: '/subscriptions',
          icon: <Repeat className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
        {
          label: 'Invoices',
          to: '/invoices',
          icon: <Receipt className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
        {
          label: 'Payments',
          to: '/payments',
          icon: <CreditCard className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
      ],
    },
    {
      title: 'CUSTOMERS',
      items: [
        {
          label: 'Customers',
          to: '/customers',
          icon: <Users className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff'],
        },
        {
          label: 'Customer Portal',
          to: '/portal',
          icon: <UserCheck className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff', 'customer'],
          badge: role === 'customer' ? 'My Portal' : undefined,
        },
        {
          label: 'Customer Services',
          to: '/customer-services',
          icon: <FileText className="w-4 h-4 shrink-0" />,
          roles: ['admin', 'staff', 'customer'],
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          label: 'Settings',
          to: '/settings',
          icon: <Settings className="w-4 h-4 shrink-0" />,
          roles: ['admin'],
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-[#0b1329] text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800/80 select-none z-30 shrink-0',
        isCollapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30">
            B
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Brightloop
                <span className="text-[10px] font-medium bg-blue-950 text-blue-400 border border-blue-800/60 rounded px-1.5 py-0.2">
                  SaaS
                </span>
              </span>
              <span className="text-[11px] text-slate-400 truncate">Subscription Engine</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigation.map((section) => {
          // Filter items by strictly verified role from auth context
          const visibleItems = section.items.filter((item) => {
            if (!item.roles) return true;
            if (!role) return false;
            return item.roles.includes(role);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white',
                      isCollapsed && 'justify-center px-0'
                    )
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {item.icon}
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                      {!isCollapsed && item.badge && (
                        <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-400/30">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute left-0 w-1 h-5 bg-blue-400 rounded-r-full"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>

      {/* Authenticated Role Footer */}
      {!isCollapsed && user ? (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-slate-200 capitalize">
                {role} account
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-[#0b1329] text-slate-300 shadow-md hover:text-white hover:bg-slate-800 transition-colors z-40 cursor-pointer"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
};
