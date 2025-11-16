/**
 * OverviewTab - Displays book overview with metadata and categories
 */
import React from 'react';

interface BookDetails {
  isbn: string;
  added_date: string;
  last_updated: string;
  categories: string[];
  collections?: string[];
}

interface OverviewTabProps {
  bookDetails: BookDetails;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ bookDetails }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-booktarr-text mb-4">Book Overview</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-booktarr-text mb-2">Metadata</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-booktarr-textMuted">ISBN:</span>
                <span className="text-booktarr-text">{bookDetails.isbn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-booktarr-textMuted">Added:</span>
                <span className="text-booktarr-text">
                  {new Date(bookDetails.added_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-booktarr-textMuted">Last Updated:</span>
                <span className="text-booktarr-text">
                  {new Date(bookDetails.last_updated).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-booktarr-text mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {bookDetails.categories?.length > 0 ? (
                bookDetails.categories.map((category, index) => (
                  <span
                    key={`category-${category}-${index}`}
                    className="px-2 py-1 bg-booktarr-accent/10 text-booktarr-accent text-xs rounded-full border border-booktarr-accent/20"
                  >
                    {category}
                  </span>
                ))
              ) : (
                <span className="text-booktarr-textMuted text-sm">No categories assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {bookDetails.collections && bookDetails.collections.length > 0 && (
        <div>
          <h4 className="font-medium text-booktarr-text mb-2">Collections</h4>
          <div className="flex flex-wrap gap-2">
            {bookDetails.collections.map((collection, index) => (
              <span
                key={`collection-${collection}-${index}`}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200"
              >
                📚 {collection}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
