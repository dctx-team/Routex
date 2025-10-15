#!/bin/bash
# Install Git hooks for Routex
# 安装Routex的Git hooks

set -e

echo "🔧 Installing Git hooks for Routex..."
echo ""

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR="scripts"

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository!"
    echo "   Please run this script from the Routex root directory."
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-push hook
echo "📝 Installing pre-push hook..."
cat > "$HOOKS_DIR/pre-push" << 'HOOK_EOF'
#!/usr/bin/env python3
"""
Git pre-push hook to strip Chinese text before pushing to remote.
This script creates a temporary branch with Chinese removed, pushes it,
then switches back to the original branch with Chinese intact.
"""

import sys
import subprocess
import re
from pathlib import Path

def run_command(cmd, check=True):
    """Run a shell command and return output."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Error running: {cmd}")
        print(result.stderr)
        sys.exit(1)
    return result.stdout.strip()

def has_chinese(text):
    """Check if text contains Chinese characters."""
    return bool(re.search(r'[\u4e00-\u9fff]', text))

def remove_chinese_from_text(text):
    """Remove Chinese characters and related punctuation from text."""
    text = re.sub(r'[\u4e00-\u9fff]+', '', text)
    chinese_punct = '，。；：？！（）【】《》""''、'
    for punct in chinese_punct:
        text = text.replace(punct, '')
    text = re.sub(r'\s+/\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s+-\s+$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\(\s*\)', '', text)
    text = re.sub(r'\[\s*\]', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text

def process_file(filepath):
    """Process a file to remove Chinese text."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if has_chinese(content):
            cleaned = remove_chinese_from_text(content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(cleaned)
            return True
        return False
    except Exception as e:
        print(f"Warning: Could not process {filepath}: {e}")
        return False

def main():
    print("🔍 Pre-push hook: Checking for Chinese text...")
    current_branch = run_command("git branch --show-current")
    print(f"📍 Current branch: {current_branch}")

    temp_branch = f"{current_branch}-no-chinese-temp"
    print(f"🌿 Creating temporary branch: {temp_branch}")
    run_command(f"git checkout -b {temp_branch}")

    files_to_process = []
    md_files = Path('.').glob('**/*.md')
    files_to_process.extend([f for f in md_files if '.git' not in str(f) and 'node_modules' not in str(f)])
    code_files = list(Path('src').glob('**/*.ts')) + list(Path('src').glob('**/*.js'))
    files_to_process.extend(code_files)

    print(f"📝 Processing {len(files_to_process)} files...")
    modified_count = sum(1 for f in files_to_process if process_file(f))
    print(f"✅ Processed {modified_count} files with Chinese text")

    if modified_count > 0:
        run_command("git add .")
        run_command('git commit -m "chore: remove Chinese text for GitHub push [auto]"')
        print("✅ Changes committed to temporary branch")

    remote = "origin"
    print(f"🚀 Pushing to {remote}/{current_branch}...")
    result = subprocess.run(f"git push {remote} {temp_branch}:{current_branch}", shell=True, capture_output=True, text=True)

    print(f"🔄 Switching back to {current_branch}...")
    run_command(f"git checkout {current_branch}")
    print(f"🗑️  Deleting temporary branch...")
    run_command(f"git branch -D {temp_branch}")

    if result.returncode != 0:
        print("❌ Push failed!")
        print(result.stderr)
        sys.exit(1)

    print("✅ Push successful!")
    print("📍 Your local branch still contains Chinese text")
    print(result.stdout)
    sys.exit(1)

if __name__ == '__main__':
    main()
HOOK_EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ Pre-push hook installed"

echo ""
echo "✅ Git hooks installation complete!"
echo ""
echo "📋 Installed hooks:"
echo "   - pre-push: Automatically removes Chinese text when pushing to GitHub"
echo ""
echo "💡 How it works:"
echo "   1. When you run 'git push', the hook activates"
echo "   2. Creates a temporary branch with Chinese text removed"
echo "   3. Pushes the temp branch to GitHub"
echo "   4. Switches back to your original branch (with Chinese intact)"
echo "   5. Your local files remain unchanged!"
echo ""
echo "🎯 Usage:"
echo "   Just use 'git push origin main' as normal"
echo "   The hook will handle Chinese text removal automatically"
echo ""
echo "⚠️  Note: The first push after installation will trigger the hook"
