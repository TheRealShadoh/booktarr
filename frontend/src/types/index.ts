// Book related types
export interface Book {
  id: string;
  title: string;
  authors: string[];
  series?: string;
  seriesPosition?: number;
  isbn?: string;
  isbn13?: string;
  coverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  description?: string;
  language?: string;
  genres?: string[];
  tags?: string[];
  rating?: number;
  status: 'owned' | 'wanted' | 'missing' | 'read';
  format?: 'physical' | 'ebook' | 'audiobook';
  dateAdded?: string;
  dateRead?: string;
  notes?: string;
  location?: string;
  loanedTo?: string;
  price?: number;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
}

export interface Edition {
  id: string;
  bookId: string;
  isbn?: string;
  isbn13?: string;
  format: 'physical' | 'ebook' | 'audiobook';
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  coverUrl?: string;
  price?: number;
  status: 'owned' | 'wanted' | 'missing';
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  location?: string;
  notes?: string;
  loanedTo?: string;
  dateAcquired?: string;
  source?: string;
}

export interface Series {
  name: string;
  books: Book[];
  totalBooks?: number;
  completedBooks?: number;
  author?: string;
  description?: string;
  status: 'complete' | 'ongoing' | 'hiatus' | 'cancelled';
  firstPublished?: string;
  lastPublished?: string;
  genres?: string[];
  tags?: string[];
}

export interface Author {
  id: string;
  name: string;
  books: Book[];
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  nationality?: string;
  website?: string;
  imageUrl?: string;
  genres?: string[];
  awards?: string[];
}

// UI State types
export interface AppState {
  books: Book[];
  filteredBooks: Book[];
  selectedBook: Book | null;
  currentPage: string;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: FilterState;
  settings: Settings;
  theme: ThemeState;
}

export interface FilterState {
  status: string[];
  format: string[];
  genre: string[];
  author: string[];
  series: string[];
  rating: number[];
  dateRange: {
    start?: string;
    end?: string;
  };
  tags: string[];
  language: string[];
  sortBy: 'title' | 'author' | 'dateAdded' | 'rating' | 'publishedDate';
  sortOrder: 'asc' | 'desc';
}

export interface Settings {
  apiUrl: string;
  theme: 'dark' | 'light' | 'auto';
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  itemsPerPage: number;
  showCoverImages: boolean;
  showSeries: boolean;
  showAuthors: boolean;
  showGenres: boolean;
  showRatings: boolean;
  showProgress: boolean;
  enableNotifications: boolean;
  enableSync: boolean;
  enableBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  defaultBookStatus: 'owned' | 'wanted' | 'missing';
  defaultBookFormat: 'physical' | 'ebook' | 'audiobook';
  scannerEnabled: boolean;
  autoAddBooks: boolean;
  autoEnhanceMetadata: boolean;
  duplicateHandling: 'ignore' | 'merge' | 'ask';
  exportFormat: 'json' | 'csv' | 'xml';
  importSources: string[];
}

export interface ThemeState {
  current: 'dark' | 'light';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
}

// API Response types
export interface SearchResponse {
  results: Book[];
  totalResults: number;
  page: number;
  totalPages: number;
  query: string;
}

export interface BookResponse {
  success: boolean;
  data?: Book;
  error?: string;
  message?: string;
}

export interface BooksResponse {
  success: boolean;
  data?: Book[];
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Component Props types
export interface BookCardProps {
  book: Book;
  onClick?: (book: Book) => void;
  onStatusChange?: (book: Book, status: string) => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  showControls?: boolean;
  showStatus?: boolean;
  showSeries?: boolean;
  showAuthor?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface BookListProps {
  books: Book[];
  loading?: boolean;
  error?: string | null;
  onBookClick?: (book: Book) => void;
  onRefresh?: () => void;
  onStatusChange?: (book: Book, status: string) => void;
  showFilters?: boolean;
  showSort?: boolean;
  showSearch?: boolean;
  viewMode?: 'grid' | 'list' | 'table';
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  showFilters?: boolean;
  onFilterToggle?: () => void;
}

export interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  books: Book[];
  onClose?: () => void;
  isOpen?: boolean;
}

// Toast notification types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  children?: NavItem[];
}

// API Service types
export interface ApiClient {
  get<T>(url: string, params?: any): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  put<T>(url: string, data?: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
  patch<T>(url: string, data?: any): Promise<T>;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
}

export interface FormData {
  [key: string]: any;
}

export interface FormErrors {
  [key: string]: string;
}

// Utility types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type ViewMode = 'grid' | 'list' | 'table';
export type SortDirection = 'asc' | 'desc';
export type BookStatus = 'owned' | 'wanted' | 'missing' | 'read';
export type BookFormat = 'physical' | 'ebook' | 'audiobook';
export type Theme = 'dark' | 'light' | 'auto';