/**
 * QuoteForm - Form for adding quotes
 */
import React, { useState } from 'react';

interface QuoteFormProps {
  onAddQuote: (text: string, pageNumber?: number) => void;
  onCancel: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ onAddQuote, onCancel }) => {
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState<number | undefined>();

  const handleSubmit = () => {
    if (!quoteText.trim()) return;
    onAddQuote(quoteText.trim(), quotePage);
    setQuoteText('');
    setQuotePage(undefined);
  };

  return (
    <div className="booktarr-card mb-6">
      <div className="booktarr-card-header">
        <h3 className="text-lg font-semibold text-booktarr-text">Add Quote</h3>
      </div>
      <div className="booktarr-card-content">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-booktarr-text mb-2">
              Quote Text
            </label>
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
              rows={3}
              placeholder="Enter the quote..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-booktarr-text mb-2">
                Page Number (optional)
              </label>
              <input
                type="number"
                value={quotePage || ''}
                onChange={(e) => setQuotePage(parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                placeholder="Page number"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="bg-booktarr-accent text-white px-4 py-2 rounded-lg hover:bg-booktarr-accent/90 transition-colors"
            >
              Add Quote
            </button>
            <button
              onClick={onCancel}
              className="bg-booktarr-border text-booktarr-textMuted px-4 py-2 rounded-lg hover:bg-booktarr-border/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteForm;
