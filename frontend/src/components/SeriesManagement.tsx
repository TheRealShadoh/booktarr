import React, { useState, useEffect } from 'react';

// Icon Components
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="w-12 h-12 mx-auto mb-4 text-booktarr-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface Series {
  id: number;
  name: string;
  author?: string;
  description?: string;
  total_books: number;
  owned_books: number;
  completion_percentage: number;
  status: string;
  cover_url?: string;
}

interface Volume {
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
  status: string;
  notes?: string;
}

interface SeriesDetails {
  series: {
    id: number;
    name: string;
    description?: string;
    total_books: number;
    author?: string;
    publisher?: string;
    first_published?: string;
    last_published?: string;
    status: string;
    genres: string[];
    tags: string[];
    cover_url?: string;
  };
  volumes: Volume[];
  stats: {
    total_volumes: number;
    owned_volumes: number;
    wanted_volumes: number;
    missing_volumes: number;
    completion_percentage: number;
  };
}

const SeriesManagement: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<SeriesDetails | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Form states
  const [seriesForm, setSeriesForm] = useState({
    name: '',
    author: '',
    description: '',
    total_books: 0,
    publisher: '',
    status: 'ongoing',
    genres: [] as string[],
    tags: [] as string[]
  });

  const [volumeForm, setVolumeForm] = useState({
    position: 1,
    title: '',
    subtitle: '',
    isbn_13: '',
    isbn_10: '',
    publisher: '',
    published_date: '',
    page_count: 0,
    description: '',
    cover_url: '',
    status: 'missing'
  });

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const response = await fetch('/api/series/');
      if (!response.ok) throw new Error('Failed to fetch series');
      const data = await response.json();
      setSeries(data.series || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch series');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesDetails = async (seriesName: string) => {
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(seriesName)}`);
      if (!response.ok) throw new Error('Failed to fetch series details');
      const data = await response.json();
      setSelectedSeries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch series details');
    }
  };

  const createSeries = async () => {
    try {
      const response = await fetch('/api/series/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seriesForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create series');
      }
      
      await fetchSeries();
      setIsCreating(false);
      resetSeriesForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create series');
    }
  };

  const updateSeries = async () => {
    if (!selectedSeries) return;
    
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(selectedSeries.series.name)}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seriesForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update series');
      }
      
      await fetchSeries();
      await fetchSeriesDetails(seriesForm.name || selectedSeries.series.name);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update series');
    }
  };

  const deleteSeries = async (seriesName: string) => {
    if (!window.confirm(`Are you sure you want to delete the series "${seriesName}" and all its volumes?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(seriesName)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete series');
      }
      
      await fetchSeries();
      if (selectedSeries?.series.name === seriesName) {
        setSelectedSeries(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete series');
    }
  };

  const addVolumeToSeries = async () => {
    if (!selectedSeries) return;
    
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(selectedSeries.series.name)}/books/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volumeForm)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add volume');
      }
      
      await fetchSeriesDetails(selectedSeries.series.name);
      setIsAddingVolume(false);
      resetVolumeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add volume');
    }
  };

  const removeVolumeFromSeries = async (position: number) => {
    if (!selectedSeries) return;
    
    if (!window.confirm(`Are you sure you want to remove volume ${position} from the series?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(selectedSeries.series.name)}/books/${position}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove volume');
      }
      
      await fetchSeriesDetails(selectedSeries.series.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove volume');
    }
  };

  const updateVolumeStatus = async (position: number, status: string) => {
    if (!selectedSeries) return;
    
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(selectedSeries.series.name)}/volumes/${position}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update volume status');
      }
      
      await fetchSeriesDetails(selectedSeries.series.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update volume status');
    }
  };

  const resetSeriesForm = () => {
    setSeriesForm({
      name: '',
      author: '',
      description: '',
      total_books: 0,
      publisher: '',
      status: 'ongoing',
      genres: [],
      tags: []
    });
  };

  const resetVolumeForm = () => {
    setVolumeForm({
      position: selectedSeries ? selectedSeries.volumes.length + 1 : 1,
      title: '',
      subtitle: '',
      isbn_13: '',
      isbn_10: '',
      publisher: '',
      published_date: '',
      page_count: 0,
      description: '',
      cover_url: '',
      status: 'missing'
    });
  };

  const startEditingSeries = () => {
    if (!selectedSeries) return;
    
    setSeriesForm({
      name: selectedSeries.series.name,
      author: selectedSeries.series.author || '',
      description: selectedSeries.series.description || '',
      total_books: selectedSeries.series.total_books,
      publisher: selectedSeries.series.publisher || '',
      status: selectedSeries.series.status,
      genres: selectedSeries.series.genres,
      tags: selectedSeries.series.tags
    });
    setIsEditing(true);
  };

  const runMaintenance = async (endpoint: string, action: string) => {
    if (!window.confirm(`Are you sure you want to ${action}? This will modify your series data.`)) {
      return;
    }

    setMaintenanceLoading(true);
    try {
      const response = await fetch(`/api/series/${endpoint}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${action}`);
      }
      
      const result = await response.json();
      alert(`Success: ${result.message}`);
      
      // Refresh series list
      await fetchSeries();
      if (selectedSeries) {
        await fetchSeriesDetails(selectedSeries.series.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const fixOrphanedBooks = () => runMaintenance('fix-orphaned-books', 'fix orphaned books');
  const fixMissingVolumes = () => runMaintenance('fix-missing-volumes', 'fix missing volumes');
  const validateSeries = () => runMaintenance('validate', 'validate series data');
  const syncAllSeries = () => runMaintenance('sync-all', 'sync all series volumes');
  const fixAllSeries = () => runMaintenance('fix-all', 'fix all series issues');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="booktarr-loading-skeleton text-booktarr-textSecondary">Loading series data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 bg-booktarr-bg min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-booktarr-text">Series Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="booktarr-btn booktarr-btn-primary flex items-center gap-2"
        >
          <PlusIcon />
          Create Series
        </button>
      </div>

      {error && (
        <div className="bg-booktarr-error/10 border border-booktarr-error text-booktarr-error px-4 py-3 rounded-lg mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right text-booktarr-error hover:text-booktarr-text transition-colors">×</button>
        </div>
      )}

      {/* Maintenance Section */}
      <div className="booktarr-card mb-6">
        <div className="booktarr-card-header">
          <h2 className="text-lg font-semibold text-booktarr-warning mb-1">Series Maintenance</h2>
        </div>
        <div className="booktarr-card-body">
          <p className="text-sm text-booktarr-textSecondary mb-4">
            Use these tools to fix common series data issues. These operations are safe but will modify your database.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fixOrphanedBooks}
              disabled={maintenanceLoading}
              className="booktarr-btn booktarr-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Fix Orphaned Books
            </button>
            <button
              onClick={fixMissingVolumes}
              disabled={maintenanceLoading}
              className="booktarr-btn booktarr-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Fix Missing Volumes
            </button>
            <button
              onClick={validateSeries}
              disabled={maintenanceLoading}
              className="booktarr-btn booktarr-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Validate Series Data
            </button>
            <button
              onClick={syncAllSeries}
              disabled={maintenanceLoading}
              className="booktarr-btn booktarr-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Sync All Series
            </button>
            <button
              onClick={fixAllSeries}
              disabled={maintenanceLoading}
              className="booktarr-btn booktarr-btn-danger disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Fix All Issues
            </button>
          </div>
          {maintenanceLoading && (
            <div className="mt-3 text-sm text-booktarr-accent flex items-center gap-2">
              <div className="booktarr-loading-shimmer w-4 h-4 rounded-full"></div>
              Running maintenance operation...
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Series List */}
        <div className="booktarr-card">
          <div className="booktarr-card-header">
            <h2 className="text-xl font-semibold text-booktarr-text">All Series ({series.length})</h2>
          </div>
          <div className="booktarr-card-body">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {series.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedSeries?.series.id === s.id 
                      ? 'bg-booktarr-accent/10 border-booktarr-accent shadow-md' 
                      : 'border-booktarr-border hover:bg-booktarr-surface2 hover:border-booktarr-accent/50'
                  }`}
                  onClick={() => fetchSeriesDetails(s.name)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-booktarr-text">{s.name}</h3>
                      {s.author && <p className="text-sm text-booktarr-textSecondary">{s.author}</p>}
                      <div className="flex items-center gap-4 mt-2 text-sm text-booktarr-textMuted">
                        <span>{s.owned_books}/{s.total_books} volumes</span>
                        <span className="text-booktarr-accent">{s.completion_percentage}% complete</span>
                        <span className="capitalize">{s.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchSeriesDetails(s.name);
                          setTimeout(() => startEditingSeries(), 100);
                        }}
                        className="p-1 hover:bg-booktarr-surface3 rounded text-booktarr-textSecondary hover:text-booktarr-text transition-colors"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSeries(s.name);
                        }}
                        className="p-1 hover:bg-booktarr-error/20 rounded text-booktarr-textSecondary hover:text-booktarr-error transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Series Details */}
        <div className="booktarr-card">
          {selectedSeries ? (
            <>
              <div className="booktarr-card-header">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-booktarr-text">{selectedSeries.series.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={startEditingSeries}
                      className="booktarr-btn booktarr-btn-ghost p-2"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => setIsAddingVolume(true)}
                      className="booktarr-btn booktarr-btn-primary text-sm flex items-center gap-1"
                    >
                      <PlusIcon />
                      Add Volume
                    </button>
                  </div>
                </div>
              </div>

              <div className="booktarr-card-body">
                <div className="mb-4">
                  <p className="text-booktarr-textSecondary mb-2">{selectedSeries.series.author}</p>
                  {selectedSeries.series.description && (
                    <p className="text-sm text-booktarr-textMuted mb-3">{selectedSeries.series.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-booktarr-text">Total Volumes:</span> 
                      <span className="text-booktarr-textSecondary ml-1">{selectedSeries.stats.total_volumes}</span>
                    </div>
                    <div>
                      <span className="font-medium text-booktarr-text">Owned:</span> 
                      <span className="text-booktarr-success ml-1">{selectedSeries.stats.owned_volumes}</span>
                    </div>
                    <div>
                      <span className="font-medium text-booktarr-text">Status:</span> 
                      <span className="capitalize text-booktarr-textSecondary ml-1">{selectedSeries.series.status}</span>
                    </div>
                    <div>
                      <span className="font-medium text-booktarr-text">Completion:</span> 
                      <span className="text-booktarr-accent ml-1">{selectedSeries.stats.completion_percentage}%</span>
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold text-booktarr-text mb-3">Volumes</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedSeries.volumes.map((volume) => (
                    <div key={volume.position} className="flex items-center justify-between p-2 border border-booktarr-border rounded bg-booktarr-surface2/50">
                      <div className="flex-1">
                        <span className="font-medium text-booktarr-text">Vol. {volume.position}</span>
                        <span className="ml-2 text-booktarr-textSecondary">{volume.title}</span>
                        {volume.isbn_13 && <span className="ml-2 text-xs text-booktarr-textMuted">({volume.isbn_13})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={volume.status}
                          onChange={(e) => updateVolumeStatus(volume.position, e.target.value)}
                          className="booktarr-form-input text-xs px-2 py-1 min-w-0 w-20"
                        >
                          <option value="owned">Owned</option>
                          <option value="wanted">Wanted</option>
                          <option value="missing">Missing</option>
                        </select>
                        <button
                          onClick={() => removeVolumeFromSeries(volume.position)}
                          className="p-1 hover:bg-booktarr-error/20 rounded text-booktarr-textSecondary hover:text-booktarr-error transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="booktarr-card-body">
              <div className="text-center text-booktarr-textMuted mt-12">
                <BookOpenIcon />
                <p>Select a series to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Series Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="booktarr-card w-full max-w-md mx-4">
            <div className="booktarr-card-header">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-booktarr-text">Create New Series</h3>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="text-booktarr-textSecondary hover:text-booktarr-text transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
            
            <div className="booktarr-card-body">
              <div className="space-y-4">
                <div>
                  <label className="booktarr-form-label">Name *</label>
                  <input
                    type="text"
                    value={seriesForm.name}
                    onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })}
                    className="booktarr-form-input"
                    placeholder="Enter series name"
                    required
                  />
                </div>
                
                <div>
                  <label className="booktarr-form-label">Author</label>
                  <input
                    type="text"
                    value={seriesForm.author}
                    onChange={(e) => setSeriesForm({ ...seriesForm, author: e.target.value })}
                    className="booktarr-form-input"
                    placeholder="Enter author name"
                  />
                </div>
                
                <div>
                  <label className="booktarr-form-label">Description</label>
                  <textarea
                    value={seriesForm.description}
                    onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                    className="booktarr-form-input resize-none"
                    rows={3}
                    placeholder="Enter series description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="booktarr-form-label">Total Books</label>
                    <input
                      type="number"
                      value={seriesForm.total_books}
                      onChange={(e) => setSeriesForm({ ...seriesForm, total_books: parseInt(e.target.value) || 0 })}
                      className="booktarr-form-input"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="booktarr-form-label">Status</label>
                    <select
                      value={seriesForm.status}
                      onChange={(e) => setSeriesForm({ ...seriesForm, status: e.target.value })}
                      className="booktarr-form-input"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="hiatus">Hiatus</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createSeries}
                  className="booktarr-btn booktarr-btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <SaveIcon />
                  Create Series
                </button>
                <button
                  onClick={() => { setIsCreating(false); resetSeriesForm(); }}
                  className="booktarr-btn booktarr-btn-secondary px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Series Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="booktarr-card w-full max-w-md mx-4">
            <div className="booktarr-card-header">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-booktarr-text">Edit Series</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-booktarr-textSecondary hover:text-booktarr-text transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
            
            <div className="booktarr-card-body">
              <div className="space-y-4">
                <div>
                  <label className="booktarr-form-label">Name *</label>
                  <input
                    type="text"
                    value={seriesForm.name}
                    onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })}
                    className="booktarr-form-input"
                    required
                  />
                </div>
                
                <div>
                  <label className="booktarr-form-label">Author</label>
                  <input
                    type="text"
                    value={seriesForm.author}
                    onChange={(e) => setSeriesForm({ ...seriesForm, author: e.target.value })}
                    className="booktarr-form-input"
                  />
                </div>
                
                <div>
                  <label className="booktarr-form-label">Description</label>
                  <textarea
                    value={seriesForm.description}
                    onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                    className="booktarr-form-input resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="booktarr-form-label">Total Books</label>
                    <input
                      type="number"
                      value={seriesForm.total_books}
                      onChange={(e) => setSeriesForm({ ...seriesForm, total_books: parseInt(e.target.value) || 0 })}
                      className="booktarr-form-input"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="booktarr-form-label">Status</label>
                    <select
                      value={seriesForm.status}
                      onChange={(e) => setSeriesForm({ ...seriesForm, status: e.target.value })}
                      className="booktarr-form-input"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="hiatus">Hiatus</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateSeries}
                  className="booktarr-btn booktarr-btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <SaveIcon />
                  Update Series
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="booktarr-btn booktarr-btn-secondary px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Volume Modal */}
      {isAddingVolume && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="booktarr-card w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="booktarr-card-header">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-booktarr-text">Add Volume</h3>
                <button 
                  onClick={() => setIsAddingVolume(false)}
                  className="text-booktarr-textSecondary hover:text-booktarr-text transition-colors"
                >
                  <XIcon />
                </button>
              </div>
            </div>
            
            <div className="booktarr-card-body">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="booktarr-form-label">Position *</label>
                    <input
                      type="number"
                      value={volumeForm.position}
                      onChange={(e) => setVolumeForm({ ...volumeForm, position: parseInt(e.target.value) || 1 })}
                      className="booktarr-form-input"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="booktarr-form-label">Status</label>
                    <select
                      value={volumeForm.status}
                      onChange={(e) => setVolumeForm({ ...volumeForm, status: e.target.value })}
                      className="booktarr-form-input"
                    >
                      <option value="missing">Missing</option>
                      <option value="owned">Owned</option>
                      <option value="wanted">Wanted</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="booktarr-form-label">Title</label>
                  <input
                    type="text"
                    value={volumeForm.title}
                    onChange={(e) => setVolumeForm({ ...volumeForm, title: e.target.value })}
                    className="booktarr-form-input"
                    placeholder={`${selectedSeries?.series.name} Vol. ${volumeForm.position}`}
                  />
                </div>
                
                <div>
                  <label className="booktarr-form-label">ISBN-13</label>
                  <input
                    type="text"
                    value={volumeForm.isbn_13}
                    onChange={(e) => setVolumeForm({ ...volumeForm, isbn_13: e.target.value })}
                    className="booktarr-form-input"
                    placeholder="978-XXXXXXXXXX"
                  />
                </div>
                
                <div>
                  <label className="booktarr-form-label">Publisher</label>
                  <input
                    type="text"
                    value={volumeForm.publisher}
                    onChange={(e) => setVolumeForm({ ...volumeForm, publisher: e.target.value })}
                    className="booktarr-form-input"
                    placeholder="Publisher name"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={addVolumeToSeries}
                  className="booktarr-btn booktarr-btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <PlusIcon />
                  Add Volume
                </button>
                <button
                  onClick={() => { setIsAddingVolume(false); resetVolumeForm(); }}
                  className="booktarr-btn booktarr-btn-secondary px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesManagement;