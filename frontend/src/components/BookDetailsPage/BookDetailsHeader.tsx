/**
 * BookDetailsHeader - Header with back button and quick actions
 */
import React from 'react';

interface BookDetailsHeaderProps {
  onBack: () => void;
  isReading: boolean;
  onStartReading: () => void;
  onStopReading: () => void;
  onAddQuote: () => void;
  onRefreshMetadata: () => void;
}

const BookDetailsHeader: React.FC<BookDetailsHeaderProps> = ({
  onBack,
  isReading,
  onStartReading,
  onStopReading,
  onAddQuote,
  onRefreshMetadata
}) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
      >
        <span className="text-xl">←</span>
        <span>Back to Library</span>
      </button>

      <div className="flex items-center space-x-3">
        {!isReading ? (
          <button
            onClick={onStartReading}
            className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-600 transition-colors"
          >
            <span>📖</span>
            <span>Start Reading</span>
          </button>
        ) : (
          <button
            onClick={onStopReading}
            className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-600 transition-colors"
          >
            <span>⏹️</span>
            <span>Stop Reading</span>
          </button>
        )}

        <button
          onClick={onAddQuote}
          className="bg-booktarr-accent text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-booktarr-accent/90 transition-colors"
        >
          <span>💭</span>
          <span>Add Quote</span>
        </button>

        <button
          onClick={onRefreshMetadata}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors"
          title="Refresh book metadata from external sources"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};

export default BookDetailsHeader;
