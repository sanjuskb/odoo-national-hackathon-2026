import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
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
  Breadcrumbs,
  EmptyState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CreditCard, RefreshCw, DollarSign } from 'lucide-react';

interface Payment {
  id: string;
  invoice_id: string;
  amount: string;
  payment_date: string;
  method: string;
  reference?: string | null;
  note?: string | null;
  created_at: string;
}

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: Payment[] }>('/payments');
      if (res.success && res.data) {
        setPayments(res.data.items || []);
      }
    } catch {
      toast({ title: 'Error', message: 'Failed to load payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalCollected = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: 'Payments' }]} />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Recorded Payments & Reconciliation
            <Badge variant="success">Persisted In Supabase</Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Audit-grade payment entries with payment method, timestamp, and linked invoice reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayments} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Collected</span>
            <div className="p-2 rounded-lg bg-emerald-100/80">
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-950 mt-2">
            ₹{totalCollected.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Across {payments.length} verified payment receipt(s)
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Payments Ledger</CardTitle>
            <CardDescription>Verified incoming settlements against approved invoices</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CreditCard className="w-8 h-8" />}
                title="No Payments Recorded Yet"
                description="Payments recorded against confirmed invoices will appear here in chronological order."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Invoice Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Audit Notes</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-slate-800">
                      {p.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-600">
                      INV-{p.invoice_id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {p.payment_date?.slice(0, 10) || p.created_at?.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 uppercase">
                      {p.method.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-700">
                      ₹{p.amount}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                      {p.note || p.reference || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="success">SETTLED</Badge>
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
