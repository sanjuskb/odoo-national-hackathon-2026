import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Determine current page title
  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard Overview';
      case '/products':
        return 'Products & Variants';
      case '/plans':
        return 'Billing Plans';
      case '/quotations':
        return 'Quotation Templates';
      case '/subscriptions':
        return 'Subscriptions Management';
      case '/invoices':
        return 'Invoices & Billing';
      case '/payments':
        return 'Recorded Payments';
      case '/customers':
        return 'Customer Directory';
      case '/portal':
        return 'Customer Self-Service Portal';
      case '/customer-services':
        return 'Customer Services & Support';
      case '/settings':
        return 'Settings & Configuration';
      default:
        return 'Brightloop';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex h-full w-64 flex-col bg-[#0b1329]">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          title={getPageTitle(location.pathname)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

