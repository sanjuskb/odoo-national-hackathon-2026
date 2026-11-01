import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Repeat,
  DollarSign,
  Clock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { staggerContainer, fadeInUp } from '@/lib/animations';
import { api } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [activeSubsCount, setActiveSubsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningBilling, setRunningBilling] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes, subRes] = await Promise.all([
        api.get<any>('/reports/summary?refresh=true'),
        api.get<any>('/invoices?limit=5'),
        api.get<any>('/subscriptions?status=active'),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (invRes.success && invRes.data?.items) {
        setRecentInvoices(invRes.data.items.slice(0, 5));
      }
      if (subRes.success && subRes.data?.items) {
        setActiveSubsCount(subRes.data.items.length);
      }
    } catch {
      toast({ title: 'Error', message: 'Failed to refresh financial metrics', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunBilling = async () => {
    setRunningBilling(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.post<any>('/billing/run', { target_date: today });
      if (res.success && res.data) {
        toast({
          title: 'Billing Batch Complete',
          message: `Created: ${res.data.created}, Already Existed: ${res.data.alreadyExists}`,
          type: 'success',
        });
        fetchDashboardData();
      } else {
        toast({
          title: 'Billing Run Issue',
          message: res.message || 'No due invoices to process for today.',
          type: 'info',
        });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error executing billing run', type: 'error' });
    } finally {
      setRunningBilling(false);
    }
  };

  const metrics = [
    {
      title: 'Active Subscriptions',
      value: summary?.active_subscriptions ?? activeSubsCount ?? 0,
      subtext: `${summary?.paused_subscriptions ?? 0} paused contracts`,
      icon: <Repeat className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      title: 'Revenue Collected',
      value: summary ? `₹${summary.revenue_collected}` : '₹0.00',
      subtext: `Total invoiced: ₹${summary?.revenue_invoiced ?? '0.00'}`,
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
    },
    {
      title: 'Outstanding Receivables',
      value: summary ? `₹${summary.outstanding_balance}` : '₹0.00',
      subtext: 'Awaiting customer settlement',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
    },
    {
      title: 'Overdue Invoices',
      value: summary?.overdue_count ?? 0,
      subtext: summary?.overdue_amount ? `Total: ₹${summary.overdue_amount}` : 'None overdue',
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      bg: 'bg-rose-50',
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Subscription & Revenue Insights
            <Badge variant="success">Live Supabase Feed</Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial status, automated recurring billing pulse, and invoice collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={runningBilling}
            onClick={handleRunBilling}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Run Due Billing
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item, idx) => (
          <motion.div key={idx} variants={fadeInUp}>
            <Card className="h-full border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {item.title}
                </span>
                <div className={`p-2 rounded-lg ${item.bg}`}>{item.icon}</div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {item.value}
                </div>
                <div className="mt-2 flex items-center text-[11px] text-slate-500">
                  <span>{item.subtext}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Recurring Revenue Trend Card */}
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>Financial Reconciliation Pulse</CardTitle>
                <CardDescription>
                  Reconciled billing summary from authoritative PostgreSQL ledger
                </CardDescription>
              </div>
              <Badge variant="success">Reconciled</Badge>
            </CardHeader>
            <CardContent className="py-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Invoiced</span>
                  <span className="text-lg font-bold text-slate-900 mt-1 block">
                    ₹{summary?.revenue_invoiced ?? '0.00'}
                  </span>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <span className="text-[11px] font-medium text-emerald-700 block">Total Collected</span>
                  <span className="text-lg font-bold text-emerald-950 mt-1 block">
                    ₹{summary?.revenue_collected ?? '0.00'}
                  </span>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <span className="text-[11px] font-medium text-amber-700 block">Receivables</span>
                  <span className="text-lg font-bold text-amber-950 mt-1 block">
                    ₹{summary?.outstanding_balance ?? '0.00'}
                  </span>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <span className="text-[11px] font-medium text-blue-700 block">As of Date</span>
                  <span className="text-lg font-bold text-blue-950 mt-1 block">
                    {summary?.as_of ?? new Date().toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links Card */}
        <motion.div variants={fadeInUp}>
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>Quick Navigation</CardTitle>
                <CardDescription>Direct module management shortcuts</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 py-4">
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => navigate('/subscriptions')}
                leftIcon={<Repeat className="w-4 h-4 text-blue-600" />}
              >
                Manage Subscriptions ({summary?.active_subscriptions ?? activeSubsCount})
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => navigate('/invoices')}
                leftIcon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              >
                Inspect Invoices & Run AI Explainer
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => navigate('/payments')}
                leftIcon={<Clock className="w-4 h-4 text-purple-600" />}
              >
                View Payment Ledger
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Invoices Section */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Recent Invoices & Lifecycle Status</CardTitle>
                <CardDescription>
                  Auditable billing events generated from subscriptions (Draft → Confirmed → Paid).
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/invoices')}>
                View All Invoices
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="No Invoices Generated Yet"
                  description="Click 'Run Due Billing' above or confirm an active subscription to generate invoices."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {inv.billing_period_start} → {inv.billing_period_end_exclusive}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{inv.due_date}</TableCell>
                      <TableCell className="font-bold text-slate-900">₹{inv.total}</TableCell>
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
      </motion.div>
    </motion.div>
  );
};
