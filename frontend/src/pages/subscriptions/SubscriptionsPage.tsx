import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  BadgeVariant,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Input,
  Select,
  Breadcrumbs,
  EmptyState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Plus, Repeat, RefreshCw, Play, Pause, XCircle, Send, CheckCircle2 } from 'lucide-react';

interface SubscriptionLine {
  id?: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: string;
  description: string;
  variant_adjustment?: string;
  tax_rate_percent?: string;
}

interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  plan_id: string;
  start_date: string;
  expiry_date: string;
  payment_terms: string;
  status: 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed';
  subtotal: string;
  next_billing_date?: string | null;
  billing_anchor_date?: string | null;
  lines?: SubscriptionLine[];
}

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const { toast } = useToast();

  // Create form state
  const [formData, setFormData] = useState({
    customer_id: 'cbe10cf2-fefe-48d0-ba26-9af9d53fa2f7',
    plan_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    payment_terms: 'NET-15',
    product_id: '',
    quantity: 1,
    tax_id: '',
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: Subscription[] }>('/subscriptions');
      if (res.success && res.data) {
        setSubscriptions(res.data.items || []);
      }
    } catch {
      toast({ title: 'Error', message: 'Failed to load subscriptions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [prodRes, planRes, taxRes] = await Promise.all([
        api.get<any>('/products'),
        api.get<any>('/plans'),
        api.get<any>('/taxes'),
      ]);
      if (prodRes.success && prodRes.data?.items) setProducts(prodRes.data.items);
      if (planRes.success && planRes.data?.items) {
        setPlans(planRes.data.items);
        if (planRes.data.items.length > 0) {
          setFormData((prev) => ({ ...prev, plan_id: planRes.data.items[0].id }));
        }
      }
      if (taxRes.success && taxRes.data?.items) {
        setTaxes(taxRes.data.items);
        if (taxRes.data.items.length > 0) {
          setFormData((prev) => ({ ...prev, tax_id: taxRes.data.items[0].id }));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    loadDependencies();
  }, []);

  const handleTransition = async (id: string, action: string) => {
    try {
      const res = await api.post<any>(`/subscriptions/${id}/transition`, { action });
      if (res.success) {
        toast({ title: 'Success', message: `Subscription transitioned: ${action}`, type: 'success' });
        fetchSubscriptions();
      } else {
        toast({ title: 'Action Failed', message: res.message || 'Cannot perform transition', type: 'error' });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error during transition', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        customer_id: formData.customer_id,
        plan_id: formData.plan_id,
        start_date: formData.start_date,
        expiry_date: formData.expiry_date,
        payment_terms: formData.payment_terms,
        lines: [
          {
            product_id: formData.product_id || (products[0] ? products[0].id : ''),
            quantity: Number(formData.quantity) || 1,
            tax_id: formData.tax_id || (taxes[0] ? taxes[0].id : undefined),
          },
        ],
      };
      const res = await api.post<any>('/subscriptions', payload);
      if (res.success) {
        toast({ title: 'Created', message: 'Subscription created successfully', type: 'success' });
        setIsModalOpen(false);
        fetchSubscriptions();
      } else {
        toast({ title: 'Creation Failed', message: res.message || 'Failed to create subscription', type: 'error' });
      }
    } catch {
      toast({ title: 'Error', message: 'Network error creating subscription', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'active': return 'success';
      case 'confirmed': return 'default';
      case 'quotation': return 'warning';
      case 'paused': return 'neutral';
      case 'closed': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: 'Subscriptions' }]} />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Subscription Lifecycle Management
            <Badge variant="success">Connected to Supabase</Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Track end-to-end customer recurring contracts: Draft → Quotation → Confirmed → Active → Closed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSubscriptions} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Subscription
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Active & Historical Subscriptions</CardTitle>
            <CardDescription>Deterministic ledger records persisted in Supabase database</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading subscriptions...</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Repeat className="w-8 h-8" />}
                title="No Subscriptions Found"
                description="Create a new subscription from an available product and plan."
                actionLabel="Create Subscription"
                onAction={() => setIsModalOpen(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription #</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Next Billing Date</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lifecycle Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-semibold text-slate-900">{sub.subscription_number}</TableCell>
                    <TableCell className="text-slate-600">{sub.start_date}</TableCell>
                    <TableCell className="text-slate-600">{sub.next_billing_date || '—'}</TableCell>
                    <TableCell className="font-medium text-slate-900">₹{sub.subtotal}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sub.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleTransition(sub.id, 'send_quotation')} leftIcon={<Send className="w-3 h-3" />}>
                            Send Quotation
                          </Button>
                        )}
                        {sub.status === 'quotation' && (
                          <Button size="sm" variant="primary" onClick={() => handleTransition(sub.id, 'confirm')} leftIcon={<CheckCircle2 className="w-3 h-3" />}>
                            Confirm
                          </Button>
                        )}
                        {sub.status === 'confirmed' && (
                          <Button size="sm" variant="primary" onClick={() => handleTransition(sub.id, 'activate')} leftIcon={<Play className="w-3 h-3" />}>
                            Activate
                          </Button>
                        )}
                        {sub.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => handleTransition(sub.id, 'pause')} leftIcon={<Pause className="w-3 h-3" />}>
                            Pause
                          </Button>
                        )}
                        {sub.status === 'paused' && (
                          <Button size="sm" variant="primary" onClick={() => handleTransition(sub.id, 'resume')} leftIcon={<Play className="w-3 h-3" />}>
                            Resume
                          </Button>
                        )}
                        {sub.status !== 'closed' && (
                          <Button size="sm" variant="outline" onClick={() => handleTransition(sub.id, 'close')} leftIcon={<XCircle className="w-3 h-3 text-rose-500" />}>
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Subscription Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Subscription">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Recurring Plan</label>
            <Select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              options={plans.map((p) => ({ value: p.id, label: `${p.name} (${p.frequency} - ₹${p.price})` }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product</label>
            <Select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              options={products.map((pr) => ({ value: pr.id, label: `${pr.name} (Base: ₹${pr.sales_price})` }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              Create Subscription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
