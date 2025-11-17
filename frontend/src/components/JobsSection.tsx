import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { useStateManager } from '../hooks/useStateManager';

interface Job {
  name: string;
  description: string;
  interval_hours: number;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'rate_limited';
  last_error: string | null;
  items_processed: number;
  items_failed: number;
}

interface JobsSectionProps {
  className?: string;
}

const JobsSection: React.FC<JobsSectionProps> = ({ className = '' }) => {
  const { showToast } = useStateManager();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingJobs, setUpdatingJobs] = useState<Set<string>>(new Set());
  const [triggeringJobs, setTriggeringJobs] = useState<Set<string>>(new Set());

  // Fetch jobs on mount and periodically (disabled in test environments)
  useEffect(() => {
    fetchJobs();

    // Only enable auto-refresh if not in a test environment
    // Playwright sets navigator.webdriver = true
    const isTestEnvironment = navigator.webdriver || (window as any).Cypress;

    if (!isTestEnvironment) {
      const interval = setInterval(fetchJobs, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError('Failed to load jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateJob = async (jobName: string, updates: { enabled?: boolean; interval_hours?: number }) => {
    setUpdatingJobs(prev => new Set(prev).add(jobName));
    try {
      const response = await fetch(`/api/jobs/${jobName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update job');
      
      const result = await response.json();
      setJobs(prev => prev.map(job => 
        job.name === jobName ? result.job : job
      ));
    } catch (err) {
      console.error('Error updating job:', err);
      showToast('Failed to update job', 'error');
    } finally {
      setUpdatingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobName);
        return newSet;
      });
    }
  };

  const triggerJob = async (jobName: string) => {
    setTriggeringJobs(prev => new Set(prev).add(jobName));
    try {
      const response = await fetch(`/api/jobs/${jobName}/trigger`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to trigger job');
      
      showToast(`Job ${jobName} has been triggered successfully!`, 'success');
      // Refresh jobs after a short delay
      setTimeout(fetchJobs, 2000);
    } catch (err) {
      console.error('Error triggering job:', err);
      showToast('Failed to trigger job', 'error');
    } finally {
      setTriggeringJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobName);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    const statusConfig = {
      idle: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Idle' },
      running: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Running' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
      rate_limited: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Rate Limited' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatInterval = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours === 1) return '1 hour';
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600">{error}</p>
        <button onClick={fetchJobs} className="text-red-600 underline mt-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-booktarr-text">Scheduled Jobs</h2>
        <button
          onClick={fetchJobs}
          className="text-booktarr-accent hover:text-booktarr-accentHover"
          title="Refresh jobs"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.name} className="bg-booktarr-surface border border-booktarr-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-booktarr-text capitalize">
                    {job.name.replace(/_/g, ' ')}
                  </h3>
                  {getStatusBadge(job.status)}
                </div>
                <p className="text-sm text-booktarr-textMuted mt-1">{job.description}</p>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={job.enabled}
                    onChange={(e) => updateJob(job.name, { enabled: e.target.checked })}
                    disabled={updatingJobs.has(job.name)}
                    className="mr-2 rounded text-booktarr-accent focus:ring-booktarr-accent"
                  />
                  <span className="text-sm text-booktarr-text">Enabled</span>
                </label>
                
                <button
                  onClick={() => triggerJob(job.name)}
                  disabled={triggeringJobs.has(job.name) || job.status === 'running'}
                  className="px-3 py-1 text-sm bg-booktarr-accent text-white rounded hover:bg-booktarr-accentHover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {triggeringJobs.has(job.name) ? 'Triggering...' : 'Run Now'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-booktarr-textMuted">Interval:</span>
                <p className="text-booktarr-text font-medium">{formatInterval(job.interval_hours)}</p>
              </div>
              
              <div>
                <span className="text-booktarr-textMuted">Last Run:</span>
                <p className="text-booktarr-text font-medium">{formatDateTime(job.last_run)}</p>
              </div>
              
              <div>
                <span className="text-booktarr-textMuted">Next Run:</span>
                <p className="text-booktarr-text font-medium">{formatDateTime(job.next_run)}</p>
              </div>
              
              <div>
                <span className="text-booktarr-textMuted">Processed:</span>
                <p className="text-booktarr-text font-medium">
                  {job.items_processed} items
                  {job.items_failed > 0 && (
                    <span className="text-red-600"> ({job.items_failed} failed)</span>
                  )}
                </p>
              </div>
            </div>

            {job.last_error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">
                  <span className="font-medium">Last Error:</span> {job.last_error}
                </p>
              </div>
            )}

            {/* Interval adjustment */}
            <div className="mt-4 flex items-center space-x-2">
              <label className="text-sm text-booktarr-textMuted">Run every:</label>
              <select
                value={job.interval_hours}
                onChange={(e) => updateJob(job.name, { interval_hours: parseFloat(e.target.value) })}
                disabled={updatingJobs.has(job.name)}
                className="px-3 py-1 text-sm border border-booktarr-border rounded focus:outline-none focus:ring-2 focus:ring-booktarr-accent bg-booktarr-bg text-booktarr-text"
              >
                <option value="0.5">30 minutes</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">Daily</option>
                <option value="168">Weekly</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Note:</span> Jobs run automatically based on their schedule. 
          The metadata update job will check all books for missing information and fetch it from online sources. 
          If API rate limits are hit, the job will pause until the next scheduled run.
        </p>
      </div>
    </div>
  );
};

export default JobsSection;