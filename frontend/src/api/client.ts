import { ApiResponse } from '@/types';

/**
 * Base API client connecting to Express Backend /api/v1
 * Respects strict architectural requirements:
 * - Direct connection to real Express backend endpoints
 * - Authorization Bearer token attachment from verified session
 * - Zero client-side financial calculations
 * - Zero silent mock fallbacks
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem('brightloop_auth_token', token);
    } else {
      localStorage.removeItem('brightloop_auth_token');
    }
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('brightloop_auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          data: null as any,
          message: json?.message || `HTTP ${response.status}: ${response.statusText}`,
          errors: json?.errors || null,
        };
      }

      if (json && typeof json.success === 'boolean') {
        return json as ApiResponse<T>;
      }

      return {
        success: true,
        data: json as T,
        message: 'Success',
      };
    } catch (error: any) {
      return {
        success: false,
        data: null as any,
        message: 'Unable to connect to the server. Please try again later.',
        errors: error,
      };
    }
  }

  public get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
export const apiClient = api;
