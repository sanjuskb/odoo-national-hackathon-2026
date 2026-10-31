import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Input } from '@/components/ui';
import { HelpCircle, Mail, MessageSquare, AlertCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const CustomerServicesPage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  const faqs = [
    {
      q: 'How are recurring subscriptions billed in Brightloop?',
      a: 'Brightloop supports anchored daily, weekly, monthly, and yearly recurring frequencies. On each billing due date, the deterministic billing engine automatically generates a single itemized invoice reflecting current line items, tax rules, and active discounts.',
    },
    {
      q: 'Can I pause my active subscription without losing configuration?',
      a: 'Yes, if your plan has pause permissions enabled (allow_pause: true), you can pause your subscription directly from the Customer Portal. While paused, billing cycles are temporarily held and no new renewal invoices are produced.',
    },
    {
      q: 'How are taxes and discounts calculated on my invoice?',
      a: 'All financial calculations are computed server-side in exact integer minor units. Taxes follow assigned tax jurisdictions, and discounts adhere to non-stackable percentage or fixed deduction caps. The frontend never computes or modifies ledger amounts.',
    },
    {
      q: 'What is the procedure for early cancellation or renewal?',
      a: 'Subscriptions configured with allow_early_close can be closed at any time prior to the period end date. Subscriptions nearing expiry can be renewed either automatically or manually through your portal account.',
    },
    {
      q: 'Where do I find official invoices and receipts?',
      a: 'Confirmed invoices are available under the Invoices section of the Customer Portal. Each invoice contains date stamps, tax line breakdowns, and payment reconciliation records.',
    },
    {
      q: 'How does role-based access work for enterprise accounts?',
      a: 'Brightloop enforces multi-tenant security via Supabase Auth and PostgreSQL Row-Level Security. Customer users only see records tied strictly to their authenticated customer account ID.',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1329] to-[#1e293b] p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="info">Support & Assistance</Badge>
              <Badge variant="neutral">Read-Only Advisory</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Customer Services & Help Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Explore frequently asked questions, learn how recurring billing works, and raise support requests directly with the Brightloop operations team.
            </p>
          </div>
          {isAuthenticated && (
            <div className="shrink-0">
              <Link to={role === 'customer' ? '/portal' : '/dashboard'}>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                  {role === 'customer' ? 'My Customer Portal' : 'Admin Dashboard'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* FAQs Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clear, authoritative answers regarding plan intervals, billing policies, and security boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, i) => (
            <Card key={i} className="p-5 border-slate-200/80 bg-white shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{faq.q}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Support Request Form & Contact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Request Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div>
                <CardTitle>Raise a Support Request</CardTitle>
                <CardDescription>
                  Need assistance with your plan, invoice discrepancies, or account permissions? Submit a request below.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert('Support request submission is currently in integration-pending status. The backend ticket management service will be wired in an upcoming sprint.');
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Your Name / Account" placeholder="Jane Doe" required />
                  <Input label="Contact Email" type="email" placeholder="you@company.com" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Inquiry Category
                    </label>
                    <select className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600">
                      <option>Billing & Invoice Inquiry</option>
                      <option>Subscription Change / Upgrade</option>
                      <option>Plan Cancellation or Pause</option>
                      <option>Technical / Account Access</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Urgency
                    </label>
                    <select className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600">
                      <option>Normal Priority</option>
                      <option>High Priority (Billing Blocked)</option>
                      <option>Urgent (Production Issue)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Message / Request Details
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry or issue in detail..."
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Integration-Pending Notice:</strong> Automated ticket dispatch will connect to the team's backend support service once finalized.
                  </span>
                </div>

                <Button type="submit" variant="primary" size="md">
                  Submit Support Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information & Channels */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Direct Assistance</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Support Desk</span>
                  <p className="text-slate-500">Official support channel pending backend configuration</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Brightloop AI Assistant</span>
                  <p className="text-slate-500">Available 24/7 via the floating widget at the bottom right</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Data Privacy</span>
                  <p className="text-slate-500">All queries bound to authenticated session context</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-blue-100 bg-blue-50/50">
            <h3 className="text-sm font-bold text-blue-950">Self-Service Tip</h3>
            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
              Log in to your <strong>Customer Portal</strong> to view live subscription renewal dates, download PDF invoices, or query your active billing frequency without waiting for support response.
            </p>
            <div className="mt-3">
              <Link to={isAuthenticated ? '/portal' : '/login'}>
                <Button variant="outline" size="sm" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100">
                  {isAuthenticated ? 'Open Portal' : 'Log In to Portal'}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
