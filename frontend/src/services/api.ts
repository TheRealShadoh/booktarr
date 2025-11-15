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
  ReadingGoal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalProgress,
  ReadingVelocityStats,
  MonthlyGoal,
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

  // Reading Goals API methods
  async createGoal(request: CreateGoalRequest): Promise<ReadingGoal> {
    const response = await this.api.post<{ goal: ReadingGoal }>('/goals', request);
    return response.data.goal;
  }

  async getGoals(): Promise<ReadingGoal[]> {
    const response = await this.api.get<{ goals: ReadingGoal[] }>('/goals');
    return response.data.goals;
  }

  async getActiveGoals(): Promise<ReadingGoal[]> {
    const response = await this.api.get<{ goals: ReadingGoal[] }>('/goals/active');
    return response.data.goals;
  }

  async getGoal(goalId: number): Promise<ReadingGoal> {
    const response = await this.api.get<{ goal: ReadingGoal }>(`/goals/${goalId}`);
    return response.data.goal;
  }

  async updateGoal(goalId: number, request: UpdateGoalRequest): Promise<ReadingGoal> {
    const response = await this.api.put<{ goal: ReadingGoal }>(`/goals/${goalId}`, request);
    return response.data.goal;
  }

  async deleteGoal(goalId: number): Promise<void> {
    await this.api.delete(`/goals/${goalId}`);
  }

  async addGoalProgress(goalId: number, valueAdded: number, notes?: string): Promise<ReadingGoal> {
    const response = await this.api.post<{ goal_progress: ReadingGoal }>(`/goals/${goalId}/progress`, {
      value_added: valueAdded,
      notes,
    });
    return response.data.goal_progress;
  }

  async getGoalProgress(goalId: number): Promise<GoalProgress[]> {
    const response = await this.api.get<{ progress_history: GoalProgress[] }>(`/goals/${goalId}/progress`);
    return response.data.progress_history;
  }

  async completeGoal(goalId: number): Promise<ReadingGoal> {
    const response = await this.api.post<{ goal: ReadingGoal }>(`/goals/${goalId}/complete`);
    return response.data.goal;
  }

  async abandonGoal(goalId: number): Promise<ReadingGoal> {
    const response = await this.api.post<{ goal: ReadingGoal }>(`/goals/${goalId}/abandon`);
    return response.data.goal;
  }

  async getReadingVelocity(months: number = 12): Promise<ReadingVelocityStats> {
    const response = await this.api.get<{ reading_velocity: ReadingVelocityStats }>(`/goals/stats/velocity?months=${months}`);
    return response.data.reading_velocity;
  }

  async initializeDefaultChallenges(): Promise<void> {
    await this.api.post('/goals/init-defaults', {});
  }

  async getCurrentMonthlyGoal(): Promise<MonthlyGoal> {
    const response = await this.api.get<{ monthly_goal: MonthlyGoal }>('/goals/monthly/current');
    return response.data.monthly_goal;
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