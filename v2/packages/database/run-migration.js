const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://booktarr:booktarr_dev_password@localhost:5432/booktarr';

async function runMigration() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('Applying metadata_cache unique constraint...');

    // Check if constraint already exists
    const existing = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'metadata_cache'
      AND constraint_name = 'metadata_cache_source_identifier_unique'
    `;

    if (existing.length > 0) {
      console.log('✓ Constraint already exists, skipping migration');
    } else {
      await sql`
        ALTER TABLE metadata_cache
        ADD CONSTRAINT metadata_cache_source_identifier_unique
        UNIQUE (source, identifier)
      `;
      console.log('✓ Migration applied successfully');
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
