# Scripts / 脚本

This directory contains utility scripts for Routex development and deployment.

本目录包含Routex开发和部署的实用脚本。

## Available Scripts / 可用脚本

### strip-chinese.py

Removes Chinese text from documentation and code comments before pushing to GitHub.

在推送到GitHub前从文档和代码注释中移除中文文本。

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

中文文本移除的Shell脚本版本（不如Python版本精确）。

**Usage**:
```bash
cd /media/window_G/GitHub_local/ClaudeCodeProxy/Routex
./scripts/strip-chinese.sh
```

### prepare-commit.sh

Automated script to prepare and commit changes with Chinese text removed.

自动化脚本，用于准备和提交已移除中文文本的更改。

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
- Commit: `git commit -m "your message"`
- Push: `git push origin main`
- Restore backup: `git stash apply` (if needed)

## Workflow for GitHub Push / GitHub推送工作流程

### Option 1: Automated (Recommended) / 自动化方式（推荐）

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

### Option 2: Manual / 手动方式

```bash
# 1. Backup current state
git stash push -m "backup-$(date +%Y%m%d)"

# 2. Remove Chinese text
python3 scripts/strip-chinese.py

# 3. Review changes
git diff

# 4. Stage changes
git add .

# 5. Commit
git commit -m "feat: implement SmartRouter and Transformers (v1.1.0-beta)"

# 6. Push
git push origin main

# 7. Restore backup locally (optional)
git stash pop
```

## Important Notes / 重要说明

1. **Always backup first** / 始终先备份
   - Use `git stash` or create a branch before removing Chinese text
   - 在移除中文文本前使用`git stash`或创建分支

2. **Local vs Remote** / 本地与远程
   - Keep bilingual version locally for development
   - Push English-only version to GitHub
   - 本地保留双语版本用于开发
   - 推送纯英文版本到GitHub

3. **Restore after push** / 推送后恢复
   - After pushing to GitHub, you can restore the Chinese text locally
   - Use `git stash apply` to get back your bilingual files
   - 推送到GitHub后，可以在本地恢复中文文本
   - 使用`git stash apply`恢复双语文件

## Example Workflow / 示例工作流程

```bash
# Development with bilingual docs
# 使用双语文档进行开发
vim README.md  # Edit with Chinese and English

# When ready to push to GitHub
# 准备推送到GitHub时
./scripts/prepare-commit.sh

# Review and commit
# 检查并提交
git commit -m "feat: new feature"
git push origin main

# Restore Chinese text locally
# 在本地恢复中文文本
git stash pop  # Restore the backup

# Continue development with bilingual docs
# 继续使用双语文档开发
```

## Troubleshooting / 故障排除

### Script permission denied / 脚本权限被拒绝

```bash
chmod +x scripts/*.sh
chmod +x scripts/*.py
```

### Chinese text not fully removed / 中文文本未完全移除

- The Python script (`strip-chinese.py`) is more accurate than the shell script
- Review files manually and adjust if needed
- Python脚本比Shell脚本更精确
- 手动检查文件并根据需要调整

### Lost changes after strip / 移除后丢失更改

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
