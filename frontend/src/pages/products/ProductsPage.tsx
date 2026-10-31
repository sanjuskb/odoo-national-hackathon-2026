import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Sparkles,
  ExternalLink,
  Edit,
  Tag,
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
import { productsApi } from '@/api/products';
import { Product, ProductVariant } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export const ProductsPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { success, error: toastError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create / Edit Product Sheet state
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'service',
    sales_price: '',
    cost_price: '',
    notes: '',
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Variant Inspection & Management Sheet state
  const [isVariantSheetOpen, setIsVariantSheetOpen] = useState(false);
  const [activeProductForVariants, setActiveProductForVariants] = useState<Product | null>(null);
  const [variantForm, setVariantForm] = useState({
    name: '',
    price_adjustment: '',
  });
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  // Server Price Preview state (strictly calculated on backend)
  const [previewVariantId, setPreviewVariantId] = useState<string>('');
  const [previewQuantity, setPreviewQuantity] = useState<number>(1);
  const [serverPriceResult, setServerPriceResult] = useState<{ unit_price: string; total_price: string; currency: string } | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Load products list from API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await productsApi.list({
        page: currentPage,
        page_size: 10,
        search: searchQuery || undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
      });

      if (res.success && res.data) {
        setProducts(res.data.items || []);
        setTotalItems(res.data.pagination.total_items);
        setTotalPages(res.data.pagination.total_pages);
      } else {
        setErrorMessage(res.message || 'Failed to retrieve product records');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, selectedType]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Product Create / Edit Submission
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);

    try {
      if (editingProduct) {
        const res = await productsApi.update(editingProduct.id, {
          name: productForm.name,
          type: productForm.type,
          sales_price: productForm.sales_price,
          cost_price: productForm.cost_price,
          notes: productForm.notes || null,
        });
        if (res.success) {
          success('Product updated', `Saved changes to ${productForm.name}`);
          setIsProductSheetOpen(false);
          fetchProducts();
        } else {
          toastError('Failed to update product', res.message);
        }
      } else {
        const res = await productsApi.create({
          name: productForm.name,
          type: productForm.type,
          sales_price: productForm.sales_price,
          cost_price: productForm.cost_price,
          notes: productForm.notes || null,
        });
        if (res.success) {
          success('Product created', `${productForm.name} is now available`);
          setIsProductSheetOpen(false);
          fetchProducts();
        } else {
          toastError('Failed to create product', res.message);
        }
      }
    } catch (err: any) {
      toastError('Network error', err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Open Product Sheet for Edit
  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      type: prod.type,
      sales_price: prod.sales_price.toString(),
      cost_price: (prod.cost_price ?? '').toString(),
      notes: prod.notes || '',
    });
    setIsProductSheetOpen(true);
  };

  // Open Product Sheet for Create
  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      type: 'service',
      sales_price: '',
      cost_price: '',
      notes: '',
    });
    setIsProductSheetOpen(true);
  };

  // Open Variant Sheet and load variants from GET /api/v1/products/:id
  const openVariantsModal = async (prod: Product) => {
    setActiveProductForVariants(prod);
    setServerPriceResult(null);
    setPreviewVariantId('');
    setPreviewQuantity(1);
    setIsVariantSheetOpen(true);

    try {
      const res = await productsApi.getById(prod.id);
      if (res.success && res.data?.product) {
        setActiveProductForVariants(res.data.product);
      }
    } catch {
      // keep current product representation
    }
  };

  // Handle Add Variant
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProductForVariants) return;
    setIsSavingVariant(true);

    try {
      const res = await productsApi.createVariant(activeProductForVariants.id, {
        name: variantForm.name,
        price_adjustment: variantForm.price_adjustment || '0.00',
      });

      if (res.success) {
        success('Variant added', `${variantForm.name} added to ${activeProductForVariants.name}`);
        setVariantForm({ name: '', price_adjustment: '' });
        // Refresh product with updated variants
        const updatedRes = await productsApi.getById(activeProductForVariants.id);
        if (updatedRes.success && updatedRes.data?.product) {
          setActiveProductForVariants(updatedRes.data.product);
        }
        fetchProducts();
      } else {
        toastError('Failed to create variant', res.message);
      }
    } catch (err: any) {
      toastError('Network error', err.message);
    } finally {
      setIsSavingVariant(false);
    }
  };

  // Fetch Server-Computed Price Preview
  const handleQueryServerPrice = async (variantId?: string, qty: number = 1) => {
    if (!activeProductForVariants) return;
    setIsLoadingPrice(true);

    try {
      const res = await productsApi.getPrice(activeProductForVariants.id, variantId || undefined, qty);
      if (res.success && res.data) {
        setServerPriceResult(res.data);
      } else {
        toastError('Could not calculate price', res.message);
      }
    } catch (err: any) {
      toastError('Network error', err.message);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: 'Billing' }, { label: 'Products & Variants' }]} />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Products & Product Variants
          </h1>
          <p className="text-xs text-slate-500">
            Official PS Section 3: Product catalogue with sales/cost prices and variant adjustments (e.g. Odoo brand +560).
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            onClick={openCreateProduct}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Product
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="service">Service</option>
              <option value="good">Good / Product</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Products Table View */}
      {isLoading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load products"
          message={errorMessage}
          onRetry={fetchProducts}
        />
      ) : products.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No Products Found"
            description={
              searchQuery
                ? `No products match "${searchQuery}". Clear your search to view all catalog items.`
                : 'No products have been added to the system yet.'
            }
            actionLabel={isAdmin ? 'Create First Product' : undefined}
            onAction={isAdmin ? openCreateProduct : undefined}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Sales Price</TableHead>
                {isAdmin && <TableHead className="text-right">Cost Price</TableHead>}
                <TableHead>Variants</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{prod.name}</span>
                      {prod.notes && (
                        <span className="text-xs text-slate-400 line-clamp-1">{prod.notes}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="capitalize">
                      {prod.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(prod.sales_price)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right font-mono text-xs text-slate-500">
                      {prod.cost_price !== undefined ? formatCurrency(prod.cost_price) : '—'}
                    </TableCell>
                  )}
                  <TableCell>
                    <button
                      onClick={() => openVariantsModal(prod)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Manage Variants</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(prod.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openVariantsModal(prod)}
                        title="View and preview pricing"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditProduct(prod)}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          <span>Edit</span>
                        </Button>
                      )}
                    </div>
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

      {/* Product Create / Edit Slide-Over Sheet */}
      <Sheet
        isOpen={isProductSheetOpen}
        onClose={() => setIsProductSheetOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
        description="Provide standard product details, type, and sales/cost pricing."
        size="md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input
            label="Product Name"
            type="text"
            required
            placeholder="e.g. Brightloop Software Suite"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Product Type
            </label>
            <select
              value={productForm.type}
              onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="service">Service (Recurring Software License)</option>
              <option value="good">Good (Hardware / Physical Deliverable)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sales Price ($)"
              type="number"
              step="0.01"
              required
              placeholder="1200.00"
              value={productForm.sales_price}
              onChange={(e) => setProductForm({ ...productForm, sales_price: e.target.value })}
            />
            <Input
              label="Cost Price ($)"
              type="number"
              step="0.01"
              required
              placeholder="350.00"
              value={productForm.cost_price}
              onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Notes & Description
            </label>
            <textarea
              rows={3}
              placeholder="Optional administrative or contractual notes..."
              value={productForm.notes}
              onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
              className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsProductSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSavingProduct}
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Product Variants & Server-Side Pricing Sheet */}
      <Sheet
        isOpen={isVariantSheetOpen}
        onClose={() => setIsVariantSheetOpen(false)}
        title={activeProductForVariants?.name ? `${activeProductForVariants.name} — Variants & Pricing` : 'Product Variants'}
        description="Official PS Page 3: Specific product variants with price adjustments."
        size="lg"
      >
        <div className="space-y-6">
          {/* Base Product Pricing Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Base Catalog Price</p>
                <p className="text-lg font-bold font-mono text-slate-900">
                  {formatCurrency(activeProductForVariants?.sales_price)}
                </p>
              </div>
              <Badge variant="neutral">{activeProductForVariants?.type}</Badge>
            </div>
          </div>

          {/* Variants List Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Registered Product Variants</h3>
            {!activeProductForVariants?.variants || activeProductForVariants.variants.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                No variants registered yet. Choosing the base product incurs no price adjustments.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="p-2.5">Variant Name</th>
                      <th className="p-2.5 text-right">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeProductForVariants.variants.map((v: ProductVariant) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">{v.name}</td>
                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-600">
                          +{formatCurrency(v.price_adjustment)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Admin Add Variant Form */}
          {isAdmin && (
            <Card className="p-4 border-dashed border-slate-300">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Add New Variant
              </h4>
              <form onSubmit={handleSaveVariant} className="space-y-3">
                <Input
                  label="Variant Name"
                  type="text"
                  required
                  placeholder="e.g. Odoo Brand (+560)"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                />
                <Input
                  label="Price Adjustment ($)"
                  type="number"
                  step="0.01"
                  required
                  placeholder="560.00"
                  value={variantForm.price_adjustment}
                  onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: e.target.value })}
                  helperText="Amount added to unit sales price when this variant is selected."
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingVariant}
                  className="w-full mt-2"
                >
                  Save Variant
                </Button>
              </form>
            </Card>
          )}

          {/* Server-Side Pricing Verification Section */}
          <Card className="p-4 bg-blue-50/40 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Server Pricing Calculation Check
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 mb-3">
              Direct verification of the backend calculation endpoint (`GET /api/v1/products/:id/price`).
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Select Variant:</label>
                <select
                  value={previewVariantId}
                  onChange={(e) => setPreviewVariantId(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">Base Product (No Variant)</option>
                  {activeProductForVariants?.variants?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (+{v.price_adjustment})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={previewQuantity}
                  onChange={(e) => setPreviewQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQueryServerPrice(previewVariantId, previewQuantity)}
              isLoading={isLoadingPrice}
              className="w-full"
            >
              Query Backend Pricing
            </Button>

            {serverPriceResult && (
              <div className="mt-3 p-3 rounded-lg bg-white border border-blue-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Price:</span>
                  <span className="font-mono font-bold text-slate-900">${serverPriceResult.unit_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Price ({previewQuantity} qty):</span>
                  <span className="font-mono font-bold text-blue-700">${serverPriceResult.total_price} {serverPriceResult.currency}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </Sheet>
    </div>
  );
};
