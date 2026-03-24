/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateStartup } = await import('./lib/startup-validation');
    const { logger } = await import('./lib/logger');

    try {
      const result = await validateStartup();

      if (!result.success) {
        logger.error('🛑 Startup validation failed — continuing with degraded functionality');
        result.errors.forEach(err => {
          logger.error(`  - [${err.component}] ${err.message}`);
        });
      } else {
        logger.info('🚀 Application started successfully');

        if (result.warnings.length > 0) {
          logger.warn(`Note: ${result.warnings.length} warning(s) detected`);
        }
      }
    } catch (error) {
      logger.error('Failed to run startup validation', error as Error);
    }
  }
}
