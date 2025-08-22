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
  cover_url?: string;
  description?: string;
  categories: string[];
  pricing: PriceInfo[];
  metadata_source: MetadataSource;
  added_date: string;
  last_updated: string;
  isbn10?: string;
  isbn13?: string;
  // Metadata enhancement fields
  metadata_enhanced?: boolean;
  metadata_enhanced_date?: string;
  metadata_sources_used?: string[];
  // Reading progress and status fields
  reading_status: ReadingStatus;
  reading_progress_pages?: number;
  reading_progress_percentage?: number;
  date_started?: string;
  date_finished?: string;
  personal_rating?: number; // 1-5 star rating
  personal_notes?: string;
  reading_goal_id?: string;
  times_read: number;
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
  AMAZON = 'amazon',
}

export enum ReadingStatus {
  UNREAD = 'unread',
  READING = 'reading',
  READ = 'read',
  WISHLIST = 'wishlist',
  DNF = 'dnf', // Did Not Finish
  WANT_TO_READ = 'want_to_read',
}

export interface BooksResponse {
  series: { [key: string]: Book[] };
  series_metadata?: { 
    [key: string]: {
      total_books: number;
      description?: string;
      status?: string;
    }
  };
  total_books: number;
  total_series: number;
  last_sync: string;
}

export interface Settings {
  skoolib_url?: string;
  google_books_api_key?: string;
  open_library_api_key?: string;
  cache_ttl: number;
  enable_price_lookup: boolean;
  default_language: string;
  enable_external_metadata?: boolean;
  external_metadata_timeout_until?: string;
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
  open_library_api_key?: string;
  cache_ttl?: number;
  enable_price_lookup?: boolean;
  default_language?: string;
  enable_external_metadata?: boolean;
  external_metadata_timeout_until?: string;
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
  open_library_api_key: undefined,
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


export interface CacheStatsResponse {
  cache_stats: any;
  enhancement_cache_ttl: number;
  api_cache_ttl: number;
  book_cache_ttl: number;
}

export interface MetadataSourcesResponse {
  isbn: string;
  sources: { [key: string]: any };
  total_sources: number;
}

// Reading Progress API types
export interface UpdateReadingProgressRequest {
  isbn: string;
  reading_status?: ReadingStatus;
  reading_progress_pages?: number;
  reading_progress_percentage?: number;
  date_started?: string;
  date_finished?: string;
  personal_rating?: number;
  personal_notes?: string;
}

export interface ReadingProgressResponse {
  success: boolean;
  message: string;
  book?: Book;
}

export interface ReadingStatsResponse {
  total_books: number;
  books_read: number;
  books_reading: number;
  books_unread: number;
  books_wishlist: number;
  books_dnf: number;
  average_rating?: number;
  total_pages_read?: number;
  reading_streak_days: number;
  books_this_year: number;
  books_this_month: number;
}

export interface ReadingGoal {
  id: string;
  title: string;
  target_books?: number;
  target_pages?: number;
  start_date: string;
  end_date: string;
  current_books: number;
  current_pages: number;
  is_completed: boolean;
  created_date: string;
}

// CSV Import API types
export interface CSVImportRequest {
  file: File;
  format_type: string; // 'handylib', 'goodreads', etc.
  user_id?: number;
}

export interface CSVImportResponse {
  success: boolean;
  filename: string;
  format: string;
  imported: number;
  updated: number;
  errors: CSVImportError[];
  books: ImportedBook[];
}

export interface CSVImportError {
  row?: number;
  error: string;
  title?: string;
}

export interface ImportedBook {
  id: number;
  title: string;
  authors: string[];
  series_name?: string;
  series_position?: number;
}

export interface CSVPreviewRequest {
  file: File;
  format_type: string;
  limit?: number;
}

export interface CSVPreviewResponse {
  filename: string;
  format: string;
  headers: string[];
  preview: CSVPreviewRow[];
  total_rows_in_file: string;
}

export interface CSVPreviewRow {
  row_number: number;
  original: any;
  parsed: any;
}

export interface ManualMatchRequest {
  unmatched_books: UnmatchedBook[];
  user_matches: BookMatch[];
}

export interface UnmatchedBook {
  row_number: number;
  title: string;
  authors: string[];
  isbn?: string;
  series?: string;
  original_data: any;
}

export interface BookMatch {
  row_number: number;
  matched_book?: Book;
  action: 'import' | 'skip' | 'create_new';
  user_notes?: string;
}

// Series API types
export interface Series {
  id: number;
  name: string;
  description?: string;
  total_books?: number;
  author?: string;
  publisher?: string;
  first_published?: string;
  last_published?: string;
  status?: string;
  genres: string[];
  tags: string[];
  cover_url?: string;
  created_date: string;
  last_updated: string;
}

export interface SeriesInfo {
  id: number;
  name: string;
  description?: string;
  total_books?: number;
  author?: string;
  publisher?: string;
  first_published?: string;
  last_published?: string;
  status?: string;
  genres: string[];
  tags: string[];
  cover_url?: string;
  created_date: string;
  last_updated: string;
}

export interface SeriesVolume {
  position: number;
  title: string;
  subtitle?: string;
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  description?: string;
  cover_url?: string;
  status: 'owned' | 'wanted' | 'missing';
  notes?: string;
  date_acquired?: string;
  owned_book?: {
    id: number;
    title: string;
    authors: string[];
    isbn?: string;
  };
}

export interface SeriesDetailsResponse {
  series: SeriesInfo;
  volumes: SeriesVolume[];
  stats: {
    total_volumes: number;
    owned_volumes: number;
    wanted_volumes: number;
    missing_volumes: number;
    completion_percentage: number;
  };
}

export interface UpdateVolumeStatusRequest {
  status: 'owned' | 'wanted' | 'missing';
}

export interface UpdateVolumeStatusResponse {
  success: boolean;
  message: string;
  volume: {
    position: number;
    title: string;
    status: string;
  };
}