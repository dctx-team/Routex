# Scripts
This directory contains utility scripts for Routex development and deployment.

Routex

## Available Scripts
### strip-chinese.py

Removes Chinese text from documentation and code comments before pushing to GitHub.

GitHub

**Usage**:
```bash
cd /media/window_G/GitHub_local/ClaudeCodeProxy/Routex
python3 scripts/strip-chinese.py
```

**What it does**:
- Removes Chinese characters from all `.md` files
- Removes Chinese from comments in `.ts` and `.js` files
- Preserves English content and code structure
- Cleans up empty lines and formatting

**Note**: This operation modifies files in place. Make sure you have a backup!

### strip-chinese.sh

Shell script version of Chinese text removal (less precise than Python version).

ShellPython

**Usage**:
```bash
cd /media/window_G/GitHub_local/ClaudeCodeProxy/Routex
./scripts/strip-chinese.sh
```

### prepare-commit.sh

Automated script to prepare and commit changes with Chinese text removed.

**Usage**:
```bash
cd /media/window_G/GitHub_local/ClaudeCodeProxy/Routex
./scripts/prepare-commit.sh
```

**What it does**:
1. Creates a backup using `git stash`
2. Runs `strip-chinese.py` to remove Chinese text
3. Stages all changes with `git add`
4. Shows a summary of changes
5. Provides suggested commit message

**After running**, you can:
- Review changes: `git diff --cached`
- Commit: `git commit -m your message`
- Push: `git push origin main`
- Restore backup: `git stash apply` (if needed)

## Workflow for GitHub Push / GitHub

### Option 1: Automated (Recommended)
```bash
# Run the automated prepare script
./scripts/prepare-commit.sh

# Review changes
git diff --cached

# Commit with provided message
git commit -F- << 'EOF'
feat: implement SmartRouter and Transformers (v1.1.0-beta)

[... use the suggested commit message ...]
EOF

# Push to GitHub
git push origin main
```

### Option 2: Manual
```bash
# 1. Backup current state
git stash push -m backup-$(date +%Y%m%d)

# 2. Remove Chinese text
python3 scripts/strip-chinese.py

# 3. Review changes
git diff

# 4. Stage changes
git add .

# 5. Commit
git commit -m feat: implement SmartRouter and Transformers (v1.1.0-beta)

# 6. Push
git push origin main

# 7. Restore backup locally (optional)
git stash pop
```

## Important Notes
1. **Always backup first**
   - Use `git stash` or create a branch before removing Chinese text
   - `git stash`

2. **Local vs Remote**
   - Keep bilingual version locally for development
   - Push English-only version to GitHub
   - GitHub

3. **Restore after push**
   - After pushing to GitHub, you can restore the Chinese text locally
   - Use `git stash apply` to get back your bilingual files
   - GitHub
   - `git stash apply`

## Example Workflow
```bash
# Development with bilingual docs
# 
vim README.md  # Edit with Chinese and English

# When ready to push to GitHub
# GitHub
./scripts/prepare-commit.sh

# Review and commit
# 
git commit -m feat: new feature
git push origin main

# Restore Chinese text locally
# 
git stash pop  # Restore the backup

# Continue development with bilingual docs
# 
```

## Troubleshooting
### Script permission denied
```bash
chmod +x scripts/*.sh
chmod +x scripts/*.py
```

### Chinese text not fully removed
- The Python script (`strip-chinese.py`) is more accurate than the shell script
- Review files manually and adjust if needed
- PythonShell
### Lost changes after strip
```bash
# List stashes
git stash list

# Apply a specific stash
git stash apply stash@{0}
```

---

**Developer**: dctx479
**Team**: dctx-team
**Project**: Routex v1.1.0-beta
