file_path = "apps/web/src/lib/services/csv-import.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the strict column check with lenient version
old_code = '''    for (let i = 1; i < allRows.length; i++) {
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
    }'''

new_code = '''    for (let i = 1; i < allRows.length; i++) {
      const values = this.parseCSVLine(allRows[i]);

      // Pad missing columns with empty strings
      while (values.length < headers.length) {
        values.push('');
      }

      // Warn if too many columns (data issue)
      if (values.length > headers.length) {
        console.log(`[CSV Parser] Row ${i} has extra columns: expected ${headers.length}, got ${values.length}`);
      }

      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }'''

content = content.replace(old_code, new_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Parser updated to be lenient with column counts")
