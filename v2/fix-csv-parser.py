file_path = "apps/web/src/lib/services/csv-import.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the broken string literals
fixed_lines = []
i = 0
while i < len(lines):
    line = lines[i]

    # Fix line 73-74
    if i == 72 and "} else if (char === '" in line:
        fixed_lines.append("      } else if (char === '\\n' && !inQuotes) {\n")
        i += 2  # Skip the broken continuation
        continue

    # Fix line 80-83
    if i == 79 and "} else if (char === ''" in line:
        fixed_lines.append("      } else if (char === '\\r' && !inQuotes && nextChar === '\\n') {\n")
        i += 1
        if i < len(lines) and "') {" in lines[i]:
            i += 1  # Skip broken line
        if i < len(lines) and "// Windows" in lines[i]:
            fixed_lines.append(lines[i])  # Keep comment
            i += 1
        if i < len(lines) and "next" in lines[i]:
            i += 1  # Skip broken comment continuation
        continue

    # Fix line 85-86
    if i == 84 and "} else if (char === ''" in line:
        fixed_lines.append("      } else if (char === '\\r' && !inQuotes) {\n")
        i += 2  # Skip broken continuation
        continue

    fixed_lines.append(line)
    i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("CSV parser fixed successfully")
