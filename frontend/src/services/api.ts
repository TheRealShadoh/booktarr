/**
 * Enhanced API service with TypeScript support and error handling
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Book,
  BooksResponse,
  Settings,
  SettingsResponse,
  SettingsUpdateRequest,
  UrlValidationRequest,
  UrlValidationResponse,
  SettingsInfo,
  SettingsHealth,
  APIError,
  MetadataSourcesResponse,
  UpdateReadingProgressRequest,
  ReadingProgressResponse,
  ReadingStatsResponse,
  ReadingStatus,
  WishlistItem,
  WishlistRequest,
  WishlistUpdateRequest,
  WishlistStats,
  WishlistResponse,
  PriceTracking,
  PriceTrackingResponse,
  PreOrder,
  PreOrderRequest,
  PreOrderResponse,
  AcquisitionPreference,
} from '../types';

// Dynamically determine API URL based on current hostname and environment
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Always use relative path to leverage proxy in package.json
  // This works for both localhost and network access
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔧 Booktarr API URL:', API_BASE_URL);

class BooktarrAPI {
  private api: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        const apiError = this.handleAPIError(error);
        console.error('❌ API Response Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  private handleAPIError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as any;
      return {
        message: data?.detail || data?.message || 'Server error occurred',
        status: error.response.status,
        detail: JSON.stringify(data),
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'No response from server. Please check your connection.',
        status: 0,
        detail: 'Network error',
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
        detail: 'Request setup error',
      };
    }
  }

  // Books API
  async getBooks(): Promise<BooksResponse> {
    const response = await this.api.get<BooksResponse>('/books/');
    return response.data;
  }

  async getTestBooks(): Promise<BooksResponse> {
    const response = await this.api.get<BooksResponse>('/books/test');
    return response.data;
  }


  async getBookMetadataSources(isbn: string): Promise<MetadataSourcesResponse> {
    const response = await this.api.get<MetadataSourcesResponse>(`/books/${isbn}/metadata-sources`);
    return response.data;
  }

  async enrichBookMetadata(isbn: string): Promise<any> {
    const response = await this.api.get(`/books/enrich/${isbn}`);
    return response.data;
  }

  // CSV Import API
  async importCSV(file: File, formatType: string = 'handylib', userId: number = 1): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post(`/books/import/csv?format_type=${formatType}&user_id=${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async previewCSV(file: File, formatType: string = 'handylib', limit: number = 5): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post(`/books/import/csv/preview?format_type=${formatType}&limit=${limit}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Settings API
  async getSettings(): Promise<Settings> {
    const response = await this.api.get<Settings>('/settings/');
    return response.data;
  }

  async updateSettings(settings: SettingsUpdateRequest): Promise<SettingsResponse> {
    const response = await this.api.put<SettingsResponse>('/settings/', settings);
    return response.data;
  }

  async validateUrl(request: UrlValidationRequest): Promise<UrlValidationResponse> {
    const response = await this.api.post<UrlValidationResponse>('/settings/validate-url', request);
    return response.data;
  }

  async resetSettings(): Promise<SettingsResponse> {
    const response = await this.api.post<SettingsResponse>('/settings/reset');
    return response.data;
  }

  async backupSettings(): Promise<{ message: string; backup_file: string }> {
    const response = await this.api.post('/settings/backup');
    return response.data;
  }

  async restoreSettings(backupFile: string): Promise<SettingsResponse> {
    const response = await this.api.post<SettingsResponse>('/settings/restore', {
      backup_file: backupFile,
    });
    return response.data;
  }

  async getSettingsInfo(): Promise<SettingsInfo> {
    const response = await this.api.get<SettingsInfo>('/settings/info');
    return response.data;
  }

  async getSettingsHealth(): Promise<SettingsHealth> {
    const response = await this.api.get<SettingsHealth>('/settings/health');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Utility methods
  getBaseURL(): string {
    return this.api.defaults.baseURL || API_BASE_URL;
  }

  setTimeout(timeout: number): void {
    this.api.defaults.timeout = timeout;
  }

  // Reading Progress API methods
  async updateReadingProgress(request: UpdateReadingProgressRequest): Promise<ReadingProgressResponse> {
    const response = await this.api.put<ReadingProgressResponse>('/reading/progress', request);
    return response.data;
  }

  async getReadingStats(): Promise<ReadingStatsResponse> {
    const response = await this.api.get<ReadingStatsResponse>('/reading/stats');
    return response.data;
  }

  async getBooksByStatus(status: ReadingStatus): Promise<Book[]> {
    const response = await this.api.get<Book[]>(`/reading/books/status/${status}`);
    return response.data;
  }

  async startReading(isbn: string): Promise<ReadingProgressResponse> {
    const response = await this.api.post<ReadingProgressResponse>(`/reading/books/${isbn}/start-reading`);
    return response.data;
  }

  async finishReading(isbn: string, rating?: number): Promise<ReadingProgressResponse> {
    const url = `/reading/books/${isbn}/finish-reading${rating ? `?rating=${rating}` : ''}`;
    const response = await this.api.post<ReadingProgressResponse>(url);
    return response.data;
  }

  async addToWishlist(isbn: string): Promise<ReadingProgressResponse> {
    const response = await this.api.post<ReadingProgressResponse>(`/reading/books/${isbn}/add-to-wishlist`);
    return response.data;
  }

  // ============= WISHLIST API METHODS =============

  async getWishlists(): Promise<WishlistResponse> {
    const response = await this.api.get<WishlistResponse>('/wishlist/');
    return response.data;
  }

  async addToWishlistItem(request: WishlistRequest): Promise<WishlistResponse> {
    const response = await this.api.post<WishlistResponse>('/wishlist/items', request);
    return response.data;
  }

  async getWishlistItems(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/items?wishlist_id=${wishlistId}` : '/wishlist/items';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getWishlistItem(itemId: number): Promise<WishlistResponse> {
    const response = await this.api.get<WishlistResponse>(`/wishlist/items/${itemId}`);
    return response.data;
  }

  async updateWishlistItem(itemId: number, update: WishlistUpdateRequest): Promise<WishlistResponse> {
    const response = await this.api.put<WishlistResponse>(`/wishlist/items/${itemId}`, update);
    return response.data;
  }

  async removeFromWishlist(itemId: number): Promise<WishlistResponse> {
    const response = await this.api.delete<WishlistResponse>(`/wishlist/items/${itemId}`);
    return response.data;
  }

  async getWishlistItemsByPriority(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/items/by-priority/all?wishlist_id=${wishlistId}` : '/wishlist/items/by-priority/all';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getWishlistItemsByStatus(status: string, wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId
      ? `/wishlist/items/status/${status}?wishlist_id=${wishlistId}`
      : `/wishlist/items/status/${status}`;
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getWatchingItems(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/items/watching/all?wishlist_id=${wishlistId}` : '/wishlist/items/watching/all';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getReadyToBuyItems(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/items/ready-to-buy/all?wishlist_id=${wishlistId}` : '/wishlist/items/ready-to-buy/all';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getPreOrderedItems(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/items/pre-ordered/all?wishlist_id=${wishlistId}` : '/wishlist/items/pre-ordered/all';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getOverdueItems(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/items/overdue/all?wishlist_id=${wishlistId}` : '/wishlist/items/overdue/all';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  async getWishlistStats(wishlistId?: number): Promise<WishlistResponse> {
    const url = wishlistId ? `/wishlist/stats?wishlist_id=${wishlistId}` : '/wishlist/stats';
    const response = await this.api.get<WishlistResponse>(url);
    return response.data;
  }

  // ============= ACQUISITION PREFERENCE API METHODS =============

  async getAcquisitionPreferences(): Promise<WishlistResponse> {
    const response = await this.api.get<WishlistResponse>('/wishlist/preferences');
    return response.data;
  }

  async updateAcquisitionPreferences(preferences: Partial<AcquisitionPreference>): Promise<WishlistResponse> {
    const response = await this.api.put<WishlistResponse>('/wishlist/preferences', preferences);
    return response.data;
  }

  // ============= PRICE TRACKING API METHODS =============

  async trackPrice(
    price: number,
    source: string,
    isbn?: string,
    title?: string,
    editionId?: number,
    wishlistItemId?: number,
    sourceUrl?: string
  ): Promise<PriceTrackingResponse> {
    const url = `/wishlist/prices/track?price=${price}&source=${source}${isbn ? `&isbn=${isbn}` : ''}${title ? `&title=${title}` : ''}${editionId ? `&edition_id=${editionId}` : ''}${wishlistItemId ? `&wishlist_item_id=${wishlistItemId}` : ''}${sourceUrl ? `&source_url=${sourceUrl}` : ''}`;
    const response = await this.api.post<PriceTrackingResponse>(url);
    return response.data;
  }

  async getPriceHistory(editionId?: number, wishlistItemId?: number, limit: number = 50): Promise<PriceTrackingResponse> {
    let url = `/wishlist/prices/history?limit=${limit}`;
    if (editionId) url += `&edition_id=${editionId}`;
    if (wishlistItemId) url += `&wishlist_item_id=${wishlistItemId}`;
    const response = await this.api.get<PriceTrackingResponse>(url);
    return response.data;
  }

  async getCurrentPrice(editionId?: number, wishlistItemId?: number): Promise<PriceTrackingResponse> {
    let url = '/wishlist/prices/current';
    if (editionId) url += `?edition_id=${editionId}`;
    if (wishlistItemId) url += `${editionId ? '&' : '?'}wishlist_item_id=${wishlistItemId}`;
    const response = await this.api.get<PriceTrackingResponse>(url);
    return response.data;
  }

  async detectPriceDrops(thresholdPercent: number = 10): Promise<PriceTrackingResponse> {
    const response = await this.api.get<PriceTrackingResponse>(`/wishlist/prices/drops?threshold_percent=${thresholdPercent}`);
    return response.data;
  }

  async getPriceTrend(editionId?: number, wishlistItemId?: number): Promise<PriceTrackingResponse> {
    let url = '/wishlist/prices/trend';
    if (editionId) url += `?edition_id=${editionId}`;
    if (wishlistItemId) url += `${editionId ? '&' : '?'}wishlist_item_id=${wishlistItemId}`;
    const response = await this.api.get<PriceTrackingResponse>(url);
    return response.data;
  }

  // ============= PRE-ORDER API METHODS =============

  async createPreOrder(request: PreOrderRequest): Promise<PreOrderResponse> {
    const response = await this.api.post<PreOrderResponse>('/wishlist/preorders', request);
    return response.data;
  }

  async getActivePreOrders(): Promise<PreOrderResponse> {
    const response = await this.api.get<PreOrderResponse>('/wishlist/preorders/active');
    return response.data;
  }

  async getUpcomingReleases(daysAhead: number = 30): Promise<PreOrderResponse> {
    const response = await this.api.get<PreOrderResponse>(`/wishlist/preorders/upcoming?days_ahead=${daysAhead}`);
    return response.data;
  }

  async updatePreOrderStatus(preOrderId: number, status: string, estimatedDeliveryDate?: string): Promise<PreOrderResponse> {
    let url = `/wishlist/preorders/${preOrderId}/status?status=${status}`;
    if (estimatedDeliveryDate) url += `&estimated_delivery_date=${estimatedDeliveryDate}`;
    const response = await this.api.put<PreOrderResponse>(url);
    return response.data;
  }

  async cancelPreOrder(preOrderId: number): Promise<PreOrderResponse> {
    const response = await this.api.delete<PreOrderResponse>(`/wishlist/preorders/${preOrderId}`);
    return response.data;
  }
}

// Create singleton instance
export const booktarrAPI = new BooktarrAPI();

// Export individual functions for backward compatibility
export const fetchBooks = () => booktarrAPI.getBooks();
export const fetchSettings = () => booktarrAPI.getSettings();
export const updateSettings = (settings: SettingsUpdateRequest) => 
  booktarrAPI.updateSettings(settings);
export const validateSkoolibUrl = (url: string) => 
  booktarrAPI.validateUrl({ url });

// CSV Import functions
export const importCSV = (file: File, formatType: string = 'handylib') =>
  booktarrAPI.importCSV(file, formatType);
export const previewCSV = (file: File, formatType: string = 'handylib', limit: number = 5) =>
  booktarrAPI.previewCSV(file, formatType, limit);

export default booktarrAPI;