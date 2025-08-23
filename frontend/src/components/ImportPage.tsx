/**
 * Import page component for importing book lists from various formats
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { CSVPreviewResponse, UnmatchedBook, BookMatch } from '../types';
import LoadingSpinner from './LoadingSpinner';
import booktarrAPI from '../services/api';
import ManualBookMatching from './ManualBookMatching';

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
  const { showToast } = useAppContext();
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewResponse | null>(null);
  const [unmatchedBooks, setUnmatchedBooks] = useState<UnmatchedBook[]>([]);
  const [showManualMatching, setShowManualMatching] = useState(false);

  const importFormats: ImportFormat[] = useMemo(() => [
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
      description: 'HandyLib CSV export format with advanced parsing',
      extensions: ['.csv', '.txt', '.tsv'],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ], []);

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
    setCsvPreview(null);
    setShowPreview(false);
    setUnmatchedBooks([]);
    setShowManualMatching(false);
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

  const handlePreviewFile = async () => {
    if (!importFile) {
      showToast('Please select a file first', 'error');
      return;
    }

    setImporting(true);
    try {
      // Use backend API for HandyLib format
      if (selectedFormat === 'handylib') {
        const previewResponse = await booktarrAPI.previewCSV(importFile, 'handylib', 5);
        setCsvPreview(previewResponse);
        setShowPreview(true);
        showToast(`Preview loaded: ${previewResponse.preview.length} rows`, 'success');
      } else {
        // Fall back to local parsing for other formats
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          let parsed;

          if (selectedFormat === 'csv' || selectedFormat === 'goodreads') {
            parsed = parseCSV(text);
          } else if (selectedFormat === 'handylib') {
            parsed = parseTabDelimited(text);
          } else if (selectedFormat === 'hardcover') {
            try {
              parsed = JSON.parse(text);
            } catch (error) {
              showToast('Invalid JSON format', 'error');
              return;
            }
          }

          setPreviewData(parsed.slice(0, 10)); // Show first 10 rows
          setShowFieldMapping(true);
        };
        reader.readAsText(importFile);
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      showToast(error.message || 'Failed to preview file', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile = async () => {
    if (!importFile) {
      showToast('Please select a file first', 'error');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Use backend API for HandyLib format
      if (selectedFormat === 'handylib') {
        const importResponse = await booktarrAPI.importCSV(importFile, 'handylib');
        
        // Check if there were errors that need manual matching
        if (importResponse.errors && importResponse.errors.length > 0) {
          const unmatchedBooksData = importResponse.errors.map((error: any, index: number) => ({
            row_number: error.row || index + 1,
            title: error.title || 'Unknown',
            authors: [],
            original_data: error
          }));
          
          setUnmatchedBooks(unmatchedBooksData);
          setShowManualMatching(true);
        }

        setImportResult({
          success: importResponse.success,
          imported: importResponse.imported,
          failed: importResponse.errors.length,
          errors: importResponse.errors.map((e: any) => e.error),
          skipped: 0,
          processing_time: 0,
          books_added: importResponse.books.map((b: any) => b.title)
        });

        showToast(
          `Import completed! ${importResponse.imported} books imported, ${importResponse.updated} updated, ${importResponse.errors.length} errors`,
          importResponse.errors.length > 0 ? 'warning' : 'success'
        );
      } else {
        // Fall back to local processing for other formats
        showToast('Local import processing not implemented for this format', 'error');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        imported: 0,
        failed: 1,
        errors: [error.message || 'Import failed'],
        skipped: 0,
        processing_time: 0,
        books_added: []
      });
      showToast(error.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleManualMatchingComplete = (matches: BookMatch[]) => {
    // Process the manual matches - for now just close the modal
    setShowManualMatching(false);
    setUnmatchedBooks([]);
    
    const importedCount = matches.filter(m => m.action === 'import').length;
    const skippedCount = matches.filter(m => m.action === 'skip').length;
    
    showToast(`Manual matching completed: ${importedCount} books matched, ${skippedCount} skipped`, 'success');
  };

  const handleManualMatchingCancel = () => {
    setShowManualMatching(false);
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
                onClick={selectedFormat === 'handylib' ? handlePreviewFile : handlePreview}
                disabled={importing}
                className="booktarr-btn booktarr-btn-secondary"
              >
                {importing ? <LoadingSpinner size="small" /> : 'Preview'}
              </button>
              {selectedFormat === 'handylib' && (
                <button
                  onClick={handleImportFile}
                  disabled={importing}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  {importing ? <LoadingSpinner size="small" /> : 'Import Now'}
                </button>
              )}
              <button
                onClick={() => {
                  setImportFile(null);
                  setPreviewData(null);
                  setImportResult(null);
                  setCsvPreview(null);
                  setShowPreview(false);
                  setUnmatchedBooks([]);
                  setShowManualMatching(false);
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
                    <tr key={`preview-row-${index}`} className="border-b border-booktarr-border">
                      {Object.values(row).map((value: any, colIndex) => (
                        <td key={`preview-cell-${index}-${colIndex}`} className="p-2 text-booktarr-textSecondary">
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
                    <div key={`error-${index}-${error.substring(0, 20)}`} className="text-sm text-booktarr-error bg-booktarr-surface2 p-2 rounded">
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

      {/* Enhanced CSV Preview for HandyLib */}
      {showPreview && csvPreview && (
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-lg font-semibold text-booktarr-text">CSV Preview</h2>
            <p className="text-booktarr-textSecondary text-sm mt-1">
              Preview of {csvPreview.filename} ({csvPreview.format} format)
            </p>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-4">
              {csvPreview.preview.map((row, index) => (
                <div key={`csv-preview-${index}-${row.row_number || index}`} className="border border-booktarr-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-booktarr-text">Row {row.row_number}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-booktarr-text mb-2">Original Data:</h4>
                      <div className="bg-booktarr-surface p-2 rounded text-xs space-y-1">
                        <p><strong>Title:</strong> {row.original.Title}</p>
                        <p><strong>Author:</strong> {row.original.Author}</p>
                        <p><strong>Series:</strong> {row.original.Series}</p>
                        <p><strong>ISBN:</strong> {row.original.ISBN}</p>
                        <p><strong>Format:</strong> {row.original.Format}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-booktarr-text mb-2">Parsed Data:</h4>
                      <div className="bg-booktarr-surface p-2 rounded text-xs space-y-1">
                        {row.parsed ? (
                          <>
                            <p><strong>Title:</strong> {row.parsed.title}</p>
                            <p><strong>Authors:</strong> {row.parsed.authors?.join(', ')}</p>
                            <p><strong>Series:</strong> {row.parsed.series_name} {row.parsed.series_position ? `#${row.parsed.series_position}` : ''}</p>
                            <p><strong>ISBN:</strong> {row.parsed.isbn_13}</p>
                            <p><strong>Format:</strong> {row.parsed.format}</p>
                            <p><strong>Price:</strong> {row.parsed.price ? `$${row.parsed.price}` : 'N/A'}</p>
                          </>
                        ) : (
                          <p className="text-red-500">Failed to parse</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleImportFile}
                disabled={importing}
                className="booktarr-button-primary"
              >
                {importing ? <LoadingSpinner size="small" /> : 'Import All Books'}
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="booktarr-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Book Matching */}
      {showManualMatching && unmatchedBooks.length > 0 && (
        <ManualBookMatching
          unmatchedBooks={unmatchedBooks}
          onComplete={handleManualMatchingComplete}
          onCancel={handleManualMatchingCancel}
        />
      )}
    </div>
  );
};

export default ImportPage;