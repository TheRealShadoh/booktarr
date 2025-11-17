/**
 * StatsTab - Displays reading statistics
 */
import React from 'react';

interface ReadingStats {
  totalPages: number;
  totalSessions: number;
  avgPagesPerSession: number;
}

interface StatsTabProps {
  readingStats: ReadingStats | null;
}

const StatsTab: React.FC<StatsTabProps> = ({ readingStats }) => {
  if (!readingStats) {
    return (
      <div className="text-center py-8 text-booktarr-textMuted">
        <span className="text-4xl block mb-2">📈</span>
        Start reading to see your statistics!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-booktarr-text mb-4">Reading Statistics</h3>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
          <div className="text-2xl font-bold text-booktarr-accent mb-1">
            {readingStats.totalPages}
          </div>
          <div className="text-sm text-booktarr-textMuted">Total Pages Read</div>
        </div>
        <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
          <div className="text-2xl font-bold text-booktarr-accent mb-1">
            {readingStats.totalSessions}
          </div>
          <div className="text-sm text-booktarr-textMuted">Reading Sessions</div>
        </div>
        <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
          <div className="text-2xl font-bold text-booktarr-accent mb-1">
            {readingStats.avgPagesPerSession}
          </div>
          <div className="text-sm text-booktarr-textMuted">Avg Pages/Session</div>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
