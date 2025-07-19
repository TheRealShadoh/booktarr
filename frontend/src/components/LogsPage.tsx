/**
 * System logs page component
 */
import React from 'react';

const LogsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-booktarr-text text-xl font-semibold">System</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            System logs and application diagnostics
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">System Logs</h3>
            <p className="text-booktarr-textSecondary max-w-md mx-auto">
              View system logs, error reports, and application diagnostics for troubleshooting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsPage;