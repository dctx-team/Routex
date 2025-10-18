/**
 * I18n Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { I18n } from '../src/i18n';

describe('I18n', () => {
  let i18n: I18n;

  beforeEach(() => {
    i18n = new I18n('en');

    // Add test translations
    i18n.addTranslations('en', {
      greeting: 'Hello',
      farewell: 'Goodbye',
      nested: {
        message: 'Nested message',
        deep: {
          value: 'Deep value',
        },
      },
      parameterized: 'Hello, {{name}}!',
      multiParam: 'User {{name}} has {{count}} items',
    });

    i18n.addTranslations('zh-CN', {
      greeting: '你好',
      farewell: '再见',
      nested: {
        message: '嵌套消息',
        deep: {
          value: '深层值',
        },
      },
      parameterized: '你好，{{name}}！',
      multiParam: '用户 {{name}} 有 {{count}} 项',
    });
  });

  describe('Locale Management', () => {
    test('should set and get locale', () => {
      expect(i18n.getLocale()).toBe('en');

      i18n.setLocale('zh-CN');
      expect(i18n.getLocale()).toBe('zh-CN');
    });

    test('should use default locale', () => {
      const i18nDefault = new I18n();
      expect(i18nDefault.getLocale()).toBe('en');
    });
  });

  describe('Translation', () => {
    test('should translate simple key', () => {
      expect(i18n.t('greeting')).toBe('Hello');

      i18n.setLocale('zh-CN');
      expect(i18n.t('greeting')).toBe('你好');
    });

    test('should translate nested key', () => {
      expect(i18n.t('nested.message')).toBe('Nested message');
      expect(i18n.t('nested.deep.value')).toBe('Deep value');

      i18n.setLocale('zh-CN');
      expect(i18n.t('nested.message')).toBe('嵌套消息');
      expect(i18n.t('nested.deep.value')).toBe('深层值');
    });

    test('should return key for missing translation', () => {
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
    });

    test('should fallback to default locale', () => {
      i18n.addTranslations('fr', {
        greeting: 'Bonjour',
        // Missing 'farewell'
      });

      i18n.setLocale('fr');
      expect(i18n.t('greeting')).toBe('Bonjour');
      expect(i18n.t('farewell')).toBe('Goodbye'); // Falls back to English
    });
  });

  describe('Parameter Interpolation', () => {
    test('should interpolate single parameter', () => {
      const result = i18n.t('parameterized', { name: 'Alice' });
      expect(result).toBe('Hello, Alice!');

      i18n.setLocale('zh-CN');
      const zhResult = i18n.t('parameterized', { name: 'Alice' });
      expect(zhResult).toBe('你好，Alice！');
    });

    test('should interpolate multiple parameters', () => {
      const result = i18n.t('multiParam', { name: 'Bob', count: '5' });
      expect(result).toBe('User Bob has 5 items');

      i18n.setLocale('zh-CN');
      const zhResult = i18n.t('multiParam', { name: 'Bob', count: '5' });
      expect(zhResult).toBe('用户 Bob 有 5 项');
    });

    test('should handle number parameters', () => {
      const result = i18n.t('multiParam', { name: 'Charlie', count: 10 });
      expect(result).toBe('User Charlie has 10 items');
    });

    test('should keep placeholder for missing parameter', () => {
      const result = i18n.t('parameterized', {});
      expect(result).toBe('Hello, {{name}}!');
    });

    test('should handle extra parameters', () => {
      const result = i18n.t('parameterized', { name: 'Dave', extra: 'ignored' });
      expect(result).toBe('Hello, Dave!');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty translation object', () => {
      i18n.addTranslations('empty' as any, {});
      i18n.setLocale('empty' as any);
      expect(i18n.t('anything')).toBe('anything');
    });

    test('should handle undefined parameters', () => {
      const result = i18n.t('greeting', undefined);
      expect(result).toBe('Hello');
    });

    test('should handle deep nesting', () => {
      i18n.addTranslations('en', {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'Very deep',
              },
            },
          },
        },
      });

      expect(i18n.t('level1.level2.level3.level4.level5')).toBe('Very deep');
    });
  });

  describe('Multiple Locales', () => {
    test('should support switching between multiple locales', () => {
      i18n.addTranslations('es', {
        greeting: 'Hola',
      });

      i18n.setLocale('en');
      expect(i18n.t('greeting')).toBe('Hello');

      i18n.setLocale('zh-CN');
      expect(i18n.t('greeting')).toBe('你好');

      i18n.setLocale('es' as any);
      expect(i18n.t('greeting')).toBe('Hola');
    });
  });
});
