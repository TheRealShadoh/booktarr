/**
 * BookInfoSection - Main book information display
 */
import React from 'react';

interface BookInfoSectionProps {
  title: string;
  authors: string[];
  series?: string;
  seriesPosition?: number;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  language: string;
  description?: string;
  customTags: string[];
  newTag: string;
  onSeriesClick?: (seriesName: string) => void;
  onEditMetadata: () => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onNewTagChange: (tag: string) => void;
  onNewTagKeyPress: (e: React.KeyboardEvent) => void;
}

const BookInfoSection: React.FC<BookInfoSectionProps> = ({
  title,
  authors,
  series,
  seriesPosition,
  publisher,
  publishedDate,
  pageCount,
  language,
  description,
  customTags,
  newTag,
  onSeriesClick,
  onEditMetadata,
  onAddTag,
  onRemoveTag,
  onNewTagChange,
  onNewTagKeyPress
}) => {
  return (
    <div className="md:col-span-2 space-y-4">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold text-booktarr-text">{title}</h1>
          <button
            onClick={onEditMetadata}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            ✏️ Edit Metadata
          </button>
        </div>
        <p className="text-lg text-booktarr-textMuted">
          by {authors.join(', ')}
        </p>
        {series && (
          <p className="text-sm text-booktarr-textMuted mt-1">
            <span className="font-medium">Series:</span>{' '}
            {onSeriesClick ? (
              <button
                onClick={() => onSeriesClick(series)}
                className="text-booktarr-accent hover:text-booktarr-accent/80 underline transition-colors"
              >
                {series}
              </button>
            ) : (
              <span>{series}</span>
            )}
            {seriesPosition && ` #${seriesPosition}`}
          </p>
        )}
      </div>

      {/* Basic Info Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-booktarr-text">Publisher:</span>
          <p className="text-booktarr-textMuted">{publisher || 'Unknown'}</p>
        </div>
        <div>
          <span className="font-medium text-booktarr-text">Published:</span>
          <p className="text-booktarr-textMuted">
            {publishedDate ? new Date(publishedDate).getFullYear() : 'Unknown'}
          </p>
        </div>
        <div>
          <span className="font-medium text-booktarr-text">Pages:</span>
          <p className="text-booktarr-textMuted">{pageCount || 'Unknown'}</p>
        </div>
        <div>
          <span className="font-medium text-booktarr-text">Language:</span>
          <p className="text-booktarr-textMuted">{language || 'Unknown'}</p>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div>
          <h3 className="font-medium text-booktarr-text mb-2">Description</h3>
          <p className="text-sm text-booktarr-textMuted leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {/* Tags */}
      <div>
        <h3 className="font-medium text-booktarr-text mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {customTags.map((tag, index) => (
            <span
              key={`tag-${tag}-${index}`}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-booktarr-accent/10 text-booktarr-accent border border-booktarr-accent/20"
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="ml-1 text-booktarr-accent/70 hover:text-booktarr-accent"
              >
                ×
              </button>
            </span>
          ))}
          {newTag && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
                onKeyPress={onNewTagKeyPress}
                className="px-2 py-1 text-xs border border-booktarr-border rounded focus:outline-none focus:ring-1 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                placeholder="New tag..."
              />
              <button
                onClick={onAddTag}
                className="text-xs bg-booktarr-accent text-white px-2 py-1 rounded hover:bg-booktarr-accent/90"
              >
                Add
              </button>
            </div>
          )}
          <button
            onClick={() => onNewTagChange(' ')}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-dashed border-booktarr-textMuted text-booktarr-textMuted hover:border-booktarr-accent hover:text-booktarr-accent"
          >
            + Add Tag
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookInfoSection;
