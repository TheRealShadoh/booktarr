/**
 * Wanted books page component
 */
import React from 'react';

const WantedPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-booktarr-text text-xl font-semibold">Wanted</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Books you want to read and upcoming releases
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">Wanted Books</h3>
            <p className="text-booktarr-textSecondary max-w-md mx-auto">
              Track books you want to read, upcoming releases, and missing books from your favorite series.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WantedPage;