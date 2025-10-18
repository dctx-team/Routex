/**
 * Built-in Transformers
 * 
 */

export { MaxTokenTransformer, type MaxTokenOptions } from './maxtoken';
export { SamplingTransformer, type SamplingOptions } from './sampling';
export { CleanCacheTransformer, type CleanCacheOptions } from './cleancache';

//  transformers
export const createBuiltinTransformers =  => {
  return {
    maxtoken: MaxTokenTransformer,
    sampling: SamplingTransformer,
    cleancache: CleanCacheTransformer,
  };
};
