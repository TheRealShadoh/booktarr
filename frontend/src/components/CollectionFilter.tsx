/**
 * CollectionFilter Component
 * Provides filtering options for tags, categories, languages, and formats
 */
import React, { useState, useEffect } from 'react';
import { Filter, X, Loader2, BarChart3 } from 'lucide-react';
import { CollectionStats } from '../types';
import './CollectionFilter.css';

interface FilterOptions {
  selectedTags: string[];
  selectedCategories: string[];
  selectedLanguages: string[];
  selectedFormats: string[];
  matchAllTags: boolean;
}

interface CollectionFilterProps {
  stats?: CollectionStats;
  onFilterChange?: (filters: FilterOptions) => void;
  showStats?: boolean;
  collapsible?: boolean;
}

export const CollectionFilter: React.FC<CollectionFilterProps> = ({
  stats,
  onFilterChange,
  showStats = true,
  collapsible = true,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    selectedTags: [],
    selectedCategories: [],
    selectedLanguages: [],
    selectedFormats: [],
    matchAllTags: false,
  });

  const [isExpanded, setIsExpanded] = useState(!collapsible);
  const [loading, setLoading] = useState(!stats);

  useEffect(() => {
    if (!stats) {
      loadStats();
    }
  }, []);

  useEffect(() => {
    onFilterChange?.(filters);
  }, [filters]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/collection/stats');
      if (response.ok) {
        const data = await response.json();
        // Stats are loaded but we just use the component state for filters
      }
    } catch (error) {
      console.error('Failed to load collection stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  };

  const toggleCategory = (category: string) => {
    setFilters(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category]
    }));
  };

  const toggleLanguage = (language: string) => {
    setFilters(prev => ({
      ...prev,
      selectedLanguages: prev.selectedLanguages.includes(language)
        ? prev.selectedLanguages.filter(l => l !== language)
        : [...prev.selectedLanguages, language]
    }));
  };

  const toggleFormat = (format: string) => {
    setFilters(prev => ({
      ...prev,
      selectedFormats: prev.selectedFormats.includes(format)
        ? prev.selectedFormats.filter(f => f !== format)
        : [...prev.selectedFormats, format]
    }));
  };

  const resetFilters = () => {
    setFilters({
      selectedTags: [],
      selectedCategories: [],
      selectedLanguages: [],
      selectedFormats: [],
      matchAllTags: false,
    });
  };

  const hasActiveFilters =
    filters.selectedTags.length > 0 ||
    filters.selectedCategories.length > 0 ||
    filters.selectedLanguages.length > 0 ||
    filters.selectedFormats.length > 0;

  const languageLabels: { [key: string]: string } = {
    'en': '🇬🇧 English',
    'ja': '🇯🇵 Japanese',
    'fr': '🇫🇷 French',
    'es': '🇪🇸 Spanish',
    'de': '🇩🇪 German',
    'zh': '🇨🇳 Chinese',
    'ko': '🇰🇷 Korean',
    'ru': '🇷🇺 Russian',
  };

  return (
    <div className="collection-filter">
      {/* Header */}
      <div className="filter-header" onClick={() => collapsible && setIsExpanded(!isExpanded)}>
        <div className="filter-title">
          <Filter size={18} />
          <h3>Collection Filters</h3>
          {hasActiveFilters && (
            <span className="active-badge">{
              filters.selectedTags.length +
              filters.selectedCategories.length +
              filters.selectedLanguages.length +
              filters.selectedFormats.length
            }</span>
          )}
        </div>
        {collapsible && (
          <button className="expand-toggle">
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="filter-content">
          {loading && (
            <div className="loading-container">
              <Loader2 size={24} className="spinner" />
              <p>Loading filters...</p>
            </div>
          )}

          {!loading && stats && (
            <>
              {/* Tags Section */}
              {stats.tags && Object.keys(stats.tags).length > 0 && (
                <div className="filter-section">
                  <h4 className="section-title">Tags</h4>
                  <div className="filter-options">
                    {Object.entries(stats.tags)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 12)
                      .map(([tag, count]) => (
                        <label key={tag} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.selectedTags.includes(tag)}
                            onChange={() => toggleTag(tag)}
                          />
                          <span className="option-label">
                            {tag}
                            <span className="option-count">{count}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                  {filters.selectedTags.length > 0 && (
                    <label className="filter-option">
                      <input
                        type="checkbox"
                        checked={filters.matchAllTags}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          matchAllTags: e.target.checked
                        }))}
                      />
                      <span className="option-label">Match all selected tags</span>
                    </label>
                  )}
                </div>
              )}

              {/* Categories Section */}
              {stats.categories && Object.keys(stats.categories).length > 0 && (
                <div className="filter-section">
                  <h4 className="section-title">Categories</h4>
                  <div className="filter-options">
                    {Object.entries(stats.categories)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([category, count]) => (
                        <label key={category} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                          />
                          <span className="option-label">
                            {category}
                            <span className="option-count">{count}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Languages Section */}
              {stats.languages && Object.keys(stats.languages).length > 0 && (
                <div className="filter-section">
                  <h4 className="section-title">Languages</h4>
                  <div className="filter-options">
                    {Object.entries(stats.languages)
                      .sort(([, a], [, b]) => b - a)
                      .map(([language, count]) => (
                        <label key={language} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.selectedLanguages.includes(language)}
                            onChange={() => toggleLanguage(language)}
                          />
                          <span className="option-label">
                            {languageLabels[language] || language}
                            <span className="option-count">{count}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Formats Section */}
              {stats.formats && Object.keys(stats.formats).length > 0 && (
                <div className="filter-section">
                  <h4 className="section-title">Edition Formats</h4>
                  <div className="filter-options">
                    {Object.entries(stats.formats)
                      .sort(([, a], [, b]) => b - a)
                      .map(([format, count]) => (
                        <label key={format} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filters.selectedFormats.includes(format)}
                            onChange={() => toggleFormat(format)}
                          />
                          <span className="option-label">
                            {format}
                            <span className="option-count">{count}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Reset button */}
              {hasActiveFilters && (
                <button className="reset-filters" onClick={resetFilters}>
                  <X size={16} />
                  Reset Filters
                </button>
              )}
            </>
          )}

          {!loading && !stats && (
            <div className="error-message">
              <p>Failed to load filter options</p>
            </div>
          )}
        </div>
      )}

      {/* Collection Stats */}
      {showStats && stats && !loading && (
        <div className="stats-summary">
          <BarChart3 size={16} />
          <div className="stats-info">
            <div className="stat-item">
              <span className="stat-label">Books:</span>
              <span className="stat-value">{stats.total_books}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Languages:</span>
              <span className="stat-value">{stats.unique_languages}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tags:</span>
              <span className="stat-value">{stats.unique_tags}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Formats:</span>
              <span className="stat-value">{stats.unique_formats}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionFilter;
