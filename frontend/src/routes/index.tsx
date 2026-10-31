import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LandingPage } from '@/pages/landing/LandingPage';
import { CustomerServicesPage } from '@/pages/support/CustomerServicesPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { PlansPage } from '@/pages/plans/PlansPage';
import { CustomerPortalPage } from '@/pages/portal/CustomerPortalPage';
import { GenericPlaceholderPage } from '@/pages/common/GenericPlaceholderPage';
import { AIAssistantWidget } from '@/components/assistant/AIAssistantWidget';
import {
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Users,
  Settings,
} from 'lucide-react';

export const AppRoutes: React.FC = () => {
  return (
    <>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Authentication Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Customer Services & Support (Accessible publicly or from app) */}
        <Route
          path="/customer-services"
          element={
            <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
              <CustomerServicesPage />
            </div>
          }
        />

        {/* Protected Backoffice & Customer App Shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Admin & Staff Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Phase 3 Products & Variants Module (Admin & Staff) */}
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          {/* Phase 3 Recurring Plans Module (Admin & Staff) */}
          <Route
            path="/plans"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <PlansPage />
              </ProtectedRoute>
            }
          />

          {/* Quotations Blueprint Module */}
          <Route
            path="/quotations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <GenericPlaceholderPage
                  title="Quotation Templates"
                  description="Standardized quotation blueprints prepopulating plans and lines with custom validity days."
                  icon={<FileText className="w-6 h-6" />}
                  entityName="Quotation Template"
                />
              </ProtectedRoute>
            }
          />

          {/* Subscriptions Lifecycle Module */}
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <GenericPlaceholderPage
                  title="Subscriptions"
                  description="Track end-to-end customer lifecycle: Draft → Quotation → Confirmed → Active → Closed."
                  icon={<Repeat className="w-6 h-6" />}
                  entityName="Subscription"
                />
              </ProtectedRoute>
            }
          />

          {/* Invoices & Scheduled Billing Module */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <GenericPlaceholderPage
                  title="Invoices & Scheduled Billing"
                  description="Automated invoice generation engine with tax rules, discounts, and idempotent billing cycles."
                  icon={<Receipt className="w-6 h-6" />}
                  entityName="Invoice"
                />
              </ProtectedRoute>
            }
          />

          {/* Recorded Payments Module */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <GenericPlaceholderPage
                  title="Recorded Payments"
                  description="Record payments against verified invoices with method, amount, date, and audit notes."
                  icon={<CreditCard className="w-6 h-6" />}
                  entityName="Payment"
                />
              </ProtectedRoute>
            }
          />

          {/* Customers Directory (Admin & Staff) */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <GenericPlaceholderPage
                  title="Customer Directory"
                  description="Directory of verified business customer accounts and billing assignments."
                  icon={<Users className="w-6 h-6" />}
                  entityName="Customer"
                />
              </ProtectedRoute>
            }
          />

          {/* Customer Self-Service Portal (Customer, Staff & Admin) */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff', 'customer']}>
                <CustomerPortalPage />
              </ProtectedRoute>
            }
          />

          {/* System Settings (Admin Only) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <GenericPlaceholderPage
                  title="System & Tax Configuration"
                  description="Manage admin rules, tax jurisdictions, staff invitations, and global discount rules."
                  icon={<Settings className="w-6 h-6" />}
                  entityName="Setting Rule"
                />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Floating AI Assistant Widget */}
      <AIAssistantWidget />
    </>
  );
};
