file_path = "packages/database/src/schema/books.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add 'unique' to the imports
old_import = "import { pgTable, text, timestamp, uuid, varchar, integer, decimal, date, boolean, jsonb, index } from 'drizzle-orm/pg-core';"
new_import = "import { pgTable, text, timestamp, uuid, varchar, integer, decimal, date, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core';"

content = content.replace(old_import, new_import)

# Step 2: Add unique constraint to metadata_cache table
old_constraint = """}, (table) => ({
  sourceIdentifierIdx: index('metadata_cache_source_identifier_idx').on(table.source, table.identifier),
  expiresIdx: index('metadata_cache_expires_idx').on(table.expiresAt),
}));"""

new_constraint = """}, (table) => ({
  sourceIdentifierUnique: unique('metadata_cache_source_identifier_unique').on(table.source, table.identifier),
  sourceIdentifierIdx: index('metadata_cache_source_identifier_idx').on(table.source, table.identifier),
  expiresIdx: index('metadata_cache_expires_idx').on(table.expiresAt),
}));"""

content = content.replace(old_constraint, new_constraint)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added unique constraint to metadata_cache schema")
