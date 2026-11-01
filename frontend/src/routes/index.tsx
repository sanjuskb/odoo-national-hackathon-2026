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
import { SubscriptionsPage } from '@/pages/subscriptions/SubscriptionsPage';
import { InvoicesPage } from '@/pages/invoices/InvoicesPage';
import { PaymentsPage } from '@/pages/payments/PaymentsPage';
import { CustomerPortalPage } from '@/pages/portal/CustomerPortalPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { QuotationTemplatesPage } from '@/pages/quotations/QuotationTemplatesPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { AIAssistantWidget } from '@/components/assistant/AIAssistantWidget';

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
                <QuotationTemplatesPage />
              </ProtectedRoute>
            }
          />

          {/* Subscriptions Lifecycle Module */}
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <SubscriptionsPage />
              </ProtectedRoute>
            }
          />

          {/* Invoices & Scheduled Billing Module */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />

          {/* Recorded Payments Module */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />

          {/* Customers Directory (Admin & Staff) */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']}>
                <CustomersPage />
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
                <SettingsPage />
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
