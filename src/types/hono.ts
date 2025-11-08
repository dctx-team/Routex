/**
 * Hono Framework Type Extensions
 *
 * Defines custom context variables for Hono middleware and route handlers
 */

/**
 * Custom environment variables for Hono context
 */
export type HonoEnv = {
  Variables: {
    requestId: string;
    validatedParams: any;
    validatedBody: any;
    validatedQuery: any;
  };
};
