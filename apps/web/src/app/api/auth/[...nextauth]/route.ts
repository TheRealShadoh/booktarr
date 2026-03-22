import { handlers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handlers.GET(request as never);
}

export async function POST(request: Request) {
  return handlers.POST(request as never);
}
