import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { importJobManager } from '@/lib/services/import-job-manager';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = importJobManager.getUserJobs(session.user.id);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('GET /api/import/jobs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
