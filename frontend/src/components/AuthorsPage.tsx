/**
 * Authors page component
 */
import React from 'react';

const AuthorsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="booktarr-card">
        <div className="booktarr-card-header">
          <h2 className="text-booktarr-text text-xl font-semibold">Authors</h2>
          <p className="text-booktarr-textSecondary text-sm mt-1">
            Explore your library by author and discover new books
          </p>
        </div>
        <div className="booktarr-card-body">
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-booktarr-textMuted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-booktarr-text text-lg font-semibold mb-2">Author Collection</h3>
            <p className="text-booktarr-textSecondary max-w-md mx-auto">
              Browse your library by author, see statistics for each writer, and get recommendations for new books.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorsPage;