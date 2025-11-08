/**
 * 
 * Routing Condition Type Definitions
 */

/**
 * 
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
 * 
 * Model condition
 */
export interface ModelCondition {
  model?: string;
  modelPattern?: string;
}

/**
 * Header 
 * Header condition
 */
export interface HeaderCondition {
  header: string;
  value: string | string;
  operator?: 'equals' | 'contains' | 'matches';
}

/**
 * 
 * Path condition
 */
export interface PathCondition {
  path?: string;
  pathPattern?: string;
}

/**
 * 
 * Time condition
 */
export interface TimeCondition {
  timeRange?: {
    start: string;
    end: string;
  };
  weekdays?: number;
}

/**
 * 
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
 * 
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
 * 
 * Type guard: check if it's a model condition
 */
export function isModelCondition(condition: RoutingCondition): condition is ModelCondition {
  return 'model' in condition || 'modelPattern' in condition;
}

/**
 *  Header 
 * Type guard: check if it's a header condition
 */
export function isHeaderCondition(condition: RoutingCondition): condition is HeaderCondition {
  return 'header' in condition && 'value' in condition;
}

/**
 * 
 * Type guard: check if it's a path condition
 */
export function isPathCondition(condition: RoutingCondition): condition is PathCondition {
  return 'path' in condition || 'pathPattern' in condition;
}

/**
 * 
 * Type guard: check if it's a time condition
 */
export function isTimeCondition(condition: RoutingCondition): condition is TimeCondition {
  return 'timeRange' in condition || 'weekdays' in condition;
}
