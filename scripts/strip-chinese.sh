#!/bin/bash
# Strip Chinese text from all documentation files before GitHub push
# 从所有文档文件中移除中文文本（用于GitHub推送前）

set -e

echo "🧹 Stripping Chinese text from documentation files..."

# Function to remove Chinese text from a file
strip_chinese() {
    local file="$1"
    echo "Processing: $file"

    # Remove Chinese characters and related punctuation
    # Keep English, numbers, and common symbols
    sed -i 's/[一-龥]//g' "$file"
    sed -i 's/，//g' "$file"
    sed -i 's/。//g' "$file"
    sed -i 's/；//g' "$file"
    sed -i 's/：//g' "$file"
    sed -i 's/？//g' "$file"
    sed -i 's/！//g' "$file"
    sed -i 's/（//g' "$file"
    sed -i 's/）//g' "$file"
    sed -i 's/【//g' "$file"
    sed -i 's/】//g' "$file"
    sed -i 's/《//g' "$file"
    sed -i 's/》//g' "$file"
    sed -i 's/""//g' "$file"
    sed -i 's/''//g' "$file"

    # Remove bilingual separator patterns
    sed -i 's/ \/ $//g' "$file"
    sed -i 's/ \/$//g' "$file"

    # Remove empty lines created by Chinese removal
    sed -i '/^[[:space:]]*$/d' "$file"
}

# Process all markdown files
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.git/*" | while read -r file; do
    strip_chinese "$file"
done

# Process all TypeScript/JavaScript files (only comments)
find ./src -name "*.ts" -o -name "*.js" | while read -r file; do
    echo "Processing code file: $file"
    # Remove Chinese from single-line comments
    sed -i 's/\/\/ .*[一-龥].*/\/\//g' "$file"
    # Remove Chinese from multi-line comments
    sed -i '/\/\*/,/\*\//{ s/[一-龥]//g }' "$file"
done

echo "✅ Chinese text removal complete!"
echo ""
echo "📝 Files processed:"
echo "  - All .md files"
echo "  - All .ts/.js files (comments only)"
echo ""
echo "⚠️  Note: This is a destructive operation!"
echo "   Make sure you have a backup of the original files."
