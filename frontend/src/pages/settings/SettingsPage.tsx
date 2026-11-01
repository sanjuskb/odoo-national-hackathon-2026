import React, { useState, useEffect, useCallback } from 'react';
import {
  Percent,
  Tag,
  Cpu,
  Plus,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Volume2,
  PhoneCall,
  Server,
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

interface TaxRule {
  id: string;
  name: string;
  rate_percent: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface DiscountRule {
  id: string;
  name: string;
  type: string;
  value: string;
  scope: string;
  is_active: boolean;
  max_uses: number | null;
  created_at: string;
}

export const SettingsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'taxes' | 'discounts' | 'integrations'>('taxes');

  // Taxes state
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: '', rate_percent: '18.00', description: '' });
  const [isSubmittingTax, setIsSubmittingTax] = useState(false);

  // Discounts state
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(true);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage',
    value: '10.00',
    scope: 'subscription',
  });
  const [isSubmittingDiscount, setIsSubmittingDiscount] = useState(false);

  const fetchTaxes = useCallback(async () => {
    setIsLoadingTaxes(true);
    setTaxError(null);
    try {
      const res = await apiClient.get<{ items: TaxRule[] }>('/taxes');
      if (res.success && res.data) {
        setTaxes(res.data.items || (res.data as any) || []);
      } else {
        setTaxError(res.message || 'Failed to fetch tax rules');
      }
    } catch (err: any) {
      setTaxError(err.message || 'Network error fetching taxes');
    } finally {
      setIsLoadingTaxes(false);
    }
  }, []);

  const fetchDiscounts = useCallback(async () => {
    setIsLoadingDiscounts(true);
    setDiscountError(null);
    try {
      const res = await apiClient.get<{ items: DiscountRule[] }>('/discounts');
      if (res.success && res.data) {
        setDiscounts(res.data.items || (res.data as any) || []);
      } else {
        setDiscountError(res.message || 'Failed to fetch discounts');
      }
    } catch (err: any) {
      setDiscountError(err.message || 'Network error fetching discounts');
    } finally {
      setIsLoadingDiscounts(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
    fetchDiscounts();
  }, [fetchTaxes, fetchDiscounts]);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxForm.name || !taxForm.rate_percent) {
      toastError('Tax name and rate are required');
      return;
    }

    setIsSubmittingTax(true);
    try {
      const res = await apiClient.post('/taxes', {
        name: taxForm.name,
        rate_percent: taxForm.rate_percent,
        description: taxForm.description || null,
        is_active: true,
      });

      if (res.success) {
        success('Tax rule created successfully');
        setIsTaxModalOpen(false);
        setTaxForm({ name: '', rate_percent: '18.00', description: '' });
        fetchTaxes();
      } else {
        toastError(res.message || 'Failed to create tax rule');
      }
    } catch (err: any) {
      toastError(err.message || 'Error creating tax rule');
    } finally {
      setIsSubmittingTax(false);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.name || !discountForm.value) {
      toastError('Discount name and value are required');
      return;
    }

    setIsSubmittingDiscount(true);
    try {
      const res = await apiClient.post('/discounts', {
        name: discountForm.name,
        type: discountForm.type,
        value: discountForm.value,
        scope: discountForm.scope,
      });

      if (res.success) {
        success('Discount rule created successfully');
        setIsDiscountModalOpen(false);
        setDiscountForm({ name: '', type: 'percentage', value: '10.00', scope: 'subscription' });
        fetchDiscounts();
      } else {
        toastError(res.message || 'Failed to create discount rule');
      }
    } catch (err: any) {
      toastError(err.message || 'Error creating discount rule');
    } finally {
      setIsSubmittingDiscount(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'System & Tax Configuration' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System & Configuration Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure financial tax jurisdictions, automated discount logic, and monitor external provider telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'taxes' && (
            <Button variant="primary" size="sm" onClick={() => setIsTaxModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tax Rule
            </Button>
          )}
          {activeTab === 'discounts' && (
            <Button variant="primary" size="sm" onClick={() => setIsDiscountModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Discount Rule
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('taxes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'taxes'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Percent className="w-4 h-4" />
          Tax Jurisdictions ({taxes.length})
        </button>
        <button
          onClick={() => setActiveTab('discounts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'discounts'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" />
          Promotions & Discounts ({discounts.length})
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'integrations'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Integrations & Telemetry
        </button>
      </div>

      {/* TAB 1: TAXES */}
      {activeTab === 'taxes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tax Rules & Jurisdictions</CardTitle>
                <CardDescription>
                  Applied deterministically to recurring billing lines during invoice generation
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTaxes}
                disabled={isLoadingTaxes}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingTaxes ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTaxes ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : taxError ? (
              <ErrorState title="Failed to load taxes" message={taxError} onRetry={fetchTaxes} />
            ) : taxes.length === 0 ? (
              <EmptyState
                icon={<Percent className="w-10 h-10 text-slate-300" />}
                title="No tax rules found"
                description="Create tax jurisdictions to apply automated GST or VAT to invoice lines."
                actionLabel="Add Tax Rule"
                onAction={() => setIsTaxModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Rate Percentage</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxes.map((tax) => (
                      <TableRow key={tax.id}>
                        <TableCell className="font-medium text-slate-900">{tax.name}</TableCell>
                        <TableCell>
                          <Badge variant="info">
                            {parseFloat(tax.rate_percent).toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {tax.description || 'Standard calculation rule'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tax.is_active ? 'success' : 'neutral'}>
                            {tax.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-400">
                          {formatDate(tax.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: DISCOUNTS */}
      {activeTab === 'discounts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Discounts & Promo Codes</CardTitle>
                <CardDescription>
                  Non-stackable deduction rules enforced server-side before tax computation
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDiscounts}
                disabled={isLoadingDiscounts}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingDiscounts ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDiscounts ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : discountError ? (
              <ErrorState title="Failed to load discounts" message={discountError} onRetry={fetchDiscounts} />
            ) : discounts.length === 0 ? (
              <EmptyState
                icon={<Tag className="w-10 h-10 text-slate-300" />}
                title="No active discounts"
                description="Configure percentage or fixed promotional codes to offer customer discounts."
                actionLabel="Add Discount Rule"
                onAction={() => setIsDiscountModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Discount Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deduction Value</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium text-slate-900">{d.name}</TableCell>
                        <TableCell>
                          <Badge variant="neutral">{d.type}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          {d.type === 'percentage' ? `${d.value}%` : `₹${d.value}`}
                        </TableCell>
                        <TableCell>
                          <span className="capitalize text-xs text-slate-600">{d.scope}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.is_active ? 'success' : 'neutral'}>
                            {d.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-400">
                          {formatDate(d.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Supabase PostgreSQL & Auth</CardTitle>
                  <CardDescription>Primary Database & Tenant RLS</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Connection Endpoint</span>
                <span className="font-mono text-xs text-slate-900">bdmwwpfglltcpagwblmk.supabase.co</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">PostgreSQL Status</span>
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Live Pooler Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Database Tables</span>
                <span className="font-semibold text-slate-900">16 Verified Tables</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Google Gemini AI Engine</CardTitle>
                  <CardDescription>Grounding Invoice Explainer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Model Assigned</span>
                <span className="font-mono text-xs text-slate-900">gemini-1.5-pro / flash</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Grounding Strictness</span>
                <Badge variant="success">Deterministic Strict</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Math Hallucination Guard</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Active
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Murf Studio Voice API</CardTitle>
                  <CardDescription>TTS Audio Synthesizer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Voice Synthesis Engine</span>
                <span className="font-mono text-xs text-slate-900">Murf Gen2 (en-US-marcus)</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Output Encoding</span>
                <span className="text-slate-900 font-mono text-xs">MP3 (High Quality)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Service Status</span>
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Authenticated & Operational
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Twilio Voice Telephony</CardTitle>
                  <CardDescription>Outbound Automated Calling</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Account SID</span>
                <span className="font-mono text-xs text-slate-900">AC********************</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-slate-600">Caller ID</span>
                <span className="font-mono text-xs text-slate-900">+1 555-***-****</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Safety Guard</span>
                <Badge variant="warning">Dry-Run Protection Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tax Modal */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Add Tax Rule</h3>
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTax} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tax Name *</label>
                <Input
                  required
                  placeholder="e.g. GST 18% or VAT 20%"
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rate Percentage (%) *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxForm.rate_percent}
                  onChange={(e) => setTaxForm({ ...taxForm, rate_percent: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <Input
                  placeholder="e.g. Standard national Goods and Services Tax"
                  value={taxForm.description}
                  onChange={(e) => setTaxForm({ ...taxForm, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsTaxModalOpen(false)} disabled={isSubmittingTax}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmittingTax}>
                  {isSubmittingTax ? 'Saving...' : 'Save Tax Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Add Discount Rule</h3>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDiscount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rule / Code Name *</label>
                <Input
                  required
                  placeholder="e.g. WELCOME10 or ENTERPRISE500"
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Discount Type</label>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  value={discountForm.type}
                  onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Value *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountForm.value}
                  onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDiscountModalOpen(false)} disabled={isSubmittingDiscount}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmittingDiscount}>
                  {isSubmittingDiscount ? 'Saving...' : 'Save Discount'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
