import re

file_path = "apps/web/src/lib/services/csv-import.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the parseCSV method
old_method = r'''  parseCSV\(csvContent: string\): CSVRow\[\] \{
    const lines = csvContent\.split\('\\n'\)\.filter\(\(line\) => line\.trim\(\)\);
    if \(lines\.length === 0\) return \[\];

    const headers = this\.parseCSVLine\(lines\[0\]\);
    console\.log\('\[CSV Parser\] Found', lines\.length, 'lines'\);
    console\.log\('\[CSV Parser\] Headers:', headers\.length, 'columns', headers\.slice\(0, 5\)\);
    const rows: CSVRow\[\] = \[\];

    for \(let i = 1; i < lines\.length; i\+\+\) \{
      const values = this\.parseCSVLine\(lines\[i\]\);
      if \(values\.length !== headers\.length\) \{
        console\.log\(`\[CSV Parser\] Row \$\{i\} skipped: expected \$\{headers\.length\} columns, got \$\{values\.length\}`\);
        continue;
      \}
      const row: CSVRow = \{\};
      headers\.forEach\(\(header, index\) => \{
        row\[header\] = values\[index\];
      \}\);
      rows\.push\(row\);
    \}

    console\.log\('\[CSV Parser\] Parsed', rows\.length, 'valid rows'\);
    return rows;
  \}'''

new_method = '''  parseCSV(csvContent: string): CSVRow[] {
    // Split into rows while respecting quoted fields that may contain newlines
    const allRows = this.splitCSVRows(csvContent);
    if (allRows.length === 0) return [];

    const headers = this.parseCSVLine(allRows[0]);
    console.log('[CSV Parser] Found', allRows.length, 'rows');
    console.log('[CSV Parser] Headers:', headers.length, 'columns', headers.slice(0, 5));
    const rows: CSVRow[] = [];

    for (let i = 1; i < allRows.length; i++) {
      const values = this.parseCSVLine(allRows[i]);
      if (values.length !== headers.length) {
        console.log(`[CSV Parser] Row ${i} skipped: expected ${headers.length} columns, got ${values.length}`);
        continue;
      }
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }

    console.log('[CSV Parser] Parsed', rows.length, 'valid rows');
    return rows;
  }

  private splitCSVRows(csvContent: string): string[] {
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
      } else if (char === '\\n' && !inQuotes) {
        // End of row (only if not inside quotes)
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else if (char === '\\r' && !inQuotes && nextChar === '\\n') {
        // Windows line ending - skip \\r, will handle \\n next
        continue;
      } else if (char === '\\r' && !inQuotes) {
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
  }'''

content = re.sub(old_method, new_method, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("CSV parser updated successfully")
