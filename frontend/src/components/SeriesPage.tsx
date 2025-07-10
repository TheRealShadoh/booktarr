/**
 * Series management page component
 */
import React from 'react';

const SeriesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-booktarr-text text-xl font-semibold">Series</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Manage your book series and track reading progress
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">Series Management</h3>
            <p className="text-booktarr-textSecondary max-w-md mx-auto">
              This page will show all your book series, reading progress, and help you discover missing books in your collections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeriesPage;