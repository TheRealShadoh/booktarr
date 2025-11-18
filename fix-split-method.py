file_path = "apps/web/src/lib/services/csv-import.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the broken splitCSVRows method
broken_start = content.find('  private splitCSVRows(csvContent: string): string[] {')
broken_end = content.find('  private parseCSVLine(line: string): string[] {')

if broken_start == -1 or broken_end == -1:
    print("Could not find method boundaries")
    exit(1)

# Correct implementation
fixed_method = r"""  private splitCSVRows(csvContent: string): string[] {
    const rows: string[] = [];
    let currentRow = '';
    let inQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
      const char = csvContent[i];
      const nextChar = csvContent[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentRow += '""';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          currentRow += char;
        }
      } else if (char === '\n' && !inQuotes) {
        // End of row (only if not inside quotes)
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else if (char === '\r' && !inQuotes && nextChar === '\n') {
        // Windows line ending - skip \r, will handle \n next
        continue;
      } else if (char === '\r' && !inQuotes) {
        // Mac line ending
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else {
        currentRow += char;
      }
    }

    // Add final row if exists
    if (currentRow.trim()) {
      rows.push(currentRow);
    }

    return rows;
  }

  """

# Replace the broken method
new_content = content[:broken_start] + fixed_method + content[broken_end:]

# Write the fixed file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed splitCSVRows method")
