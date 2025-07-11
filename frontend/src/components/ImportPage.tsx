/**
 * Import page component for importing book lists from various formats
 */
import React, { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Book } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  skipped: number;
  processing_time: number;
  books_added: string[];
}

interface ImportFormat {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  icon: React.ReactNode;
}

const ImportPage: React.FC = () => {
  const { showToast, addBook } = useAppContext();
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [showFieldMapping, setShowFieldMapping] = useState(false);

  const importFormats: ImportFormat[] = [
    {
      id: 'csv',
      name: 'CSV',
      description: 'Comma-separated values with customizable field mapping',
      extensions: ['.csv'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'goodreads',
      name: 'Goodreads',
      description: 'Goodreads CSV export with Excel formula format support',
      extensions: ['.csv'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'hardcover',
      name: 'Hardcover',
      description: 'Hardcover app export format (JSON)',
      extensions: ['.json'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    },
    {
      id: 'handylib',
      name: 'HandyLib',
      description: 'HandyLib tab-delimited export format',
      extensions: ['.txt', '.tsv'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ];

  const requiredFields = ['title', 'isbn'];
  const optionalFields = ['author', 'series', 'series_position', 'description', 'published_date', 'page_count', 'categories', 'rating'];

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const selectedFormatData = importFormats.find(f => f.id === selectedFormat);
    if (selectedFormatData) {
      const hasValidExtension = selectedFormatData.extensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        showToast(`Invalid file type. Expected: ${selectedFormatData.extensions.join(', ')}`, 'error');
        return;
      }
    }

    setImportFile(file);
    setImportResult(null);
    setPreviewData(null);
    setShowFieldMapping(false);
  }, [selectedFormat, showToast, importFormats]);

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const row: any = {};
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Handle Goodreads Excel formula format (="value")
        if (selectedFormat === 'goodreads' && value.startsWith('="') && value.endsWith('"')) {
          value = value.slice(2, -1);
        }
        
        row[header] = value;
      });
      
      data.push(row);
    }

    return data;
  };

  const parseTabDelimited = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split('\t').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const row: any = {};
      const values = lines[i].split('\t').map(v => v.trim());
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  };

  const parseJSON = (text: string): any[] => {
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  const handlePreview = async () => {
    if (!importFile) return;

    try {
      setImporting(true);
      const text = await importFile.text();
      let data: any[] = [];

      switch (selectedFormat) {
        case 'csv':
        case 'goodreads':
          data = parseCSV(text);
          break;
        case 'handylib':
          data = parseTabDelimited(text);
          break;
        case 'hardcover':
          data = parseJSON(text);
          break;
        default:
          throw new Error('Unsupported format');
      }

      setPreviewData(data.slice(0, 10)); // Show first 10 rows for preview
      
      // Auto-detect field mapping for CSV
      if (selectedFormat === 'csv' && data.length > 0) {
        const headers = Object.keys(data[0]);
        const autoMapping: Record<string, string> = {};
        
        // Try to auto-map common field names
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('title')) autoMapping.title = header;
          if (lowerHeader.includes('isbn')) autoMapping.isbn = header;
          if (lowerHeader.includes('author')) autoMapping.author = header;
          if (lowerHeader.includes('series')) autoMapping.series = header;
          if (lowerHeader.includes('position') || lowerHeader.includes('number')) autoMapping.series_position = header;
          if (lowerHeader.includes('description') || lowerHeader.includes('summary')) autoMapping.description = header;
          if (lowerHeader.includes('published') || lowerHeader.includes('date')) autoMapping.published_date = header;
          if (lowerHeader.includes('page') || lowerHeader.includes('pages')) autoMapping.page_count = header;
          if (lowerHeader.includes('genre') || lowerHeader.includes('category')) autoMapping.categories = header;
          if (lowerHeader.includes('rating') || lowerHeader.includes('score')) autoMapping.rating = header;
        });
        
        setFieldMapping(autoMapping);
        setShowFieldMapping(true);
      }
      
      showToast(`Preview loaded: ${data.length} rows found`, 'success');
    } catch (error) {
      showToast(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const convertToBook = (row: any): Book | null => {
    try {
      let title = '';
      let isbn = '';
      let author = '';
      let series = '';
      let seriesPosition: number | undefined;

      if (selectedFormat === 'csv') {
        // Use field mapping for CSV
        title = row[fieldMapping.title] || '';
        isbn = row[fieldMapping.isbn] || '';
        author = row[fieldMapping.author] || '';
        series = row[fieldMapping.series] || '';
        seriesPosition = row[fieldMapping.series_position] ? parseInt(row[fieldMapping.series_position]) : undefined;
      } else if (selectedFormat === 'goodreads') {
        // Goodreads standard field names
        title = row['Title'] || '';
        isbn = row['ISBN'] || row['ISBN13'] || '';
        author = row['Author'] || '';
        series = row['Series'] || '';
        seriesPosition = row['Series Position'] ? parseInt(row['Series Position']) : undefined;
      } else if (selectedFormat === 'handylib') {
        // HandyLib tab-delimited format
        title = row['Title'] || '';
        isbn = row['ISBN'] || '';
        author = row['Author'] || '';
        series = row['Series'] || '';
        seriesPosition = row['Position'] ? parseInt(row['Position']) : undefined;
      } else if (selectedFormat === 'hardcover') {
        // Hardcover JSON format
        title = row.title || '';
        isbn = row.isbn || row.isbn13 || '';
        author = row.author || '';
        series = row.series || '';
        seriesPosition = row.seriesPosition ? parseInt(row.seriesPosition) : undefined;
      }

      if (!title || !isbn) {
        return null; // Skip rows without required fields
      }

      const book: Book = {
        isbn: isbn,
        title: title,
        authors: author ? [author] : [],
        series: series || undefined,
        series_position: seriesPosition,
        description: '',
        published_date: '',
        page_count: 0,
        categories: [],
        thumbnail: '',
        language: 'en',
        reading_status: 'unread',
        reading_progress: 0,
        rating: 0,
        read_count: 0,
        last_read_date: null,
        date_added: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        metadata: {}
      };

      return book;
    } catch (error) {
      console.error('Error converting row to book:', error);
      return null;
    }
  };

  const handleImport = async () => {
    if (!importFile || !previewData) return;

    try {
      setImporting(true);
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('format', selectedFormat);
      formData.append('field_mapping', JSON.stringify(fieldMapping));
      formData.append('skip_duplicates', 'true');
      formData.append('enrich_metadata', 'true');

      // Call backend API
      const response = await fetch('/api/books/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      
      showToast(`Import completed: ${result.imported} books imported, ${result.failed} failed, ${result.skipped} skipped`, 
        result.imported > 0 ? 'success' : 'warning');
    } catch (error) {
      showToast(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const selectedFormatData = importFormats.find(f => f.id === selectedFormat);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h1 className="text-booktarr-text text-2xl font-bold mb-2">Import Books</h1>
          <p className="text-booktarr-textSecondary text-sm">
            Import your book collection from various formats and platforms
          </p>
        </div>
      </div>

      {/* Format Selection */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Select Import Format</h2>
        </div>
        <div className="booktarr-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {importFormats.map(format => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === format.id
                    ? 'border-booktarr-accent bg-booktarr-accent bg-opacity-10'
                    : 'border-booktarr-border hover:border-booktarr-hover'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedFormat === format.id
                      ? 'bg-booktarr-accent text-white'
                      : 'bg-booktarr-surface2 text-booktarr-textSecondary'
                  }`}>
                    {format.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-booktarr-text">{format.name}</h3>
                    <p className="text-sm text-booktarr-textSecondary mt-1">{format.description}</p>
                    <p className="text-xs text-booktarr-textMuted mt-1">
                      Supported: {format.extensions.join(', ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-text">Upload File</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Upload your {selectedFormatData?.name} file to import books
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="border-2 border-dashed border-booktarr-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept={selectedFormatData?.extensions.join(',')}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-booktarr-surface2 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-booktarr-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-booktarr-text font-medium">
                    {importFile ? importFile.name : 'Click to upload file'}
                  </p>
                  <p className="text-booktarr-textSecondary text-sm">
                    {selectedFormatData?.extensions.join(', ')} files only
                  </p>
                </div>
              </div>
            </label>
          </div>
          
          {importFile && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handlePreview}
                disabled={importing}
                className="booktarr-btn booktarr-btn-secondary"
              >
                {importing ? <LoadingSpinner size="small" /> : 'Preview'}
              </button>
              <button
                onClick={() => {
                  setImportFile(null);
                  setPreviewData(null);
                  setImportResult(null);
                }}
                className="booktarr-btn booktarr-btn-secondary"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Field Mapping (CSV only) */}
      {showFieldMapping && selectedFormat === 'csv' && previewData && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Field Mapping</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Map CSV columns to book fields
            </p>
          </div>
          <div className="booktarr-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...requiredFields, ...optionalFields].map(field => (
                <div key={field}>
                  <label className="booktarr-form-label">
                    {field} {requiredFields.includes(field) && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={fieldMapping[field] || ''}
                    onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                    className="booktarr-form-input"
                  >
                    <option value="">-- Select Column --</option>
                    {Object.keys(previewData[0] || {}).map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewData && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Preview</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Preview of first 10 rows
            </p>
          </div>
          <div className="booktarr-card-body">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-booktarr-border">
                    {Object.keys(previewData[0] || {}).map(header => (
                      <th key={header} className="text-left p-2 text-booktarr-text font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-b border-booktarr-border">
                      {Object.values(row).map((value: any, colIndex) => (
                        <td key={colIndex} className="p-2 text-booktarr-textSecondary">
                          {String(value).substring(0, 50)}
                          {String(value).length > 50 && '...'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleImport}
                disabled={importing || (selectedFormat === 'csv' && !fieldMapping.title)}
                className="booktarr-btn booktarr-btn-primary"
              >
                {importing ? <LoadingSpinner size="small" /> : 'Import Books'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">Import Results</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-booktarr-surface2 rounded-lg">
                <div className="text-2xl font-bold text-booktarr-success">{importResult.imported}</div>
                <div className="text-sm text-booktarr-textMuted">Books Imported</div>
              </div>
              <div className="text-center p-4 bg-booktarr-surface2 rounded-lg">
                <div className="text-2xl font-bold text-booktarr-warning">{importResult.skipped}</div>
                <div className="text-sm text-booktarr-textMuted">Skipped (Duplicates)</div>
              </div>
              <div className="text-center p-4 bg-booktarr-surface2 rounded-lg">
                <div className="text-2xl font-bold text-booktarr-error">{importResult.failed}</div>
                <div className="text-sm text-booktarr-textMuted">Failed</div>
              </div>
            </div>
            
            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-booktarr-text mb-2">Errors:</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-booktarr-error bg-booktarr-surface2 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <button
                onClick={() => {
                  setImportResult(null);
                  setImportFile(null);
                  setPreviewData(null);
                  setShowFieldMapping(false);
                }}
                className="booktarr-btn booktarr-btn-secondary"
              >
                Import Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportPage;