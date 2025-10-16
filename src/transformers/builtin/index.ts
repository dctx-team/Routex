/**
 * Built-in Transformers
 * 内置转换器集合
 */

export { MaxTokenTransformer, type MaxTokenOptions } from './maxtoken';
export { SamplingTransformer, type SamplingOptions } from './sampling';
export { CleanCacheTransformer, type CleanCacheOptions } from './cleancache';

// 便捷导出：创建预配置的 transformers
export const createBuiltinTransformers = () => {
  return {
    maxtoken: MaxTokenTransformer,
    sampling: SamplingTransformer,
    cleancache: CleanCacheTransformer,
  };
};
