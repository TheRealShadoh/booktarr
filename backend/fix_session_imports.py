#!/usr/bin/env python3
"""
Fix all services to use get_db_session instead of get_session for context manager usage
"""
import os
import re

def fix_file(filepath):
    """Fix a single file's imports and usage"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Skip if file doesn't use get_session
    if 'get_session' not in content:
        return False
    
    original_content = content
    
    # Fix imports
    content = re.sub(
        r'from backend\.database import get_session',
        'from backend.database import get_db_session',
        content
    )
    content = re.sub(
        r'from database import get_session',
        'from database import get_db_session',
        content
    )
    
    # Fix usage as context manager
    content = re.sub(
        r'with get_session\(\) as session:',
        'with get_db_session() as session:',
        content
    )
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    
    return False

def main():
    """Fix all Python files in services directory"""
    services_dir = '/home/chris/git/booktarr/backend/services'
    fixed_count = 0
    
    for filename in os.listdir(services_dir):
        if filename.endswith('.py'):
            filepath = os.path.join(services_dir, filename)
            if fix_file(filepath):
                fixed_count += 1
    
    print(f"Fixed {fixed_count} files")

if __name__ == "__main__":
    main()