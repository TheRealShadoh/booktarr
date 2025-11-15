/**
 * TagManager Component
 * Manages tags for individual books and provides filtering capabilities
 */
import React, { useState, useCallback, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import './TagManager.css';

interface TagManagerProps {
  bookId: number;
  initialTags?: string[];
  allTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  readOnly?: boolean;
  maxTags?: number;
}

interface SuggestionCategory {
  category: string;
  tags: string[];
}

// Predefined tag suggestions organized by category
const TAG_SUGGESTIONS: SuggestionCategory[] = [
  {
    category: 'Tropes & Themes',
    tags: ['Found Family', 'Time Travel', 'Isekai', 'Reincarnation', 'Magic System',
            'Portal Fantasy', 'Enemies to Lovers', 'Slow Burn', 'Chosen One', 'Forbidden Romance']
  },
  {
    category: 'Vibes & Mood',
    tags: ['Cozy', 'Dark', 'Whimsical', 'Sad', 'Comedic', 'Romantic', 'Action-Packed',
            'Philosophical', 'Spooky', 'Heartwarming']
  },
  {
    category: 'Format & Translation',
    tags: ['Light Novel', 'Manga', 'Web Novel', 'Original English', 'Translated',
            'Dual Language', 'Graphic Novel', 'Audiobook']
  },
  {
    category: 'Collection Status',
    tags: ['Collector\'s Edition', 'Signed Copy', 'Rare', 'Deluxe', 'Mint Condition',
            'First Edition', 'Limited Print', 'Out of Print']
  },
  {
    category: 'Personal Notes',
    tags: ['Favorite', 'Reread', 'Wish List Priority', 'Gifted', 'Borrowed', 'To Donate']
  }
];

export const TagManager: React.FC<TagManagerProps> = ({
  bookId,
  initialTags = [],
  allTags = [],
  onTagsChange,
  readOnly = false,
  maxTags = 10
}) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter suggestions based on input and existing tags
  const filteredSuggestions = useCallback(() => {
    if (!inputValue.trim()) {
      return [];
    }

    const query = inputValue.toLowerCase();
    const existingSet = new Set(tags.map(t => t.toLowerCase()));
    const combined = new Set<string>();

    // Add matching tags from all available tags
    allTags.forEach(tag => {
      if (tag.toLowerCase().includes(query) && !existingSet.has(tag.toLowerCase())) {
        combined.add(tag);
      }
    });

    // Add matching predefined suggestions
    TAG_SUGGESTIONS.forEach(cat => {
      cat.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query) && !existingSet.has(tag.toLowerCase())) {
          combined.add(tag);
        }
      });
    });

    return Array.from(combined).slice(0, 5);
  }, [inputValue, tags, allTags]);

  useEffect(() => {
    setSuggestions(filteredSuggestions());
  }, [inputValue, filteredSuggestions]);

  const addTag = async (newTag: string) => {
    const trimmedTag = newTag.trim();

    // Validation
    if (!trimmedTag) {
      setError('Tag cannot be empty');
      return;
    }

    if (trimmedTag.length > 50) {
      setError('Tag is too long (max 50 characters)');
      return;
    }

    if (tags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
      setError('This tag already exists');
      return;
    }

    if (tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    // Add the tag
    const updatedTags = [...tags, trimmedTag];
    setTags(updatedTags);
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);

    // Call callback if provided
    if (onTagsChange) {
      onTagsChange(updatedTags);
    }

    // Optionally save to server
    if (!readOnly && bookId) {
      await saveTagToServer(updatedTags);
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    setError(null);

    // Call callback if provided
    if (onTagsChange) {
      onTagsChange(updatedTags);
    }

    // Optionally save to server
    if (!readOnly && bookId) {
      await saveTagToServer(updatedTags);
    }
  };

  const saveTagToServer = async (updatedTags: string[]) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tags/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTags),
      });

      if (!response.ok) {
        throw new Error('Failed to save tags');
      }
    } catch (err) {
      console.error('Error saving tags:', err);
      setError('Failed to save tags');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  return (
    <div className="tag-manager">
      <div className="tag-manager-header">
        <h3>Tags</h3>
        <span className="tag-count">
          {tags.length}/{maxTags}
        </span>
      </div>

      {/* Display existing tags */}
      <div className="tags-display">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <div key={tag} className="tag-chip">
              <span>{tag}</span>
              {!readOnly && (
                <button
                  onClick={() => removeTag(tag)}
                  className="tag-remove"
                  aria-label={`Remove tag: ${tag}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="no-tags">No tags yet</p>
        )}
      </div>

      {/* Input field */}
      {!readOnly && tags.length < maxTags && (
        <div className="tag-input-wrapper">
          <div className="tag-input-container">
            <Plus size={16} className="input-icon" />
            <input
              type="text"
              className="tag-input"
              placeholder="Add a tag..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              disabled={loading}
            />
            {loading && <Loader2 size={16} className="spinner" />}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="suggestions-dropdown">
              {suggestions.length > 0 ? (
                <div className="suggestions-list">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="suggestion-item"
                      onClick={() => addTag(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : inputValue.trim() ? (
                <div className="no-suggestions">
                  <p>No suggestions found</p>
                  <button
                    className="create-new-tag"
                    onClick={() => addTag(inputValue)}
                  >
                    Create new tag: "{inputValue}"
                  </button>
                </div>
              ) : (
                <div className="predefined-suggestions">
                  <p className="suggestions-title">Popular tag categories:</p>
                  {TAG_SUGGESTIONS.map((category) => (
                    <div key={category.category} className="suggestion-category">
                      <button
                        className="category-header"
                        onClick={() => toggleCategory(category.category)}
                      >
                        <span>{category.category}</span>
                        <span className="toggle-icon">
                          {expandedCategories.has(category.category) ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedCategories.has(category.category) && (
                        <div className="category-tags">
                          {category.tags.map((tag) => (
                            <button
                              key={tag}
                              className="quick-tag"
                              onClick={() => addTag(tag)}
                              disabled={tags.some(t => t.toLowerCase() === tag.toLowerCase())}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="error-message">{error}</p>}

      {/* Info message */}
      {tags.length >= maxTags && (
        <p className="info-message">Maximum tags reached</p>
      )}
    </div>
  );
};

export default TagManager;
