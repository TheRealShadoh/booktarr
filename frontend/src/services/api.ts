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
} from '../types';

// Dynamically determine API URL based on current hostname and environment
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if we're in development (localhost) and use proxy
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Use relative path to leverage proxy in package.json
    return '/api';
  }
  
  // For production/remote access, use the same hostname with port 8000
  const protocol = window.location.protocol;
  return `${protocol}//${window.location.hostname}:8000/api`;
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