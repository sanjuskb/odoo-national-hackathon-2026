import { api } from './client';
import { Product, ProductVariant } from '@/types';

export interface ProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: string;
}

export interface ProductListResponseData {
  items: Product[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface CreateProductPayload {
  name: string;
  type?: string;
  sales_price: string | number;
  cost_price: string | number;
  notes?: string | null;
}

export interface UpdateProductPayload {
  name?: string;
  type?: string;
  sales_price?: string | number;
  cost_price?: string | number;
  notes?: string | null;
}

export interface CreateVariantPayload {
  name: string;
  price_adjustment?: string | number;
}

export interface UpdateVariantPayload {
  name?: string;
  price_adjustment?: string | number;
}

export interface ServerPriceResponseData {
  unit_price: string;
  total_price: string;
  currency: string;
}

export const productsApi = {
  // GET /api/v1/products
  list: async (params?: ProductListParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);

    const queryString = query.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return api.get<ProductListResponseData>(endpoint);
  },

  // GET /api/v1/products/:id
  getById: async (id: string) => {
    return api.get<{ product: Product }>(`/products/${id}`);
  },

  // GET /api/v1/products/:id/price?variant_id=...&quantity=...
  getPrice: async (productId: string, variantId?: string, quantity: number = 1) => {
    const query = new URLSearchParams();
    if (variantId) query.set('variant_id', variantId);
    if (quantity) query.set('quantity', quantity.toString());

    return api.get<ServerPriceResponseData>(`/products/${productId}/price?${query.toString()}`);
  },

  // POST /api/v1/products (Admin only)
  create: async (payload: CreateProductPayload) => {
    return api.post<{ product: Product }>('/products', payload);
  },

  // PATCH /api/v1/products/:id (Admin only)
  update: async (id: string, payload: UpdateProductPayload) => {
    return api.put<{ product: Product }>(`/products/${id}`, payload);
  },

  // POST /api/v1/products/:id/variants (Admin only)
  createVariant: async (productId: string, payload: CreateVariantPayload) => {
    return api.post<{ variant: ProductVariant }>(`/products/${productId}/variants`, payload);
  },

  // PATCH /api/v1/products/:id/variants/:variantId (Admin only)
  updateVariant: async (productId: string, variantId: string, payload: UpdateVariantPayload) => {
    return api.put<{ variant: ProductVariant }>(`/products/${productId}/variants/${variantId}`, payload);
  },
};

