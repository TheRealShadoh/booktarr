export interface ImportJob {
  id: string;
  userId: string;
  status: 'pending' | 'running' | 'paused' | 'cancelled' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
  errors: Array<{
    row: number;
    error: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  error?: string;
  filename?: string;
}

class ImportJobManager {
  private jobs: Map<string, ImportJob> = new Map();

  createJob(userId: string, totalRows: number): ImportJob {
    const id = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ImportJob = {
      id,
      userId,
      status: 'pending',
      progress: {
        total: totalRows,
        processed: 0,
        success: 0,
        failed: 0,
      },
      errors: [],
      startedAt: new Date(),
    };

    this.jobs.set(id, job);

    // Auto-cleanup after 1 hour
    setTimeout(() => {
      this.jobs.delete(id);
    }, 60 * 60 * 1000);

    return job;
  }

  getJob(jobId: string): ImportJob | undefined {
    return this.jobs.get(jobId);
  }

  updateProgress(
    jobId: string,
    processed: number,
    success: number,
    failed: number
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress.processed = processed;
      job.progress.success = success;
      job.progress.failed = failed;
      job.status = 'running';
    }
  }

  addError(jobId: string, row: number, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.errors.push({ row, error });
    }
  }

  completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
    }
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error;
    }
  }

  getUserJobs(userId: string): ImportJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  pauseJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'paused';
      job.pausedAt = new Date();
      return true;
    }
    return false;
  }

  resumeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'paused') {
      job.status = 'running';
      job.pausedAt = undefined;
      return true;
    }
    return false;
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && (job.status === 'running' || job.status === 'paused' || job.status === 'pending')) {
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  isPaused(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    return job?.status === 'paused';
  }

  isCancelled(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    return job?.status === 'cancelled';
  }
}

// Singleton instance
export const importJobManager = new ImportJobManager();
