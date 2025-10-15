#!/usr/bin/env python3
"""
Strip Chinese text from documentation files before GitHub push.
Removes Chinese characters while preserving English content.
"""

import re
import sys
from pathlib import Path

def has_chinese(text):
    """Check if text contains Chinese characters."""
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def remove_chinese_line(line):
    """Remove Chinese characters and related punctuation from a line."""
    # Remove Chinese characters
    line = re.sub(r'[\u4e00-\u9fff]+', '', line)

    # Remove Chinese punctuation
    chinese_punct = '，。；：？！（）【】《》""''、'
    for punct in chinese_punct:
        line = line.replace(punct, '')

    # Clean up bilingual separators
    line = re.sub(r'\s+/\s*$', '', line)
    line = re.sub(r'\s+-\s+$', '', line)

    # Remove empty parentheses/brackets left after Chinese removal
    line = re.sub(r'\(\s*\)', '', line)
    line = re.sub(r'\[\s*\]', '', line)

    return line.strip()

def process_markdown_file(filepath):
    """Process a markdown file to remove Chinese text."""
    print(f"Processing: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    skip_next = False

    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue

        # Skip lines that are only Chinese
        if has_chinese(line) and not re.search(r'[a-zA-Z]', line):
            continue

        # Process lines with mixed content
        if has_chinese(line):
            cleaned = remove_chinese_line(line)
            if cleaned and not cleaned.isspace():
                new_lines.append(cleaned + '\n')
        else:
            new_lines.append(line)

    # Remove multiple consecutive empty lines
    final_lines = []
    prev_empty = False
    for line in new_lines:
        is_empty = not line.strip()
        if is_empty and prev_empty:
            continue
        final_lines.append(line)
        prev_empty = is_empty

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(final_lines)

def process_code_file(filepath):
    """Process a TypeScript/JavaScript file to remove Chinese from comments."""
    print(f"Processing code: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove Chinese from single-line comments
    def replace_comment(match):
        comment = match.group(0)
        if has_chinese(comment):
            # Keep the // but remove Chinese
            cleaned = remove_chinese_line(comment)
            return '//' + cleaned if cleaned else '//'
        return comment

    content = re.sub(r'//.*$', replace_comment, content, flags=re.MULTILINE)

    # Remove Chinese from multi-line comments
    def replace_multiline_comment(match):
        comment = match.group(0)
        if has_chinese(comment):
            lines = comment.split('\n')
            new_lines = []
            for line in lines:
                if '/*' in line or '*/' in line:
                    new_lines.append(line)
                elif has_chinese(line):
                    cleaned = remove_chinese_line(line)
                    if cleaned:
                        # Preserve the * at the start of comment lines
                        if line.strip().startswith('*'):
                            new_lines.append(' ' + cleaned)
                        else:
                            new_lines.append(cleaned)
                else:
                    new_lines.append(line)
            return '\n'.join(new_lines)
        return comment

    content = re.sub(r'/\*.*?\*/', replace_multiline_comment, content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    root_dir = Path('.')

    print("🧹 Stripping Chinese text from files...")
    print()

    # Process markdown files
    md_files = list(root_dir.glob('*.md'))
    md_files += list(root_dir.glob('docs/**/*.md'))

    print(f"📝 Processing {len(md_files)} markdown files...")
    for filepath in md_files:
        if filepath.name not in ['.git', 'node_modules']:
            process_markdown_file(filepath)

    # Process TypeScript files
    ts_files = list(root_dir.glob('src/**/*.ts'))
    ts_files += list(root_dir.glob('src/**/*.js'))

    print(f"\n💻 Processing {len(ts_files)} code files...")
    for filepath in ts_files:
        process_code_file(filepath)

    print()
    print("✅ Chinese text removal complete!")
    print()
    print("📊 Summary:")
    print(f"   - Processed {len(md_files)} markdown files")
    print(f"   - Processed {len(ts_files)} code files")
    print()
    print("⚠️  Note: This operation modifies files in place.")
    print("   Make sure you have a backup or can revert via git.")

if __name__ == '__main__':
    main()
