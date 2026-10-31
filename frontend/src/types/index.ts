/**
 * Standard API Envelope agreed across backend and frontend:
 * { "success": boolean, "data": T, "message": string, "errors": any }
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  errors?: any;
}

// User & Role models
export type UserRole = 'admin' | 'staff' | 'customer';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

// Product & Variant (Exact fields from backend products.repository.js & DDL)
export interface Product {
  id: string;
  name: string;
  type: string;
  sales_price: string | number;
  cost_price?: string | number;
  notes?: string | null;
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // e.g. "Odoo Brand"
  price_adjustment: string | number; // e.g. "560.00"
  created_at?: string;
  updated_at?: string;
}

// Plan (Exact fields from backend plans.repository.js & DDL)
export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  id: string;
  product_id: string;
  price: string | number;
  frequency: BillingFrequency;
  min_quantity: number;
  available_from?: string | null;
  available_until?: string | null;
  auto_close: boolean;
  allow_early_close: boolean;
  allow_pause: boolean;
  allow_renew: boolean;
  created_at?: string;
  updated_at?: string;
}

// Subscription
export type SubscriptionStatus = 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Closed';

export interface SubscriptionLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  customer_name?: string;
  plan_id: string;
  plan_name?: string;
  start_date: string;
  expiry_date?: string;
  payment_terms: string;
  status: SubscriptionStatus;
  lines: SubscriptionLine[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  created_at: string;
}

// Invoice
export type InvoiceStatus = 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id: string;
  customer_id: string;
  customer_name?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  created_at: string;
}

// Payment
export interface Payment {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  amount: number;
  method: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

// Dashboard Overview
export interface DashboardMetrics {
  active_subscriptions_count: number;
  revenue_received: number;
  outstanding_amount: number;
  overdue_invoices_count: number;
  currency?: string;
}
