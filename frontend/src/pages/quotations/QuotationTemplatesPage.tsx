import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  EmptyState,
  ErrorState,
  Breadcrumbs,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface QuotationTemplateItem {
  id: string;
  name: string;
  plan_id: string;
  validity_days: number;
  created_at: string;
  updated_at: string;
  lines: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
  }>;
}

interface PlanOption {
  id: string;
  name: string;
  billing_period: string;
  price: string;
}

interface ProductOption {
  id: string;
  name: string;
  sales_price: string;
}

export const QuotationTemplatesPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<QuotationTemplateItem[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Template Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    plan_id: '',
    validity_days: 30,
    selected_product_id: '',
    quantity: 1,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [templatesRes, plansRes, productsRes] = await Promise.all([
        apiClient.get<{ items: QuotationTemplateItem[] }>('/quotation-templates'),
        apiClient.get<{ plans: PlanOption[] }>('/plans'),
        apiClient.get<{ products: ProductOption[] }>('/products'),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data.items || (templatesRes.data as any) || []);
      } else {
        setErrorMessage(templatesRes.message || 'Failed to load templates');
      }

      if (plansRes.success && plansRes.data) {
        setPlans((plansRes.data as any).plans || (plansRes.data as any).items || []);
      }
      if (productsRes.success && productsRes.data) {
        setProducts((productsRes.data as any).products || (productsRes.data as any).items || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error fetching data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.plan_id) {
      toastError('Template name and recurring plan are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name,
        plan_id: formData.plan_id,
        validity_days: Number(formData.validity_days) || 30,
        lines: formData.selected_product_id
          ? [
              {
                product_id: formData.selected_product_id,
                quantity: Number(formData.quantity) || 1,
              },
            ]
          : [],
      };

      const res = await apiClient.post('/quotation-templates', payload);
      if (res.success) {
        success('Quotation template created successfully');
        setIsModalOpen(false);
        setFormData({
          name: '',
          plan_id: '',
          validity_days: 30,
          selected_product_id: '',
          quantity: 1,
        });
        fetchData();
      } else {
        toastError(res.message || 'Failed to create quotation template');
      }
    } catch (err: any) {
      toastError(err.message || 'Error creating quotation template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Quotation Templates' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quotation Templates & Blueprints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standardized subscription blueprints that pre-configure recurring plans, default quantities, and validity periods.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Blueprint
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Active Templates
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{templates.length}</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Available Plans
                </p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{plans.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Standard Expiry
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">30 Days</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Template Blueprints</CardTitle>
          <CardDescription>
            Templates can be used to instantly initialize new customer subscriptions with verified lines
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : errorMessage ? (
            <ErrorState
              title="Unable to load quotation templates"
              message={errorMessage}
              onRetry={fetchData}
            />
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-10 h-10 text-slate-300" />}
              title="No quotation templates configured"
              description="Create standard quotation templates to accelerate subscription provisioning."
              actionLabel="Create Template"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Plan Reference</TableHead>
                    <TableHead>Quote Validity</TableHead>
                    <TableHead>Default Lines</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tpl) => {
                    const matchedPlan = plans.find((p) => p.id === tpl.plan_id);
                    return (
                      <TableRow key={tpl.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{tpl.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{tpl.id.substring(0, 8)}...</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">
                            {matchedPlan ? matchedPlan.name : `${tpl.plan_id.substring(0, 8)}...`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-700 text-sm">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{tpl.validity_days || 30} days</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {tpl.lines ? `${tpl.lines.length} line item(s)` : '0 lines'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDate(tpl.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/subscriptions')}
                          >
                            Use in Subscription
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Create Quotation Blueprint</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Template Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Enterprise Annual SaaS Blueprint"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Associated Recurring Plan *
                </label>
                <select
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                >
                  <option value="">Select recurring plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billing_period} - ₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Validity Period (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value, 10) || 30 })}
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Default Product Line (Optional)
                </p>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Default Product</label>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                    value={formData.selected_product_id}
                    onChange={(e) => setFormData({ ...formData, selected_product_id: e.target.value })}
                  >
                    <option value="">None (Empty line)</option>
                    {products.map((prd) => (
                      <option key={prd.id} value={prd.id}>
                        {prd.name} (₹{prd.sales_price})
                      </option>
                    ))}
                  </select>
                </div>
                {formData.selected_product_id && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Save Blueprint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
