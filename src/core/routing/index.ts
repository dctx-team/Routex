/**
 * Routing module exports
 * 
 */

export { SmartRouter } from './smart-router';
export type { RouterContext, RouterResult } from './smart-router';

export { ContentAnalyzer } from './content-analyzer';
export type {
  ContentAnalysis,
  ContentCategory,
  ComplexityLevel,
  RequestIntent,
} from './content-analyzer';

export {
  CustomRouterRegistry,
  BuiltinRouters,
  globalRouterRegistry,
  composeAnd,
  composeOr,
  not,
  when,
  fallback,
  testRouter,
} from './custom-routers';
export type {
  CustomRouterFunction,
  RouterFunctionInfo,
  RegisteredRouter,
} from './custom-routers';
