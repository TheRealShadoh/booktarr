/**
 * TypeScript type definitions for Booktarr frontend
 */

export interface Book {
  isbn: string;
  title: string;
  authors: string[];
  series?: string;
  series_position?: number;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  language: string;
  thumbnail_url?: string;
  description?: string;
  categories: string[];
  pricing: PriceInfo[];
  metadata_source: MetadataSource;
  added_date: string;
  last_updated: string;
  isbn10?: string;
  isbn13?: string;
}

export interface PriceInfo {
  source: string;
  price: number;
  currency: string;
  url?: string;
  last_updated: string;
}

export enum MetadataSource {
  SKOOLIB = 'skoolib',
  GOOGLE_BOOKS = 'google_books',
  OPEN_LIBRARY = 'open_library',
}

export interface BooksResponse {
  series: { [key: string]: Book[] };
  total_books: number;
  total_series: number;
  last_sync: string;
}

export interface Settings {
  skoolib_url?: string;
  google_books_api_key?: string;
  cache_ttl: number;
  enable_price_lookup: boolean;
  default_language: string;
}

export interface SettingsResponse {
  message: string;
  settings: Settings;
}

export interface UrlValidationRequest {
  url: string;
}

export interface UrlValidationResponse {
  valid: boolean;
  error?: string;
  warning?: string;
  isbn_count?: number;
  sample_isbns?: string[];
}

export interface SettingsUpdateRequest {
  skoolib_url?: string;
  google_books_api_key?: string;
  cache_ttl?: number;
  enable_price_lookup?: boolean;
  default_language?: string;
}

export interface SettingsInfo {
  settings_file: {
    file_path: string;
    exists: boolean;
    file_size?: number;
    last_modified?: string;
  };
  supported_languages: string[];
  cache_ttl_range: {
    min: number;
    max: number;
    default: number;
  };
}

export interface SettingsHealth {
  status: 'healthy' | 'unhealthy';
  settings_loaded?: boolean;
  file_exists?: boolean;
  file_path?: string;
  error?: string;
}

// UI-specific types
export interface BooksBySeriesMap {
  [seriesName: string]: Book[];
}

export interface SeriesGroup {
  name: string;
  books: Book[];
  book_count: number;
}

export interface FilterState {
  searchQuery: string;
  selectedSeries: string[];
  selectedAuthors: string[];
  selectedCategories: string[];
  minPages?: number;
  maxPages?: number;
  publishedAfter?: string;
  publishedBefore?: string;
}

export interface UIState {
  loading: boolean;
  error: string | null;
  filters: FilterState;
  viewMode: 'grid' | 'list';
  sortBy: 'title' | 'author' | 'series' | 'published_date' | 'added_date';
  sortOrder: 'asc' | 'desc';
}

export interface AppState {
  books: BooksBySeriesMap;
  settings: Settings;
  ui: UIState;
}

// API Error types
export interface APIError {
  message: string;
  status: number;
  detail?: string;
}

// Component Props types
export interface BookListProps {
  books: BooksBySeriesMap;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export interface BookCardProps {
  book: Book;
  onClick?: (book: Book) => void;
}

export interface SeriesGroupProps {
  seriesName: string;
  books: Book[];
  expanded?: boolean;
  onToggle?: (seriesName: string) => void;
}

export interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  value?: string;
}

export interface SettingsPageProps {
  settings: Settings;
  onUpdateSettings: (settings: SettingsUpdateRequest) => Promise<void>;
  onValidateUrl: (url: string) => Promise<UrlValidationResponse>;
  loading?: boolean;
  error?: string | null;
}

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export interface ErrorMessageProps {
  error: string | APIError;
  onRetry?: () => void;
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

// Context types
export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export interface AppAction {
  type: string;
  payload?: any;
}

// Constants
export const DEFAULT_SETTINGS: Settings = {
  skoolib_url: undefined,
  google_books_api_key: undefined,
  cache_ttl: 3600,
  enable_price_lookup: true,
  default_language: 'en',
};

export const DEFAULT_UI_STATE: UIState = {
  loading: false,
  error: null,
  filters: {
    searchQuery: '',
    selectedSeries: [],
    selectedAuthors: [],
    selectedCategories: [],
  },
  viewMode: 'grid',
  sortBy: 'title',
  sortOrder: 'asc',
};

export const DEFAULT_FILTER_STATE: FilterState = {
  searchQuery: '',
  selectedSeries: [],
  selectedAuthors: [],
  selectedCategories: [],
};