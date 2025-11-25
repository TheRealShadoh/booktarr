import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { importJobManager } from '@/lib/services/import-job-manager';
import { logger } from '@/lib/logger';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    const job = importJobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify the job belongs to this user
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    let success = false;
    let message = '';

    switch (action) {
      case 'pause':
        success = importJobManager.pauseJob(jobId);
        message = success ? 'Job paused' : 'Could not pause job';
        break;
      case 'resume':
        success = importJobManager.resumeJob(jobId);
        message = success ? 'Job resumed' : 'Could not resume job';
        break;
      case 'cancel':
        success = importJobManager.cancelJob(jobId);
        message = success ? 'Job cancelled' : 'Could not cancel job';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message,
        job: importJobManager.getJob(jobId),
      });
    } else {
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    logger.error('POST /api/import/jobs/[jobId] error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    const job = importJobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify the job belongs to this user
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only delete completed, failed, or cancelled jobs
    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      return NextResponse.json(
        { error: 'Can only delete completed, failed, or cancelled jobs' },
        { status: 400 }
      );
    }

    const deleted = importJobManager.deleteJob(jobId);

    if (deleted) {
      return NextResponse.json({ success: true, message: 'Job deleted' });
    } else {
      return NextResponse.json({ error: 'Could not delete job' }, { status: 400 });
    }
  } catch (error) {
    logger.error('DELETE /api/import/jobs/[jobId] error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
