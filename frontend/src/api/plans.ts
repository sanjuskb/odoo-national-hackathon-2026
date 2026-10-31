import { api } from './client';
import { Plan, BillingFrequency } from '@/types';

export interface PlanListParams {
  page?: number;
  page_size?: number;
  frequency?: BillingFrequency;
  product_id?: string;
  available?: boolean;
}

export interface PlanListResponseData {
  items: Plan[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface CreatePlanPayload {
  product_id: string;
  price: string | number;
  frequency: BillingFrequency;
  min_quantity?: number;
  available_from?: string | null;
  available_until?: string | null;
  auto_close?: boolean;
  allow_early_close?: boolean;
  allow_pause?: boolean;
  allow_renew?: boolean;
}

export interface UpdatePlanPayload {
  product_id?: string;
  price?: string | number;
  frequency?: BillingFrequency;
  min_quantity?: number;
  available_from?: string | null;
  available_until?: string | null;
  auto_close?: boolean;
  allow_early_close?: boolean;
  allow_pause?: boolean;
  allow_renew?: boolean;
}

export const plansApi = {
  // GET /api/v1/plans
  list: async (params?: PlanListParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());
    if (params?.frequency) query.set('frequency', params.frequency);
    if (params?.product_id) query.set('product_id', params.product_id);
    if (typeof params?.available === 'boolean') query.set('available', params.available.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/plans?${queryString}` : '/plans';
    return api.get<PlanListResponseData>(endpoint);
  },

  // GET /api/v1/plans/:id
  getById: async (id: string) => {
    return api.get<{ plan: Plan }>(`/plans/${id}`);
  },

  // POST /api/v1/plans (Admin only)
  create: async (payload: CreatePlanPayload) => {
    return api.post<{ plan: Plan }>('/plans', payload);
  },

  // PATCH /api/v1/plans/:id (Admin only)
  update: async (id: string, payload: UpdatePlanPayload) => {
    return api.put<{ plan: Plan }>(`/plans/${id}`, payload);
  },
};

