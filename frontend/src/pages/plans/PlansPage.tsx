import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Calendar,
  Edit,
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  Skeleton,
  EmptyState,
  ErrorState,
  Sheet,
  Breadcrumbs,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { plansApi } from '@/api/plans';
import { productsApi } from '@/api/products';
import { Plan, Product, BillingFrequency } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export const PlansPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { success, error: toastError } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, string>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Plan Create / Edit Sheet state
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    product_id: '',
    price: '',
    frequency: 'monthly' as BillingFrequency,
    min_quantity: 1,
    available_from: '',
    available_until: '',
    auto_close: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renew: true,
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Initial load of parent products for name lookup (single product lookup per instruction)
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await productsApi.list({ page_size: 100 });
        if (res.success && res.data?.items) {
          const map: Record<string, string> = {};
          res.data.items.forEach((p) => {
            map[p.id] = p.name;
          });
          setProductsMap(map);
          setAllProducts(res.data.items);
        }
      } catch {
        // silent fallback
      }
    }
    loadProducts();
  }, []);

  // Fetch plans from backend API
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await plansApi.list({
        page: currentPage,
        page_size: 10,
        frequency: selectedFrequency !== 'all' ? (selectedFrequency as BillingFrequency) : undefined,
        product_id: selectedProductFilter !== 'all' ? selectedProductFilter : undefined,
      });

      if (res.success && res.data) {
        setPlans(res.data.items || []);
        setTotalItems(res.data.pagination.total_items);
        setTotalPages(res.data.pagination.total_pages);
      } else {
        setErrorMessage(res.message || 'Failed to retrieve recurring plans');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedFrequency, selectedProductFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Handle Create / Edit Plan Submission
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.product_id) {
      toastError('Missing product', 'Please select a parent product for this plan');
      return;
    }

    setIsSavingPlan(true);

    try {
      if (editingPlan) {
        const res = await plansApi.update(editingPlan.id, {
          product_id: planForm.product_id,
          price: planForm.price,
          frequency: planForm.frequency,
          min_quantity: planForm.min_quantity,
          available_from: planForm.available_from ? new Date(planForm.available_from).toISOString() : null,
          available_until: planForm.available_until ? new Date(planForm.available_until).toISOString() : null,
          auto_close: planForm.auto_close,
          allow_early_close: planForm.allow_early_close,
          allow_pause: planForm.allow_pause,
          allow_renew: planForm.allow_renew,
        });
        if (res.success) {
          success('Plan updated', 'Recurring billing plan has been modified');
          setIsPlanSheetOpen(false);
          fetchPlans();
        } else {
          toastError('Failed to update plan', res.message);
        }
      } else {
        const res = await plansApi.create({
          product_id: planForm.product_id,
          price: planForm.price,
          frequency: planForm.frequency,
          min_quantity: planForm.min_quantity,
          available_from: planForm.available_from ? new Date(planForm.available_from).toISOString() : null,
          available_until: planForm.available_until ? new Date(planForm.available_until).toISOString() : null,
          auto_close: planForm.auto_close,
          allow_early_close: planForm.allow_early_close,
          allow_pause: planForm.allow_pause,
          allow_renew: planForm.allow_renew,
        });
        if (res.success) {
          success('Plan created', 'New recurring plan is now active');
          setIsPlanSheetOpen(false);
          fetchPlans();
        } else {
          toastError('Failed to create plan', res.message);
        }
      }
    } catch (err: any) {
      toastError('Network error', err.message);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      product_id: allProducts[0]?.id || '',
      price: '',
      frequency: 'monthly',
      min_quantity: 1,
      available_from: '',
      available_until: '',
      auto_close: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renew: true,
    });
    setIsPlanSheetOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      product_id: plan.product_id,
      price: plan.price.toString(),
      frequency: plan.frequency,
      min_quantity: plan.min_quantity ?? 1,
      available_from: plan.available_from ? plan.available_from.substring(0, 10) : '',
      available_until: plan.available_until ? plan.available_until.substring(0, 10) : '',
      auto_close: Boolean(plan.auto_close),
      allow_early_close: Boolean(plan.allow_early_close),
      allow_pause: Boolean(plan.allow_pause),
      allow_renew: Boolean(plan.allow_renew),
    });
    setIsPlanSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: 'Billing' }, { label: 'Recurring Plans' }]} />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Recurring Billing Plans
          </h1>
          <p className="text-xs text-slate-500">
            Official PS Section 3: Billing intervals (daily, weekly, monthly, yearly), min quantity, and renewal/pause policies.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            onClick={openCreatePlan}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Plan
          </Button>
        )}
      </div>

      {/* Filter and Tabs Controls */}
      <Card className="p-4 space-y-3">
        {/* Frequency Segmented Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          {['all', 'daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
            <button
              key={freq}
              onClick={() => {
                setSelectedFrequency(freq);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                selectedFrequency === freq
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {freq}
            </button>
          ))}
        </div>

        {/* Product Filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Filter by Product:
          </span>
          <select
            value={selectedProductFilter}
            onChange={(e) => {
              setSelectedProductFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none cursor-pointer max-w-xs"
          >
            <option value="all">All Products</option>
            {allProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Plans Table View */}
      {isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load billing plans"
          message={errorMessage}
          onRetry={fetchPlans}
        />
      ) : plans.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Layers className="w-8 h-8" />}
            title="No Recurring Plans Found"
            description={
              selectedFrequency !== 'all' || selectedProductFilter !== 'all'
                ? 'No plans match the selected frequency or product filter.'
                : 'No recurring plans configured in the catalog yet.'
            }
            actionLabel={isAdmin ? 'Create First Plan' : undefined}
            onAction={isAdmin ? openCreatePlan : undefined}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associated Product</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Min Qty</TableHead>
                <TableHead>Availability Period</TableHead>
                <TableHead>Lifecycle Policies</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {productsMap[plan.product_id] || plan.product_id}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                        ID: {plan.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="capitalize">
                      {plan.frequency}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900">
                    {formatCurrency(plan.price)}
                    <span className="text-xs text-slate-400 font-normal"> / {plan.frequency}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-slate-700">
                    {plan.min_quantity}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {plan.available_from || plan.available_until ? (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(plan.available_from)} → {plan.available_until ? formatDate(plan.available_until) : 'Indefinite'}
                      </span>
                    ) : (
                      <span className="text-slate-400">Always Available</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.allow_renew && (
                        <Badge variant="success" className="text-[10px] py-0">Renewable</Badge>
                      )}
                      {plan.allow_pause && (
                        <Badge variant="info" className="text-[10px] py-0">Pausable</Badge>
                      )}
                      {plan.auto_close && (
                        <Badge variant="warning" className="text-[10px] py-0">Auto-Close</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditPlan(plan)}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        <span>Edit</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Table Pagination */}
          <div className="px-6 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </Card>
      )}

      {/* Plan Create / Edit Slide-Over Sheet */}
      <Sheet
        isOpen={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
        title={editingPlan ? 'Edit Recurring Plan' : 'Configure New Recurring Plan'}
        description="Official PS Section 3: Cost, frequency, minimum quantity and lifecycle policies."
        size="md"
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="parent-product-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Parent Product
            </label>
            <select
              id="parent-product-select"
              value={planForm.product_id}
              onChange={(e) => setPlanForm({ ...planForm, product_id: e.target.value })}
              required
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Select a Product</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.sales_price)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Recurring Price ($)"
              type="number"
              step="0.01"
              required
              placeholder="99.00"
              value={planForm.price}
              onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Billing Frequency
              </label>
              <select
                value={planForm.frequency}
                onChange={(e) => setPlanForm({ ...planForm, frequency: e.target.value as BillingFrequency })}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <Input
            label="Minimum Quantity"
            type="number"
            min="1"
            required
            value={planForm.min_quantity}
            onChange={(e) => setPlanForm({ ...planForm, min_quantity: parseInt(e.target.value, 10) || 1 })}
            helperText="Minimum seats or volume required for this plan."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Available From"
              type="date"
              value={planForm.available_from}
              onChange={(e) => setPlanForm({ ...planForm, available_from: e.target.value })}
            />
            <Input
              label="Available Until"
              type="date"
              value={planForm.available_until}
              onChange={(e) => setPlanForm({ ...planForm, available_until: e.target.value })}
            />
          </div>

          {/* Policy Toggles */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Plan Lifecycle Policies
            </p>

            <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.auto_close}
                onChange={(e) => setPlanForm({ ...planForm, auto_close: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Auto-close plan when expiry date ends</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.allow_pause}
                onChange={(e) => setPlanForm({ ...planForm, allow_pause: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow customer to pause subscription</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.allow_renew}
                onChange={(e) => setPlanForm({ ...planForm, allow_renew: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow automatic or manual plan renewal</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={planForm.allow_early_close}
                onChange={(e) => setPlanForm({ ...planForm, allow_early_close: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow early termination / cancellation</span>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsPlanSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSavingPlan}
            >
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};
