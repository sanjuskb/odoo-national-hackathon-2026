import React, { useState } from 'react';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge, DropdownMenu } from '@/components/ui';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, title = 'Dashboard' }) => {
  const { user, role, logout } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-800 tracking-tight">{title}</h1>
        </div>
      </div>

      {/* Middle: Chargebee-style search UI placeholder */}
      <div className="hidden lg:flex items-center w-72">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subscriptions, customers, invoices"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            disabled
            title="Search interface placeholder — will connect in Phase 2"
          />
        </div>
      </div>

      {/* Right: Authenticated Role, Notifications & User Dropdown */}
      <div className="flex items-center gap-3">
        {/* Verified Server-Authorized Role Badge */}
        {role && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold capitalize text-slate-900">{role}</span>
          </div>
        )}

        {/* Notifications Placeholder */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Notifications</span>
                <Badge variant="neutral">0 New</Badge>
              </div>
              <div className="py-6 text-center text-xs text-slate-500">
                No active billing notifications.
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown Menu */}
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || <User className="w-4 h-4" />}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-800 leading-none">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-500 leading-none mt-1">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          }
          items={[
            {
              label: 'Sign Out',
              icon: <LogOut className="w-3.5 h-3.5" />,
              variant: 'danger',
              onClick: logout,
            },
          ]}
        />
      </div>
    </header>
  );
};
