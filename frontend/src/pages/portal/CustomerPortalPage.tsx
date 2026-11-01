import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';
import { Repeat, Receipt } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPortalData = async () => {
      setLoading(true);
      try {
        const [subRes, invRes] = await Promise.all([
          api.get<any>('/subscriptions'),
          api.get<any>('/invoices'),
        ]);
        if (subRes.success && subRes.data?.items) {
          setSubscriptions(subRes.data.items);
        }
        if (invRes.success && invRes.data?.items) {
          setInvoices(invRes.data.items);
        }
      } catch {
        toast({ title: 'Error', message: 'Failed to load customer portal data', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, []);

  const activeSub = subscriptions.find((s) => s.status === 'active') || subscriptions[0];

  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1329] to-[#1e293b] p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="success">Customer Portal Active</Badge>
              <span className="text-xs text-slate-300">Signed in as {user?.email}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Self-Service Subscription Hub</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Securely view active subscription cycles, download billing records, and review itemized tax calculations.
            </p>
          </div>
        </div>
      </div>

      {/* Subscription & Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My Subscription</CardTitle>
              <CardDescription>Directly bound to authenticated account ({user?.id?.slice(0, 8)}...)</CardDescription>
            </div>
            {activeSub ? (
              <Badge variant={activeSub.status === 'active' ? 'success' : 'default'}>
                {activeSub.status.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant="neutral">No Active Plan</Badge>
            )}
          </CardHeader>
          <CardContent className="py-4">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading subscription details...</div>
            ) : activeSub ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Contract Number:</span>
                  <span className="font-semibold text-slate-900">{activeSub.subscription_number}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Start Date:</span>
                  <span className="font-medium text-slate-800">{activeSub.start_date}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Next Billing Maturity:</span>
                  <span className="font-bold text-blue-600">{activeSub.next_billing_date || 'Periodic Anchor'}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Contract Subtotal:</span>
                  <span className="font-bold text-slate-900">₹{activeSub.subtotal}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Repeat className="w-8 h-8" />}
                title="No Subscription Found"
                description="Your account currently has no active plans assigned."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Reconciliation Status</CardTitle>
              <CardDescription>Payment ledger reflection from Supabase</CardDescription>
            </div>
            <Badge variant="success">Verified</Badge>
          </CardHeader>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Payment Terms:</span>
                <span className="font-semibold text-slate-800">{activeSub?.payment_terms || 'NET-15'}</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Accepted Settlement:</span>
                <span className="font-medium text-slate-800">Bank Transfer / UPI / Cards</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Invoices Billed:</span>
                <span className="font-bold text-slate-900">{invoices.length} Issued</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Invoices & Payment Receipts</CardTitle>
            <CardDescription>Retrieved strictly for your authenticated tenant account</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<Receipt className="w-8 h-8" />}
                title="No Invoices Issued"
                description="All invoices generated for your subscriptions will appear here with full tax breakdowns."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {inv.billing_period_start} → {inv.billing_period_end_exclusive}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{inv.due_date}</TableCell>
                    <TableCell className="font-bold text-slate-900">₹{inv.total}</TableCell>
                    <TableCell className="font-bold text-amber-700">
                      ₹{inv.financials?.balance_due || inv.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'confirmed' ? 'default' : 'neutral'}>
                        {inv.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
