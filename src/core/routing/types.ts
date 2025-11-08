/**
 * 路由条件类型定义
 * Routing Condition Type Definitions
 */

/**
 * 内容分析条件
 * Content analysis condition
 */
export interface ContentCondition {
  contentCategory?: 'general' | 'code' | 'creative' | 'analytical';
  complexityLevel?: 'simple' | 'medium' | 'complex';
  hasCode?: boolean;
  programmingLanguage?: string;
  intent?: 'question' | 'instruction' | 'conversation';
  minWordCount?: number;
  maxWordCount?: number;
}

/**
 * 模型条件
 * Model condition
 */
export interface ModelCondition {
  model?: string;
  modelPattern?: string;
}

/**
 * Header 条件
 * Header condition
 */
export interface HeaderCondition {
  header: string;
  value: string | string[];
  operator?: 'equals' | 'contains' | 'matches';
}

/**
 * 路径条件
 * Path condition
 */
export interface PathCondition {
  path?: string;
  pathPattern?: string;
}

/**
 * 时间条件
 * Time condition
 */
export interface TimeCondition {
  timeRange?: {
    start: string;
    end: string;
  };
  weekdays?: number[];
}

/**
 * 路由条件联合类型
 * Routing condition union type
 */
export type RoutingCondition =
  | ContentCondition
  | ModelCondition
  | HeaderCondition
  | PathCondition
  | TimeCondition
  | Record<string, unknown>;

/**
 * 类型守卫：检查是否为内容条件
 * Type guard: check if it's a content condition
 */
export function isContentCondition(condition: RoutingCondition): condition is ContentCondition {
  return (
    'contentCategory' in condition ||
    'complexityLevel' in condition ||
    'hasCode' in condition ||
    'programmingLanguage' in condition ||
    'intent' in condition ||
    'minWordCount' in condition ||
    'maxWordCount' in condition
  );
}

/**
 * 类型守卫：检查是否为模型条件
 * Type guard: check if it's a model condition
 */
export function isModelCondition(condition: RoutingCondition): condition is ModelCondition {
  return 'model' in condition || 'modelPattern' in condition;
}

/**
 * 类型守卫：检查是否为 Header 条件
 * Type guard: check if it's a header condition
 */
export function isHeaderCondition(condition: RoutingCondition): condition is HeaderCondition {
  return 'header' in condition && 'value' in condition;
}

/**
 * 类型守卫：检查是否为路径条件
 * Type guard: check if it's a path condition
 */
export function isPathCondition(condition: RoutingCondition): condition is PathCondition {
  return 'path' in condition || 'pathPattern' in condition;
}

/**
 * 类型守卫：检查是否为时间条件
 * Type guard: check if it's a time condition
 */
export function isTimeCondition(condition: RoutingCondition): condition is TimeCondition {
  return 'timeRange' in condition || 'weekdays' in condition;
}
