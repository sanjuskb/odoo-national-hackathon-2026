import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Repeat,
  DollarSign,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Sparkles,
  BarChart3,
  Layers,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  EmptyState,
} from '@/components/ui';
import { staggerContainer, fadeInUp } from '@/lib/animations';

export const DashboardPage: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('Current Billing Month (Oct 2026)');

  // Unpopulated KPI placeholders clearly marked as pending backend metrics
  const metricPlaceholders = [
    {
      title: 'Active Subscriptions',
      icon: <Repeat className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
    },
    {
      title: 'Revenue Collected',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
    },
    {
      title: 'Outstanding Receivables',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50',
    },
    {
      title: 'Overdue Invoices',
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
            <span className="text-xs font-normal bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
              Awaiting Backend Data
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial status, automated recurring billing pulse, and invoice collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date range filter dropdown UI */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option>Current Billing Month (Oct 2026)</option>
              <option>Last Quarter (Q3 2026)</option>
              <option>Year to Date (2026)</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Run Due Billing
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid - Strict Empty / Design Placeholder States */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricPlaceholders.map((item, idx) => (
          <motion.div key={idx} variants={fadeInUp}>
            <Card className="h-full border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {item.title}
                </span>
                <div className={`p-2 rounded-lg ${item.bg}`}>{item.icon}</div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight text-slate-400">
                  —
                </div>
                <div className="mt-2 flex items-center text-[11px] text-slate-400">
                  <span>Pending API data</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart & Breakdown Section - Honest Empty States */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Recurring Revenue Trend Card */}
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>Monthly Recurring Revenue (MRR) Pulse</CardTitle>
                <CardDescription>
                  Normalized monthly recurring billing trajectory across active plans.
                </CardDescription>
              </div>
              <Badge variant="neutral">Not Connected</Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-12">
              <div className="flex flex-col items-center justify-center text-center max-w-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">No Revenue Data to Display</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Once Amarnadh implements `/api/v1/reports/overview` and subscriptions are seeded, the recurring revenue trajectory will render here.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan Breakdown Card */}
        <motion.div variants={fadeInUp}>
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Active subscriptions by frequency</CardDescription>
              </div>
              <Badge variant="neutral">Pending</Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-12">
              <div className="flex flex-col items-center justify-center text-center max-w-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">No Active Plans</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Distribution charts will automatically populate as plans and subscriptions are confirmed.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Invoices Section - Honest Empty State */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Invoices & Lifecycle Status</CardTitle>
              <CardDescription>
                Auditable billing events generated from subscriptions (Draft → Confirmed → Paid).
              </CardDescription>
            </div>
          </CardHeader>
          <div className="py-6">
            <EmptyState
              title="No Invoices Generated Yet"
              description="Invoices will be automatically created on billing day from active subscriptions via the backend billing engine."
              actionLabel="View Subscriptions"
              onAction={() => {}}
            />
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};
