/**
 * Activity page component
 */
import React from 'react';

const ActivityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-booktarr-text text-xl font-semibold">Activity</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Recent activity and library statistics
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">Library Activity</h3>
            <p className="text-booktarr-textSecondary max-w-md mx-auto">
              View recent additions, sync history, reading statistics, and library growth over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;