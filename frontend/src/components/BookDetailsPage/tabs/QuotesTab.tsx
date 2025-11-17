/**
 * QuotesTab - Displays saved quotes and notes
 */
import React from 'react';

interface BookQuote {
  id: string;
  text: string;
  page_number?: number;
  chapter?: string;
  date_added: string;
  tags: string[];
}

interface QuotesTabProps {
  quotes?: BookQuote[];
}

const QuotesTab: React.FC<QuotesTabProps> = ({ quotes }) => {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="text-center py-8 text-booktarr-textMuted">
        <span className="text-4xl block mb-2">💭</span>
        No quotes saved yet. Click "Add Quote" to save your favorite passages!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-booktarr-text mb-4">Quotes & Notes</h3>

      <div className="space-y-4">
        {quotes.map((quote) => (
          <div key={quote.id} className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
            <blockquote className="text-booktarr-text italic text-lg leading-relaxed mb-3">
              "{quote.text}"
            </blockquote>
            <div className="flex items-center justify-between text-sm text-booktarr-textMuted">
              <div className="flex items-center space-x-4">
                {quote.page_number && (
                  <span>Page {quote.page_number}</span>
                )}
                {quote.chapter && (
                  <span>{quote.chapter}</span>
                )}
              </div>
              <span>{new Date(quote.date_added).toLocaleDateString()}</span>
            </div>
            {quote.tags && quote.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {quote.tags.map((tag, index) => (
                  <span
                    key={`quote-tag-${tag}-${index}`}
                    className="px-2 py-1 bg-booktarr-accent/10 text-booktarr-accent text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuotesTab;
