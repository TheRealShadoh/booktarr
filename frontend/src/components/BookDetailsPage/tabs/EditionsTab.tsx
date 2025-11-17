/**
 * EditionsTab - Displays available book editions
 */
import React from 'react';

interface BookEdition {
  id: number;
  isbn_13?: string;
  isbn_10?: string;
  format?: string;
  publisher?: string;
  release_date?: string;
  cover_url?: string;
  price?: number;
  status?: 'own' | 'want' | 'missing';
  notes?: string;
}

interface EditionsTabProps {
  editions: BookEdition[];
  selectedEdition: string | null;
  onSelectEdition: (editionId: string) => void;
}

const getEditionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'hardcover': 'Hardcover',
    'paperback': 'Paperback',
    'ebook': 'E-book',
    'audiobook': 'Audiobook',
    'mass_market': 'Mass Market',
    'trade_paperback': 'Trade Paperback'
  };
  return labels[type] || type;
};

const EditionsTab: React.FC<EditionsTabProps> = ({ editions, selectedEdition, onSelectEdition }) => {
  if (!editions || editions.length === 0) {
    return (
      <div className="text-center py-8 text-booktarr-textMuted">
        <span className="text-4xl block mb-2">📚</span>
        No editions available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-booktarr-text mb-4">Available Editions</h3>

      <div className="grid md:grid-cols-2 gap-4">
        {editions.map((edition, index) => (
          <div
            key={edition.id || edition.isbn_13 || `edition-${index}`}
            className={`p-4 rounded-lg border transition-all ${
              selectedEdition === (edition.isbn_13 || edition.id.toString())
                ? 'border-booktarr-accent bg-booktarr-accent/5'
                : 'border-booktarr-border bg-booktarr-cardBg hover:border-booktarr-accent/50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-booktarr-text">
                  {getEditionTypeLabel(edition.format || 'unknown')}
                </h4>
                <p className="text-sm text-booktarr-textMuted">
                  {edition.publisher || 'Unknown Publisher'}
                </p>
              </div>
              <button
                onClick={() => onSelectEdition(edition.isbn_13 || edition.id.toString() || '')}
                className={`px-3 py-1 rounded-full text-xs ${
                  selectedEdition === (edition.isbn_13 || edition.id.toString())
                    ? 'bg-booktarr-accent text-white'
                    : 'bg-booktarr-border text-booktarr-textMuted hover:bg-booktarr-accent hover:text-white'
                }`}
              >
                {selectedEdition === (edition.isbn_13 || edition.id.toString()) ? 'Selected' : 'Select'}
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-booktarr-textMuted">ISBN:</span>
                <span className="text-booktarr-text">{edition.isbn_13 || edition.isbn_10 || 'N/A'}</span>
              </div>
              {edition.release_date && (
                <div className="flex justify-between">
                  <span className="text-booktarr-textMuted">Published:</span>
                  <span className="text-booktarr-text">
                    {new Date(edition.release_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {edition.price && (
                <div className="flex justify-between">
                  <span className="text-booktarr-textMuted">Price:</span>
                  <span className="text-booktarr-text">${edition.price}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-booktarr-textMuted">Status:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  edition.status === 'own'
                    ? 'bg-green-100 text-green-800'
                    : edition.status === 'want'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {edition.status || 'unknown'}
                </span>
              </div>
              {edition.notes && (
                <div className="mt-2 p-2 bg-booktarr-bg rounded text-xs text-booktarr-textMuted">
                  {edition.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditionsTab;
