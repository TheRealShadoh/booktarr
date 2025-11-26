import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

// Check if essential environment variables are configured
function checkConfiguration() {
  const issues: string[] = [];

  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL is not configured');
  }
  if (!process.env.NEXTAUTH_SECRET) {
    issues.push('NEXTAUTH_SECRET is not configured');
  }

  return issues;
}

export default async function HomePage() {
  // Check configuration first
  const configIssues = checkConfiguration();

  if (configIssues.length > 0) {
    // Show setup page when configuration is missing
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            BookTarr Setup Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The application requires some environment variables to be configured:
          </p>
          <ul className="list-disc list-inside text-red-600 dark:text-red-400 mb-6">
            {configIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Please configure these environment variables in your Vercel project settings
            or your deployment environment.
          </p>
        </div>
      </div>
    );
  }

  try {
    const session = await auth();

    if (session) {
      redirect('/library');
    } else {
      redirect('/login');
    }
  } catch (error) {
    // If auth fails (e.g., database connection error), redirect to login
    console.error('Auth error:', error);
    redirect('/login');
  }
}
