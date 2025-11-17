/**
 * ProgressTab - Displays reading progress, sessions, and goals
 */
import React from 'react';

interface ReadingSession {
  id: string;
  start_time: string;
  end_time?: string;
  pages_read: number;
  notes?: string;
  mood?: 'excited' | 'engaged' | 'neutral' | 'bored' | 'frustrated';
}

interface ReadingGoal {
  target_date?: string;
  pages_per_day?: number;
  total_time_estimate?: number;
}

interface Ownership {
  reading_progress_pages?: number;
  reading_progress_percentage?: number;
  times_read?: number;
}

interface ProgressTabProps {
  ownership?: Ownership;
  readingSessions?: ReadingSession[];
  readingGoal: ReadingGoal;
  onReadingGoalChange: (goal: ReadingGoal) => void;
}

const getReadingMoodIcon = (mood: string): string => {
  const icons: Record<string, string> = {
    'excited': '🤩',
    'engaged': '😊',
    'neutral': '😐',
    'bored': '😴',
    'frustrated': '😤'
  };
  return icons[mood] || '📖';
};

const ProgressTab: React.FC<ProgressTabProps> = ({
  ownership,
  readingSessions,
  readingGoal,
  onReadingGoalChange
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-booktarr-text mb-4">Reading Progress</h3>

      {/* Progress Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-booktarr-cardBg rounded-lg">
          <div className="text-2xl font-bold text-booktarr-accent">
            {ownership?.reading_progress_pages || 0}
          </div>
          <div className="text-sm text-booktarr-textMuted">Pages Read</div>
        </div>
        <div className="p-4 bg-booktarr-cardBg rounded-lg">
          <div className="text-2xl font-bold text-booktarr-accent">
            {ownership?.reading_progress_percentage || 0}%
          </div>
          <div className="text-sm text-booktarr-textMuted">Complete</div>
        </div>
        <div className="p-4 bg-booktarr-cardBg rounded-lg">
          <div className="text-2xl font-bold text-booktarr-accent">
            {ownership?.times_read || 0}
          </div>
          <div className="text-sm text-booktarr-textMuted">Times Read</div>
        </div>
      </div>

      {/* Reading Sessions */}
      <div>
        <h4 className="font-medium text-booktarr-text mb-3">Recent Reading Sessions</h4>
        {readingSessions && readingSessions.length > 0 ? (
          <div className="space-y-3">
            {readingSessions.map((session) => (
              <div key={session.id} className="p-3 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {session.mood ? getReadingMoodIcon(session.mood) : '📖'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-booktarr-text">
                        {session.pages_read} pages read
                      </div>
                      <div className="text-xs text-booktarr-textMuted">
                        {new Date(session.start_time).toLocaleDateString()} at{' '}
                        {new Date(session.start_time).toLocaleTimeString()}
                        {session.end_time && (
                          <> - {new Date(session.end_time).toLocaleTimeString()}</>
                        )}
                      </div>
                    </div>
                  </div>
                  {session.end_time && (
                    <div className="text-xs text-booktarr-textMuted">
                      {Math.round(
                        (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) /
                        (1000 * 60)
                      )} min
                    </div>
                  )}
                </div>
                {session.notes && (
                  <div className="mt-2 text-sm text-booktarr-textMuted italic">
                    "{session.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-booktarr-textMuted">
            <span className="text-4xl block mb-2">📖</span>
            No reading sessions yet. Start reading to track your progress!
          </div>
        )}
      </div>

      {/* Reading Goals */}
      <div>
        <h4 className="font-medium text-booktarr-text mb-3">Reading Goals</h4>
        <div className="p-4 bg-booktarr-cardBg rounded-lg border border-booktarr-border">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-booktarr-text mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={readingGoal.target_date || ''}
                onChange={(e) => onReadingGoalChange({ ...readingGoal, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-booktarr-text mb-2">
                Pages Per Day
              </label>
              <input
                type="number"
                value={readingGoal.pages_per_day || ''}
                onChange={(e) => onReadingGoalChange({ ...readingGoal, pages_per_day: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                placeholder="Pages per day"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-booktarr-text mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                value={readingGoal.total_time_estimate || ''}
                onChange={(e) => onReadingGoalChange({ ...readingGoal, total_time_estimate: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-booktarr-border rounded-md focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
                placeholder="Total hours"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTab;
