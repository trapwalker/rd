#!/usr/bin/env python3
"""
Script to automate Python 2 to 3 migration fixes
"""
import os
import re
from pathlib import Path

def fix_unicode_types(content):
    """Replace type=str with type=str"""
    content = re.sub(r'\btype=unicode\b', 'type=str', content)
    return content

def fix_unicode_literals(content):
    """Remove '' string prefixes where not needed"""
    # Remove u prefix from simple strings
    content = re.sub(r'\bu(["\'])', r'\1', content)
    return content

def fix_future_imports(content):
    """Remove or update __future__ imports"""
    lines = content.split('\n')
    new_lines = []
    skip_next_blank = False

    for line in lines:
        # Keep the file if it has from __future__, but we can simplify later
        if 'from __future__ import' in line:
            # Keep absolute_import as it doesn't hurt in Py3
            # Remove print_function as print() is default in Py3
            if 'print_function' in line and 'absolute_import' not in line:
                skip_next_blank = True
                continue
        elif skip_next_blank and line.strip() == '':
            skip_next_blank = False
            continue
        new_lines.append(line)

    return '\n'.join(new_lines)

def fix_decode_cp1251(content):
    """Fix Windows encoding decode issues"""
    # str(e) -> str(e) in Python 3
    content = re.sub(
        r"str\((\w+)\)\.decode\(['\"]cp1251['\"](?:,\s*errors=['\"]ignore['\"]\))?\)",
        r'str(\1)',
        content
    )
    return content

def fix_exception_message(content):
    """Fix str(e) to str(e)"""
    content = re.sub(r'(\w+)\.message\b', r'str(\1)', content)
    return content

def process_file(filepath):
    """Process a single Python file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Try with cp1251 for old Russian files
        with open(filepath, 'r', encoding='cp1251') as f:
            content = f.read()

    original = content

    content = fix_unicode_types(content)
    content = fix_unicode_literals(content)
    content = fix_decode_cp1251(content)
    content = fix_exception_message(content)
    # content = fix_future_imports(content)  # Skip for now to be safe

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Main migration function"""
    root = Path('.')
    exclude_dirs = {'.venv', '.git', 'node_modules', '__pycache__', '.idea', 'build', 'dist', 'egg-info'}

    modified = []

    for py_file in root.rglob('*.py'):
        # Skip excluded directories
        if any(excluded in py_file.parts for excluded in exclude_dirs):
            continue

        if process_file(py_file):
            modified.append(py_file)
            print(f"✓ {py_file}")

    print(f"\nModified {len(modified)} files")

if __name__ == '__main__':
    main()
