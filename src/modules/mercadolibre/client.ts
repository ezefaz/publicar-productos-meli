import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { httpRequest } from '../../lib/http';
import {
  MLCategoryAttribute,
  MLCategorySuggestion,
  MLCreateItemResponse,
  MLPictureUploadResponse
} from '../../types/mercadolibre';
import { TokenManager } from '../auth/token-manager';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: BodyInit;
  headers?: Record<string, string>;
  retryOnUnauthorized?: boolean;
  useAuth?: boolean;
};

export class MercadoLibreClient {
  constructor(private readonly tokenManager: TokenManager) {}

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const makeRequest = async () => {
      const url = `${env.ML_API_BASE_URL}${path}`;
      const headers: Record<string, string> = {
        ...options.headers
      };

      if (options.useAuth !== false) {
        const token = this.tokenManager.getAccessToken();
        headers.Authorization = `Bearer ${token}`;
      }

      return httpRequest<T>(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body
      });
    };

    try {
      return await makeRequest();
    } catch (error: unknown) {
      const status = error instanceof AppError ? error.statusCode : undefined;
      const shouldRetry = options.retryOnUnauthorized !== false && status === 401;
      if (!shouldRetry) {
        throw error;
      }
      await this.tokenManager.refreshAccessToken();
      return makeRequest();
    }
  }

  async suggestCategories(query: string): Promise<MLCategorySuggestion[]> {
    const safeQuery = encodeURIComponent(query);
    return this.request<MLCategorySuggestion[]>(
      `/sites/${env.ML_SITE_ID}/domain_discovery/search?limit=8&q=${safeQuery}`,
      { useAuth: false }
    );
  }

  async getCategoryAttributes(categoryId: string): Promise<MLCategoryAttribute[]> {
    return this.request<MLCategoryAttribute[]>(`/categories/${categoryId}/attributes`, { useAuth: false });
  }

  async uploadPicture(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<MLPictureUploadResponse> {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    form.append('file', blob, fileName);

    return this.request<MLPictureUploadResponse>('/pictures/items/upload', {
      method: 'POST',
      body: form
    });
  }

  async createItem(payload: unknown): Promise<MLCreateItemResponse> {
    return this.request<MLCreateItemResponse>('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async createDescription(itemId: string, plainText: string): Promise<void> {
    await this.request(`/items/${itemId}/description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plain_text: plainText })
    });
  }
}
