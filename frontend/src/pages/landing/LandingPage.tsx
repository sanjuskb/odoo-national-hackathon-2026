import React from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileText,
  UserCheck,
  Bot,
  HelpCircle,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  // Role-aware primary CTA destination
  const getAppDestination = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'customer') return '/portal';
    return '/dashboard';
  };

  const ctaLabel = !isAuthenticated
    ? 'Sign In to Brightloop'
    : role === 'customer'
    ? 'Go to Customer Portal'
    : 'Open Admin Dashboard';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-900/40">
              B
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Brightloop <span className="text-xs font-semibold text-blue-400">SaaS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Platform Features
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              Subscription Workflow
            </a>
            <a href="#billing" className="hover:text-white transition-colors">
              Deterministic Invoicing
            </a>
            <Link to="/customer-services" className="hover:text-white transition-colors flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              Customer Services
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to={getAppDestination()}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                {ctaLabel}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-blue-600/15 blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 mb-6 backdrop-blur-xs">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Odoo National Hackathon 2026 — Verified SaaS Platform</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight">
            Automated Subscription Billing & Customer Intelligence
          </h1>

          <p className="mt-6 text-base text-slate-400 sm:text-lg max-w-2xl mx-auto">
            A unified subscription management platform providing multi-frequency recurrence, idempotent invoice generation, quotation lifecycles, and grounded AI customer assistance.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to={getAppDestination()}>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                {ctaLabel}
              </Button>
            </Link>
            <Link to="/customer-services">
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                Explore Help & FAQs
              </Button>
            </Link>
          </div>

          {/* Value Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Server-Authoritative Math
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Strict Multi-Tenant RBAC
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Deterministic Period Progression
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Grounded Read-Only AI
            </span>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="info">End-to-End Capabilities</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white mt-3">
              Built for Enterprise Subscription Governance
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Engineered according to official Problem Statement requirements (Sections 1–8).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-slate-800 bg-slate-900/60 p-6 text-left">
              <div className="p-3 bg-blue-500/10 rounded-xl w-fit text-blue-400 mb-4 border border-blue-500/20">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Product & Plans Catalog</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Configure products and variants with explicit price adjustments. Define recurring billing intervals: daily, weekly, monthly, and yearly with policy toggles.
              </p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 p-6 text-left">
              <div className="p-3 bg-indigo-500/10 rounded-xl w-fit text-indigo-400 mb-4 border border-indigo-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Quotation Lifecycles</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Standardized quotation blueprints prepopulating plans and lines with custom validity days. Full lifecycle progression from Draft to Confirmed Active subscription.
              </p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 p-6 text-left">
              <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 mb-4 border border-emerald-500/20">
                <Repeat className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Deterministic Invoicing</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Deterministic calculation engine enforcing exact minor units, tax jurisdictions, non-stackable discount caps, and idempotent period progression.
              </p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 p-6 text-left">
              <div className="p-3 bg-amber-500/10 rounded-xl w-fit text-amber-400 mb-4 border border-amber-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Self-Service Customer Portal</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Customers securely manage their active subscriptions, review scheduled renewals, download invoices, and request pauses or closures.
              </p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 p-6 text-left">
              <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-400 mb-4 border border-purple-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">AI Customer Assistant</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Grounded read-only assistance explaining subscription plans, line-item taxes, billing schedules, and support escalation.
              </p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 p-6 text-left">
              <div className="p-3 bg-rose-500/10 rounded-xl w-fit text-rose-400 mb-4 border border-rose-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Enterprise Role Isolation</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Server-enforced Supabase Auth and PostgreSQL Row-Level Security (RLS). Customers cannot access backoffice records, and staff cannot alter admin rules.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Subscription Workflow Section */}
      <section id="workflow" className="py-20 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="neutral">Lifecycle State Machine</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white mt-3">
              Official Subscription Workflow
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Predictable transitions with complete auditability across all subscription states.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Step 01</span>
              <h4 className="text-base font-semibold text-white mt-1">Draft & Quotation</h4>
              <p className="text-xs text-slate-400 mt-2">
                Staff preconfigures plan tiers, custom lines, tax rules, and discounts based on customer requirements.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step 02</span>
              <h4 className="text-base font-semibold text-white mt-1">Confirmation & Active</h4>
              <p className="text-xs text-slate-400 mt-2">
                Customer signs or confirms the quotation. The subscription transitions to Active and schedules next billing.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Step 03</span>
              <h4 className="text-base font-semibold text-white mt-1">Automated Invoicing</h4>
              <p className="text-xs text-slate-400 mt-2">
                Billing runner triggers recurring invoice generation. Exactly one invoice per subscription per period.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Step 04</span>
              <h4 className="text-base font-semibold text-white mt-1">Lifecycle Operations</h4>
              <p className="text-xs text-slate-400 mt-2">
                Customer self-services renewals, early cancellations, and pause schedules directly from the portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deterministic Billing Callout */}
      <section id="billing" className="py-16 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-950 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <Badge variant="success">Deterministic Finance Invariant</Badge>
            <h3 className="text-2xl font-bold text-white mt-2">
              Zero Frontend Calculations. 100% Server-Authoritative.
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Every financial computation—subtotals, taxes, discounts, and payments—is computed exclusively by the deterministic billing service in exact minor currency units. Frontend never invents or calculates ledger balances.
            </p>
          </div>
          <div className="shrink-0 flex gap-3">
            <Link to="/customer-services">
              <Button variant="outline" size="md" className="border-slate-700 text-slate-200">
                Customer Services & FAQs
              </Button>
            </Link>
            <Link to={getAppDestination()}>
              <Button variant="primary" size="md">
                Launch Application
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              B
            </div>
            <div>
              <p className="font-semibold text-slate-200">Brightloop Subscription Management Platform</p>
              <p className="text-[11px] text-slate-400">Odoo National Hackathon 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/customer-services" className="hover:text-slate-200 transition-colors">
              Help Center & FAQs
            </Link>
            <Link to="/login" className="hover:text-slate-200 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-200 transition-colors">
              Create Customer Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
