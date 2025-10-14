#!/usr/bin/env bun

/**
 * Strip Chinese characters from files before pushing to GitHub
 * 在推送到 GitHub 之前移除文件中的中文字符
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Pattern to match Chinese characters and common Chinese punctuation
// 匹配中文字符和常见中文标点的模式
const chinesePattern = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]+/g;

// Files to process / 需要处理的文件
const patterns = [
  '**/*.md',
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.json'
];

// Directories to exclude / 排除的目录
const exclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/build/**'
];

function stripChinese(content: string): string {
  // Remove lines that are purely Chinese comments
  // 移除纯中文注释行
  let result = content.replace(/^[ \t]*\/\/[ \t]*[\u4e00-\u9fa5].+$/gm, '');
  result = result.replace(/^[ \t]*#[ \t]*[\u4e00-\u9fa5].+$/gm, '');

  // Remove Chinese from inline bilingual format "English / 中文"
  // 移除内联双语格式中的中文 "English / 中文"
  result = result.replace(/(\S+)\s*\/\s*[\u4e00-\u9fa5]+/g, '$1');

  // Remove Chinese from bilingual bullet points "- English\n  - 中文"
  // 移除双语项目符号中的中文
  result = result.replace(/\n[ \t]*-[ \t]*[\u4e00-\u9fa5].+$/gm, '');

  // Remove remaining Chinese characters
  // 移除剩余的中文字符
  result = result.replace(chinesePattern, '');

  // Clean up multiple blank lines
  // 清理多余的空行
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

async function main() {
  console.log('🧹 Stripping Chinese characters for GitHub...');
  console.log('🧹 为 GitHub 移除中文字符...\n');

  let fileCount = 0;

  for (const pattern of patterns) {
    const files = await glob(pattern, { ignore: exclude });

    for (const file of files) {
      try {
        const original = readFileSync(file, 'utf-8');
        const stripped = stripChinese(original);

        if (original !== stripped) {
          writeFileSync(file, stripped, 'utf-8');
          console.log(`✓ Processed / 已处理: ${file}`);
          fileCount++;
        }
      } catch (error) {
        console.error(`✗ Error processing / 处理错误: ${file}`, error);
      }
    }
  }

  console.log(`\n✅ Processed ${fileCount} files / 已处理 ${fileCount} 个文件`);
}

main();
